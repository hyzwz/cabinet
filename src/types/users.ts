export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface JwtPayload {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export type PageVisibility = "team" | "private";
