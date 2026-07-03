export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "moderator";
  is_active: boolean;
  created_at: string;
};
