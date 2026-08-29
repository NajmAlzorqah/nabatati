"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HeartPulse, Send } from "lucide-react";
import { sendPlantDoctorMessage } from "@/lib/analysis";
import { getChatMessages, saveChatMessage } from "@/lib/db";
import type { ChatMessage, ScanResult } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function PlantDoctorChat({
  open,
  onOpenChange,
  scan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scan: ScanResult | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !scan) return;
    getChatMessages(scan.id)
      .then((msgs) => {
        setLoadError(null);
        setSendError(null);
        setMessages(msgs);
      })
      .catch((e) => {
        const err = e instanceof Error ? e.message : "Could not load chat history";
        setLoadError(err);
        setMessages([]);
      });
  }, [open, scan]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!scan) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setSendError(null);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      scanId: scan.id,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    saveChatMessage(scan.id, "user", text).catch((e) => {
      console.error("Failed to save user chat message:", e);
    });
    const history = [...messages, userMsg];
    try {
      const reply = await sendPlantDoctorMessage(
        scan.id,
        scan.imageUrl,
        history,
        text,
      );
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        scanId: scan.id,
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, assistantMsg]);
      saveChatMessage(scan.id, "assistant", reply).catch((e) => {
        console.error("Failed to save assistant chat message:", e);
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : "Something went wrong";
      setSendError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh]">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-[#15803d]" />
            <SheetTitle>Plant Doctor</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {scan.analysis.identification.name} · {scan.analysis.identification.scientific_name}
          </p>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed"
          >
            Hi, I&apos;m your Plant Doctor. Ask me anything about{" "}
            {scan.analysis.identification.name} - watering, light, pests, or how to
            treat the issues in this scan.
          </motion.div>

          {loadError && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Could not load chat history: {loadError}
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "self-end max-w-[80%] rounded-2xl rounded-br-sm bg-[#15803d] px-4 py-2.5 text-sm leading-relaxed text-white"
                  : "self-start max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed"
              }
            >
              {m.content}
            </div>
          ))}
          {sendError && (
            <div className="self-start max-w-[80%] rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Could not send your message: {sendError}. Please try again.
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask the Plant Doctor…"
              className="max-h-32 min-h-11 flex-1 resize-none"
              rows={1}
            />
            <Button
              onClick={send}
              disabled={sending || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
