/** Mirrors backend `AppUserDTO` JSON (password is never returned). */
export type AppUser = {
  id: number;
  username: string;
  email: string;
  roles: string;
};

export type AuthResponse = {
  token: string;
  user: AppUser;
};

export type BookmarkListItem = {
  id: number;
  url: string;
  title: string | null;
  tags: string[];
  priority: number | null;
  createdAt: string; // ISO string from backend
};

export type BookmarkDetail = {
  id: number;
  url: string;
  title: string | null;
  content: string | null;
  summary: string | null;
  tags: string[];
  priority: number | null;
  createdAt: string;
  updatedAt: string;
};
