import {eventHandler} from "vinxi/server";
// @ts-ignore
import {getManifest} from "vinxi/manifest";
// @ts-ignore
import {renderAsset} from "./src/app/renderAsset";

export default eventHandler((async (event) => {

    const clientManifest = getManifest("client")

    const assets = await clientManifest.inputs[clientManifest.handler].assets();
    const manifestJson = await clientManifest.json();

    if (event.path === "/") {
        event.node.res.setHeader("Content-Type", "text/html");
        return `<html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <title>Title</title>
            ${assets.map((m) => renderAsset(m)).join("\n")}
            <script type="module" src=${clientManifest.inputs[clientManifest.handler].output.path}></script>
            <script>
            window.manifest = ${JSON.stringify(manifestJson)};
            </script>
        </head>
        <body>
        <div id="app">
        </div>
        </body>
        </html>`
    }
}));
