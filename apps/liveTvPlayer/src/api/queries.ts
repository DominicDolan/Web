import {ServerInfo} from "~/api/ServerInfo";
import {TvHeadendChannelGridModel, TvHeadendChannelListModel} from "~/api/TvHeadendChannel";

const baseUrl = "http://192.168.0.98:9981/api"
const headers = new Headers();
headers.set('Authorization', 'Basic ' + btoa("admin" + ":" + "d"));

function stringifyValues(obj: Record<string, string | number>) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        return { ...acc, [key]: String(value) };
    }, {} as Record<string, string>)
}

async function getJson<T>(path: string, params: Record<string, string | number> = {}) {
    const stringifiedParams = stringifyValues(params)
    const res = await fetch(`${baseUrl}${path}?${new URLSearchParams(stringifiedParams)}`, {
        headers,
        method: "GET",
    })

    if (res.ok) {
        return await res.json() as T
    }
}

export const queries = {
    server: {
        info: async function () {
            return getJson<ServerInfo>("/serverinfo")
        }
    },
    channels: {
        grid: async function () {
            return getJson<{ entries: TvHeadendChannelGridModel[], total: number }>("/channel/grid", {
                start: 0,
                limit: 10,
            })
        },
        list: async function () {
            return getJson<{ entries: TvHeadendChannelListModel[] }>("/channel/list", {
                start: 0,
                limit: 10,
            })
        },
    },
    epg: {
        events: async function () {
            return getJson<any>("/epg/events/grid", {
                start: 0,
                limit: 10,
            })
        }
    },
    services: {
        list: async function () {
            return getJson<{ entries: TvHeadendService[] }>("/service/list", {
                start: 0,
                limit: 1,
            })
        }
    }
}
