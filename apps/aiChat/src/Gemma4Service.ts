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


export async function getGreeting(prompt: string = "Hello") {

    try {
        const model = await getLLamaModel();
        const context = await model.createContext();
        const session = new LlamaChatSession({
            contextSequence: context.getSequence()
        });

        console.log("User:", prompt);
        const response = await session.prompt(prompt);

        console.log("Gemma4Service")
        return response

    } catch (e) {
        console.error(e)
        return "Something went wrong"
    }
}
