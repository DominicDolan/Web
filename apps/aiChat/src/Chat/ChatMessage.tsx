import {marked} from "marked";
import {createMemo} from "solid-js";


export function ChatMessage(props: { message: string, role: "user" | "assistant"}) {

    const content = createMemo(() => marked.parse(props.message))
    return <div class={`flex ${props.role === "user" ? "justify-end" : "justify-start"}`}>
        <div
            class={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                props.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
            }`}
        >
            <div class="text-xs font-semibold opacity-70 mb-1">
                {props.role === "user" ? "You" : "Gemma"}
            </div>
            <div class="whitespace-pre-wrap" innerHTML={content()}></div>
        </div>
    </div>
}
