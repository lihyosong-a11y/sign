import { defaultPublicRegistrationSettings, type DatabaseState, type Event, type Participant } from "../types";
import { authService } from "../services/authService";
import { createId, toDateTimeInputValue } from "../utils/format";

const futureDate = (days: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return toDateTimeInputValue(date);
};

const makeParticipant = (
  eventId: string,
  name: string,
  organization: string,
  phone: string,
  registrationSource: Participant["registrationSource"],
  attendanceType: Participant["attendanceType"],
  note = "",
): Participant => ({
  id: createId("participant"),
  eventId,
  name,
  organization,
  phone,
  email: `${name.replace(/\s/g, "").toLowerCase()}@school.kr`,
  attendanceType,
  note,
  registrationSource,
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000).toISOString(),
  attendanceStatus: "예정",
  signed: false,
});

export const buildSampleData = (): DatabaseState => {
  const samplePasswordHash = authService.hashPassword("teacher1234");
  const aiEvent: Event = {
    id: createId("event"),
    title: "AI 활용 수업 연수",
    category: "연수",
    eventDate: futureDate(7, 15),
    location: "본관 3층 스마트교실",
    managerName: "교육연구부 김지윤",
    description: "생성형 AI를 활용한 수업 설계와 평가 사례를 함께 살펴보는 교사 연수입니다.",
    capacity: 30,
    isPublicRegistrationOpen: true,
    registrationDeadline: futureDate(5, 17),
    publicRegistrationSettings: defaultPublicRegistrationSettings,
    adminPasswordHash: samplePasswordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const scienceEvent: Event = {
    id: createId("event"),
    title: "과학 탐구 수업 워크숍",
    category: "워크숍",
    eventDate: futureDate(14, 14),
    location: "과학실 2",
    managerName: "과학부 박민석",
    description: "실험 안전, 탐구 보고서 지도, 소그룹 실습 중심으로 운영됩니다.",
    capacity: 24,
    isPublicRegistrationOpen: true,
    registrationDeadline: futureDate(12, 12),
    publicRegistrationSettings: {
      ...defaultPublicRegistrationSettings,
      mode: "pre_registered_signature",
    },
    adminPasswordHash: samplePasswordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const digitalEvent: Event = {
    id: createId("event"),
    title: "디지털 도구 활용 교사 연수",
    category: "연수",
    eventDate: futureDate(21, 10),
    location: "온라인 Zoom",
    managerName: "정보부 이서연",
    description: "수업 자료 제작, 협업 문서, 온라인 평가 도구를 실제 업무 흐름에 맞게 실습합니다.",
    capacity: 50,
    isPublicRegistrationOpen: true,
    registrationDeadline: futureDate(19, 18),
    publicRegistrationSettings: {
      ...defaultPublicRegistrationSettings,
      mode: "both",
      collectPhone: true,
      requirePhone: true,
      collectEmail: true,
      requireEmail: true,
    },
    adminPasswordHash: samplePasswordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    events: [aiEvent, scienceEvent, digitalEvent],
    participants: [
      makeParticipant(aiEvent.id, "강민준", "한빛초등학교", "010-2354-1188", "admin", "대면", "교내 전달 연수 예정"),
      makeParticipant(aiEvent.id, "이하은", "늘봄중학교", "010-8845-7712", "self", "온라인"),
      makeParticipant(aiEvent.id, "정서우", "푸른고등학교", "010-4455-1209", "admin", "대면"),
      makeParticipant(aiEvent.id, "이하은", "늘봄중학교", "010-8845-7712", "self", "온라인", "중복 확인용 예시"),
      makeParticipant(scienceEvent.id, "오지훈", "강변중학교", "010-9133-5004", "admin", "대면"),
      makeParticipant(scienceEvent.id, "문소라", "새솔초등학교", "010-7611-9382", "self", "대면", "주차 가능 여부 문의"),
      makeParticipant(scienceEvent.id, "백하린", "미래고등학교", "010-2044-6627", "admin", "미정"),
      makeParticipant(digitalEvent.id, "최윤재", "도담초등학교", "010-6402-8851", "admin", "온라인"),
      makeParticipant(digitalEvent.id, "김나연", "서문중학교", "010-5091-2345", "self", "온라인"),
      makeParticipant(digitalEvent.id, "한도윤", "교육지원청", "010-3902-8194", "admin", "대면"),
    ],
  };
};
