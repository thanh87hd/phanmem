export interface UserRole {
  id: number;
  name: string;
  permissions?: string;
}

export interface UserProfile {
  id?: number;
  userId?: number; // fallback depending on token format
  username?: string;
  fullName?: string;
  email?: string;
  department?: string;
  teamCode?: string;
  role?: string | UserRole;
  permissions?: string; // dynamic permissions string directly in user profile
}
