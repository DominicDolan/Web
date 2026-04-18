import {createServer} from "@web/server-functions/server";

export default createServer(async (event) => {
    const url = new URL(event.request.url)

    if (url.pathname === '/api/health' && event.request.method === 'GET') {
        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'content-type': 'application/json' },
        })
    }
})
