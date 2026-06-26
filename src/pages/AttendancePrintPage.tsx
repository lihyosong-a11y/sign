import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Printer } from "lucide-react";
import { EventPasswordGate } from "../components/EventPasswordGate";
import { authService } from "../services/authService";
import { eventService } from "../services/eventService";
import { participantService } from "../services/participantService";
import { attendanceStatusLabels, type Event, type Participant } from "../types";
import { formatDateTime, maskPhone } from "../utils/format";

type PrintRange = "all" | "onsite";

function AttendancePrintPage() {
  const { eventId } = useParams();

  return (
    <EventPasswordGate
      eventId={eventId}
      title="출석부 인쇄 비밀번호 확인"
      description="출석부에는 참가자 개인정보가 포함될 수 있어 행사 관리 비밀번호 확인 후 열립니다."
    >
      <AttendancePrintContent />
    </EventPasswordGate>
  );
}

function AttendancePrintContent() {
  const { eventId } = useParams();
  const [printRange, setPrintRange] = useState<PrintRange>("onsite");
  const [showFullPhone, setShowFullPhone] = useState(false);
  const [event, setEvent] = useState<Event | undefined>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!eventId) return;

    setLoading(true);
    Promise.all([
      eventService.getEventById(eventId),
      participantService.getParticipantsByEventIdForAdmin(eventId),
    ])
      .then(([nextEvent, nextParticipants]) => {
        if (!active) return;
        setEvent(nextEvent);
        setParticipants(nextParticipants);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-xl font-semibold text-ink-900">출석부를 불러오는 중입니다</h1>
        </section>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-xl font-semibold text-ink-900">출석부를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-ink-500">행사 주소를 다시 확인해 주세요.</p>
          <Link className="btn-secondary mt-5" to="/admin">
            관리자 화면으로 이동
          </Link>
        </section>
      </main>
    );
  }

  const faceToFaceParticipants = participants.filter((participant) => participant.attendanceType === "대면");
  const printParticipants = printRange === "onsite" ? faceToFaceParticipants : participants;
  const isTeacherOwner =
    Boolean(event.ownerUserId) && authService.getCurrentTeacherUserId() === event.ownerUserId && !authService.isAdminAuthenticated();
  const backPath = isTeacherOwner ? "/user" : "/admin";
  const backLabel = isTeacherOwner ? "담당자 화면" : "관리자 화면";
  const formatPhoneForPrint = (phone: string) => {
    if (!phone.trim()) return "-";
    return showFullPhone ? phone : maskPhone(phone);
  };

  return (
    <main className="print-page min-h-screen bg-ink-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-school-700">인쇄용 출석부</p>
          <h1 className="text-xl font-semibold text-ink-900">{event.title}</h1>
          <p className="mt-1 text-sm text-ink-500">브라우저 인쇄 창에서 PDF로 저장할 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to={backPath}>
            <ArrowLeft size={18} aria-hidden="true" />
            {backLabel}
          </Link>
          <div className="inline-flex rounded-md border border-ink-200 bg-white p-1">
            <button
              className={`min-h-9 rounded px-3 text-sm font-semibold ${printRange === "onsite" ? "bg-school-600 text-white" : "text-ink-700"}`}
              type="button"
              onClick={() => setPrintRange("onsite")}
            >
              대면 참석자만
            </button>
            <button
              className={`min-h-9 rounded px-3 text-sm font-semibold ${printRange === "all" ? "bg-school-600 text-white" : "text-ink-700"}`}
              type="button"
              onClick={() => setPrintRange("all")}
            >
              전체 신청자
            </button>
          </div>
          <button className="btn-secondary" type="button" onClick={() => setShowFullPhone((value) => !value)}>
            {showFullPhone ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            {showFullPhone ? "뒤 4자리 표시" : "전체 연락처 표시"}
          </button>
          <button className="btn-primary" type="button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            인쇄하기
          </button>
        </div>
      </div>

      <section className="print-sheet mx-auto max-w-5xl rounded-lg border border-ink-200 bg-white p-8 shadow-soft">
        <header className="border-b-2 border-ink-900 pb-5">
          <h1 className="text-center text-2xl font-bold text-ink-900">[{event.title}] 참가자 출석부</h1>
          <div className="mt-5 grid gap-2 text-sm text-ink-900 sm:grid-cols-2">
            <p>
              <span className="font-semibold">행사 일시:</span> {formatDateTime(event.eventDate)}
            </p>
            <p>
              <span className="font-semibold">장소:</span> {event.location || "장소 미정"}
            </p>
            <p>
              <span className="font-semibold">담당자:</span> {event.managerName || "-"}
            </p>
            <p>
              <span className="font-semibold">전체 등록 인원:</span> {participants.length}명
            </p>
            <p>
              <span className="font-semibold">대면 참석 예정 인원:</span> {faceToFaceParticipants.length}명
            </p>
            <p>
              <span className="font-semibold">인쇄 범위:</span> {printRange === "onsite" ? "대면 참석자" : "전체 신청자"} {printParticipants.length}명
            </p>
          </div>
        </header>

        <table className="print-table mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ink-100">
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">번호</th>
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">성명</th>
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">소속</th>
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">연락처</th>
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">참석 형태</th>
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">참석 확인</th>
              <th className="w-32 border border-ink-700 px-2 py-2 text-center font-semibold">서명</th>
              <th className="border border-ink-700 px-2 py-2 text-center font-semibold">비고</th>
            </tr>
          </thead>
          <tbody>
            {printParticipants.length === 0 ? (
              <tr>
                <td className="h-20 border border-ink-700 px-2 py-3 text-center" colSpan={8}>
                  인쇄할 참가자가 없습니다.
                </td>
              </tr>
            ) : (
              printParticipants.map((participant, index) => (
                <tr key={participant.id} className="h-16">
                  <td className="border border-ink-700 px-2 py-3 text-center">{index + 1}</td>
                  <td className="border border-ink-700 px-2 py-3 text-center font-semibold">{participant.name}</td>
                  <td className="border border-ink-700 px-2 py-3">{participant.organization}</td>
                  <td className="border border-ink-700 px-2 py-3 text-center">{formatPhoneForPrint(participant.phone)}</td>
                  <td className="border border-ink-700 px-2 py-3 text-center">{participant.attendanceType}</td>
                  <td className="border border-ink-700 px-2 py-3 text-center">
                    {participant.attendanceStatus === "예정" ? "" : attendanceStatusLabels[participant.attendanceStatus]}
                  </td>
                  <td className="border border-ink-700 px-2 py-2 text-center">
                    {participant.signatureDataUrl ? (
                      <img className="mx-auto max-h-12 max-w-28 object-contain" src={participant.signatureDataUrl} alt={`${participant.name} 서명`} />
                    ) : participant.signed ? (
                      "서명 완료"
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="border border-ink-700 px-2 py-3">{participant.note || ""}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right text-xs text-ink-500" colSpan={8}>
                페이지 <span className="page-number" />
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}

export default AttendancePrintPage;
