const BASE = "/api";

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`GET ${path}: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`POST ${path}: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`PATCH ${path}: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  delete: async (path: string): Promise<void> => {
    const res = await fetch(`${BASE}${path}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error(`DELETE ${path}: ${res.status}`);
    }
  },
};
