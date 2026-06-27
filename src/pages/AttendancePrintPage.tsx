import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { EventPasswordGate } from "../components/EventPasswordGate";
import { authService } from "../services/authService";
import { eventService } from "../services/eventService";
import { participantService } from "../services/participantService";
import type { Event, Participant } from "../types";
import { formatDateTime } from "../utils/format";

function AttendancePrintPage() {
  const { eventId } = useParams();

  return (
    <EventPasswordGate
      eventId={eventId}
      title="등록부 인쇄 권한 확인"
      description="등록부는 학교 관리자 또는 해당 행사 담당 교사 로그인 후 열립니다."
    >
      <AttendancePrintContent />
    </EventPasswordGate>
  );
}

function AttendancePrintContent() {
  const { eventId } = useParams();
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
          <h1 className="text-xl font-semibold text-ink-900">등록부를 불러오는 중입니다</h1>
        </section>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-xl font-semibold text-ink-900">등록부를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-ink-500">행사 주소를 다시 확인해 주세요.</p>
          <Link className="btn-secondary mt-5" to="/admin">
            관리자 화면으로 이동
          </Link>
        </section>
      </main>
    );
  }

  const minimumRows = Math.max(event.capacity ?? 0, participants.length, 10);
  const printRows = Array.from({ length: minimumRows }, (_, index) => participants[index]);
  const isTeacherOwner =
    Boolean(event.ownerUserId) && authService.getCurrentTeacherUserId() === event.ownerUserId && !authService.isAdminAuthenticated();
  const backPath = isTeacherOwner ? "/user" : "/admin";
  const backLabel = isTeacherOwner ? "담당자 화면" : "관리자 화면";
  const getNote = (participant?: Participant) =>
    participant?.attendanceType === "온라인" ? "온라인" : (participant?.note ?? "");

  return (
    <main className="print-page min-h-screen bg-ink-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-school-700">인쇄용 등록부</p>
          <h1 className="text-xl font-semibold text-ink-900">{event.title}</h1>
          <p className="mt-1 text-sm text-ink-500">브라우저 인쇄 창에서 PDF로 저장할 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to={backPath}>
            <ArrowLeft size={18} aria-hidden="true" />
            {backLabel}
          </Link>
          <button className="btn-primary" type="button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            인쇄하기
          </button>
        </div>
      </div>

      <section className="print-sheet mx-auto max-w-5xl rounded-lg border border-ink-200 bg-white p-8 shadow-soft">
        <header className="pb-5">
          <div className="h-1.5 border-l-[260px] border-l-ink-900 bg-blue-700" />
          <h1 className="py-4 text-center text-3xl font-bold text-ink-900">{event.title} 등록부</h1>
          <div className="h-1.5 border-l-[260px] border-l-red-600 bg-ink-900" />
          <div className="mt-16 flex flex-wrap gap-x-8 gap-y-2 text-xl font-bold text-ink-900">
            <p>▶ 일시: {formatDateTime(event.eventDate)}</p>
            <p>장소: {event.location || "장소 미정"}</p>
          </div>
        </header>

        <table className="print-table mt-6 w-full border-collapse text-xl">
          <thead>
            <tr className="bg-sky-50">
              <th className="w-16 border border-ink-900 px-2 py-5 text-center font-semibold">순</th>
              <th className="border border-ink-900 px-2 py-5 text-center font-semibold">소속</th>
              <th className="w-28 border border-ink-900 px-2 py-5 text-center font-semibold">직위</th>
              <th className="w-40 border border-ink-900 px-2 py-5 text-center font-semibold">성명</th>
              <th className="w-44 border border-ink-900 px-2 py-5 text-center font-semibold">서명</th>
              <th className="w-40 border border-ink-900 px-2 py-5 text-center font-semibold">비고</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((participant, index) => (
                <tr key={participant?.id ?? `blank-${index}`} className="h-20">
                  <td className="border border-ink-900 px-2 py-3 text-center">{index + 1}</td>
                  <td className="border border-ink-900 px-2 py-3">{participant?.organization ?? ""}</td>
                  <td className="border border-ink-900 px-2 py-3 text-center">{participant?.position ?? ""}</td>
                  <td className="border border-ink-900 px-2 py-3 text-center font-semibold">{participant?.name ?? ""}</td>
                  <td className="border border-ink-900 px-2 py-2 text-center">
                    {participant?.signatureDataUrl ? (
                      <img className="mx-auto max-h-12 max-w-28 object-contain" src={participant.signatureDataUrl} alt={`${participant.name} 서명`} />
                    ) : participant?.signed ? (
                      "완료"
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="border border-ink-900 px-2 py-3 text-center">{getNote(participant)}</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right text-xs text-ink-500" colSpan={6}>
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
