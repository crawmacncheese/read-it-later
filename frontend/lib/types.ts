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
