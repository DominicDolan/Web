import {eventHandler} from "vinxi/server";
// @ts-ignore
import {getManifest} from "vinxi/manifest";
// @ts-ignore
import {renderAssetToString} from "./renderAsset.js";

export function createServer(factory: (props: { assets: string, scripts: string, children: string }) => string) {
    return eventHandler(async (event) => {
        const clientManifest = getManifest("client")

        const clientAssets = await clientManifest.inputs[clientManifest.handler].assets();
        const manifestJson = await clientManifest.json();

        event.node.res.setHeader("Content-Type", "text/html");

        const clientAssetScripts = clientAssets
            .filter((m: any) => m.tag === "script")
            .map((m: any) => renderAssetToString(m)).join("\n")
        const otherAssets = clientAssets
                .filter((m: any) => m.tag === "link" || m.tag === "style")
                .map((m: any) => renderAssetToString(m)).join("\n")


        const scripts = `
    ${clientAssetScripts}
    <script type="module" src=${clientManifest.inputs[clientManifest.handler].output.path}></script>
    <script>window.manifest = ${JSON.stringify(manifestJson)};</script>`

        return factory({
            scripts,
            assets: otherAssets,
            children: ""
        })
    })

}

