/**
 * Test-data builders.
 *
 * Two rules, both learned the hard way:
 *
 * 1. EVERY test invents its own data. Shared fixtures ("the standard project")
 *    couple tests together — one test renames it, three others fail, and the
 *    failure points at the innocent tests. Parallel workers make this worse,
 *    not better.
 *
 * 2. Names are UNIQUE and TRACEABLE. The prefix says which suite made it, so a
 *    leaked record in a shared environment can be traced back and cleaned up.
 *    Uniqueness is what lets `fullyParallel` be true.
 */

let counter = 0;

/** Monotonic-ish unique suffix. Timestamp for traceability, counter for
 *  collisions inside the same millisecond, random for cross-worker safety
 *  (workers are separate processes, so the counter alone is not enough). */
function unique(): string {
  counter += 1;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${stamp}-${counter}-${rand}`;
}

export interface NewProject {
  name: string;
  description: string;
  visibility: 'private' | 'public';
}

/**
 * Builder with sane defaults and a partial override — the shape that keeps a
 * test readable. A test that cares only about visibility writes
 * `aProject({ visibility: 'public' })`, and the reader instantly knows that
 * visibility is the variable under test and everything else is irrelevant.
 */
export function aProject(overrides: Partial<NewProject> = {}): NewProject {
  return {
    name: `e2e-project-${unique()}`,
    description: 'Created by the automated suite. Safe to delete.',
    visibility: 'private',
    ...overrides,
  };
}

export interface NewUser {
  email: string;
  fullName: string;
  role: 'admin' | 'member' | 'viewer';
}

export function aUser(overrides: Partial<NewUser> = {}): NewUser {
  const id = unique();
  return {
    email: `e2e-user-${id}@example.com`,
    fullName: `E2E User ${id}`,
    role: 'member',
    ...overrides,
  };
}
