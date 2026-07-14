export interface ServerInfo {
    sw_version: string;
    api_version: number;
    name: string;
    capabilities: Capability[];
}

type Capability =
    | "caclient"
    | "tvadapters"
    | "satip_client"
    | "satip_server"
    | "trace"
    | "libav";
