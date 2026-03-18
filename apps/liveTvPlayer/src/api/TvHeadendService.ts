interface TvHeadendService {
    uuid: string;
    id: string;
    text: string;
    caption: string;
    class: string;
    event: string;
    params: ServiceParameter[];
}

/**
 * Discriminated union for the different parameter types
 * found in the Tvheadend API.
 */
type ServiceParameter =
    | StringParameter
    | NumberParameter
    | BooleanParameter;

interface BaseParameter {
    id: string;
    caption: string;
    description: string;
    advanced?: boolean;
    expert?: boolean;
    hidden?: boolean;
    rdonly?: boolean;
    nosave?: boolean;
    list?: number;
}

interface StringParameter extends BaseParameter {
    type: "str";
    default?: string;
    value: string | string[]; // Handles cases like the "channel" list
    enum?: EnumOption[] | ApiEnum;
}

interface NumberParameter extends BaseParameter {
    type: "int";
    default?: number;
    value: number;
    enum?: EnumOption[];
}

interface BooleanParameter extends BaseParameter {
    type: "bool";
    default?: boolean;
    value: boolean;
}

interface EnumOption {
    key: number | string;
    val: string;
}

interface ApiEnum {
    type: "api";
    uri: string;
    event: string;
    params: Record<string, any>;
}
