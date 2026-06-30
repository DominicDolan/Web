import {TypefaceDefinition} from "~/models/TypefaceDefinition";
import {TypefaceRole, TypefaceSize} from "~/constants/TypefaceRoles";

export function getTypefaceSelector(role: TypefaceRole, type: TypefaceDefinition["type"]) {
    return `.${role + (type === "variant" ? ".variant" : "")}`
}
