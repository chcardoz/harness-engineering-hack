/**
 * Recruiter-workspace component library for @yougrep/openui.
 * Each component maps to a name in RECRUITER_COMPONENTS and receives
 * validated props inferred from componentSchemas.
 */

import {
  Briefcase,
  Buildings,
  CheckCircle,
  ChartBar,
  FileText,
  Lightning,
  PlugsConnected,
  Rocket,
  User,
  Warning,
  X,
  XCircle,
} from '@phosphor-icons/react';
import React, { useContext, useState } from 'react';
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

function Tag({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'danger' | 'warn';
}) {
  const colors: Record<string, React.CSSProperties> = {
    default: { background: 'var(--paper-2)', color: 'var(--ink-soft)' },
    accent: { background: 'var(--accent-wash)', color: 'var(--accent)' },
    danger: { background: 'rgba(180,35,24,0.08)', color: 'var(--danger)' },
    warn: { background: 'rgba(181,71,8,0.08)', color: 'var(--warn)' },
  };
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '12px',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        ...colors[variant],
      }}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  variant = 'secondary',
  onClick,
  disabled,
  style,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'opacity 0.15s, background 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
    secondary: {
      background: 'var(--paper-2)',
      color: 'var(--ink-soft)',
      borderColor: 'var(--line-strong)',
    },
    danger: { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' },
  };
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

/* ── JobBriefCard ─────────────────────────────────────────────────────────── */

export function JobBriefCard({
  title,
  summary,
  mustHaves,
  sourcedFrom,
}: ComponentProps<'JobBriefCard'>) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <span
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-wash)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Briefcase size={18} color="var(--accent)" weight="duotone" />
        </span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </p>
          <p
            style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}
          >
            {summary}
          </p>
        </div>
      </div>

      {mustHaves.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <SectionLabel>Must-haves</SectionLabel>
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
            {mustHaves.map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--ink-soft)',
                }}
              >
                <CheckCircle
                  size={14}
                  color="var(--accent)"
                  weight="fill"
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sourcedFrom && sourcedFrom.length > 0 && (
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--muted-2)' }}>Sourced from</span>
          {sourcedFrom.map((s, i) => (
            <Tag key={i}>{s}</Tag>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── ConnectorStatus ─────────────────────────────────────────────────────── */

const connectorStatusMeta: Record<
  string,
  { icon: React.ReactNode; label: string; tagVariant: 'accent' | 'warn' | 'danger' | 'default' }
> = {
  connected: {
    icon: <PlugsConnected size={14} weight="fill" color="var(--accent)" />,
    label: 'Connected',
    tagVariant: 'accent',
  },
  syncing: {
    icon: <Lightning size={14} weight="fill" color="var(--warn)" />,
    label: 'Syncing',
    tagVariant: 'warn',
  },
  error: {
    icon: <XCircle size={14} weight="fill" color="var(--danger)" />,
    label: 'Error',
    tagVariant: 'danger',
  },
  disconnected: {
    icon: <X size={14} weight="bold" color="var(--muted)" />,
    label: 'Disconnected',
    tagVariant: 'default',
  },
};

export function ConnectorStatus({ connectors }: ComponentProps<'ConnectorStatus'>) {
  return (
    <Card>
      <SectionLabel>Connectors</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        {connectors.map((c, i) => {
          const meta: {
            icon: React.ReactNode;
            label: string;
            tagVariant: 'accent' | 'warn' | 'danger' | 'default';
          } = connectorStatusMeta[c.status] ?? {
            icon: <X size={14} weight="bold" color="var(--muted)" />,
            label: c.status,
            tagVariant: 'default',
          };
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--paper-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Buildings size={16} color="var(--muted)" weight="duotone" />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-soft)' }}>
                  {c.provider}
                </span>
                {c.detail && (
                  <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>{c.detail}</span>
                )}
              </div>
              <Tag variant={meta.tagVariant as 'accent' | 'warn' | 'danger' | 'default'}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {meta.icon}
                  {meta.label}
                </span>
              </Tag>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── JobListingDraft ─────────────────────────────────────────────────────── */

export function JobListingDraft({
  title,
  location,
  employmentType,
  salaryRange,
  summary,
  responsibilities,
  requirements,
  niceToHaves,
}: ComponentProps<'JobListingDraft'>) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
        <FileText
          size={20}
          color="var(--accent)"
          weight="duotone"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            {title}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            {location && <Tag>{location}</Tag>}
            {employmentType && <Tag>{employmentType}</Tag>}
            {salaryRange && <Tag variant="accent">{salaryRange}</Tag>}
          </div>
        </div>
      </div>

      <p
        style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.6 }}
      >
        {summary}
      </p>

      {responsibilities.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>Responsibilities</SectionLabel>
          <ul
            style={{
              margin: 0,
              paddingLeft: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {responsibilities.map((r, i) => (
              <li key={i} style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {requirements.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>Requirements</SectionLabel>
          <ul
            style={{
              margin: 0,
              paddingLeft: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {requirements.map((r, i) => (
              <li key={i} style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {niceToHaves.length > 0 && (
        <div>
          <SectionLabel>Nice to haves</SectionLabel>
          <ul
            style={{
              margin: 0,
              paddingLeft: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {niceToHaves.map((n, i) => (
              <li key={i} style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ── CandidateCard ───────────────────────────────────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'var(--accent)' : score >= 50 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div
      aria-label={`Score: ${score} out of 100`}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: `2.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 700,
        color,
        flexShrink: 0,
      }}
    >
      {score}
    </div>
  );
}

export function CandidateCard({
  name,
  headline,
  overallScore,
  recommendation,
  strengths,
  concerns,
}: ComponentProps<'CandidateCard'>) {
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--accent-wash)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User size={18} color="var(--accent)" weight="duotone" />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              {name}
            </p>
            {headline && (
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                {headline}
              </p>
            )}
          </div>
        </div>
        {overallScore !== undefined && <ScoreBadge score={overallScore} />}
      </div>

      {recommendation && (
        <p
          style={{
            margin: '0 0 14px',
            fontSize: '13px',
            color: 'var(--ink-soft)',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          {recommendation}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: strengths.length && concerns.length ? '1fr 1fr' : '1fr',
          gap: '12px',
        }}
      >
        {strengths.length > 0 && (
          <div>
            <SectionLabel>Strengths</SectionLabel>
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
              {strengths.map((s, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--ink-soft)',
                    alignItems: 'flex-start',
                  }}
                >
                  <CheckCircle
                    size={13}
                    color="var(--accent)"
                    weight="fill"
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {concerns.length > 0 && (
          <div>
            <SectionLabel>Concerns</SectionLabel>
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
              {concerns.map((c, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--ink-soft)',
                    alignItems: 'flex-start',
                  }}
                >
                  <Warning
                    size={13}
                    color="var(--warn)"
                    weight="fill"
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── CandidateComparisonTable ────────────────────────────────────────────── */

export function CandidateComparisonTable({
  criteria,
  candidates,
}: ComponentProps<'CandidateComparisonTable'>) {
  function cellColor(score: number): string {
    if (score >= 4) return 'var(--accent-wash)';
    if (score >= 2.5) return 'rgba(181,71,8,0.07)';
    return 'rgba(180,35,24,0.07)';
  }
  function cellText(score: number): string {
    if (score >= 4) return 'var(--accent)';
    if (score >= 2.5) return 'var(--warn)';
    return 'var(--danger)';
  }

  return (
    <Card style={{ padding: '20px 0', overflowX: 'auto' }}>
      <div style={{ padding: '0 24px 12px' }}>
        <SectionLabel>Candidate comparison</SectionLabel>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
        aria-label="Candidate comparison table"
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                padding: '8px 24px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--muted)',
                borderBottom: '1px solid var(--line)',
                whiteSpace: 'nowrap',
              }}
            >
              Criteria
            </th>
            {candidates.map((c) => (
              <th
                key={c.name}
                scope="col"
                style={{
                  padding: '8px 16px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                  borderBottom: '1px solid var(--line)',
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <User size={14} color="var(--muted)" />
                  {c.name}
                  {c.overallScore !== undefined && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color:
                          c.overallScore >= 75
                            ? 'var(--accent)'
                            : c.overallScore >= 50
                              ? 'var(--warn)'
                              : 'var(--danger)',
                      }}
                    >
                      {c.overallScore}/100
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((cr, ri) => (
            <tr
              key={cr.key}
              style={{ background: ri % 2 === 1 ? 'var(--paper-2)' : 'transparent' }}
            >
              <th
                scope="row"
                style={{
                  padding: '10px 24px',
                  textAlign: 'left',
                  fontWeight: 500,
                  color: 'var(--ink-soft)',
                  whiteSpace: 'nowrap',
                }}
              >
                {cr.label}
              </th>
              {candidates.map((c) => {
                const s = c.scores[cr.key] ?? 0;
                return (
                  <td
                    key={c.name}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'center',
                      background: cellColor(s),
                      fontWeight: 600,
                      color: cellText(s),
                    }}
                    aria-label={`${c.name}: ${s}`}
                  >
                    {s}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {candidates.some((c) => c.note) && (
          <tfoot>
            <tr>
              <td
                colSpan={candidates.length + 1}
                style={{
                  padding: '10px 24px',
                  fontSize: '12px',
                  color: 'var(--muted-2)',
                  borderTop: '1px solid var(--line)',
                }}
              >
                {candidates
                  .filter((c) => c.note)
                  .map((c) => (
                    <span key={c.name} style={{ marginRight: '16px' }}>
                      <strong>{c.name}:</strong> {c.note}
                    </span>
                  ))}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </Card>
  );
}

/* ── InterviewSummary ────────────────────────────────────────────────────── */

export function InterviewSummary({
  candidateName,
  overallScore,
  recommendation,
  summary,
  rubricScores,
}: ComponentProps<'InterviewSummary'>) {
  const maxScore = Math.max(...(rubricScores.length > 0 ? rubricScores.map((r) => r.score) : [5]));

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChartBar size={20} color="var(--accent)" weight="duotone" />
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
            Interview Summary — {candidateName}
          </p>
        </div>
        {overallScore !== undefined && <ScoreBadge score={overallScore} />}
      </div>

      {recommendation && (
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--accent-wash)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            fontSize: '13px',
            color: 'var(--accent-ink)',
            fontWeight: 500,
          }}
        >
          {recommendation}
        </div>
      )}

      <p
        style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.6 }}
      >
        {summary}
      </p>

      {rubricScores.length > 0 && (
        <div>
          <SectionLabel>Rubric scores</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {rubricScores.map((r) => (
              <div key={r.key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{r.label}</span>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
                    {r.score}/{maxScore}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--line)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-valuenow={r.score}
                  aria-valuemin={0}
                  aria-valuemax={maxScore}
                  aria-label={r.label}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(r.score / maxScore) * 100}%`,
                      background: 'var(--accent)',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── PipelineChart ───────────────────────────────────────────────────────── */

export function PipelineChart({ stages }: ComponentProps<'PipelineChart'>) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <ChartBar size={18} color="var(--accent)" weight="duotone" />
        <SectionLabel>Pipeline</SectionLabel>
      </div>
      <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stages.map((s) => (
          <div key={s.label} role="listitem">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{s.label}</span>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{s.count}</span>
            </div>
            <div
              style={{
                height: 8,
                background: 'var(--line)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
              role="img"
              aria-label={`${s.label}: ${s.count} candidates`}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(s.count / max) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-bright) 100%)',
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── NextActionButtons ───────────────────────────────────────────────────── */

export function NextActionButtons({ prompt, actions }: ComponentProps<'NextActionButtons'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [pending, setPending] = useState<string | null>(null);

  function handleClick(action: ComponentProps<'NextActionButtons'>['actions'][number]) {
    if (action.confirm) {
      setPending(action.id);
    } else {
      onAction?.({ actionId: action.id, component: 'NextActionButtons' });
    }
  }

  function handleConfirm(id: string) {
    onAction?.({ actionId: id, component: 'NextActionButtons', confirmed: true });
    setPending(null);
  }

  return (
    <Card>
      {prompt && (
        <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--ink-soft)' }}>{prompt}</p>
      )}

      {pending && (
        <div
          role="alertdialog"
          aria-modal="false"
          style={{
            padding: '12px 14px',
            background: 'rgba(180,35,24,0.06)',
            border: '1px solid rgba(180,35,24,0.2)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            fontSize: '13px',
            color: 'var(--ink-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>This action requires confirmation. Proceed?</span>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Btn variant="danger" onClick={() => handleConfirm(pending)}>
              Confirm
            </Btn>
            <Btn variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <Btn key={a.id} variant={a.kind} onClick={() => handleClick(a)}>
            {a.kind === 'primary' && <Rocket size={14} weight="duotone" />}
            {a.label}
          </Btn>
        ))}
      </div>
    </Card>
  );
}

/* ── ConfirmPublish ──────────────────────────────────────────────────────── */

export function ConfirmPublish({
  title,
  summary,
  orgSlug,
  jobSlug,
  note,
}: ComponentProps<'ConfirmPublish'>) {
  const { onAction } = useContext(OpenUIActionContext);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <Card style={{ background: 'var(--paper-2)', borderStyle: 'dashed' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
          Publish cancelled.
        </p>
      </Card>
    );
  }

  const previewUrl = orgSlug && jobSlug ? `/c/${orgSlug}/${jobSlug}` : null;

  return (
    <Card style={{ borderColor: 'var(--accent)', borderWidth: '1.5px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <span
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-wash)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Rocket size={18} color="var(--accent)" weight="duotone" />
        </span>
        <div>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
            {title}
          </p>
          <p
            style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}
          >
            {summary}
          </p>
        </div>
      </div>

      {previewUrl && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--paper-2)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Will be published at: <strong style={{ color: 'var(--ink-soft)' }}>{previewUrl}</strong>
        </div>
      )}

      {note && (
        <p
          style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--muted-2)', lineHeight: 1.5 }}
        >
          {note}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <Btn
          variant="primary"
          onClick={() =>
            onAction?.({
              actionId: 'confirm_publish',
              component: 'ConfirmPublish',
              confirmed: true,
            })
          }
        >
          <Rocket size={14} weight="duotone" />
          Publish to job board
        </Btn>
        <Btn
          variant="secondary"
          onClick={() => {
            setDismissed(true);
            onAction?.({
              actionId: 'cancel_publish',
              component: 'ConfirmPublish',
              confirmed: false,
            });
          }}
        >
          Cancel
        </Btn>
      </div>
    </Card>
  );
}

/* ── Registry ────────────────────────────────────────────────────────────── */

export const recruiterRegistry = {
  JobBriefCard,
  ConnectorStatus,
  JobListingDraft,
  CandidateCard,
  CandidateComparisonTable,
  InterviewSummary,
  PipelineChart,
  NextActionButtons,
  ConfirmPublish,
} as const;
