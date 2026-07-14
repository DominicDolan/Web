import {createServer} from "@web/vinxi/server";

export default createServer(({scripts, assets}) => {
    return `
    <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <title>Gemma 4 Chat</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
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
