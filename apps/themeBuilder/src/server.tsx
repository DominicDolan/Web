import {createServer} from "@web/vinxi/server";

export default createServer(({scripts, assets}) => {
    return `
    <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <title>Theme.Build</title>
            ${assets}
        </head>
        <body>
        <div id="app">
        </div>
        ${scripts}
        </body>
        </html>
    `
})
