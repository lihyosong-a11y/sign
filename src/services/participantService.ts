import type { AttendanceStatus, Participant } from "../types";
import { duplicateKey, normalizeName } from "../utils/format";
import { readDatabase, sortParticipants, writeDatabase } from "./localDatabase";

export type PublicSignatureCandidate = Pick<Participant, "id" | "name" | "organization" | "attendanceType" | "signed">;

export const participantService = {
  async getAllParticipantsForAdmin(): Promise<Participant[]> {
    return sortParticipants(readDatabase().participants);
  },

  async getParticipantsByEventIdForAdmin(eventId: string): Promise<Participant[]> {
    return sortParticipants(readDatabase().participants.filter((participant) => participant.eventId === eventId));
  },

  async getPublicRegistrationSummary(eventId: string): Promise<{ count: number }> {
    const count = readDatabase().participants.filter((participant) => participant.eventId === eventId).length;
    return { count };
  },

  async getPublicSignatureCandidates(eventId: string): Promise<PublicSignatureCandidate[]> {
    return sortParticipants(
      readDatabase().participants.filter(
        (participant) => participant.eventId === eventId && participant.registrationSource === "admin",
      ),
    ).map(({ id, name, organization, attendanceType, signed }) => ({
      id,
      name,
      organization,
      attendanceType,
      signed,
    }));
  },

  async hasDuplicateInEvent(eventId: string, name: string, phone: string, ignoreParticipantId?: string): Promise<boolean> {
    const target = duplicateKey(name, phone);
    return readDatabase().participants.some(
      (participant) =>
        participant.eventId === eventId &&
        participant.id !== ignoreParticipantId &&
        duplicateKey(participant.name, participant.phone) === target,
    );
  },

  async hasNameInEvent(eventId: string, name: string, ignoreParticipantId?: string): Promise<boolean> {
    const target = normalizeName(name);
    return readDatabase().participants.some(
      (participant) =>
        participant.eventId === eventId &&
        participant.id !== ignoreParticipantId &&
        normalizeName(participant.name) === target,
    );
  },

  async saveParticipant(participant: Participant): Promise<void> {
    const state = readDatabase();
    const index = state.participants.findIndex((item) => item.id === participant.id);

    if (index >= 0) {
      state.participants[index] = participant;
    } else {
      state.participants.push(participant);
    }

    writeDatabase(state);
  },

  async saveParticipants(participants: Participant[]): Promise<void> {
    const state = readDatabase();
    const incomingIds = new Set(participants.map((participant) => participant.id));
    writeDatabase({
      ...state,
      participants: [
        ...state.participants.filter((participant) => !incomingIds.has(participant.id)),
        ...participants,
      ],
    });
  },

  async deleteParticipant(participantId: string): Promise<void> {
    const state = readDatabase();
    writeDatabase({
      ...state,
      participants: state.participants.filter((participant) => participant.id !== participantId),
    });
  },

  async setAttendanceStatus(participantId: string, attendanceStatus: AttendanceStatus): Promise<void> {
    const state = readDatabase();
    writeDatabase({
      ...state,
      participants: state.participants.map((participant) =>
        participant.id === participantId ? { ...participant, attendanceStatus } : participant,
      ),
    });
  },

  async setSigned(participantId: string, signed: boolean): Promise<void> {
    const state = readDatabase();
    writeDatabase({
      ...state,
      participants: state.participants.map((participant) =>
        participant.id === participantId
          ? { ...participant, signed, signatureDataUrl: signed ? participant.signatureDataUrl : undefined }
          : participant,
      ),
    });
  },

  async saveSignature(participantId: string, signatureDataUrl: string): Promise<void> {
    const state = readDatabase();
    writeDatabase({
      ...state,
      participants: state.participants.map((participant) =>
        participant.id === participantId
          ? { ...participant, signed: true, signatureDataUrl }
          : participant,
      ),
    });
  },

  async confirmPublicSignature(participantId: string, signatureDataUrl: string): Promise<Participant | undefined> {
    const state = readDatabase();
    let savedParticipant: Participant | undefined;

    const participants = state.participants.map((participant) => {
      if (participant.id !== participantId) return participant;

      savedParticipant = {
        ...participant,
        signed: true,
        signatureDataUrl,
        attendanceStatus: "참석",
      };
      return savedParticipant;
    });

    writeDatabase({ ...state, participants });
    return savedParticipant;
  },
};
