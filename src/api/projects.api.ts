import { ApiClient } from './api-client';
import type { Project } from './types';
import type { NewProject } from '../support/data-factory';

/**
 * Project resource helpers.
 *
 * These exist to serve the ARRANGE and the ASSERT thirds of a test — never the
 * ACT third. A test that both creates a project via API and verifies it via API
 * has not tested the UI at all; it is an API test wearing a browser costume,
 * and it will keep passing after the front end breaks.
 *
 *   ARRANGE via API  — fast, stable, and not what is under test
 *   ACT via UI       — the actual subject, always through a page object
 *   ASSERT via UI    — what the user sees
 *   ASSERT via API   — optionally ALSO, to prove it persisted rather than
 *                      merely rendered optimistically
 *
 * That last point is worth dwelling on: a UI-only assertion cannot tell a saved
 * record from an optimistic render that will vanish on refresh. Asserting both
 * is how you catch that class of bug.
 */
export class ProjectsApi {
  constructor(private readonly api: ApiClient) {}

  async create(project: NewProject): Promise<Project> {
    return this.api.post<Project>('/projects', project);
  }

  async get(id: string): Promise<Project> {
    return this.api.get<Project>(`/projects/${id}`);
  }

  async list(): Promise<Project[]> {
    return this.api.get<Project[]>('/projects');
  }

  async rename(id: string, name: string): Promise<Project> {
    return this.api.patch<Project>(`/projects/${id}`, { name });
  }

  async delete(id: string): Promise<void> {
    await this.api.delete<void>(`/projects/${id}`);
  }

  /**
   * Idempotent cleanup, for use in teardown.
   *
   * Teardown must NEVER fail the test. A project already deleted by the test
   * body, or missing because the API is down, is not a reason to turn a green
   * test red — that converts one real failure into two confusing ones and
   * hides which was the cause.
   */
  async deleteIfExists(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch {
      // Intentionally swallowed. See doc comment above.
    }
  }

  /** Bulk helper for seeding a list view. One call per project, but issued
   *  concurrently — a serial loop of 20 creates is a slow test for no reason. */
  async createMany(projects: NewProject[]): Promise<Project[]> {
    return Promise.all(projects.map((p) => this.create(p)));
  }
}
