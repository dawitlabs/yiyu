"use client";

import { type SubmitEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  username: string;
  content: string;
};

export function LiveChat({ channelHandle }: { channelHandle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082";
    const wsUrl = `${apiUrl.replace(/^http/, "ws")}/ws/live/${channelHandle}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const message: { username: string; content: string } = JSON.parse(
        event.data,
      );
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), ...message },
      ]);
    };

    return () => ws.close();
  }, [channelHandle]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, []);

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const ws = wsRef.current;
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify({ content: input }));
    setInput("");
  }

  return (
    <div className="flex h-[500px] flex-col rounded-lg border border-black/10 dark:border-white/10">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <p key={m.id} className="text-sm">
            <span className="font-medium">{m.username}</span>{" "}
            <span className="text-black/80 dark:text-white/80">
              {m.content}
            </span>
          </p>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-black/10 border-t p-2 dark:border-white/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? "Say something" : "Connecting…"}
          disabled={!isConnected}
          className="flex-1 rounded-full border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={!isConnected || !input.trim()}
          className="rounded-full bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
