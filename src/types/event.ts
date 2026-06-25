export const EVENT_CATEGORIES = ["연수", "회의", "워크숍", "행사", "기타"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

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
  createdAt: string;
  updatedAt?: string;
}
