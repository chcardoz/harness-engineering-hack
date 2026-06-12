import Reveal from './Reveal';
import s from './landing.module.css';

/* ── Workspace mock (Slack-style sidebar + chat) ─────────────────────── */
function WorkspaceMock() {
  return (
    <div className={s.surfaceCard}>
      <div className={s.surfaceCardHeader} aria-hidden="true">
        <div className={s.surfaceCardDots}>
          <span className={`${s.dot} ${s.dotRed}`} />
          <span className={`${s.dot} ${s.dotYellow}`} />
          <span className={`${s.dot} ${s.dotGreen}`} />
        </div>
        <span className={s.surfaceCardTitle}>Yougrep — Acme Corp</span>
      </div>
      <div className={s.surfaceCardBody}>
        <div className={s.workspaceMock}>
          {/* Sidebar */}
          <aside className={s.workspaceSidebar} aria-label="Job channels">
            <div className={s.workspaceOrgName}>Acme Corp</div>
            <div className={s.workspaceSection}>Channels</div>
            <div className={`${s.workspaceChannel} ${s.workspaceChannelActive}`}>
              <span className={`${s.channelHashmark} ${s.channelHashmarkActive}`}>#</span>
              postgres-engineer
            </div>
            <div className={s.workspaceChannel}>
              <span className={s.channelHashmark}>#</span>
              frontend-lead
              <span className={s.workspaceUnread}>3</span>
            </div>
            <div className={s.workspaceChannel}>
              <span className={s.channelHashmark}>#</span>
              staff-engineer
            </div>
            <div className={s.workspaceChannel}>
              <span className={s.channelHashmark}>#</span>
              devrel
              <span className={s.workspaceUnread}>1</span>
            </div>
          </aside>

          {/* Main pane */}
          <main className={s.workspaceMain}>
            <div className={s.workspaceChannelBar}>
              #postgres-engineer
              <span className={s.agentBadge}>agent · active</span>
            </div>
            <div className={s.workspaceMessages} aria-label="Channel messages">
              <div className={s.message}>
                <div className={`${s.messageAvatar} ${s.messageUserAvatar}`}>JD</div>
                <div className={s.messageBody}>
                  <div className={s.messageSender}>Jordan (recruiter)</div>
                  <div className={s.messageText}>
                    Draft the listing. Pull context from the backend wiki.
                  </div>
                </div>
              </div>
              <div className={s.message}>
                <div className={`${s.messageAvatar} ${s.messageAgentAvatar}`}>YG</div>
                <div className={s.messageBody}>
                  <div className={`${s.messageSender} ${s.messageSenderAgent}`}>Yougrep Agent</div>
                  <div className={s.messageText}>
                    Read <span className={s.messageCode}>notion://engineering-wiki</span> and{' '}
                    <span className={s.messageCode}>github://backend-monorepo</span>. Draft ready —
                    4 requirements, 2 nice-to-haves. Publish?
                  </div>
                </div>
              </div>
              <div className={s.message}>
                <div className={`${s.messageAvatar} ${s.messageUserAvatar}`}>JD</div>
                <div className={s.messageBody}>
                  <div className={s.messageSender}>Jordan</div>
                  <div className={s.messageText}>Looks great, publish it.</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ── Interview card mock ─────────────────────────────────────────────── */
function InterviewMock() {
  const bars = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className={s.surfaceCard}>
      <div className={s.surfaceCardHeader} aria-hidden="true">
        <div className={s.surfaceCardDots}>
          <span className={`${s.dot} ${s.dotRed}`} />
          <span className={`${s.dot} ${s.dotYellow}`} />
          <span className={`${s.dot} ${s.dotGreen}`} />
        </div>
        <span className={s.surfaceCardTitle}>Voice Interview — Candidate</span>
      </div>
      <div className={s.surfaceCardBody}>
        <div className={s.interviewMock}>
          <div className={s.interviewHeader}>
            <div>
              <div className={s.interviewRole}>Postgres Engineer</div>
              <div className={s.interviewOrg}>Acme Corp · Remote</div>
            </div>
            <div className={s.liveIndicator} aria-label="Interview in progress">
              <span className={s.liveIndicatorDot} aria-hidden="true" />
              LIVE
            </div>
          </div>

          {/* Voice bars */}
          <div className={s.voiceVisualizer} aria-label="Voice activity" aria-hidden="true">
            {bars.map((i) => (
              <span
                key={i}
                className={s.voiceBar}
                style={{
                  animationDelay: `${(i * 0.07).toFixed(2)}s`,
                  height: '6px',
                }}
              />
            ))}
          </div>

          {/* Current question */}
          <div className={s.interviewQuestion}>
            <div className={s.interviewQuestionLabel}>Current question</div>
            <div className={s.interviewQuestionText}>
              Explain how you'd design a multi-tenant schema with row-level security in Postgres.
            </div>
          </div>

          {/* Generated code exercise */}
          <div className={s.interviewExercise} aria-label="Live coding exercise">
            <span className={s.interviewExerciseKeyword}>CREATE</span>{' '}
            <span className={s.interviewExerciseKeyword}>POLICY</span>
            {' tenant_isolation '}
            <span className={s.interviewExerciseKeyword}>ON</span>
            {' jobs\n  '}
            <span className={s.interviewExerciseKeyword}>USING</span>
            {' (org_id = '}
            <span className={s.interviewExerciseString}>current_setting</span>
            {'('}
            <span className={s.interviewExerciseString}>&#39;app.org_id&#39;</span>
            {'));\n  '}
            <span className={s.interviewExerciseComment}>{'-- complete the policy...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Surfaces() {
  return (
    <section id="surfaces" className={s.surfaces} aria-labelledby="surfaces-heading">
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionLabel}>Two surfaces</div>
          <h2 id="surfaces-heading" className={s.sectionHeading}>
            One workspace.
            <br />
            Two experiences.
          </h2>
          <p className={s.sectionSubhead}>
            Recruiters get a Slack-like channel per role. Candidates get a one-click voice interview
            with live coding exercises — no app to install.
          </p>
        </Reveal>

        <div className={s.surfacesGrid}>
          <Reveal delay={0.1}>
            <WorkspaceMock />
          </Reveal>
          <Reveal delay={0.2}>
            <InterviewMock />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
