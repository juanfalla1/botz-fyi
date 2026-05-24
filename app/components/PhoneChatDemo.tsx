"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Sender = "client" | "bot";
type RowType = "typing" | "message";

type ChatMessage = {
  sender: Sender;
  text: string;
  avatar?: string;
};

type ChatRow = {
  sender: Sender;
  text: string;
  avatar?: string;
  delay: number;
  type: RowType;
};

type ChatBubbleProps = {
  sender: Sender;
  text: string;
  avatar?: string;
  delay: number;
  type: RowType;
  visible: boolean;
};

function ChatBubble({ sender, text, avatar, delay, type, visible }: ChatBubbleProps) {
  if (!visible) return null;
  if (type === "typing") {
    return (
      <div className={`btzm-msg btzm-msg-${sender} btzm-typing`} style={{ animationDelay: `${delay}ms` }}>
        {sender === "client" && avatar ? <img src={avatar} alt="client avatar" className="btzm-msg-avatar" /> : null}
        <span className="btzm-typing-dots"><i /><i /><i /></span>
      </div>
    );
  }

  return (
    <div className={`btzm-msg btzm-msg-${sender}`} style={{ animationDelay: `${delay}ms` }}>
      {sender === "client" && avatar ? <img src={avatar} alt="client avatar" className="btzm-msg-avatar" /> : null}
      {sender === "bot" && avatar ? <img src={avatar} alt="bot avatar" className="btzm-msg-avatar btzm-bot-avatar" /> : null}
      <p>{text}</p>
    </div>
  );
}

type Props = {
  messages: ChatMessage[];
  actions: string[];
  botAvatar?: string;
};

export default function PhoneChatDemo({ messages, actions, botAvatar }: Props) {
  const [step, setStep] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo<ChatRow[]>(() => {
    const items: ChatRow[] = [];
    for (const msg of messages) {
      if (msg.sender === "bot") {
        items.push({ sender: "bot", text: "", avatar: botAvatar, delay: 0, type: "typing" });
      }
      items.push({ sender: msg.sender, text: msg.text, avatar: msg.sender === "bot" ? botAvatar : msg.avatar, delay: 0, type: "message" });
    }
    return items.map((row, idx) => ({ ...row, delay: idx * 80 }));
  }, [messages, botAvatar]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const run = (index: number) => {
      if (cancelled) return;
      setStep(index);
      if (index < rows.length) {
        const current = rows[index];
        const wait = current.type === "typing" ? 850 : 1250;
        timeoutId = setTimeout(() => run(index + 1), wait);
      } else {
        timeoutId = setTimeout(() => run(0), 1800);
      }
    };

    run(0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [rows]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [step]);

  const showActions = step >= rows.length;
  const progressPct = Math.max(10, Math.min(100, Math.round((step / Math.max(rows.length, 1)) * 100)));

  return (
    <>
      <div className="btzm-chat-scroll" ref={scrollerRef}>
        {rows.map((row, idx) => (
          <ChatBubble
            key={`${idx}-${row.type}`}
            sender={row.sender}
            text={row.text}
            avatar={row.avatar}
            delay={row.delay}
            type={row.type}
            visible={idx < step}
          />
        ))}
      </div>
      <div className="btzm-progress"><span style={{ width: `${progressPct}%` }} /></div>
      <div className={`btzm-actions ${showActions ? "btzm-actions-show" : ""}`}>
        {actions.map((action) => (
          <button key={action}>{action}</button>
        ))}
      </div>
    </>
  );
}
