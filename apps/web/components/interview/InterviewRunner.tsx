'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { OpenUIRenderer, type OpenUIAction, type OpenUIDocument } from '@yougrep/openui';
import styles from './interview.module.css';

interface StepDTO {
  openui: OpenUIDocument;
  text: string;
  step: number;
  totalSteps: number;
  done: boolean;
}

export function InterviewRunner({ sessionId }: { sessionId: string }) {
  const [step, setStep] = useState<StepDTO | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const res = await fetch(`/api/interview/${sessionId}/start`, { method: 'POST' });
        const data = (await res.json()) as { step?: StepDTO; error?: string };
        if (res.ok && data.step) setStep(data.step);
        else setError(data.error ?? 'Could not start the interview.');
      } catch {
        setError('Network error starting the interview.');
      } finally {
        setBusy(false);
      }
    })();
  }, [sessionId]);

  async function submit(action: OpenUIAction) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/interview/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { step?: StepDTO; error?: string };
      if (res.ok && data.step) setStep(data.step);
      else setError(data.error ?? 'Could not record your answer.');
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p className={styles.errorTitle}>Interview unavailable</p>
        <p>{error}</p>
      </div>
    );
  }

  const total = step?.totalSteps ?? 0;
  // step === -1 is consent; clamp progress to [0, total].
  const completedSteps = step ? Math.max(0, Math.min(step.step, total)) : 0;
  const pct = step?.done ? 100 : total > 0 ? (completedSteps / total) * 100 : 0;
  const showProgress = step !== null && step.step >= 0 && !step.done;

  return (
    <>
      {showProgress && (
        <div className={styles.progressWrap}>
          <div className={styles.progressMeta}>
            <span>
              Question {Math.min(completedSteps + 1, total)} of {total}
            </span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <main className={styles.stage}>
        {busy && !step && (
          <div className={styles.loading}>
            <CircleNotch size={20} className="spin" />
            Preparing your interview…
          </div>
        )}

        {step && (
          <>
            {step.text && (
              <div className={styles.agentLine}>
                <span className={styles.agentAvatar} aria-hidden="true">
                  Y
                </span>
                <p className={styles.agentText}>{step.text}</p>
              </div>
            )}
            <OpenUIRenderer
              key={step.step}
              document={step.openui}
              variant="interview"
              onAction={(a) => void submit(a)}
            />
            {busy && (
              <div className={styles.loading} style={{ padding: '24px 0' }}>
                <CircleNotch size={18} className="spin" />
                Saving…
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
