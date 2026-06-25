const ADMIN_SESSION_KEY = "teacher-event-admin-authenticated";

export const authService = {
  isAdminAuthenticated() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
  },

  async signInWithPassword(password: string) {
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || "teacher1234";
    const success = password === expectedPassword;

    if (success) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    }

    return success;
  },

  signOut() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  },
};
