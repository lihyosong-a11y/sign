import type { DatabaseState, Event } from "../types";
import { readDatabase, sortEvents, writeDatabase } from "./localDatabase";
import { supabaseDatabase, withSupabaseFallback } from "./supabaseDatabase";

export const eventService = {
  async getEvents(): Promise<Event[]> {
    return withSupabaseFallback(
      "행사 목록 조회",
      (client) => supabaseDatabase.getEvents(client),
      () => sortEvents(readDatabase().events),
    );
  },

  async getEventById(eventId: string): Promise<Event | undefined> {
    return withSupabaseFallback(
      "행사 단건 조회",
      (client) => supabaseDatabase.getEventById(client, eventId),
      () => readDatabase().events.find((event) => event.id === eventId),
    );
  },

  async getEventsByOwner(ownerUserId: string): Promise<Event[]> {
    return withSupabaseFallback(
      "담당자 행사 목록 조회",
      (client) => supabaseDatabase.getEventsByOwner(client, ownerUserId),
      () => sortEvents(readDatabase().events.filter((event) => event.ownerUserId === ownerUserId)),
    );
  },

  async getEventSummaries(): Promise<DatabaseState> {
    return withSupabaseFallback(
      "전체 현황 조회",
      (client) => supabaseDatabase.getState(client),
      () => {
        const state = readDatabase();
        return {
          events: sortEvents(state.events),
          participants: state.participants,
          users: state.users,
        };
      },
    );
  },

  async saveEvent(event: Event): Promise<void> {
    return withSupabaseFallback(
      "행사 저장",
      (client) => supabaseDatabase.saveEvent(client, event),
      () => {
        const state = readDatabase();
        const index = state.events.findIndex((item) => item.id === event.id);

        if (index >= 0) {
          state.events[index] = event;
        } else {
          state.events.push(event);
        }

        writeDatabase(state);
      },
    );
  },

  async deleteEvent(eventId: string): Promise<void> {
    return withSupabaseFallback(
      "행사 삭제",
      (client) => supabaseDatabase.deleteEvent(client, eventId),
      () => {
        const state = readDatabase();
        writeDatabase({
          events: state.events.filter((event) => event.id !== eventId),
          participants: state.participants.filter((participant) => participant.eventId !== eventId),
          users: state.users,
        });
      },
    );
  },

  async seedSampleData(sampleState: DatabaseState): Promise<void> {
    return withSupabaseFallback(
      "시연용 데이터 저장",
      (client) => supabaseDatabase.seedSampleData(client, sampleState),
      () => writeDatabase(sampleState),
    );
  },
};
