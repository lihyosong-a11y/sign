import {
  defaultPublicRegistrationSettings,
  type DatabaseState,
  type Event,
  type Participant,
  type PublicRegistrationSettings,
  type TeacherUser,
} from "../types";
import { sortEvents, sortParticipants } from "./localDatabase";
import { supabase } from "./supabaseClient";

type SupabaseClient = NonNullable<typeof supabase>;

type EventRow = {
  id: string;
  title: string;
  category: Event["category"];
  event_date: string;
  location: string | null;
  manager_name: string | null;
  description: string | null;
  capacity: number | null;
  is_public_registration_open: boolean;
  registration_deadline: string | null;
  public_registration_settings: Partial<PublicRegistrationSettings> | null;
  admin_password_hash: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type ParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  organization: string;
  phone: string | null;
  email: string | null;
  attendance_type: Participant["attendanceType"];
  registration_source: Participant["registrationSource"];
  attendance_status: Participant["attendanceStatus"];
  note: string | null;
  signed: boolean | null;
  signature_data_url: string | null;
  created_at: string;
};

type TeacherUserRow = {
  id: string;
  username: string;
  name: string;
  organization: string | null;
  password_hash: string;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

const warnAndFallback = (scope: string, error: unknown) => {
  console.warn(`[Supabase] ${scope} 실패. localStorage 저장소로 대체합니다.`, error);
};

export class StorageRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageRuleError";
  }
}

export const withSupabaseFallback = async <T>(
  scope: string,
  supabaseOperation: (client: SupabaseClient) => Promise<T>,
  localOperation: () => Promise<T> | T,
) => {
  if (!supabase) return localOperation();

  try {
    return await supabaseOperation(supabase);
  } catch (error) {
    if (error instanceof StorageRuleError) throw error;
    warnAndFallback(scope, error);
    return localOperation();
  }
};

const ensureNoError = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const toEvent = (row: EventRow): Event => ({
  id: row.id,
  title: row.title,
  category: row.category,
  eventDate: row.event_date,
  location: row.location || undefined,
  managerName: row.manager_name || undefined,
  description: row.description || undefined,
  capacity: row.capacity ?? undefined,
  isPublicRegistrationOpen: row.is_public_registration_open,
  registrationDeadline: row.registration_deadline || undefined,
  publicRegistrationSettings: {
    ...defaultPublicRegistrationSettings,
    ...(row.public_registration_settings ?? {}),
  },
  adminPasswordHash: row.admin_password_hash || undefined,
  ownerUserId: row.owner_user_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
});

export const fromEvent = (event: Event): EventRow => ({
  id: event.id,
  title: event.title,
  category: event.category,
  event_date: event.eventDate,
  location: event.location || null,
  manager_name: event.managerName || null,
  description: event.description || null,
  capacity: event.capacity ?? null,
  is_public_registration_open: event.isPublicRegistrationOpen,
  registration_deadline: event.registrationDeadline || null,
  public_registration_settings: event.publicRegistrationSettings,
  admin_password_hash: event.adminPasswordHash || null,
  owner_user_id: event.ownerUserId || null,
  created_at: event.createdAt,
  updated_at: event.updatedAt || null,
});

export const toParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  eventId: row.event_id,
  name: row.name,
  organization: row.organization,
  phone: row.phone ?? "",
  email: row.email || undefined,
  attendanceType: row.attendance_type,
  registrationSource: row.registration_source,
  attendanceStatus: row.attendance_status,
  note: row.note || undefined,
  createdAt: row.created_at,
  signed: row.signed ?? Boolean(row.signature_data_url),
  signatureDataUrl: row.signature_data_url || undefined,
});

export const fromParticipant = (participant: Participant): ParticipantRow => ({
  id: participant.id,
  event_id: participant.eventId,
  name: participant.name,
  organization: participant.organization,
  phone: participant.phone ?? "",
  email: participant.email || null,
  attendance_type: participant.attendanceType,
  registration_source: participant.registrationSource,
  attendance_status: participant.attendanceStatus,
  note: participant.note || null,
  signed: participant.signed,
  signature_data_url: participant.signatureDataUrl || null,
  created_at: participant.createdAt,
});

export const toTeacherUser = (row: TeacherUserRow): TeacherUser => ({
  id: row.id,
  username: row.username,
  name: row.name,
  organization: row.organization || undefined,
  passwordHash: row.password_hash,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
});

export const fromTeacherUser = (user: TeacherUser): TeacherUserRow => ({
  id: user.id,
  username: user.username,
  name: user.name,
  organization: user.organization || null,
  password_hash: user.passwordHash,
  active: user.active,
  created_at: user.createdAt,
  updated_at: user.updatedAt || null,
});

export const supabaseDatabase = {
  async getEvents(client: SupabaseClient) {
    const data = ensureNoError(
      await client.from("events").select("*").order("event_date", { ascending: true }),
    ) as EventRow[] | null;
    return sortEvents((data ?? []).map(toEvent));
  },

  async getEventById(client: SupabaseClient, eventId: string) {
    const data = ensureNoError(
      await client.from("events").select("*").eq("id", eventId).maybeSingle(),
    ) as EventRow | null;
    return data ? toEvent(data) : undefined;
  },

  async getEventsByOwner(client: SupabaseClient, ownerUserId: string) {
    const data = ensureNoError(
      await client.from("events").select("*").eq("owner_user_id", ownerUserId).order("event_date", { ascending: true }),
    ) as EventRow[] | null;
    return sortEvents((data ?? []).map(toEvent));
  },

  async saveEvent(client: SupabaseClient, event: Event) {
    ensureNoError(await client.from("events").upsert(fromEvent(event)));
  },

  async deleteEvent(client: SupabaseClient, eventId: string) {
    ensureNoError(await client.from("events").delete().eq("id", eventId));
  },

  async getParticipants(client: SupabaseClient) {
    const data = ensureNoError(
      await client.from("participants").select("*").order("created_at", { ascending: true }),
    ) as ParticipantRow[] | null;
    return sortParticipants((data ?? []).map(toParticipant));
  },

  async getParticipantsByEventId(client: SupabaseClient, eventId: string) {
    const data = ensureNoError(
      await client
        .from("participants")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
    ) as ParticipantRow[] | null;
    return sortParticipants((data ?? []).map(toParticipant));
  },

  async getParticipantsByEventIds(client: SupabaseClient, eventIds: string[]) {
    if (eventIds.length === 0) return [];

    const data = ensureNoError(
      await client
        .from("participants")
        .select("*")
        .in("event_id", eventIds)
        .order("created_at", { ascending: true }),
    ) as ParticipantRow[] | null;
    return sortParticipants((data ?? []).map(toParticipant));
  },

  async countParticipantsByEventId(client: SupabaseClient, eventId: string) {
    const { count, error } = await client
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (error) throw error;
    return count ?? 0;
  },

  async saveParticipant(client: SupabaseClient, participant: Participant) {
    ensureNoError(await client.from("participants").upsert(fromParticipant(participant)));
  },

  async saveParticipants(client: SupabaseClient, participants: Participant[]) {
    if (participants.length === 0) return;
    ensureNoError(await client.from("participants").upsert(participants.map(fromParticipant)));
  },

  async deleteParticipant(client: SupabaseClient, participantId: string) {
    ensureNoError(await client.from("participants").delete().eq("id", participantId));
  },

  async updateParticipant(client: SupabaseClient, participantId: string, values: Partial<ParticipantRow>) {
    ensureNoError(await client.from("participants").update(values).eq("id", participantId));
  },

  async updateParticipantAndReturn(client: SupabaseClient, participantId: string, values: Partial<ParticipantRow>) {
    const data = ensureNoError(
      await client.from("participants").update(values).eq("id", participantId).select("*").maybeSingle(),
    ) as ParticipantRow | null;
    return data ? toParticipant(data) : undefined;
  },

  async getTeacherUsers(client: SupabaseClient) {
    const data = ensureNoError(
      await client.from("teacher_users").select("*").order("name", { ascending: true }),
    ) as TeacherUserRow[] | null;
    return (data ?? []).map(toTeacherUser);
  },

  async getTeacherUserById(client: SupabaseClient, userId: string) {
    const data = ensureNoError(
      await client.from("teacher_users").select("*").eq("id", userId).maybeSingle(),
    ) as TeacherUserRow | null;
    return data ? toTeacherUser(data) : undefined;
  },

  async getTeacherUserByUsername(client: SupabaseClient, username: string) {
    const data = ensureNoError(
      await client.from("teacher_users").select("*").eq("username", username).maybeSingle(),
    ) as TeacherUserRow | null;
    return data ? toTeacherUser(data) : undefined;
  },

  async saveTeacherUser(client: SupabaseClient, user: TeacherUser) {
    ensureNoError(await client.from("teacher_users").upsert(fromTeacherUser(user)));
  },

  async setTeacherUserActive(client: SupabaseClient, userId: string, active: boolean) {
    ensureNoError(
      await client
        .from("teacher_users")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", userId),
    );
  },

  async deleteTeacherUser(client: SupabaseClient, userId: string) {
    ensureNoError(await client.from("teacher_users").delete().eq("id", userId));
  },

  async teacherUserHasEvents(client: SupabaseClient, userId: string) {
    const { count, error } = await client
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", userId);

    if (error) throw error;
    return Boolean(count);
  },

  async getState(client: SupabaseClient): Promise<DatabaseState> {
    const [events, participants, users] = await Promise.all([
      this.getEvents(client),
      this.getParticipants(client),
      this.getTeacherUsers(client),
    ]);

    return { events, participants, users };
  },

  async seedSampleData(client: SupabaseClient, sampleState: DatabaseState) {
    if (sampleState.users.length > 0) {
      ensureNoError(await client.from("teacher_users").upsert(sampleState.users.map(fromTeacherUser)));
    }

    if (sampleState.events.length > 0) {
      ensureNoError(await client.from("events").upsert(sampleState.events.map(fromEvent)));
    }

    if (sampleState.participants.length > 0) {
      ensureNoError(await client.from("participants").upsert(sampleState.participants.map(fromParticipant)));
    }
  },
};
