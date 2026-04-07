import {eventHandler, readBody} from "vinxi/http";
import {chatStream} from "./Gemma4Service";

export default eventHandler(async (event) => {
    if (event.method === "POST" && event.path.startsWith("/chat")) {
        const body = await readBody(event) as { prompt: string };
        return chatStream(body.prompt);
    }

    return new Response("404");
});
