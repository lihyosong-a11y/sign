import type { DatabaseState, Event } from "../types";
import { readDatabase, sortEvents, writeDatabase } from "./localDatabase";

export const eventService = {
  async getEvents(): Promise<Event[]> {
    return sortEvents(readDatabase().events);
  },

  async getEventById(eventId: string): Promise<Event | undefined> {
    return readDatabase().events.find((event) => event.id === eventId);
  },

  async getEventsByOwner(ownerUserId: string): Promise<Event[]> {
    return sortEvents(readDatabase().events.filter((event) => event.ownerUserId === ownerUserId));
  },

  async getEventSummaries(): Promise<DatabaseState> {
    const state = readDatabase();
    return {
      events: sortEvents(state.events),
      participants: state.participants,
      users: state.users,
    };
  },

  async saveEvent(event: Event): Promise<void> {
    const state = readDatabase();
    const index = state.events.findIndex((item) => item.id === event.id);

    if (index >= 0) {
      state.events[index] = event;
    } else {
      state.events.push(event);
    }

    writeDatabase(state);
  },

  async deleteEvent(eventId: string): Promise<void> {
    const state = readDatabase();
    writeDatabase({
      events: state.events.filter((event) => event.id !== eventId),
      participants: state.participants.filter((participant) => participant.eventId !== eventId),
      users: state.users,
    });
  },

  async seedSampleData(sampleState: DatabaseState): Promise<void> {
    writeDatabase(sampleState);
  },
};
