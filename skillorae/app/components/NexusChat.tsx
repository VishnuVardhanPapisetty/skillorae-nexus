"use client";

import { useState, type FormEvent } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatSkillGap = {
  skill: string;
  readiness: number;
  gap: number;
};

type NexusChatProps = {
  careerName: string;
  skillGaps: ChatSkillGap[];
};

export default function NexusChat({ careerName, skillGaps }: NexusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();

    if (!content || pending) return;

    const nextMessages = messages.concat({ role: "user", content }).slice(-12);

    setMessages(nextMessages);
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/nexus-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: nextMessages,
          context: { careerName, skillGaps },
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "NEXUS chat is temporarily unavailable.",
        );
      }

      if (typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error("NEXUS returned an empty response. Please try again.");
      }

      setMessages(
        nextMessages
          .concat({ role: "assistant", content: result.reply.trim() })
          .slice(-12),
      );
      setInput("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "NEXUS chat is temporarily unavailable. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="mb-10 rounded-2xl border border-cyan-400/20 bg-slate-900 p-5 sm:p-7"
      aria-labelledby="nexus-chat-heading"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
          NEXUS · Student chat
        </p>
        <h2 id="nexus-chat-heading" className="mt-2 text-2xl font-bold">
          Ask about your next step
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Get guidance using your mapped study area and the career/skill-gap
          context shown on this dashboard. The conversation is not saved to your
          account.
        </p>
      </header>

      <div
        className="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation with NEXUS"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ask a question about {careerName || "your career direction"}, a
            skill gap, or a practical learning plan.
          </p>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${index}-${message.role}`}
              className={`max-w-[90%] rounded-xl border p-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto border-blue-400/30 bg-blue-500/10 text-slate-100"
                  : "border-cyan-400/20 bg-cyan-400/[0.06] text-slate-200"
              }`}
            >
              <p className="mb-1 text-xs font-semibold text-slate-400">
                {message.role === "user" ? "You" : "NEXUS"}
              </p>
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </article>
          ))
        )}
        {pending && (
          <p className="text-sm text-cyan-200" role="status">
            NEXUS is thinking...
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={sendMessage} className="mt-4 space-y-3">
        <label htmlFor="nexus-chat-message" className="sr-only">
          Message NEXUS
        </label>
        <textarea
          id="nexus-chat-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={1200}
          rows={3}
          disabled={pending}
          placeholder="Ask a question..."
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 disabled:opacity-60"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Messages are sent to Gemini for a response.
          </p>
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
}
