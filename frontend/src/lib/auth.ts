export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "coordinator" | "member" | "approver" | "auditor";
  department_id?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("ordo_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ordo_token", token);
    localStorage.setItem("ordo_user", JSON.stringify(user));
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ordo_token");
    localStorage.removeItem("ordo_user");
  }
}

