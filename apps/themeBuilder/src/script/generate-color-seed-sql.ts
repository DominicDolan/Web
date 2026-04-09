import { readFileSync, writeFileSync } from "node:fs";

type ColorRecord = {
    name: string;
    key: string;
    hex: string;
    group: string;
    shade: string | null;
};

type SeedColorRecord = ColorRecord & {
    source: "tailwind" | "material";
    redness: number;
    greenness: number;
    blueness: number;
    lightness: number;
};

const tailwindPath =
    process.argv[2] ?? "apps/themeBuilder/src/script/tailwind-colors.json";
const materialPath =
    process.argv[3] ?? "apps/themeBuilder/src/script/material-colors.json";
const outputPath =
    process.argv[4] ?? "apps/themeBuilder/src/script/color-palettes.seed.sql";

function parseHex(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.trim().replace(/^#/, "");

    if (normalized.length === 3) {
        const r = Number.parseInt(normalized[0] + normalized[0], 16);
        const g = Number.parseInt(normalized[1] + normalized[1], 16);
        const b = Number.parseInt(normalized[2] + normalized[2], 16);
        return { r, g, b };
    }

    if (normalized.length === 6) {
        const r = Number.parseInt(normalized.slice(0, 2), 16);
        const g = Number.parseInt(normalized.slice(2, 4), 16);
        const b = Number.parseInt(normalized.slice(4, 6), 16);
        return { r, g, b };
    }

    throw new Error(`Unsupported hex color: ${hex}`);
}

function getLightness(r: number, g: number, b: number): number {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    return (max + min) / 2;
}

function escapeSql(value: string): string {
    return value.replace(/'/g, "''");
}

function parseJsonColors(path: string): ColorRecord[] {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as ColorRecord[];
    return parsed;
}

function toSeedRecord(
    source: "tailwind" | "material",
    record: ColorRecord,
): SeedColorRecord {
    const { r, g, b } = parseHex(record.hex);
    return {
        ...record,
        source,
        redness: r,
        greenness: g,
        blueness: b,
        lightness: getLightness(r, g, b),
    };
}

const tailwindColors = parseJsonColors(tailwindPath).map((color) =>
    toSeedRecord("tailwind", color),
);
const materialColors = parseJsonColors(materialPath).map((color) =>
    toSeedRecord("material", color),
);

const colors = [...tailwindColors, ...materialColors].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.shade === null && b.shade !== null) return -1;
    if (a.shade !== null && b.shade === null) return 1;
    return (a.shade ?? "").localeCompare(b.shade ?? "");
});

const rows = colors
    .map((color) => {
        const shade = color.shade === null ? "NULL" : `'${escapeSql(color.shade)}'`;
        return `(
  '${escapeSql(color.source)}',
  '${escapeSql(color.group)}',
  '${escapeSql(color.name)}',
  ${shade},
  '${escapeSql(color.key)}',
  '${escapeSql(color.hex)}',
  ${color.redness},
  ${color.greenness},
  ${color.blueness},
  ${color.lightness}
)`;
    })
    .join(",\n");

const sql = `-- Generated file. Do not edit by hand.
-- Source: apps/themeBuilder/src/script/generate-color-seed-sql.ts

INSERT OR IGNORE INTO "color_palettes" (
  "source",
  "group_name",
  "color_name",
  "shade",
  "color_key",
  "hex_value",
  "redness",
  "greenness",
  "blueness",
  "lightness"
)
VALUES
${rows};
`;

writeFileSync(outputPath, sql, "utf8");

console.log(`Wrote ${colors.length} rows to ${outputPath}`);
