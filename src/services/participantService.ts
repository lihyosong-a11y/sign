import type { AttendanceStatus, Participant } from "../types";
import { duplicateKey, normalizeName } from "../utils/format";
import { readDatabase, sortParticipants, writeDatabase } from "./localDatabase";
import { supabaseDatabase, withSupabaseFallback } from "./supabaseDatabase";

export type PublicSignatureCandidate = Pick<Participant, "id" | "name" | "organization" | "attendanceType" | "signed">;

export const participantService = {
  async getAllParticipantsForAdmin(): Promise<Participant[]> {
    return withSupabaseFallback(
      "전체 참가자 조회",
      (client) => supabaseDatabase.getParticipants(client),
      () => sortParticipants(readDatabase().participants),
    );
  },

  async getParticipantsByEventIdForAdmin(eventId: string): Promise<Participant[]> {
    return withSupabaseFallback(
      "행사별 참가자 조회",
      (client) => supabaseDatabase.getParticipantsByEventId(client, eventId),
      () => sortParticipants(readDatabase().participants.filter((participant) => participant.eventId === eventId)),
    );
  },

  async getParticipantsByEventIdsForAdmin(eventIds: string[]): Promise<Participant[]> {
    return withSupabaseFallback(
      "여러 행사 참가자 조회",
      (client) => supabaseDatabase.getParticipantsByEventIds(client, eventIds),
      () => {
        const eventIdSet = new Set(eventIds);
        return sortParticipants(readDatabase().participants.filter((participant) => eventIdSet.has(participant.eventId)));
      },
    );
  },

  async getPublicRegistrationSummary(eventId: string): Promise<{ count: number }> {
    return withSupabaseFallback(
      "공개 등록 인원 조회",
      async (client) => ({ count: await supabaseDatabase.countParticipantsByEventId(client, eventId) }),
      () => {
        const count = readDatabase().participants.filter((participant) => participant.eventId === eventId).length;
        return { count };
      },
    );
  },

  async getPublicSignatureCandidates(eventId: string): Promise<PublicSignatureCandidate[]> {
    return withSupabaseFallback(
      "공개 서명 대상자 조회",
      async (client) =>
        (await supabaseDatabase.getParticipantsByEventId(client, eventId))
          .filter((participant) => participant.registrationSource === "admin")
          .map(({ id, name, organization, attendanceType, signed }) => ({
            id,
            name,
            organization,
            attendanceType,
            signed,
          })),
      () =>
        sortParticipants(
          readDatabase().participants.filter(
            (participant) => participant.eventId === eventId && participant.registrationSource === "admin",
          ),
        ).map(({ id, name, organization, attendanceType, signed }) => ({
          id,
          name,
          organization,
          attendanceType,
          signed,
        })),
    );
  },

  async hasDuplicateInEvent(eventId: string, name: string, phone: string, ignoreParticipantId?: string): Promise<boolean> {
    const target = duplicateKey(name, phone);
    return withSupabaseFallback(
      "중복 참가자 조회",
      async (client) =>
        (await supabaseDatabase.getParticipantsByEventId(client, eventId)).some(
          (participant) =>
            participant.id !== ignoreParticipantId && duplicateKey(participant.name, participant.phone) === target,
        ),
      () =>
        readDatabase().participants.some(
          (participant) =>
            participant.eventId === eventId &&
            participant.id !== ignoreParticipantId &&
            duplicateKey(participant.name, participant.phone) === target,
        ),
    );
  },

  async hasNameInEvent(eventId: string, name: string, ignoreParticipantId?: string): Promise<boolean> {
    const target = normalizeName(name);
    return withSupabaseFallback(
      "이름 중복 조회",
      async (client) =>
        (await supabaseDatabase.getParticipantsByEventId(client, eventId)).some(
          (participant) => participant.id !== ignoreParticipantId && normalizeName(participant.name) === target,
        ),
      () =>
        readDatabase().participants.some(
          (participant) =>
            participant.eventId === eventId &&
            participant.id !== ignoreParticipantId &&
            normalizeName(participant.name) === target,
        ),
    );
  },

  async saveParticipant(participant: Participant): Promise<void> {
    return withSupabaseFallback(
      "참가자 저장",
      (client) => supabaseDatabase.saveParticipant(client, participant),
      () => {
        const state = readDatabase();
        const index = state.participants.findIndex((item) => item.id === participant.id);

        if (index >= 0) {
          state.participants[index] = participant;
        } else {
          state.participants.push(participant);
        }

        writeDatabase(state);
      },
    );
  },

  async saveParticipants(participants: Participant[]): Promise<void> {
    return withSupabaseFallback(
      "참가자 일괄 저장",
      (client) => supabaseDatabase.saveParticipants(client, participants),
      () => {
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
    );
  },

  async deleteParticipant(participantId: string): Promise<void> {
    return withSupabaseFallback(
      "참가자 삭제",
      (client) => supabaseDatabase.deleteParticipant(client, participantId),
      () => {
        const state = readDatabase();
        writeDatabase({
          ...state,
          participants: state.participants.filter((participant) => participant.id !== participantId),
        });
      },
    );
  },

  async setAttendanceStatus(participantId: string, attendanceStatus: AttendanceStatus): Promise<void> {
    return withSupabaseFallback(
      "참석 상태 저장",
      (client) => supabaseDatabase.updateParticipant(client, participantId, { attendance_status: attendanceStatus }),
      () => {
        const state = readDatabase();
        writeDatabase({
          ...state,
          participants: state.participants.map((participant) =>
            participant.id === participantId ? { ...participant, attendanceStatus } : participant,
          ),
        });
      },
    );
  },

  async setSigned(participantId: string, signed: boolean): Promise<void> {
    return withSupabaseFallback(
      "서명 여부 저장",
      (client) =>
        supabaseDatabase.updateParticipant(
          client,
          participantId,
          signed ? { signed } : { signed, signature_data_url: null },
        ),
      () => {
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
    );
  },

  async saveSignature(participantId: string, signatureDataUrl: string): Promise<void> {
    return withSupabaseFallback(
      "서명 저장",
      (client) =>
        supabaseDatabase.updateParticipant(client, participantId, {
          signed: true,
          signature_data_url: signatureDataUrl,
        }),
      () => {
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
    );
  },

  async confirmPublicSignature(participantId: string, signatureDataUrl: string): Promise<Participant | undefined> {
    return withSupabaseFallback(
      "공개 서명 확정",
      (client) =>
        supabaseDatabase.updateParticipantAndReturn(client, participantId, {
          signed: true,
          signature_data_url: signatureDataUrl,
          attendance_status: "참석",
        }),
      () => {
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
    );
  },
};
