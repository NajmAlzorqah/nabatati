"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HeartPulse, Send } from "lucide-react";
import { sendPlantDoctorMessage } from "@/lib/analysis";
import { randomId } from "@/lib/utils";
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
  const [persistError, setPersistError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !scan) return;
    getChatMessages(scan.id)
      .then((msgs) => {
        setLoadError(null);
        setSendError(null);
        setPersistError(null);
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
  }, [messages, sending]);

  if (!scan) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setSendError(null);
    setPersistError(null);
    const userMsg: ChatMessage = {
      id: randomId(),
      scanId: scan.id,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const assistantMsg: ChatMessage = {
      id: randomId(),
      scanId: scan.id,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages((m) => [...m, userMsg]);
    try {
      await saveChatMessage(scan.id, "user", text);
    } catch (e) {
      setMessages((m) => m.filter((msg) => msg.id !== userMsg.id));
      setSendError(
        e instanceof Error ? e.message : "تعذّر حفظ رسالتك محليًا. حاول مرة أخرى.",
      );
      setSending(false);
      return;
    }

    const history = [...messages, userMsg];
    try {
      const reply = await sendPlantDoctorMessage(
        scan.id,
        scan.imageUrl,
        history,
        text,
      );
      assistantMsg.content = reply;
      setMessages((m) => [...m, assistantMsg]);
      await saveChatMessage(scan.id, "assistant", reply);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Something went wrong";
      setSendError(err);
      if (assistantMsg.content) {
        setPersistError("رسالة الطبيب لم تُحفظ. قد تُفقد عند إعادة التحميل.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] w-full max-w-2xl"
      >
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            <SheetTitle>الطبيب النباتي</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {scan.analysis.identification.name} · {scan.analysis.identification.scientific_name}
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start max-w-[80%] rounded-2xl rounded-br-sm bg-muted px-4 py-2.5 text-sm leading-relaxed"
          >
            مرحبًا! أنا طبيبك النباتي. اسألني أي شيء عن{" "}
            {scan.analysis.identification.name} — الري، الضوء، الآفات، أو كيفية
            معالجة المشاكل المكتشفة في هذا الفحص.
          </motion.div>

          {loadError && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              تعذّر تحميل سجل المحادثة: {loadError}
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "self-start max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
                  : "self-end max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed"
              }
            >
              {m.content}
            </div>
          ))}
          {sendError && (
            <div className="self-start max-w-[80%] rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              تعذّر إرسال رسالتك: {sendError}. حاول مرة أخرى.
            </div>
          )}
          {persistError && (
            <div className="self-start max-w-[80%] rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
              {persistError}
            </div>
          )}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-end flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3"
              role="status"
              aria-label="الطبيب النباتي يكتب…"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
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
              placeholder="اسأل الطبيب النباتي…"
              className="max-h-32 min-h-11 flex-1 resize-none"
              rows={1}
            />
            <Button
              onClick={send}
              disabled={sending || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              aria-label="إرسال رسالة"
            >
              <Send className="h-4 w-4 -scale-x-100" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
