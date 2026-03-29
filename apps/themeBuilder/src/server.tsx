import {createServer} from "@web/vinxi/server";

export default createServer(({scripts, assets}) => {
    return `
    <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <title>Title</title>
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
