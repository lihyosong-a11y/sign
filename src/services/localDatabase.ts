import { defaultPublicRegistrationSettings, type DatabaseState, type Event, type Participant, type TeacherUser } from "../types";

const STORAGE_KEY = "teacher-event-attendance:v2";
const LEGACY_STORAGE_KEY = "teacher-event-attendance:v1";

const emptyState: DatabaseState = {
  events: [],
  participants: [],
  users: [],
};

type LegacyEvent = {
  id: string;
  title: string;
  category: Event["category"];
  startAt?: string;
  eventDate?: string;
  location?: string;
  manager?: string;
  managerName?: string;
  description?: string;
  capacity?: number;
  publicRegistrationEnabled?: boolean;
  isPublicRegistrationOpen?: boolean;
  registrationDeadline?: string;
  publicRegistrationSettings?: Partial<Event["publicRegistrationSettings"]>;
  adminPasswordHash?: string;
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LegacyParticipant = {
  id: string;
  eventId: string;
  name: string;
  organization: string;
  phone: string;
  email?: string;
  attendanceMode?: Participant["attendanceType"];
  attendanceType?: Participant["attendanceType"];
  source?: "admin" | "public" | "self";
  registrationSource?: Participant["registrationSource"];
  registeredAt?: string;
  createdAt?: string;
  attendanceStatus?: Participant["attendanceStatus"] | "pending" | "attended" | "absent";
  signed?: boolean;
  signatureDataUrl?: string;
  note?: string;
};

type LegacyUser = {
  id: string;
  username: string;
  name: string;
  organization?: string;
  passwordHash: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const toAttendanceStatus = (value: LegacyParticipant["attendanceStatus"]): Participant["attendanceStatus"] => {
  if (value === "attended" || value === "참석") return "참석";
  if (value === "absent" || value === "미참석") return "미참석";
  return "예정";
};

const normalizeEvent = (event: LegacyEvent): Event => ({
  id: event.id,
  title: event.title,
  category: event.category,
  eventDate: event.eventDate ?? event.startAt ?? new Date().toISOString(),
  location: event.location || undefined,
  managerName: event.managerName ?? event.manager ?? undefined,
  description: event.description || undefined,
  capacity: event.capacity,
  isPublicRegistrationOpen: event.isPublicRegistrationOpen ?? event.publicRegistrationEnabled ?? true,
  registrationDeadline: event.registrationDeadline || undefined,
  publicRegistrationSettings: {
    ...defaultPublicRegistrationSettings,
    ...event.publicRegistrationSettings,
    requirePhone:
      event.publicRegistrationSettings?.collectPhone === false
        ? false
        : (event.publicRegistrationSettings?.requirePhone ?? defaultPublicRegistrationSettings.requirePhone),
    requireEmail:
      event.publicRegistrationSettings?.collectEmail === false
        ? false
        : (event.publicRegistrationSettings?.requireEmail ?? defaultPublicRegistrationSettings.requireEmail),
  },
  adminPasswordHash: event.adminPasswordHash,
  ownerUserId: event.ownerUserId,
  createdAt: event.createdAt ?? new Date().toISOString(),
  updatedAt: event.updatedAt,
});

const normalizeParticipant = (participant: LegacyParticipant): Participant => ({
  id: participant.id,
  eventId: participant.eventId,
  name: participant.name,
  organization: participant.organization,
  phone: participant.phone ?? "",
  email: participant.email || undefined,
  attendanceType: participant.attendanceType ?? participant.attendanceMode ?? "미정",
  registrationSource:
    participant.registrationSource ?? (participant.source === "admin" ? "admin" : "self"),
  attendanceStatus: toAttendanceStatus(participant.attendanceStatus),
  note: participant.note || undefined,
  createdAt: participant.createdAt ?? participant.registeredAt ?? new Date().toISOString(),
  signed: participant.signed ?? Boolean(participant.signatureDataUrl),
  signatureDataUrl: participant.signatureDataUrl || undefined,
});

const normalizeUser = (user: LegacyUser): TeacherUser => ({
  id: user.id,
  username: user.username.trim().toLowerCase(),
  name: user.name,
  organization: user.organization || undefined,
  passwordHash: user.passwordHash,
  active: user.active ?? true,
  createdAt: user.createdAt ?? new Date().toISOString(),
  updatedAt: user.updatedAt,
});

const normalizeState = (
  state: Partial<DatabaseState> & { events?: LegacyEvent[]; participants?: LegacyParticipant[]; users?: LegacyUser[] },
) => ({
  events: Array.isArray(state.events) ? state.events.map(normalizeEvent) : [],
  participants: Array.isArray(state.participants) ? state.participants.map(normalizeParticipant) : [],
  users: Array.isArray(state.users) ? state.users.map(normalizeUser) : [],
});

export const readDatabase = (): DatabaseState => {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return emptyState;

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState;
  }
};

export const writeDatabase = (state: DatabaseState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const sortEvents = (events: Event[]) =>
  [...events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

export const sortParticipants = (participants: Participant[]) =>
  [...participants].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
