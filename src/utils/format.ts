import type { Event, Participant } from "../types";

export const createId = (prefix: string) => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 11);

  return `${prefix}-${random}`;
};

export const toDateTimeInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export const formatDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatShortDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, "");

export const normalizeName = (name: string) => name.trim().replace(/\s+/g, "");

export const isValidPhone = (phone: string) => /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone.trim());

export const maskPhone = (phone: string) => {
  const numbers = normalizePhone(phone);
  if (numbers.length < 4) return "****";
  return `****-${numbers.slice(-4)}`;
};

export const isRegistrationClosed = (event: Event) => {
  if (!event.isPublicRegistrationOpen) return true;
  if (!event.registrationDeadline) return false;
  return new Date(event.registrationDeadline).getTime() < Date.now();
};

export const isDeadlinePassed = (event: Event) => {
  if (!event.registrationDeadline) return false;
  return new Date(event.registrationDeadline).getTime() < Date.now();
};

export const isCapacityFull = (event: Event, count: number) => {
  return typeof event.capacity === "number" && event.capacity > 0 && count >= event.capacity;
};

export const getEventStatusText = (event: Event, count: number) => {
  const capacity = event.capacity ? `정원 ${event.capacity}명` : "정원 제한 없음";
  return `신청 ${count}명 / ${capacity}`;
};

export const duplicateKey = (name: string, phone: string) => {
  return `${normalizeName(name)}::${normalizePhone(phone)}`;
};

export const findDuplicateGroups = (participants: Participant[]) => {
  const groups = new Map<string, Participant[]>();

  participants.forEach((participant) => {
    const key = duplicateKey(participant.name, participant.phone);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(participant);
  });

  return Array.from(groups.values()).filter((group) => group.length > 1);
};

export const hasDuplicateParticipant = (
  participants: Participant[],
  name: string,
  phone: string,
  ignoreParticipantId?: string,
) => {
  const target = duplicateKey(name, phone);
  return participants.some(
    (participant) => participant.id !== ignoreParticipantId && duplicateKey(participant.name, participant.phone) === target,
  );
};

const getAppBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredUrl || window.location.origin;
  return baseUrl.replace(/\/+$/, "");
};

export const getPublicEventUrl = (eventId: string) => {
  return `${getAppBaseUrl()}/event/${eventId}`;
};

export const getAttendanceUrl = (eventId: string) => {
  return `${getAppBaseUrl()}/event/${eventId}/attendance`;
};
