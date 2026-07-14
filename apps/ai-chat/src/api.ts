import {eventHandler, readBody} from "vinxi/http";

import {getLlama, LlamaChatSession, LlamaModel} from "node-llama-cpp";

let model: LlamaModel | undefined = undefined

const sessions = new Map<string, LlamaChatSession>();

export async function getLLamaModel() {
    if (model == undefined) {
        const llama = await getLlama("lastBuild");
        model = await llama.loadModel({
            // Point this to your Gemma 4 GGUF file
            modelPath: "/home/doghouse/Source/ai/models/gemma-4-E2B.gguf"
        })
    }
    return model;
}

export async function chatStream(sessionId: string, prompt: string) {
    const model = await getLLamaModel();
    const context = await model.createContext();
    let session = sessions.get(sessionId);

    if (!session) {
        session = new LlamaChatSession({
            contextSequence: context.getSequence()
        });
        sessions.set(sessionId, session);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                await session.prompt(prompt, {
                    onToken: (tokens) => {
                        const text = model.detokenize(tokens);
                        controller.enqueue(encoder.encode(text));
                    }
                });
                controller.close();
            } catch (e) {
                console.error("Error in chatStream:", e);
                controller.error(e);
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}


export default eventHandler(async (event) => {
    if (event.method === "POST" && event.path.startsWith("/chat")) {
        const body = await readBody(event) as { prompt: string, sessionId: string };
        return chatStream(body.sessionId, body.prompt);
    }

    return new Response("404");
});
