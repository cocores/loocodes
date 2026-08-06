import type { Bathroom, NewBathroom } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (!isJson) {
    // e.g. `vite dev` has no /api routes and falls back to serving index.html —
    // use `vercel dev` instead to exercise the serverless functions locally.
    throw new Error(`No API route at ${path} (got non-JSON response, status ${res.status})`);
  }

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  list: () => request<Bathroom[]>("/api/bathrooms"),

  create: (bathroom: NewBathroom) =>
    request<Bathroom>("/api/bathrooms", {
      method: "POST",
      body: JSON.stringify(bathroom),
    }),

  voteUp: (id: string) => request<Bathroom>(`/api/bathrooms/${id}/vote`, { method: "POST" }),

  flag: (id: string) => request<Bathroom>(`/api/bathrooms/${id}/flag`, { method: "POST" }),

  suggest: (id: string, text: string, submittedBy: string) =>
    request<Bathroom>(`/api/bathrooms/${id}/suggestions`, {
      method: "POST",
      body: JSON.stringify({ text, submittedBy }),
    }),
};
