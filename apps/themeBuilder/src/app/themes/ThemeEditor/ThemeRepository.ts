"use server"

import {ThemeDefinition, themeDefinitionSchema} from "~/models/ThemeDefinition";
import {useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/solid-delta";

export function getThemesMocked(): Promise<ThemeDefinition[]> {

    const exampleThemes = [
        {
            id: "oceanBreeze-id",
            name: "Ocean Breeze",
            class: "oceanBreeze",
            description: "A light theme inspired by calm ocean waters with soft blue tones",
            mode: "light" as const,
            updatedAt: new Date("2026-03-01T00:00:00Z").getTime(),
        },
        {
            id: "midnightCode-id",
            name: "Midnight Code",
            class: "midnightCode",
            description: "A dark theme optimized for long coding sessions with reduced eye strain",
            mode: "dark" as const,
            updatedAt: new Date("2026-03-10T00:00:00Z").getTime(),
        }
    ]
    return new Promise((resolve) => setTimeout(() => resolve(exampleThemes), 500))
}

export async function getThemesDeltas() {
    const db = useDatabaseTable(themeDefinitionSchema)

    return (await db.getAll()) as ModelDelta<ThemeDefinition>[]
}

export async function saveTheme(themeDeltas: ModelDelta<ThemeDefinition>[]) {
    const db = useDatabaseTable(themeDefinitionSchema)
    await db.insert(themeDeltas)
}
