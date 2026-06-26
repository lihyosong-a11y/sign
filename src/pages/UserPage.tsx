import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CalendarDays, MapPin, Search, UserPlus } from "lucide-react";
import { eventService } from "../services/eventService";
import { participantService } from "../services/participantService";
import type { Event } from "../types";
import { formatDateTime, getEventStatusText, isCapacityFull, isDeadlinePassed } from "../utils/format";

function UserPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    eventService
      .getEvents()
      .then(async (nextEvents) => {
        const summaries = await Promise.all(
          nextEvents.map(async (event) => {
            const summary = await participantService.getPublicRegistrationSummary(event.id);
            return [event.id, summary.count] as const;
          }),
        );

        if (!active) return;
        setEvents(nextEvents);
        setEventCounts(Object.fromEntries(summaries));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim();

    return events.filter((event) => {
      if (!event.isPublicRegistrationOpen) return false;
      if (normalizedQuery && !`${event.title} ${event.location ?? ""} ${event.managerName ?? ""}`.includes(normalizedQuery)) return false;
      return true;
    });
  }, [events, query]);

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-school-700">사용자 로그인</p>
            <h1 className="mt-1 text-2xl font-bold text-ink-900">행사 참가 신청 및 서명</h1>
          </div>
          <Link className="btn-secondary" to="/">
            처음 화면
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6">
        <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-soft">
          <label>
            <span className="field-label">행사 검색</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={18} aria-hidden="true" />
              <input
                className="field-input pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="행사명, 장소, 담당자 검색"
              />
            </div>
          </label>
        </section>

        {loading ? (
          <section className="rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
            <p className="text-sm font-medium text-ink-600">행사를 불러오는 중입니다.</p>
          </section>
        ) : visibleEvents.length === 0 ? (
          <section className="rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
            <AlertCircle className="mx-auto text-amber-700" size={32} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">공개 등록 중인 행사가 없습니다</h2>
            <p className="mt-1 text-sm text-ink-600">전달받은 QR 코드나 행사 링크가 있다면 해당 링크로 직접 접속해 주세요.</p>
          </section>
        ) : (
          <section className="grid gap-4">
            {visibleEvents.map((event) => {
              const count = eventCounts[event.id] ?? 0;
              const deadlinePassed = isDeadlinePassed(event);
              const capacityFull = isCapacityFull(event, count);
              const blocked = deadlinePassed || capacityFull;

              return (
                <article key={event.id} className="rounded-lg border border-ink-200 bg-white p-5 shadow-soft">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge bg-school-50 text-school-700">{event.category}</span>
                        {blocked ? (
                          <span className="badge bg-amber-50 text-amber-700">{deadlinePassed ? "등록 마감" : "정원 마감"}</span>
                        ) : (
                          <span className="badge bg-school-50 text-school-700">등록 가능</span>
                        )}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-ink-900">{event.title}</h2>
                      <div className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
                        <p className="flex items-center gap-2">
                          <CalendarDays size={17} aria-hidden="true" />
                          {formatDateTime(event.eventDate)}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin size={17} aria-hidden="true" />
                          {event.location || "장소 미정"}
                        </p>
                      </div>
                      <p className="mt-3 text-sm font-medium text-ink-700">{getEventStatusText(event, count)}</p>
                    </div>
                    <Link className={blocked ? "btn-secondary pointer-events-none opacity-60" : "btn-primary"} to={`/event/${event.id}`}>
                      <UserPlus size={18} aria-hidden="true" />
                      등록 화면 열기
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default UserPage;
