"use server"

import {getEvent} from "@web/server-functions/server";

type CloudflareContext = {
    cloudflare?: {
        env?: Record<string, string | undefined>;
    };
};

export type OpenRouterProofResult = {
    model: string;
    text: string;
};

type OpenRouterChatCompletionResponse = {
    id?: string;
    model?: string;
    choices?: Array<{
        message?: {
            content?: string | Array<{type?: string; text?: string}> | null;
            reasoning?: string | null;
            refusal?: string | null;
        };
        finish_reason?: string | null;
        native_finish_reason?: string | null;
    }>;
    error?: {
        message?: string;
        code?: string | number;
    };
};

type ParsedOpenRouterResponse = {
    body: OpenRouterChatCompletionResponse;
    rawText: string;
};

type OpenRouterAssistantContent = string | Array<{type?: string; text?: string}> | null | undefined;

const OPEN_ROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPEN_ROUTER_MODEL_ID = "moonshotai/kimi-k2.6";
const OPEN_ROUTER_PROOF_PROMPT = "Reply with one short sentence confirming that the air-prompt server function reached OpenRouter directly.";

export async function runOpenRouterProof(): Promise<OpenRouterProofResult> {
    const apiKey = getOpenRouterApiKey();
    const response = await fetch(OPEN_ROUTER_API_URL, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "air-prompt OpenRouter proof",
        },
        body: JSON.stringify({
            model: OPEN_ROUTER_MODEL_ID,
            messages: [
                {role: "user", content: OPEN_ROUTER_PROOF_PROMPT},
            ],
            max_tokens: 80,
            temperature: 0,
        }),
    });

    const {body: result, rawText} = await readOpenRouterResponse(response);

    if (!response.ok) {
        throw new Error(getOpenRouterErrorMessage(response, result, rawText));
    }

    const text = getAssistantText(result);

    if (!text) {
        throw new Error(getMissingAssistantTextMessage(result, rawText));
    }

    return {
        model: result.model ?? OPEN_ROUTER_MODEL_ID,
        text,
    };
}

async function readOpenRouterResponse(response: Response): Promise<ParsedOpenRouterResponse> {
    const rawText = await response.text();

    try {
        return {
            body: JSON.parse(rawText) as OpenRouterChatCompletionResponse,
            rawText,
        };
    } catch {
        return {body: {}, rawText};
    }
}

function getAssistantText(result: OpenRouterChatCompletionResponse) {
    const message = result.choices?.[0]?.message;
    const contentText = getContentText(message?.content);

    if (contentText) {
        return contentText;
    }

    return message?.reasoning?.trim() ?? "";
}

function getContentText(content: OpenRouterAssistantContent) {
    if (!content) {
        return "";
    }

    if (typeof content === "string") {
        return content.trim();
    }

    return content
        .map((part) => part.text)
        .filter((text): text is string => Boolean(text))
        .join("")
        .trim();
}

function getOpenRouterErrorMessage(response: Response, result: OpenRouterChatCompletionResponse, rawText: string) {
    const detail = result.error?.message || truncate(rawText, 500) || response.statusText;
    const code = result.error?.code ? ` (${result.error.code})` : "";

    return `OpenRouter request failed with status ${response.status}${code}: ${detail}`;
}

function getMissingAssistantTextMessage(result: OpenRouterChatCompletionResponse, rawText: string) {
    const firstChoice = result.choices?.[0];
    const messageKeys = firstChoice?.message ? Object.keys(firstChoice.message).join(", ") : "none";
    const details = [
        `id=${result.id ?? "unknown"}`,
        `model=${result.model ?? OPEN_ROUTER_MODEL_ID}`,
        `choices=${result.choices?.length ?? 0}`,
        `finish_reason=${firstChoice?.finish_reason ?? firstChoice?.native_finish_reason ?? "unknown"}`,
        `message_keys=${messageKeys}`,
    ].join("; ");

    return `OpenRouter returned a successful response but no assistant text. ${details}. Raw response: ${truncate(rawText, 1000) || "<empty>"}`;
}

function truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
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






