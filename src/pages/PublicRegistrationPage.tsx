import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, MapPin, UserPlus, Users } from "lucide-react";
import { eventService } from "../services/eventService";
import { participantService } from "../services/participantService";
import { ATTENDANCE_TYPES, type AttendanceType, type Event, type Participant, type ParticipantDraft } from "../types";
import {
  createId,
  formatDateTime,
  getEventStatusText,
  isCapacityFull,
  isDeadlinePassed,
  isValidPhone,
} from "../utils/format";

const emptyForm: ParticipantDraft = {
  name: "",
  organization: "",
  phone: "",
  email: "",
  attendanceType: "대면",
  note: "",
};

function PublicRegistrationPage() {
  const { eventId } = useParams();
  const [revision, setRevision] = useState(0);
  const [event, setEvent] = useState<Event | undefined>();
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ParticipantDraft>(emptyForm);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    let active = true;
    if (!eventId) return;

    setLoading(true);
    Promise.all([
      eventService.getEventById(eventId),
      participantService.getPublicRegistrationSummary(eventId),
    ])
      .then(([nextEvent, summary]) => {
        if (!active) return;
        setEvent(nextEvent);
        setParticipantCount(summary.count);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId, revision]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-xl font-semibold text-ink-900">행사 정보를 불러오는 중입니다</h1>
        </section>
      </main>
    );
  }

  if (!event || !eventId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <AlertCircle className="mx-auto text-red-600" size={36} aria-hidden="true" />
          <h1 className="mt-3 text-xl font-semibold text-ink-900">행사를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-ink-500">등록 링크 주소를 다시 확인해 주세요.</p>
        </section>
      </main>
    );
  }

  const deadlinePassed = isDeadlinePassed(event);
  const capacityFull = isCapacityFull(event, participantCount);
  const registrationBlocked = !event.isPublicRegistrationOpen || deadlinePassed || capacityFull;
  const registrationMessage = !event.isPublicRegistrationOpen
    ? "현재 공개 등록을 받지 않습니다."
    : deadlinePassed
      ? "등록이 마감되었습니다."
      : capacityFull
        ? "정원이 모두 찼습니다. 담당자에게 대기 신청 가능 여부를 문의해 주세요."
        : "";

  const validate = () => {
    const nextErrors: string[] = [];
    if (!form.name.trim()) nextErrors.push("성명을 입력해 주세요.");
    if (!form.organization.trim()) nextErrors.push("소속 학교 또는 부서를 입력해 주세요.");
    if (!form.phone.trim()) {
      nextErrors.push("연락처를 입력해 주세요.");
    } else if (!isValidPhone(form.phone)) {
      nextErrors.push("연락처 형식을 확인해 주세요. 예: 010-1234-5678");
    }
    if (!privacyAgreed) nextErrors.push("개인정보 수집 및 이용에 동의해 주세요.");
    return nextErrors;
  };

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setErrors([]);
    setDuplicateWarning("");

    if (registrationBlocked) {
      setErrors([registrationMessage]);
      return;
    }

    const nextErrors = validate();
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    const normalized = {
      name: form.name.trim(),
      organization: form.organization.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      attendanceType: form.attendanceType,
      note: form.note.trim(),
    };

    if (
      (await participantService.hasDuplicateInEvent(event.id, normalized.name, normalized.phone)) &&
      !duplicateAcknowledged
    ) {
      setDuplicateWarning("같은 이름과 연락처로 이미 등록된 내역이 있습니다. 본인 등록이 맞다면 한 번 더 등록 버튼을 눌러 주세요.");
      setDuplicateAcknowledged(true);
      return;
    }

    const participant: Participant = {
      id: createId("participant"),
      eventId: event.id,
      name: normalized.name,
      organization: normalized.organization,
      phone: normalized.phone,
      email: normalized.email || undefined,
      attendanceType: normalized.attendanceType,
      note: normalized.note || undefined,
      registrationSource: "self",
      createdAt: new Date().toISOString(),
      attendanceStatus: "예정",
      signed: false,
    };

    await participantService.saveParticipant(participant);
    setRegisteredParticipant(participant);
    setForm(emptyForm);
    setPrivacyAgreed(false);
    setDuplicateAcknowledged(false);
    setRevision((value) => value + 1);
  };

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-soft">
          <div className="border-b border-ink-200 bg-school-600 px-5 py-6 text-white sm:px-7">
            <p className="text-sm font-semibold text-school-100">행사 참가 신청</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{event.title}</h1>
            <div className="mt-4 grid gap-2 text-sm text-school-50 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <CalendarDays size={18} aria-hidden="true" />
                {formatDateTime(event.eventDate)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={18} aria-hidden="true" />
                {event.location || "장소 미정"}
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_320px]">
            <div>
              {registeredParticipant ? (
                <section className="rounded-lg border border-school-100 bg-school-50 p-5">
                  <CheckCircle2 className="text-school-700" size={34} aria-hidden="true" />
                  <h2 className="mt-3 text-xl font-semibold text-ink-900">등록이 완료되었습니다.</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-ink-700">행사명</dt>
                      <dd className="mt-1 text-ink-900">{event.title}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink-700">행사 일시</dt>
                      <dd className="mt-1 text-ink-900">{formatDateTime(event.eventDate)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink-700">장소</dt>
                      <dd className="mt-1 text-ink-900">{event.location || "장소 미정"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink-700">참석 형태</dt>
                      <dd className="mt-1 text-ink-900">{registeredParticipant.attendanceType}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm leading-6 text-ink-700">
                    변경이나 취소가 필요한 경우 담당자에게 문의해 주세요.
                    {event.managerName ? ` 담당자: ${event.managerName}` : ""}
                  </p>
                  <button className="btn-secondary mt-5" type="button" onClick={() => setRegisteredParticipant(null)}>
                    다른 사람 등록하기
                  </button>
                </section>
              ) : registrationBlocked ? (
                <section className="rounded-lg border border-amber-100 bg-amber-50 p-5">
                  <AlertCircle className="text-amber-700" size={34} aria-hidden="true" />
                  <h2 className="mt-3 text-xl font-semibold text-ink-900">{registrationMessage}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    행사 참여와 관련해 확인이 필요하면 담당자에게 문의해 주세요.
                    {event.managerName ? ` 담당자: ${event.managerName}` : ""}
                  </p>
                </section>
              ) : (
                <form className="grid gap-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="field-label">성명 *</span>
                      <input
                        className="field-input"
                        value={form.name}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, name: event.target.value }));
                          setDuplicateAcknowledged(false);
                        }}
                      />
                    </label>
                    <label>
                      <span className="field-label">소속 학교 또는 부서 *</span>
                      <input
                        className="field-input"
                        value={form.organization}
                        onChange={(event) => setForm((current) => ({ ...current, organization: event.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="field-label">연락처 *</span>
                      <input
                        className="field-input"
                        value={form.phone}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, phone: event.target.value }));
                          setDuplicateAcknowledged(false);
                        }}
                        placeholder="010-1234-5678"
                      />
                    </label>
                    <label>
                      <span className="field-label">이메일</span>
                      <input
                        className="field-input"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>
                  </div>
                  <label>
                    <span className="field-label">참석 형태</span>
                    <select
                      className="field-input"
                      value={form.attendanceType}
                      onChange={(event) => setForm((current) => ({ ...current, attendanceType: event.target.value as AttendanceType }))}
                    >
                      {ATTENDANCE_TYPES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">기타 요청 사항</span>
                    <textarea
                      className="field-input min-h-24 resize-y"
                      value={form.note}
                      onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm leading-6 text-ink-700">
                    <input
                      className="mt-1 h-4 w-4 rounded border-ink-300 text-school-600 focus:ring-school-600"
                      type="checkbox"
                      checked={privacyAgreed}
                      onChange={(event) => setPrivacyAgreed(event.target.checked)}
                    />
                    <span>
                      행사 신청 및 출석 확인을 위해 성명, 소속, 연락처, 이메일 정보를 수집하고 행사 종료 후 관리 목적에 맞게 보관하는 것에 동의합니다.
                    </span>
                  </label>

                  {errors.length > 0 ? (
                    <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  ) : null}

                  {duplicateWarning ? (
                    <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                      {duplicateWarning}
                    </div>
                  ) : null}

                  <button className="btn-primary w-full sm:w-auto" type="submit">
                    <UserPlus size={18} aria-hidden="true" />
                    {duplicateAcknowledged ? "중복 가능성 확인 후 등록" : "참가 신청하기"}
                  </button>
                </form>
              )}
            </div>

            <aside className="rounded-lg border border-ink-200 bg-ink-50 p-5">
              <h2 className="text-base font-semibold text-ink-900">행사 정보</h2>
              <dl className="mt-4 grid gap-4 text-sm">
                <div>
                  <dt className="font-semibold text-ink-700">신청 현황</dt>
                  <dd className="mt-1 flex items-center gap-2 text-ink-900">
                    <Users size={16} aria-hidden="true" />
                    {getEventStatusText(event, participantCount)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-700">등록 마감</dt>
                  <dd className="mt-1 text-ink-900">
                    {event.registrationDeadline ? formatDateTime(event.registrationDeadline) : "마감 일시 없음"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-700">마감 여부</dt>
                  <dd className="mt-1">
                    <span className={`badge ${registrationBlocked ? "bg-amber-50 text-amber-700" : "bg-school-50 text-school-700"}`}>
                      {registrationBlocked ? registrationMessage : "등록 가능"}
                    </span>
                  </dd>
                </div>
                {event.managerName ? (
                  <div>
                    <dt className="font-semibold text-ink-700">담당자</dt>
                    <dd className="mt-1 text-ink-900">{event.managerName}</dd>
                  </div>
                ) : null}
              </dl>

              {event.description ? (
                <div className="mt-5 border-t border-ink-200 pt-5">
                  <h2 className="text-base font-semibold text-ink-900">행사 안내문</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">{event.description}</p>
                </div>
              ) : null}

              <Link className="mt-5 inline-flex text-sm font-semibold text-school-700 hover:text-school-900" to="/admin">
                관리자 화면
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PublicRegistrationPage;
