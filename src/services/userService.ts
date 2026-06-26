import type { TeacherUser } from "../types";
import { readDatabase, writeDatabase } from "./localDatabase";

const normalizeUsername = (username: string) => username.trim().toLowerCase();

const sortUsers = (users: TeacherUser[]) =>
  [...users].sort((a, b) => a.name.localeCompare(b.name, "ko-KR") || a.username.localeCompare(b.username));

export const userService = {
  normalizeUsername,

  async getTeacherUsers(): Promise<TeacherUser[]> {
    return sortUsers(readDatabase().users);
  },

  async getTeacherUserById(userId: string): Promise<TeacherUser | undefined> {
    return readDatabase().users.find((user) => user.id === userId);
  },

  async isUsernameTaken(username: string, ignoreUserId?: string): Promise<boolean> {
    const normalized = normalizeUsername(username);
    return readDatabase().users.some((user) => user.id !== ignoreUserId && user.username === normalized);
  },

  async saveTeacherUser(user: TeacherUser): Promise<void> {
    const state = readDatabase();
    const normalizedUser = {
      ...user,
      username: normalizeUsername(user.username),
    };
    const index = state.users.findIndex((item) => item.id === user.id);

    if (index >= 0) {
      state.users[index] = normalizedUser;
    } else {
      state.users.push(normalizedUser);
    }

    writeDatabase(state);
  },

  async setTeacherUserActive(userId: string, active: boolean): Promise<void> {
    const state = readDatabase();
    writeDatabase({
      ...state,
      users: state.users.map((user) =>
        user.id === userId ? { ...user, active, updatedAt: new Date().toISOString() } : user,
      ),
    });
  },

  async deleteTeacherUser(userId: string): Promise<void> {
    const state = readDatabase();

    if (state.events.some((event) => event.ownerUserId === userId)) {
      throw new Error("이 계정으로 만든 행사가 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
    }

    writeDatabase({
      ...state,
      users: state.users.filter((user) => user.id !== userId),
    });
  },
};
