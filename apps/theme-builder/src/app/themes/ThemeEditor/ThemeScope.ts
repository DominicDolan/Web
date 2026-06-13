import {createScopeProvider} from "@web/solid-scope";
import {ThemeDefinition} from "~/models/ThemeDefinition";

export const ThemeScope = createScopeProvider<{
    theme: ThemeDefinition
}>()

