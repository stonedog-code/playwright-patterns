/**
 * Response shapes from the application's HTTP API.
 *
 * These are hand-written here for the example. In a real repo, generate them
 * from the OpenAPI schema (`openapi-typescript`) and check the generated file
 * in. Hand-maintained types drift from the API silently, and a drifted type is
 * worse than no type: it makes the compiler agree with a wrong assumption.
 */

export interface AuthToken {
  token: string;
  expiresAt: string;
  userId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  visibility: 'private' | 'public';
  createdAt: string;
  ownerId: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'member' | 'viewer';
}
