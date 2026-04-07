import { createSignal, For, Show, Loading, createStore } from "solid-js";
import { chatStream } from "~/Gemma4Service";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function App() {
  const [input, setInput] = createSignal("");
  const [isStreaming, setIsStreaming] = createSignal(false);

  const [messages, setMessages] = createStore<Message[]>([])

  async function fetchChatStream(prompt: string) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    // 1. Get the stream reader
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader found");

    const decoder = new TextDecoder();
    let resultText = "";

    const newMessageIndex = messages.length;

    setMessages((prevMessages) => {
      prevMessages[newMessageIndex] = {role: "assistant", content: ""};
    });
    // 2. Loop until the stream is finished
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // 3. Decode the Uint8Array chunk into a string
      const chunk = decoder.decode(value, { stream: true });

      // 4. Update your UI state here
      resultText += chunk;
      console.log("Current stream state:", resultText);

      // If using React/Solid, you'd call setMessages(...) here
      setMessages((prevMessages) => {
        prevMessages[newMessageIndex].content += chunk;
      });
    }
  }


  const sendMessage = async (e: SubmitEvent) => {
    e.preventDefault();
    const prompt = input();
    if (!prompt.trim() || isStreaming()) return;

    setInput("");
    const userMessage: Message = { role: "user", content: prompt };
    setMessages((m) => [...m, userMessage]);
    setIsStreaming(true);

    try {
      await fetchChatStream(prompt);
    } catch (err) {
      console.error("Error during chat stream:", err);
      setMessages((m) => [...m, { role: "assistant", content: "Error: Could not connect to the model." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div class="flex flex-col h-screen bg-gray-50 font-sans">
      <header class="bg-blue-600 text-white p-4 shadow-md">
        <h1 class="text-xl font-bold">Gemma 4 AI Chat</h1>
      </header>

      <main class="flex-1 overflow-y-auto p-4 space-y-4">
        <Loading fallback={<div class="text-center p-4">Loading model...</div>}>
          <For each={messages}>
            {(msg) => (
              <div class={`flex ${msg().role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  class={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                    msg().role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <div class="text-xs font-semibold opacity-70 mb-1">
                    {msg().role === "user" ? "You" : "Gemma"}
                  </div>
                  <div class="whitespace-pre-wrap">{msg().content}</div>
                </div>
              </div>
            )}
          </For>
        </Loading>

        <Show when={isStreaming() && messages[messages.length - 1]?.content === ""}>
          <div class="flex justify-start">
            <div class="bg-white border border-gray-200 p-3 rounded-lg animate-pulse text-gray-400">
              Thinking...
            </div>
          </div>
        </Show>
      </main>

      <footer class="p-4 bg-white border-t">
        <form onSubmit={sendMessage} class="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            placeholder="Type your message here..."
            class="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming()}
            autofocus
          />
          <button
            type="submit"
            disabled={isStreaming() || !input().trim()}
            class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isStreaming() ? "..." : "Send"}
          </button>
        </form>
      </footer>
    </div>
  );
}
