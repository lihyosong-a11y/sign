import type { TeacherUser } from "../types";
import { readDatabase, writeDatabase } from "./localDatabase";
import { StorageRuleError, supabaseDatabase, withSupabaseFallback } from "./supabaseDatabase";

const normalizeUsername = (username: string) => username.trim().toLowerCase();

const sortUsers = (users: TeacherUser[]) =>
  [...users].sort((a, b) => a.name.localeCompare(b.name, "ko-KR") || a.username.localeCompare(b.username));

export const userService = {
  normalizeUsername,

  async getTeacherUsers(): Promise<TeacherUser[]> {
    return withSupabaseFallback(
      "담당자 계정 목록 조회",
      (client) => supabaseDatabase.getTeacherUsers(client),
      () => sortUsers(readDatabase().users),
    );
  },

  async getTeacherUserById(userId: string): Promise<TeacherUser | undefined> {
    return withSupabaseFallback(
      "담당자 계정 조회",
      (client) => supabaseDatabase.getTeacherUserById(client, userId),
      () => readDatabase().users.find((user) => user.id === userId),
    );
  },

  async getTeacherUserByUsername(username: string): Promise<TeacherUser | undefined> {
    const normalized = normalizeUsername(username);
    return withSupabaseFallback(
      "담당자 로그인 계정 조회",
      (client) => supabaseDatabase.getTeacherUserByUsername(client, normalized),
      () => readDatabase().users.find((user) => user.username === normalized),
    );
  },

  async isUsernameTaken(username: string, ignoreUserId?: string): Promise<boolean> {
    const normalized = normalizeUsername(username);
    return withSupabaseFallback(
      "아이디 중복 조회",
      async (client) => {
        const user = await supabaseDatabase.getTeacherUserByUsername(client, normalized);
        return Boolean(user && user.id !== ignoreUserId);
      },
      () => readDatabase().users.some((user) => user.id !== ignoreUserId && user.username === normalized),
    );
  },

  async saveTeacherUser(user: TeacherUser): Promise<void> {
    const normalizedUser = {
      ...user,
      username: normalizeUsername(user.username),
    };

    return withSupabaseFallback(
      "담당자 계정 저장",
      (client) => supabaseDatabase.saveTeacherUser(client, normalizedUser),
      () => {
        const state = readDatabase();
        const index = state.users.findIndex((item) => item.id === user.id);

        if (index >= 0) {
          state.users[index] = normalizedUser;
        } else {
          state.users.push(normalizedUser);
        }

        writeDatabase(state);
      },
    );
  },

  async setTeacherUserActive(userId: string, active: boolean): Promise<void> {
    return withSupabaseFallback(
      "담당자 계정 활성 상태 저장",
      (client) => supabaseDatabase.setTeacherUserActive(client, userId, active),
      () => {
        const state = readDatabase();
        writeDatabase({
          ...state,
          users: state.users.map((user) =>
            user.id === userId ? { ...user, active, updatedAt: new Date().toISOString() } : user,
          ),
        });
      },
    );
  },

  async deleteTeacherUser(userId: string): Promise<void> {
    return withSupabaseFallback(
      "담당자 계정 삭제",
      async (client) => {
        const user = await supabaseDatabase.getTeacherUserById(client, userId);

        if (user?.active && (await supabaseDatabase.teacherUserHasEvents(client, userId))) {
          throw new StorageRuleError("이 계정으로 만든 행사가 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
        }

        await supabaseDatabase.deleteTeacherUser(client, userId);
      },
      () => {
        const state = readDatabase();
        const user = state.users.find((item) => item.id === userId);

        if (user?.active && state.events.some((event) => event.ownerUserId === userId)) {
          throw new Error("이 계정으로 만든 행사가 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
        }

        writeDatabase({
          ...state,
          events: state.events.map((event) =>
            event.ownerUserId === userId ? { ...event, ownerUserId: undefined, updatedAt: new Date().toISOString() } : event,
          ),
          users: state.users.filter((user) => user.id !== userId),
        });
      },
    );
  },
};
