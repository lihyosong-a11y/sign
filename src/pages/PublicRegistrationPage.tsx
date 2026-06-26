import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, MapPin, UserPlus, Users } from "lucide-react";
import { SignatureInput } from "../components/SignatureInput";
import { eventService } from "../services/eventService";
import { participantService, type PublicSignatureCandidate } from "../services/participantService";
import {
  ATTENDANCE_TYPES,
  defaultPublicRegistrationSettings,
  type AttendanceType,
  type Event,
  type Participant,
  type ParticipantDraft,
} from "../types";
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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

function PublicRegistrationPage() {
  const { eventId } = useParams();
  const [revision, setRevision] = useState(0);
  const [event, setEvent] = useState<Event | undefined>();
  const [participantCount, setParticipantCount] = useState(0);
  const [signatureCandidates, setSignatureCandidates] = useState<PublicSignatureCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ParticipantDraft>(emptyForm);
  const [selectedSignatureParticipantId, setSelectedSignatureParticipantId] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>();
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);
  const [completionType, setCompletionType] = useState<"registration" | "signature">("registration");

  useEffect(() => {
    let active = true;
    if (!eventId) return;

    setLoading(true);
    Promise.all([
      eventService.getEventById(eventId),
      participantService.getPublicRegistrationSummary(eventId),
      participantService.getPublicSignatureCandidates(eventId),
    ])
      .then(([nextEvent, summary, candidates]) => {
        if (!active) return;
        setEvent(nextEvent);
        setParticipantCount(summary.count);
        setSignatureCandidates(candidates);
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
          <p className="mt-2 text-sm leading-6 text-ink-500">
            등록 링크 주소가 맞더라도 현재 테스트 저장소는 기기별로 저장됩니다. PC에서 만든 행사는 휴대폰에 자동으로 공유되지 않으므로,
            실제 QR 운영 전에는 Supabase 연결이 필요합니다.
          </p>
        </section>
      </main>
    );
  }

  const publicSettings = {
    ...defaultPublicRegistrationSettings,
    ...event.publicRegistrationSettings,
  };
  const allowsNewRegistration = publicSettings.mode === "new" || publicSettings.mode === "both";
  const allowsPreRegisteredSignature = publicSettings.mode === "pre_registered_signature" || publicSettings.mode === "both";
  const deadlinePassed = isDeadlinePassed(event);
  const capacityFull = isCapacityFull(event, participantCount);
  const newRegistrationBlocked = !allowsNewRegistration || !event.isPublicRegistrationOpen || deadlinePassed || capacityFull;
  const newRegistrationMessage = !allowsNewRegistration
    ? "이 행사는 새 참가자 등록을 받지 않습니다."
    : !event.isPublicRegistrationOpen
      ? "현재 공개 등록을 받지 않습니다."
      : deadlinePassed
        ? "등록이 마감되었습니다."
        : capacityFull
          ? "정원이 모두 찼습니다. 담당자에게 대기 신청 가능 여부를 문의해 주세요."
          : "";
  const signatureBlocked = !allowsPreRegisteredSignature || !event.isPublicRegistrationOpen;
  const signatureMessage = !allowsPreRegisteredSignature
    ? "이 행사는 사전 명단 서명을 사용하지 않습니다."
    : !event.isPublicRegistrationOpen
      ? "현재 공개 서명을 받지 않습니다."
      : "";
  const publicStatusText = !event.isPublicRegistrationOpen
    ? "공개 등록 꺼짐"
    : allowsNewRegistration && !newRegistrationBlocked
      ? "새 등록 가능"
      : allowsPreRegisteredSignature && !signatureBlocked
        ? "사전 명단 서명 가능"
        : newRegistrationMessage || signatureMessage || "등록 불가";
  const publicStatusClass =
    !event.isPublicRegistrationOpen || (allowsNewRegistration && newRegistrationBlocked && !allowsPreRegisteredSignature)
      ? "bg-amber-50 text-amber-700"
      : "bg-school-50 text-school-700";
  const unsignedSignatureCandidates = signatureCandidates.filter((candidate) => !candidate.signed);
  const selectedSignatureCandidate = signatureCandidates.find((candidate) => candidate.id === selectedSignatureParticipantId);
  const privacyFields = [
    "성명",
    "소속",
    publicSettings.collectPhone ? "연락처" : "",
    publicSettings.collectEmail ? "이메일" : "",
    publicSettings.collectAttendanceType ? "참석 형태" : "",
    publicSettings.collectNote ? "기타 요청 사항" : "",
    "서명",
  ].filter(Boolean);

  const validate = () => {
    const nextErrors: string[] = [];
    if (!form.name.trim()) nextErrors.push("성명을 입력해 주세요.");
    if (!form.organization.trim()) nextErrors.push("소속 학교 또는 부서를 입력해 주세요.");
    if (publicSettings.collectPhone && !form.phone.trim()) {
      nextErrors.push("연락처를 입력해 주세요.");
    } else if (publicSettings.collectPhone && form.phone.trim() && !isValidPhone(form.phone)) {
      nextErrors.push("연락처 형식을 확인해 주세요. 예: 010-1234-5678");
    }
    if (publicSettings.collectEmail && !form.email.trim()) {
      nextErrors.push("이메일을 입력해 주세요.");
    } else if (publicSettings.collectEmail && form.email.trim() && !isValidEmail(form.email)) {
      nextErrors.push("이메일 형식을 확인해 주세요.");
    }
    if (publicSettings.collectNote && !form.note.trim()) {
      nextErrors.push("기타 요청 사항을 입력해 주세요.");
    }
    if (!privacyAgreed) nextErrors.push("개인정보 수집 및 이용에 동의해 주세요.");
    if (!form.signatureDataUrl) nextErrors.push("서명을 입력하거나 서명 이미지를 업로드해 주세요.");
    return nextErrors;
  };

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setErrors([]);
    setDuplicateWarning("");

    if (newRegistrationBlocked) {
      setErrors([newRegistrationMessage]);
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
      phone: publicSettings.collectPhone ? form.phone.trim() : "",
      email: publicSettings.collectEmail ? form.email.trim() : "",
      attendanceType: publicSettings.collectAttendanceType ? form.attendanceType : "미정",
      note: publicSettings.collectNote ? form.note.trim() : "",
      signatureDataUrl: form.signatureDataUrl,
    };

    const hasDuplicate = normalized.phone
      ? await participantService.hasDuplicateInEvent(event.id, normalized.name, normalized.phone)
      : await participantService.hasNameInEvent(event.id, normalized.name);

    if (hasDuplicate && !duplicateAcknowledged) {
      setDuplicateWarning(
        normalized.phone
          ? "같은 이름과 연락처로 이미 등록된 내역이 있습니다. 본인 등록이 맞다면 한 번 더 등록 버튼을 눌러 주세요."
          : "같은 이름으로 이미 등록된 내역이 있습니다. 본인 등록이 맞다면 한 번 더 등록 버튼을 눌러 주세요.",
      );
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
      signed: Boolean(normalized.signatureDataUrl),
      signatureDataUrl: normalized.signatureDataUrl,
    };

    await participantService.saveParticipant(participant);
    setRegisteredParticipant(participant);
    setCompletionType("registration");
    setForm(emptyForm);
    setPrivacyAgreed(false);
    setDuplicateAcknowledged(false);
    setRevision((value) => value + 1);
  };

  const handleSignatureSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setErrors([]);
    setDuplicateWarning("");

    if (signatureBlocked) {
      setErrors([signatureMessage]);
      return;
    }

    if (!selectedSignatureParticipantId) {
      setErrors(["사전 등록 명단에서 본인 이름을 선택해 주세요."]);
      return;
    }

    if (selectedSignatureCandidate?.signed) {
      setErrors(["이미 서명이 완료된 참가자입니다."]);
      return;
    }

    if (!signatureDataUrl) {
      setErrors(["서명을 입력하거나 서명 이미지를 업로드해 주세요."]);
      return;
    }

    if (!privacyAgreed) {
      setErrors(["개인정보 수집 및 이용에 동의해 주세요."]);
      return;
    }

    const signedParticipant = await participantService.confirmPublicSignature(selectedSignatureParticipantId, signatureDataUrl);
    if (!signedParticipant) {
      setErrors(["서명 대상자를 찾을 수 없습니다. 담당자에게 문의해 주세요."]);
      return;
    }

    setRegisteredParticipant(signedParticipant);
    setCompletionType("signature");
    setSelectedSignatureParticipantId("");
    setSignatureDataUrl(undefined);
    setPrivacyAgreed(false);
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
                  <h2 className="mt-3 text-xl font-semibold text-ink-900">
                    {completionType === "signature" ? "서명이 완료되었습니다." : "등록이 완료되었습니다."}
                  </h2>
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
                    {completionType === "signature" ? "출석 서명이 저장되었습니다." : "변경이나 취소가 필요한 경우 담당자에게 문의해 주세요."}
                    {event.managerName ? ` 담당자: ${event.managerName}` : ""}
                  </p>
                  <button
                    className="btn-secondary mt-5"
                    type="button"
                    onClick={() => {
                      setRegisteredParticipant(null);
                      setErrors([]);
                    }}
                  >
                    다른 사람 등록 또는 서명하기
                  </button>
                </section>
              ) : (
                <div className="grid gap-5">
                  {errors.length > 0 ? (
                    <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  ) : null}

                  {allowsPreRegisteredSignature ? (
                    signatureBlocked ? (
                      <section className="rounded-lg border border-amber-100 bg-amber-50 p-5">
                        <AlertCircle className="text-amber-700" size={34} aria-hidden="true" />
                        <h2 className="mt-3 text-xl font-semibold text-ink-900">{signatureMessage}</h2>
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          행사 참여와 관련해 확인이 필요하면 담당자에게 문의해 주세요.
                          {event.managerName ? ` 담당자: ${event.managerName}` : ""}
                        </p>
                      </section>
                    ) : (
                      <form className="grid gap-4 rounded-lg border border-ink-200 p-4" onSubmit={handleSignatureSubmit}>
                        <div>
                          <h2 className="text-lg font-semibold text-ink-900">사전 등록자 서명</h2>
                          <p className="mt-1 text-sm text-ink-600">담당자가 미리 등록한 명단에서 본인을 선택하고 서명합니다.</p>
                        </div>

                        {unsignedSignatureCandidates.length > 0 ? (
                          <>
                            <label>
                              <span className="field-label">본인 선택 *</span>
                              <select
                                className="field-input"
                                value={selectedSignatureParticipantId}
                                onChange={(event) => {
                                  setSelectedSignatureParticipantId(event.target.value);
                                  setSignatureDataUrl(undefined);
                                }}
                              >
                                <option value="">이름을 선택해 주세요</option>
                                {unsignedSignatureCandidates.map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {candidate.name} · {candidate.organization}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {selectedSignatureCandidate ? (
                              <div className="rounded-md border border-school-100 bg-school-50 px-3 py-2 text-sm text-school-800">
                                {selectedSignatureCandidate.name} / {selectedSignatureCandidate.organization} / {selectedSignatureCandidate.attendanceType}
                              </div>
                            ) : null}

                            <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
                              <SignatureInput value={signatureDataUrl} onChange={setSignatureDataUrl} compact />
                            </div>

                            <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm leading-6 text-ink-700">
                              <input
                                className="mt-1 h-4 w-4 rounded border-ink-300 text-school-600 focus:ring-school-600"
                                type="checkbox"
                                checked={privacyAgreed}
                                onChange={(event) => setPrivacyAgreed(event.target.checked)}
                              />
                              <span>
                                출석 확인을 위해 성명, 소속, 서명 정보를 확인하고 행사 종료 후 관리 목적에 맞게 보관하는 것에 동의합니다.
                              </span>
                            </label>

                            <button className="btn-primary w-full sm:w-auto" type="submit">
                              <CheckCircle2 size={18} aria-hidden="true" />
                              서명 완료
                            </button>
                          </>
                        ) : (
                          <p className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
                            현재 서명을 받을 사전 등록자가 없습니다. 명단이 보이지 않으면 담당자에게 문의해 주세요.
                          </p>
                        )}
                      </form>
                    )
                  ) : null}

                  {allowsNewRegistration ? (
                    newRegistrationBlocked ? (
                      <section className="rounded-lg border border-amber-100 bg-amber-50 p-5">
                        <AlertCircle className="text-amber-700" size={34} aria-hidden="true" />
                        <h2 className="mt-3 text-xl font-semibold text-ink-900">{newRegistrationMessage}</h2>
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          행사 참여와 관련해 확인이 필요하면 담당자에게 문의해 주세요.
                          {event.managerName ? ` 담당자: ${event.managerName}` : ""}
                        </p>
                      </section>
                    ) : (
                      <form className="grid gap-4 rounded-lg border border-ink-200 p-4" onSubmit={handleSubmit}>
                        <div>
                          <h2 className="text-lg font-semibold text-ink-900">새 참가자 등록</h2>
                        </div>
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

                        {publicSettings.collectPhone || publicSettings.collectEmail ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {publicSettings.collectPhone ? (
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
                            ) : null}
                            {publicSettings.collectEmail ? (
                              <label>
                                <span className="field-label">이메일 *</span>
                                <input
                                  className="field-input"
                                  type="email"
                                  value={form.email}
                                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                />
                              </label>
                            ) : null}
                          </div>
                        ) : null}

                        {publicSettings.collectAttendanceType ? (
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
                        ) : null}

                        {publicSettings.collectNote ? (
                          <label>
                            <span className="field-label">기타 요청 사항 *</span>
                            <textarea
                              className="field-input min-h-24 resize-y"
                              value={form.note}
                              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                            />
                          </label>
                        ) : null}

                        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
                          <SignatureInput
                            value={form.signatureDataUrl}
                            onChange={(signatureDataUrl) => setForm((current) => ({ ...current, signatureDataUrl }))}
                            compact
                          />
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm leading-6 text-ink-700">
                          <input
                            className="mt-1 h-4 w-4 rounded border-ink-300 text-school-600 focus:ring-school-600"
                            type="checkbox"
                            checked={privacyAgreed}
                            onChange={(event) => setPrivacyAgreed(event.target.checked)}
                          />
                          <span>
                            행사 신청 및 출석 확인을 위해 {privacyFields.join(", ")} 정보를 수집하고 행사 종료 후 관리 목적에 맞게 보관하는 것에 동의합니다.
                          </span>
                        </label>

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
                    )
                  ) : null}
                </div>
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
                    <span className={`badge ${publicStatusClass}`}>
                      {publicStatusText}
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
