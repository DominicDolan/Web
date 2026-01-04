import {createModelSchema} from "~/data/ModelSchemaBuilder";
import {themeDefinitionSchema} from "~/data/ThemeDefinition";


export default createModelSchema("theme_events", themeDefinitionSchema, { recreate: true })
    .build()
