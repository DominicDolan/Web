"use server"

import {AuthStorage, createAgentSession, ModelRegistry, SessionManager, SettingsManager} from "@earendil-works/pi-coding-agent";
import {getEvent} from "@web/server-functions/server";

type CloudflareContext = {
    cloudflare?: {
        env?: Record<string, string | undefined>;
    };
};

export type PiProofResult = {
    model: string;
    text: string;
};

const PI_PROOF_PROVIDER = "openrouter";
const PI_PROOF_MODEL_ID = "moonshotai/kimi-k2.6";
const PI_PROOF_PROMPT = "Reply with one short sentence confirming that the Pi coding agent SDK reached OpenRouter from the air-prompt server function.";

export async function runPiOpenRouterProof(): Promise<PiProofResult> {
    const apiKey = getOpenRouterApiKey();
    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(PI_PROOF_PROVIDER, apiKey);

    const modelRegistry = ModelRegistry.inMemory(authStorage);
    const model = modelRegistry.find(PI_PROOF_PROVIDER, PI_PROOF_MODEL_ID);

    if (!model) {
        throw new Error(`Unable to resolve the OpenRouter proof model ${PI_PROOF_PROVIDER}/${PI_PROOF_MODEL_ID}.`);
    }

    const {session} = await createAgentSession({
        authStorage,
        modelRegistry,
        model,
        thinkingLevel: "off",
        noTools: "all",
        sessionManager: SessionManager.inMemory(process.cwd()),
        settingsManager: SettingsManager.inMemory({
            compaction: {enabled: false},
            retry: {enabled: false},
        }),
    });

    let text = "";
    const unsubscribe = session.subscribe((event) => {
        if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
            text += event.assistantMessageEvent.delta;
        }
    });

    try {
        await session.prompt(PI_PROOF_PROMPT);
    } finally {
        unsubscribe();
        session.dispose();
    }

    return {
        model: `${model.provider}/${model.id}`,
        text: text.trim() || "Pi SDK call completed, but no text delta was streamed.",
    };
}

function getOpenRouterApiKey() {
    const event = getEvent<unknown, unknown, CloudflareContext>();
    const env = event.context?.cloudflare?.env;
    const viteEnv = (import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
    }).env;
    const processEnv = (globalThis as typeof globalThis & {
        process?: {env?: Record<string, string | undefined>};
    }).process?.env;
    const apiKey = env?.["OPEN_ROUTER_API_KEY"]
        ?? env?.["OPENROUTER_API_KEY"]
        ?? viteEnv?.["OPEN_ROUTER_API_KEY"]
        ?? viteEnv?.["OPENROUTER_API_KEY"]
        ?? processEnv?.["OPEN_ROUTER_API_KEY"]
        ?? processEnv?.["OPENROUTER_API_KEY"];

    if (!apiKey) {
        throw new Error("OpenRouter API key is not configured on the server.");
    }

    return apiKey;
}





