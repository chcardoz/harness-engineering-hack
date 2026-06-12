'use client';

/**
 * OpenUI renderer — takes an OpenUIDocument and renders it as a vertical
 * stack of validated component cards. Unknown or invalid nodes fall back
 * gracefully without throwing.
 */

import React from 'react';
import { OpenUIActionContext } from './context';
import { interviewRegistry } from './interview-library';
import { recruiterRegistry } from './recruiter-library';
import type { OpenUIActionHandler, OpenUIDocument } from './types';
import { validateNode } from './types';

// Re-export context so consumers can import from one place
export { OpenUIActionContext } from './context';

/* ── Fallback card ───────────────────────────────────────────────────────── */

export function OpenUIFallback({
  componentName,
  reason,
}: {
  componentName: string;
  reason?: string;
}) {
  return (
    <div
      role="status"
      aria-label={`Component ${componentName} could not be rendered`}
      style={{
        background: 'var(--paper-2)',
        border: '1px dashed var(--line-strong)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
        }}
        aria-hidden="true"
      >
        &#9643;
      </span>
      <div>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
          {componentName}
        </p>
        {reason && (
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '12px',
              color: 'var(--muted-2)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Registry type ───────────────────────────────────────────────────────── */

// Components each declare specific props; the renderer passes validated props
// through at runtime, so the registry is intentionally loose at the type level.
type RegistryMap = Record<string, React.ComponentType<any>>;

const defaultFullRegistry: RegistryMap = {
  ...recruiterRegistry,
  ...interviewRegistry,
};

/* ── OpenUIRenderer ──────────────────────────────────────────────────────── */

export interface OpenUIRendererProps {
  document: OpenUIDocument;
  onAction?: OpenUIActionHandler;
  variant?: 'recruiter' | 'interview';
  /** Override the component registry (useful for testing). */
  registry?: RegistryMap;
}

export function OpenUIRenderer({ document, onAction, variant, registry }: OpenUIRendererProps) {
  let resolvedRegistry: RegistryMap;
  if (registry) {
    resolvedRegistry = registry;
  } else if (variant === 'recruiter') {
    resolvedRegistry = recruiterRegistry as RegistryMap;
  } else if (variant === 'interview') {
    resolvedRegistry = interviewRegistry as RegistryMap;
  } else {
    resolvedRegistry = defaultFullRegistry;
  }

  return (
    <OpenUIActionContext.Provider value={{ onAction }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {document.nodes.map((node, index) => {
          const validation = validateNode(node);

          if (!validation.ok) {
            return (
              <OpenUIFallback
                key={index}
                componentName={node.component}
                reason={validation.error}
              />
            );
          }

          const Component = resolvedRegistry[node.component];
          if (!Component) {
            return (
              <OpenUIFallback
                key={index}
                componentName={node.component}
                reason={`No renderer registered for "${node.component}"`}
              />
            );
          }

          try {
            return <Component key={index} {...(validation.props as Record<string, unknown>)} />;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Render error';
            return <OpenUIFallback key={index} componentName={node.component} reason={msg} />;
          }
        })}
      </div>
    </OpenUIActionContext.Provider>
  );
}
