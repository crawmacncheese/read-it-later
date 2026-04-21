import type { AppUser, AuthResponse } from "@/lib/types";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>;
    if (typeof data.error === "string") return data.error;
    if (data.fields && typeof data.fields === "object") {
      const fields = data.fields as Record<string, string>;
      const first = Object.values(fields)[0];
      if (first) return String(first);
    }
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export async function loginRequest(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<AuthResponse>;
}

export async function registerRequest(
  username: string,
  email: string,
  password: string
): Promise<AppUser> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<AppUser>;
}

export async function fetchProfile(token: string): Promise<AppUser> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/users/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<AppUser>;
}
