import type { Event, TeacherUser } from "../types";
import { readDatabase } from "./localDatabase";

const ADMIN_SESSION_KEY = "teacher-event-admin-authenticated";
const TEACHER_SESSION_KEY = "teacher-event-teacher-user-id";
const EVENT_SESSION_PREFIX = "teacher-event-admin-event:";
const normalizeUsername = (username: string) => username.trim().toLowerCase();

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

  getCurrentTeacherUserId() {
    return sessionStorage.getItem(TEACHER_SESSION_KEY);
  },

  getCurrentTeacherUser(): TeacherUser | null {
    const userId = this.getCurrentTeacherUserId();
    if (!userId) return null;

    const user = readDatabase().users.find((item) => item.id === userId && item.active);
    return user ?? null;
  },

  async signInTeacher(username: string, password: string) {
    const normalizedUsername = normalizeUsername(username);
    const passwordHash = localHashPassword(password.trim());
    const user = readDatabase().users.find(
      (item) => item.active && item.username === normalizedUsername && item.passwordHash === passwordHash,
    );

    if (user) {
      sessionStorage.setItem(TEACHER_SESSION_KEY, user.id);
      return user;
    }

    return null;
  },

  canManageEvent(event: Event) {
    if (this.isAdminAuthenticated()) return true;
    const teacherUserId = this.getCurrentTeacherUserId();
    return Boolean(teacherUserId && event.ownerUserId && teacherUserId === event.ownerUserId);
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

  signOutTeacher() {
    sessionStorage.removeItem(TEACHER_SESSION_KEY);
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(EVENT_SESSION_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  },

  signOut() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(TEACHER_SESSION_KEY);
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(EVENT_SESSION_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  },
};
