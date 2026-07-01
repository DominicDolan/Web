#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const styleDir = join(packageRoot, "style");
const templateDir = join(styleDir, "template");

const themeNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/;

function toPascalCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function transformTemplateContent(content, themeName) {
  const pascalThemeName = toPascalCase(themeName);

  return content
    .replaceAll("notTemplate", `not${pascalThemeName}`)
    .replaceAll("templateTheme", themeName)
    .replaceAll("Template", pascalThemeName)
    .replaceAll("template", themeName);
}

function validateThemeName(themeName) {
  if (!themeName) {
    return "Theme name is required.";
  }

  if (!themeNamePattern.test(themeName)) {
    return "Theme name must start with a letter and contain only letters, numbers, underscores, or hyphens.";
  }

  return undefined;
}

async function promptForThemeName() {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      const answer = (await rl.question("Theme class/directory name: ")).trim();
      const error = validateThemeName(answer);

      if (!error) {
        return answer;
      }

      console.error(error);
    }
  } finally {
    rl.close();
  }
}

async function replaceTemplateText(directory, themeName) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await replaceTemplateText(entryPath, themeName);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const originalContent = await readFile(entryPath, "utf8");
      const nextContent = transformTemplateContent(originalContent, themeName);

      if (nextContent !== originalContent) {
        await writeFile(entryPath, nextContent);
      }
    }),
  );
}

async function directoryExists(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function main() {
  const argumentName = process.argv[2]?.trim();
  const argumentError = argumentName ? validateThemeName(argumentName) : undefined;

  if (argumentError) {
    console.error(argumentError);
    process.exitCode = 1;
    return;
  }

  const themeName = argumentName || (await promptForThemeName());
  const targetDir = join(styleDir, themeName);

  if (!(await directoryExists(templateDir))) {
    console.error(`Template directory not found: ${templateDir}`);
    process.exitCode = 1;
    return;
  }

  if (await directoryExists(targetDir)) {
    console.error(`Theme directory already exists: ${targetDir}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(styleDir, { recursive: true });
  await cp(templateDir, targetDir, { recursive: true, errorOnExist: true, force: false });
  await replaceTemplateText(targetDir, themeName);

  console.log(`Created LINS theme scaffold at style/${themeName}`);
  console.log(`Theme root class: .${themeName}`);
  console.log(`Opt-out class: .not${toPascalCase(themeName)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


