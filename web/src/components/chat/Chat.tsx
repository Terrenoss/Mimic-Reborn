import { useEffect, useRef, useState } from "react";
import { lcu } from "../../lib/lcu";
import { useT } from "../../lib/i18n";
import { memberName, useMemberNames } from "../../lib/summoner-names";
import "./chat.css";

// League chat, scoped to one conversation type (lobby or champ select).
// Kept deliberately small: a floating button with an unread badge, and a
// bottom sheet with the last messages — the UI stays out of the way.

/** Chat messages worth displaying (skips join/leave system noise). */
function isDisplayable(message: any): boolean {
    return (message.type === "chat" || message.type === "groupchat") && !!message.body;
}

export default function Chat(props: { types: string[]; className?: string }) {
    const [conversation, setConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(0);
    const [draft, setDraft] = useState("");
    const [selfId, setSelfId] = useState<number | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const t = useT();

    useEffect(() => {
        lcu.get("/lol-summoner/v1/current-summoner").then(r => {
            if (r.status === 200) setSelfId(r.content.summonerId);
        });
    }, []);

    // Track the conversation for our context (it appears/disappears with the
    // lobby or champ select itself).
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            const result = await lcu.get("/lol-chat/v1/conversations");
            if (cancelled) return;
            if (result.status === 200 && Array.isArray(result.content)) {
                setConversation(result.content.find((c: any) => props.types.includes(c.type)) ?? null);
            } else {
                setConversation(null);
            }
        };
        tick();
        const interval = setInterval(tick, 5000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [props.types.join(",")]);

    // Poll messages while a conversation exists (faster when the panel is open).
    useEffect(() => {
        if (!conversation) {
            setMessages([]);
            return;
        }
        let cancelled = false;
        const tick = async () => {
            const result = await lcu.get(`/lol-chat/v1/conversations/${encodeURIComponent(conversation.id)}/messages`);
            if (cancelled || result.status !== 200 || !Array.isArray(result.content)) return;
            setMessages(result.content.filter(isDisplayable));
        };
        tick();
        const interval = setInterval(tick, open ? 2000 : 5000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [conversation?.id, open]);

    // While open, everything is considered read; scroll follows new messages.
    useEffect(() => {
        if (open) {
            setSeen(messages.length);
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        }
    }, [open, messages.length]);

    useMemberNames(messages.map(m => ({ summonerId: m.fromSummonerId })));

    if (!conversation) return null;

    const unread = Math.max(0, messages.length - seen);

    const send = async () => {
        const body = draft.trim();
        if (!body) return;
        setDraft("");
        await lcu.post(`/lol-chat/v1/conversations/${encodeURIComponent(conversation.id)}/messages`, { body });
        const result = await lcu.get(`/lol-chat/v1/conversations/${encodeURIComponent(conversation.id)}/messages`);
        if (result.status === 200 && Array.isArray(result.content)) {
            setMessages(result.content.filter(isDisplayable));
        }
    };

    return (
        <>
            <button className={"chat-fab " + (props.className ?? "")} onClick={() => setOpen(v => !v)}>
                💬
                {!open && unread > 0 && <span className="chat-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <div className="chat-panel fade-in">
                    <div className="chat-header">
                        <span>{t("chat.title")}</span>
                        <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
                    </div>
                    <div className="chat-messages" ref={listRef}>
                        {messages.map(message => {
                            const own = selfId != null && message.fromSummonerId === selfId;
                            const name = own
                                ? t("chat.you")
                                : memberName({ summonerId: message.fromSummonerId }) ?? "…";
                            return (
                                <div key={message.id ?? message.timestamp} className={"chat-message" + (own ? " own" : "")}>
                                    <span className="chat-author">{name}</span>
                                    <span className="chat-body">{message.body}</span>
                                </div>
                            );
                        })}
                        {messages.length === 0 && <p className="chat-empty">{t("chat.empty")}</p>}
                    </div>
                    <div className="chat-input-row">
                        <input
                            className="chat-input"
                            placeholder={t("chat.placeholder")}
                            value={draft}
                            maxLength={256}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && send()}
                        />
                        <button className="lcu-button confirm chat-send" disabled={!draft.trim()} onClick={send}>
                            {t("chat.send")}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
