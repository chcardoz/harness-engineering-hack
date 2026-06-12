'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Hash, PaperPlaneRight } from '@phosphor-icons/react';
import { OpenUIRenderer, type OpenUIAction, type OpenUIDocument } from '@yougrep/openui';
import { ReviewSidebar } from './ReviewSidebar';
import styles from './workspace.module.css';

export interface ChannelMessageDTO {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  openui: OpenUIDocument | null;
}

interface AgentTurnDTO {
  messageId: string;
  text: string;
  openui: OpenUIDocument | null;
}

const SUGGESTIONS = [
  'Draft the listing',
  'Plan the interview',
  'Publish to the board',
  'Review candidates',
];

export function ChannelView({
  channelId,
  channelName,
  initialMessages,
  userName,
}: {
  channelId: string;
  channelName: string;
  initialMessages: ChannelMessageDTO[];
  userName: string;
}) {
  const [messages, setMessages] = useState<ChannelMessageDTO[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewNonce, setReviewNonce] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  // Reset when navigating between channels.
  useEffect(() => {
    setMessages(initialMessages);
  }, [channelId, initialMessages]);

  const send = useCallback(
    async (opts: { message?: string; action?: OpenUIAction; displayUser?: string }) => {
      if (sending) return;
      setSending(true);

      if (opts.displayUser) {
        setMessages((prev) => [
          ...prev,
          { id: `local-${prev.length}`, role: 'user', content: opts.displayUser!, openui: null },
        ]);
      }

      try {
        const res = await fetch(`/api/channels/${channelId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: opts.message, action: opts.action }),
        });
        const data = (await res.json()) as { turn?: AgentTurnDTO; error?: string };
        if (res.ok && data.turn) {
          const turn = data.turn;
          setMessages((prev) => [
            ...prev,
            { id: turn.messageId, role: 'assistant', content: turn.text, openui: turn.openui },
          ]);
          setReviewNonce((n) => n + 1);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${prev.length}`,
              role: 'assistant',
              content: data.error ?? 'Something went wrong.',
              openui: null,
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `err-${prev.length}`, role: 'assistant', content: 'Network error.', openui: null },
        ]);
      } finally {
        setSending(false);
      }
    },
    [channelId, sending],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    void send({ message: text, displayUser: text });
  }

  const handleAction = useCallback(
    (action: OpenUIAction) => {
      void send({ action });
    },
    [send],
  );

  return (
    <main className={styles.main}>
      <div className={styles.chatPane}>
        <header className={styles.chatHead}>
          <Hash size={18} color="var(--muted-2)" weight="bold" aria-hidden="true" />
          <div>
            <div className={styles.chatTitle}>{channelName}</div>
            <div className={styles.chatSub}>Channel agent · reads your connected context</div>
          </div>
        </header>

        <div className={styles.messages} ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={styles.msg}>
              <div
                className={`${styles.avatar} ${
                  m.role === 'user' ? styles.avatarUser : styles.avatarAgent
                }`}
                aria-hidden="true"
              >
                {m.role === 'user' ? (userName[0] ?? 'U').toUpperCase() : 'Y'}
              </div>
              <div className={styles.msgBody}>
                <div className={styles.msgMeta}>
                  <span className={styles.msgName}>
                    {m.role === 'user' ? userName : 'Channel agent'}
                  </span>
                  <span className={styles.msgRole}>
                    {m.role === 'user' ? 'recruiter' : 'agent'}
                  </span>
                </div>
                {m.content && <div className={styles.msgText}>{m.content}</div>}
                {m.openui && (
                  <div className={styles.msgOpenui}>
                    <OpenUIRenderer
                      document={m.openui}
                      variant="recruiter"
                      onAction={handleAction}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className={styles.msg}>
              <div className={`${styles.avatar} ${styles.avatarAgent}`} aria-hidden="true">
                Y
              </div>
              <div
                className={styles.typing}
                role="status"
                aria-live="polite"
                aria-label="Channel agent is responding"
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.dot} aria-hidden="true" />
              </div>
            </div>
          )}
        </div>

        <div className={styles.composer}>
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.suggestion}
                disabled={sending}
                onClick={() => void send({ message: s, displayUser: s })}
              >
                {s}
              </button>
            ))}
          </div>
          <form className={styles.composerInner} onSubmit={handleSubmit}>
            <textarea
              className={styles.composerInput}
              rows={1}
              placeholder={`Message the ${channelName} agent…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }
              }}
              aria-label="Message the channel agent"
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <PaperPlaneRight size={17} weight="fill" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

      <ReviewSidebar channelId={channelId} refreshSignal={reviewNonce} />
    </main>
  );
}
