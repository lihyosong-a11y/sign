export const EVENT_CATEGORIES = ["연수", "회의", "워크숍", "행사", "기타"] as const;
export const PUBLIC_REGISTRATION_MODES = ["new", "pre_registered_signature", "both"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type PublicRegistrationMode = (typeof PUBLIC_REGISTRATION_MODES)[number];

export interface PublicRegistrationSettings {
  mode: PublicRegistrationMode;
  collectPhone: boolean;
  requirePhone: boolean;
  collectEmail: boolean;
  requireEmail: boolean;
  collectAttendanceType: boolean;
  collectNote: boolean;
}

export const defaultPublicRegistrationSettings: PublicRegistrationSettings = {
  mode: "new",
  collectPhone: false,
  requirePhone: false,
  collectEmail: false,
  requireEmail: false,
  collectAttendanceType: true,
  collectNote: true,
};

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  eventDate: string;
  location?: string;
  managerName?: string;
  description?: string;
  capacity?: number;
  isPublicRegistrationOpen: boolean;
  registrationDeadline?: string;
  publicRegistrationSettings: PublicRegistrationSettings;
  createdAt: string;
  updatedAt?: string;
}
