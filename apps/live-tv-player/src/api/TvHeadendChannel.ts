export interface TvHeadendChannelGridModel {
    uuid: string;
    enabled: boolean;
    autoname: boolean;
    name: string;
    number: number;
    icon: string; // Typically a local file URI
    icon_public_url: string;
    epgauto: boolean;
    epglimit: number;
    epggrab: any[]; // Empty in example; likely string[] for grabber IDs
    dvr_pre_time: number;
    dvr_pst_time: number;
    epg_running: number;
    /** Array of Service UUIDs */
    services: string[];
    /** Array of Tag UUIDs */
    tags: string[];
    bouquet: string;
}

export interface TvHeadendChannelListModel {
    key: string
    val: string
}
