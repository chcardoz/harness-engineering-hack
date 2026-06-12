/**
 * Candidate-interview component library for @yougrep/openui.
 * Candidate-facing and interactive: each component collects a response
 * and submits it via the OpenUIActionContext handler.
 */

import {
  CheckCircle,
  Circle,
  Clock,
  Code,
  Envelope,
  MicrophoneSlash,
  Question,
  Star,
  Trophy,
} from '@phosphor-icons/react';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { OpenUIActionContext } from './context';
import type { ComponentProps } from './types';

/* ── Shared primitives ───────────────────────────────────────────────────── */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '0 0 6px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}
    >
      {children}
    </p>
  );
}

function SubmitBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '9px 18px',
        background: disabled ? 'var(--paper-2)' : 'var(--accent)',
        color: disabled ? 'var(--muted)' : '#fff',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      {children}
    </button>
  );
}

/* ── QuestionCard ─────────────────────────────────────────────────────────── */

export function QuestionCard({
  questionId,
  prompt,
  helper,
  inputKind,
  choices,
}: ComponentProps<'QuestionCard'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!value.trim() || submitted) return;
    onAction?.({ actionId: 'answer', component: 'QuestionCard', value });
    setSubmitted(true);
  }

  return (
    <Card>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <Question
          size={20}
          color="var(--accent)"
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {prompt}
        </p>
      </div>

      {helper && (
        <p
          style={{
            margin: '0 0 14px',
            fontSize: '13px',
            color: 'var(--muted)',
            fontStyle: 'italic',
          }}
        >
          {helper}
        </p>
      )}

      {submitted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} weight="fill" />
          Response recorded
        </div>
      ) : inputKind === 'choice' && choices && choices.length > 0 ? (
        <div
          role="group"
          aria-label="Answer choices"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          {choices.map((c, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${value === c ? 'var(--accent)' : 'var(--line)'}`,
                background: value === c ? 'var(--accent-wash)' : 'var(--paper-2)',
                cursor: 'pointer',
                fontSize: '14px',
                color: value === c ? 'var(--accent-ink)' : 'var(--ink-soft)',
                fontWeight: value === c ? 600 : 400,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <input
                type="radio"
                name={`question-${questionId}`}
                value={c}
                checked={value === c}
                onChange={() => setValue(c)}
                style={{ accentColor: 'var(--accent)' }}
              />
              {c}
            </label>
          ))}
          <div style={{ marginTop: '8px' }}>
            <SubmitBtn onClick={submit} disabled={!value.trim()}>
              Submit
            </SubmitBtn>
          </div>
        </div>
      ) : inputKind === 'text' ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            aria-label={prompt}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'var(--paper)',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <SubmitBtn onClick={submit} disabled={!value.trim()}>
            Submit
          </SubmitBtn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            aria-label={prompt}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'var(--paper)',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: 'var(--ink)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
          <SubmitBtn onClick={submit} disabled={!value.trim()}>
            Submit answer
          </SubmitBtn>
        </div>
      )}
    </Card>
  );
}

/* ── SkillSelfRating ─────────────────────────────────────────────────────── */

export function SkillSelfRating({
  questionId,
  skill,
  min,
  max,
}: ComponentProps<'SkillSelfRating'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const ratingLabels: Record<number, string> = {
    1: 'Beginner',
    2: 'Familiar',
    3: 'Proficient',
    4: 'Advanced',
    5: 'Expert',
  };

  function submit() {
    if (selected === null || submitted) return;
    onAction?.({
      actionId: 'skill_rating',
      component: 'SkillSelfRating',
      questionId,
      value: selected,
    });
    setSubmitted(true);
  }

  return (
    <Card>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <Star
          size={20}
          color="var(--accent)"
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
            How would you rate yourself on <span style={{ color: 'var(--accent)' }}>{skill}</span>?
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
            {min} = {ratingLabels[min] ?? 'Beginner'} · {max} = {ratingLabels[max] ?? 'Expert'}
          </p>
        </div>
      </div>

      {submitted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} weight="fill" />
          Rated {selected} — thanks!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            role="group"
            aria-label={`Rate your ${skill} skill from ${min} to ${max}`}
            style={{ display: 'flex', gap: '8px' }}
          >
            {range.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={selected === n}
                aria-label={`${n} — ${ratingLabels[n] ?? n}`}
                onClick={() => setSelected(n)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${selected === n ? 'var(--accent)' : 'var(--line-strong)'}`,
                  background: selected === n ? 'var(--accent)' : 'var(--paper-2)',
                  color: selected === n ? '#fff' : 'var(--ink-soft)',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {selected !== null && (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>
              {ratingLabels[selected] ?? `Level ${selected}`}
            </p>
          )}
          <SubmitBtn onClick={submit} disabled={selected === null}>
            Submit rating
          </SubmitBtn>
        </div>
      )}
    </Card>
  );
}

/* ── SQLProblemEditor ────────────────────────────────────────────────────── */

export function SQLProblemEditor({
  questionId,
  prompt,
  schemaHint,
  starter,
}: ComponentProps<'SQLProblemEditor'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [value, setValue] = useState(starter ?? '');
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!value.trim() || submitted) return;
    onAction?.({ actionId: 'sql_answer', component: 'SQLProblemEditor', questionId, value });
    setSubmitted(true);
  }

  return (
    <Card>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <Code
          size={20}
          color="var(--accent)"
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {prompt}
        </p>
      </div>

      {schemaHint && (
        <div style={{ marginBottom: '12px' }}>
          <SectionLabel>Schema hint</SectionLabel>
          <pre
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'var(--paper-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--ink-soft)',
              overflowX: 'auto',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {schemaHint}
          </pre>
        </div>
      )}

      {submitted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} weight="fill" />
          Query submitted
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            aria-label="SQL query editor"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={8}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'var(--paper-2)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--ink)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.7,
            }}
          />
          <SubmitBtn onClick={submit} disabled={!value.trim()}>
            <Code size={14} />
            Submit query
          </SubmitBtn>
        </div>
      )}
    </Card>
  );
}

/* ── ArchitecturePrompt ──────────────────────────────────────────────────── */

export function ArchitecturePrompt({
  questionId,
  prompt,
  considerations,
}: ComponentProps<'ArchitecturePrompt'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!value.trim() || submitted) return;
    onAction?.({
      actionId: 'architecture_answer',
      component: 'ArchitecturePrompt',
      questionId,
      value,
    });
    setSubmitted(true);
  }

  return (
    <Card>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <Code
          size={20}
          color="var(--accent)"
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {prompt}
        </p>
      </div>

      {considerations.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <SectionLabel>Consider</SectionLabel>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {considerations.map((c, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--muted)',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--accent)', fontSize: '10px', marginTop: '4px' }}>
                  ◆
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} weight="fill" />
          Response submitted
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            aria-label={prompt}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={6}
            placeholder="Describe your approach…"
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'var(--paper)',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: 'var(--ink)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
          <SubmitBtn onClick={submit} disabled={!value.trim()}>
            Submit answer
          </SubmitBtn>
        </div>
      )}
    </Card>
  );
}

/* ── TimedExercise ───────────────────────────────────────────────────────── */

export function TimedExercise({ questionId, prompt, seconds }: ComponentProps<'TimedExercise'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || submitted) return;

    function tick(now: number) {
      if (lastRef.current === null) {
        lastRef.current = now;
      }
      const delta = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setRemaining((r) => {
        const next = r - delta;
        if (next <= 0) {
          setRunning(false);
          autoSubmit();
          return 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [running, submitted]);

  function autoSubmit() {
    setSubmitted(true);
    onAction?.({ actionId: 'timed_answer', component: 'TimedExercise', questionId, value });
  }

  function submit() {
    if (submitted) return;
    setRunning(false);
    setSubmitted(true);
    onAction?.({ actionId: 'timed_answer', component: 'TimedExercise', questionId, value });
  }

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const pct = (remaining / seconds) * 100;
  const urgent = remaining < 30;

  return (
    <Card style={{ borderColor: running && urgent ? 'var(--danger)' : 'var(--line)' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <Clock
          size={20}
          color={urgent && running ? 'var(--danger)' : 'var(--accent)'}
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {prompt}
        </p>
      </div>

      {/* Timer display */}
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {submitted ? 'Completed' : running ? 'Time remaining' : 'Ready to start'}
          </span>
          <span
            aria-live="polite"
            aria-label={`${mins} minutes ${secs} seconds remaining`}
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: urgent && running ? 'var(--danger)' : 'var(--ink)',
            }}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: 'var(--line)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
          role="progressbar"
          aria-valuenow={Math.round(remaining)}
          aria-valuemin={0}
          aria-valuemax={seconds}
          aria-label="Time remaining"
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: urgent ? 'var(--danger)' : 'var(--accent)',
              borderRadius: 999,
            }}
          />
        </div>
      </div>

      {submitted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} weight="fill" />
          Answer submitted
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!running && (
            <button
              type="button"
              onClick={() => setRunning(true)}
              style={{
                padding: '9px 18px',
                background: 'var(--accent-wash)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Start exercise
            </button>
          )}
          {running && (
            <>
              <textarea
                aria-label={prompt}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={5}
                placeholder="Type your answer here…"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  background: 'var(--paper)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.6,
                }}
              />
              <SubmitBtn onClick={submit}>Submit early</SubmitBtn>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── RubricProgress ──────────────────────────────────────────────────────── */

export function RubricProgress({ criteria }: ComponentProps<'RubricProgress'>) {
  const done = criteria.filter((c) => c.done).length;
  const total = criteria.length;

  return (
    <Card style={{ background: 'var(--paper-2)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <SectionLabel>Interview progress</SectionLabel>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: done === total ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {done}/{total}
        </span>
      </div>

      <div
        style={{
          height: 4,
          background: 'var(--line)',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: '14px',
        }}
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Interview progress: ${done} of ${total} criteria covered`}
      >
        <div
          style={{
            height: '100%',
            width: `${(done / Math.max(total, 1)) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-bright) 100%)',
            borderRadius: 999,
          }}
        />
      </div>

      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {criteria.map((c) => (
          <li
            key={c.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: c.done ? 'var(--ink-soft)' : 'var(--muted)',
            }}
          >
            {c.done ? (
              <CheckCircle size={16} color="var(--accent)" weight="fill" aria-label="Complete" />
            ) : (
              <Circle size={16} color="var(--muted-2)" aria-label="Pending" />
            )}
            <span
              style={{ textDecoration: c.done ? 'none' : 'none', fontWeight: c.done ? 500 : 400 }}
            >
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── ConsentNotice ───────────────────────────────────────────────────────── */

export function ConsentNotice({ text, points }: ComponentProps<'ConsentNotice'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [consented, setConsented] = useState(false);

  function handleConsent() {
    setConsented(true);
    onAction?.({ actionId: 'consent_given', component: 'ConsentNotice', value: true });
  }

  return (
    <Card style={{ borderColor: consented ? 'var(--accent)' : 'var(--line)' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <Envelope
          size={20}
          color="var(--accent)"
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--ink)',
              lineHeight: 1.5,
            }}
          >
            Before we begin
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: 'var(--ink-soft)',
              lineHeight: 1.6,
            }}
          >
            {text}
          </p>
        </div>
      </div>

      {points.length > 0 && (
        <ul
          style={{
            margin: '0 0 16px',
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {points.map((p, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--ink-soft)',
                alignItems: 'flex-start',
              }}
            >
              <MicrophoneSlash
                size={13}
                color="var(--muted)"
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              {p}
            </li>
          ))}
        </ul>
      )}

      {consented ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} weight="fill" />
          Consent recorded — let's begin
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConsent}
          style={{
            padding: '9px 18px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          I consent — start interview
        </button>
      )}
    </Card>
  );
}

/* ── InterviewComplete ───────────────────────────────────────────────────── */

export function InterviewComplete({ headline, message }: ComponentProps<'InterviewComplete'>) {
  return (
    <Card
      style={{
        textAlign: 'center',
        padding: '36px 24px',
        borderColor: 'var(--accent)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent-wash)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Trophy size={28} color="var(--accent)" weight="duotone" aria-hidden="true" />
      </div>

      <p style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
        {headline}
      </p>
      <p
        style={{
          margin: '0 auto',
          fontSize: '14px',
          color: 'var(--muted)',
          lineHeight: 1.6,
          maxWidth: '400px',
        }}
      >
        {message}
      </p>
    </Card>
  );
}

/* ── Registry ────────────────────────────────────────────────────────────── */

export const interviewRegistry = {
  QuestionCard,
  SkillSelfRating,
  SQLProblemEditor,
  ArchitecturePrompt,
  TimedExercise,
  RubricProgress,
  ConsentNotice,
  InterviewComplete,
} as const;
