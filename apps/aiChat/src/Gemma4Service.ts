"use server"

import {getLlama, LlamaChatSession, LlamaModel} from "node-llama-cpp";

let model: LlamaModel | undefined = undefined

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

export async function chatStream(prompt: string) {
    const model = await getLLamaModel();
    const context = await model.createContext();
    const session = new LlamaChatSession({
        contextSequence: context.getSequence()
    });

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

export async function getGreeting(prompt: string = "Hello") {
    try {
        const model = await getLLamaModel();
        const context = await model.createContext();
        const session = new LlamaChatSession({
            contextSequence: context.getSequence()
        });

        console.log("User:", prompt);
        const response = await session.prompt(prompt);

        console.log("Gemma4Service response:", response)
        return response

    } catch (e) {
        console.error(e)
        return "Something went wrong"
    }
}
