import {TypefaceDefinition} from "~/models/TypefaceDefinition";
import {TypefaceRole, TypefaceSize} from "~/constants/TypefaceRoles";

export function getSizeSuffix(size: TypefaceSize) {
    if (size === "small") return "Sm"
    if (size === "large") return "Lg"
    return ""
}

export function getTypefaceSelector(role: TypefaceRole, size: TypefaceSize, type: TypefaceDefinition["type"]) {
    return `.${role + getSizeSuffix(size) + (type === "variant" ? ".variant" : "")}`
}
