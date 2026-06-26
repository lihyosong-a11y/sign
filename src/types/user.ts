export interface TeacherUser {
  id: string;
  username: string;
  name: string;
  organization?: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}
