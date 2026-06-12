'use client';

/**
 * Shared action context — extracted to a tiny module so that:
 *   - recruiter-library and interview-library can import from here
 *   - renderers.tsx can also import from here
 * ...without creating a circular dependency.
 */

import { createContext } from 'react';
import type { OpenUIActionHandler } from './types';

export const OpenUIActionContext = createContext<{ onAction: OpenUIActionHandler | undefined }>({
  onAction: undefined,
});
