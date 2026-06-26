import type { Event } from "../types";

const ADMIN_SESSION_KEY = "teacher-event-admin-authenticated";
const EVENT_SESSION_PREFIX = "teacher-event-admin-event:";

const localHashPassword = (password: string) => {
  let hash = 5381;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash * 33) ^ password.charCodeAt(index);
  }
  return `local-${(hash >>> 0).toString(36)}`;
};

export const authService = {
  hashPassword(password: string) {
    return localHashPassword(password.trim());
  },

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

  isEventAuthenticated(eventId: string) {
    return sessionStorage.getItem(`${EVENT_SESSION_PREFIX}${eventId}`) === "true";
  },

  rememberEventAccess(eventId: string) {
    sessionStorage.setItem(`${EVENT_SESSION_PREFIX}${eventId}`, "true");
  },

  async signInToEvent(event: Event, password: string) {
    const normalized = password.trim();
    const success = event.adminPasswordHash
      ? localHashPassword(normalized) === event.adminPasswordHash
      : await this.signInWithPassword(normalized);

    if (success) this.rememberEventAccess(event.id);
    return success;
  },

  signOutEvent(eventId: string) {
    sessionStorage.removeItem(`${EVENT_SESSION_PREFIX}${eventId}`);
  },

  signOut() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(EVENT_SESSION_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  },
};
