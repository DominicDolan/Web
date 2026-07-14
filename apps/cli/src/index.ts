#!/usr/bin/env bun
import {createInterface} from "node:readline/promises";
import {access, copyFile, mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";

const TEMPLATE_APP_NAME = "app-template";
const EXCLUDE_DIRS = new Set(["node_modules", ".output", ".mf", ".wrangler"]);
const EXCLUDE_FILES = new Set([".DS_Store"]);

function toKebab(input: string): string {
    return input
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}

async function pathExists(p: string): Promise<boolean> {
    try {
        await access(p);
        return true;
    } catch {
        return false;
    }
}

async function findRepoRoot(startDir: string): Promise<string> {
    let current = path.resolve(startDir);
    while (true) {
        const candidate = path.join(current, "apps", TEMPLATE_APP_NAME);
        const pkg = path.join(current, "package.json");
        if (await pathExists(candidate) && await pathExists(pkg)) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            throw new Error("Could not find repo root (expected apps/app-template and package.json). Run this from within the repo.");
        }
        current = parent;
    }
}

async function copyDir(src: string, dest: string): Promise<void> {
    await mkdir(dest, {recursive: true});
    const entries = await readdir(src, {withFileTypes: true});
    for (const entry of entries) {
        if (entry.isDirectory() && EXCLUDE_DIRS.has(entry.name)) {
            continue;
        }
        if (entry.isFile() && EXCLUDE_FILES.has(entry.name)) {
            continue;
        }
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else if (entry.isFile()) {
            await copyFile(srcPath, destPath);
        }
    }
}

async function updatePackageJson(
    appDir: string,
    packageName: string,
    includeD1: boolean,
    includeLins: boolean,
    includeDelta: boolean,
): Promise<void> {
    const pkgPath = path.join(appDir, "package.json");
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw);

    pkg.name = packageName;

    pkg.dependencies ??= {};
    pkg.scripts ??= {};

    if (includeD1) {
        pkg.dependencies["@web/d1"] = pkg.dependencies["@web/d1"] ?? "workspace:*";
        pkg.dependencies["wrangler"] = pkg.dependencies["wrangler"] ?? "catalog:";
        pkg.scripts["generate:schema"] = "generate-schema src/models migrations";
        pkg.scripts["apply:schema"] = "wrangler d1 migrations apply DB --local --config ./wrangler.jsonc";
        pkg.scripts["apply:schema:prod"] = "wrangler d1 migrations apply DB --remote --config ./wrangler.jsonc";
    } else {
        delete pkg.dependencies["@web/d1"];
    }

    if (includeLins) {
        pkg.dependencies["@web/lins"] = pkg.dependencies["@web/lins"] ?? "workspace:*";
    } else {
        delete pkg.dependencies["@web/lins"];
    }

    if (includeDelta) {
        pkg.dependencies["@web/solid-delta"] = pkg.dependencies["@web/solid-delta"] ?? "workspace:*";
    } else {
        delete pkg.dependencies["@web/solid-delta"];
    }

    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

async function updateViteConfig(appDir: string, includeD1: boolean): Promise<void> {
    const viteConfigPath = path.join(appDir, "vite.config.ts");
    if (!includeD1 || !(await pathExists(viteConfigPath))) {
        return;
    }

    const content = `import {defineConfig} from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import {solidServerFunctions} from "@web/server-functions";
import {getPlatformProxy} from "wrangler";

let cloudflareProxyPromise: Promise<Awaited<ReturnType<typeof getPlatformProxy>>> | undefined;

export default defineConfig({
    appType: "spa",
    plugins: [
        solidServerFunctions({
            serverEntry: "./src/server.tsx",
            async createRequestContext() {
                cloudflareProxyPromise ??= getPlatformProxy({
                    configPath: "./wrangler.jsonc",
                });

                const proxy = await cloudflareProxyPromise;

                return {
                    cloudflare: {
                        env: proxy.env,
                        context: proxy.ctx,
                    },
                };
            },
        }),
        solidPlugin(),
        tailwindcss(),
    ],
    resolve: {tsconfigPaths: true},
});
`;

    await writeFile(viteConfigPath, content);
}

async function updateWranglerConfig(appDir: string, appSlug: string, includeD1: boolean): Promise<void> {
    const wranglerPath = path.join(appDir, "wrangler.jsonc");
    if (!(await pathExists(wranglerPath))) {
        return;
    }
    const raw = await readFile(wranglerPath, "utf8");
    let config: Record<string, unknown>;
    try {
        config = JSON.parse(raw);
    } catch {
        return;
    }

    config.name = appSlug;

    if (includeD1) {
        config.d1_databases = [
            {
                binding: "DB",
                database_name: `${appSlug}-db`,
                database_id: "REPLACE_ME",
            },
        ];
    } else {
        delete config.d1_databases;
    }

    await writeFile(wranglerPath, JSON.stringify(config, null, 2) + "\n");
}

async function updateWorkspace(rootDir: string, appFolder: string): Promise<void> {
    const rootPkgPath = path.join(rootDir, "package.json");
    const raw = await readFile(rootPkgPath, "utf8");
    const pkg = JSON.parse(raw);

    pkg.workspaces ??= {};
    const packages: string[] = Array.isArray(pkg.workspaces.packages) ? pkg.workspaces.packages : [];
    const entry = `apps/${appFolder}`;

    if (!packages.includes("apps/*") && !packages.includes(entry)) {
        packages.push(entry);
        pkg.workspaces.packages = packages;
        await writeFile(rootPkgPath, JSON.stringify(pkg, null, 2) + "\n");
    }
}

async function promptYesNo(rl: ReturnType<typeof createInterface>, label: string, defaultValue: boolean): Promise<boolean> {
    const suffix = defaultValue ? "Y/n" : "y/N";
    const answer = (await rl.question(`${label} (${suffix}): `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    return answer === "y" || answer === "yes";
}

function printUsage(): void {
    console.log("Usage: web-cli <app-folder-name>\n");
    console.log("Creates a new app in apps/<name> based on apps/app-template.");
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    if (args.includes("-h") || args.includes("--help")) {
        printUsage();
        return;
    }

    const rl = createInterface({input: process.stdin, output: process.stdout});
    const appFolder = (args[0] ?? (await rl.question("App folder name (apps/<name>): "))).trim();
    if (!appFolder) {
        rl.close();
        throw new Error("App folder name is required.");
    }

    const appSlug = toKebab(appFolder);
    const packageName = `@web/${appSlug}`;

    const includeD1 = await promptYesNo(rl, "Include @web/d1?", true);
    const includeLins = await promptYesNo(rl, "Include @web/lins?", true);
    const includeDelta = await promptYesNo(rl, "Include @web/solid-delta?", true);

    rl.close();

    const rootDir = await findRepoRoot(process.cwd());
    const templateDir = path.join(rootDir, "apps", TEMPLATE_APP_NAME);
    const targetDir = path.join(rootDir, "apps", appFolder);

    if (await pathExists(targetDir)) {
        throw new Error(`Target directory already exists: ${targetDir}`);
    }

    await copyDir(templateDir, targetDir);

    await updatePackageJson(targetDir, packageName, includeD1, includeLins, includeDelta);
    await updateViteConfig(targetDir, includeD1);
    await updateWranglerConfig(targetDir, appSlug, includeD1);
    await updateWorkspace(rootDir, appFolder);

    console.log(`Created apps/${appFolder} from apps/${TEMPLATE_APP_NAME}.`);
    console.log(`Package name: ${packageName}`);
    if (includeD1) {
        console.log("Note: wrangler.jsonc includes database_id: REPLACE_ME.");
    }
    console.log("Done.");
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});

