#!/usr/bin/env bun

import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LINS_THEME_SPEC } from "../src/generator/index.ts";
import type { LinsDefinedTheme, LinsStylesheetId, LinsThemeDefinition } from "../src/generator/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const generatedThemesRoot = join(packageRoot, "generated", "themes");
const sharedStylesheetFileNames = ["base.css", "reset.css"] as const;
const themeIdPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;

type GeneratedTheme = LinsThemeDefinition & LinsDefinedTheme<LinsThemeDefinition>;

function printUsage(): void {
  console.log(`Usage: bun run generate-theme <path-to-theme.ts>\n\nGenerates CSS files from a defineLinsTheme() definition into:\n  generated/themes/<themeId>\n\nExamples:\n  bun run generate-theme ./style/aperture/theme.ts\n  bun ./scripts/generate-theme.ts ./style/aperture/theme.ts`);
}

function isGeneratedTheme(value: unknown): value is GeneratedTheme {
  return Boolean(
    value
      && typeof value === "object"
      && "id" in value
      && "createThemeStylesheet" in value
      && "createStylesheet" in value
      && typeof value.createThemeStylesheet === "function"
      && typeof value.createStylesheet === "function",
  );
}

function findThemeExport(moduleExports: Record<string, unknown>): GeneratedTheme | undefined {
  if (isGeneratedTheme(moduleExports.default)) {
    return moduleExports.default;
  }

  return Object.values(moduleExports).find(isGeneratedTheme);
}

function getStylesheetIds(theme: GeneratedTheme): LinsStylesheetId[] {
  if (theme.stylesheets) {
    return [...theme.stylesheets];
  }

  return LINS_THEME_SPEC.stylesheets.map((stylesheet) => stylesheet.id as LinsStylesheetId);
}

function getStylesheetFileName(stylesheetId: LinsStylesheetId): string {
  const spec = LINS_THEME_SPEC.stylesheets.find((stylesheet) => stylesheet.id === stylesheetId);

  if (!spec) {
    throw new Error(`Theme references unknown LINS stylesheet id: ${JSON.stringify(stylesheetId)}`);
  }

  return spec.fileName;
}

async function copySharedStylesheets(writtenFiles: string[]): Promise<void> {
  for (const fileName of sharedStylesheetFileNames) {
    const sourcePath = join(packageRoot, "style", fileName);
    const outputPath = join(generatedThemesRoot, fileName);

    await copyFile(sourcePath, outputPath);
    writtenFiles.push(outputPath);
  }
}

async function loadTheme(themePath: string): Promise<GeneratedTheme> {
  const resolvedThemePath = resolve(process.cwd(), themePath);
  const moduleExports = await import(pathToFileURL(resolvedThemePath).href) as Record<string, unknown>;
  const theme = findThemeExport(moduleExports);

  if (!theme) {
    throw new Error(`No defineLinsTheme() export found in ${resolvedThemePath}. Export the theme as default or as a named export.`);
  }

  if (!themeIdPattern.test(theme.id)) {
    throw new Error(`Theme id ${JSON.stringify(theme.id)} is not safe for generated output paths. Use letters, numbers, underscores, or hyphens, starting with a letter.`);
  }

  return theme;
}

async function generateTheme(theme: GeneratedTheme): Promise<string[]> {
  const outputDir = join(generatedThemesRoot, theme.id);
  const writtenFiles: string[] = [];

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await copySharedStylesheets(writtenFiles);

  const themeCssPath = join(outputDir, "theme.css");
  await writeFile(themeCssPath, theme.createThemeStylesheet(), "utf8");
  writtenFiles.push(themeCssPath);

  for (const stylesheetId of getStylesheetIds(theme)) {
    const fileName = getStylesheetFileName(stylesheetId);
    const filePath = join(outputDir, fileName);

    await writeFile(filePath, theme.createStylesheet(stylesheetId), "utf8");
    writtenFiles.push(filePath);
  }

  return writtenFiles;
}

async function main(): Promise<void> {
  const [themePath, ...extraArgs] = process.argv.slice(2);

  if (!themePath || themePath === "--help" || themePath === "-h") {
    printUsage();
    process.exitCode = themePath ? 0 : 1;
    return;
  }

  if (extraArgs.length > 0) {
    throw new Error(`Unexpected arguments: ${extraArgs.join(" ")}`);
  }

  const theme = await loadTheme(themePath);
  const writtenFiles = await generateTheme(theme);

  console.log(`Generated LINS theme CSS for ${theme.name} (${theme.id})`);
  console.log(`Output: generated/themes/${theme.id}`);

  for (const file of writtenFiles) {
    console.log(`- ${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

