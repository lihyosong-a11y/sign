export const ATTENDANCE_TYPES = ["대면", "온라인", "미정"] as const;
export const REGISTRATION_SOURCES = ["admin", "self"] as const;
export const ATTENDANCE_STATUSES = ["예정", "참석", "미참석"] as const;

export type AttendanceType = (typeof ATTENDANCE_TYPES)[number];
export type RegistrationSource = (typeof REGISTRATION_SOURCES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  organization: string;
  phone: string;
  email?: string;
  attendanceType: AttendanceType;
  registrationSource: RegistrationSource;
  attendanceStatus: AttendanceStatus;
  note?: string;
  createdAt: string;
  signed: boolean;
  signatureDataUrl?: string;
}

export interface ParticipantDraft {
  name: string;
  organization: string;
  phone: string;
  email: string;
  attendanceType: AttendanceType;
  note: string;
  signatureDataUrl?: string;
}

export const registrationSourceLabels: Record<RegistrationSource, string> = {
  admin: "관리자 사전 등록",
  self: "본인 직접 등록",
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  예정: "예정",
  참석: "참석",
  미참석: "미참석",
};
