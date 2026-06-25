export type { Event, EventCategory } from "./event";
export { EVENT_CATEGORIES } from "./event";
export type {
  AttendanceStatus,
  AttendanceType,
  Participant,
  ParticipantDraft,
  RegistrationSource,
} from "./participant";
export {
  ATTENDANCE_STATUSES,
  ATTENDANCE_TYPES as ATTENDANCE_MODES,
  ATTENDANCE_TYPES,
  REGISTRATION_SOURCES,
  attendanceStatusLabels,
  registrationSourceLabels,
} from "./participant";

export type EventItem = import("./event").Event;
export type AttendanceMode = import("./participant").AttendanceType;

export interface DatabaseState {
  events: import("./event").Event[];
  participants: import("./participant").Participant[];
}
