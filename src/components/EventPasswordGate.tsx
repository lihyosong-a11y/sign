import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { eventService } from "../services/eventService";
import { authService } from "../services/authService";
import type { Event } from "../types";

interface EventPasswordGateProps {
  eventId?: string;
  children: ReactNode;
  title?: string;
  description?: string;
}

export function EventPasswordGate({
  eventId,
  children,
  title = "행사 관리 비밀번호 확인",
  description = "이 행사 등록부를 보려면 행사 생성 시 등록한 관리 비밀번호를 입력해 주세요.",
}: EventPasswordGateProps) {
  const [event, setEvent] = useState<Event | undefined>();
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    eventService
      .getEventById(eventId)
      .then((nextEvent) => {
        if (!active) return;
        setEvent(nextEvent);
        setUnlocked(Boolean(nextEvent && (authService.isEventAuthenticated(eventId) || authService.canManageEvent(nextEvent))));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!event) return;

    if (await authService.signInToEvent(event, password)) {
      setUnlocked(true);
      setError("");
      return;
    }

    setError("행사 관리 비밀번호가 올바르지 않습니다.");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-xl font-semibold text-ink-900">행사 정보를 확인하는 중입니다</h1>
        </section>
      </main>
    );
  }

  if (!event || !eventId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-xl font-semibold text-ink-900">행사를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-ink-500">행사 주소를 다시 확인해 주세요.</p>
          <Link className="btn-secondary mt-5" to="/admin">
            관리자 화면으로 이동
          </Link>
        </section>
      </main>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <main className="min-h-screen bg-ink-50 px-4 py-10">
      <section className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <form className="w-full rounded-lg border border-ink-200 bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-school-50 text-school-700">
              <Lock size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
              <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p>
              <p className="mt-2 text-sm font-medium text-ink-700">{event.title}</p>
            </div>
          </div>

          <label className="field-label" htmlFor="event-password">
            관리 비밀번호
          </label>
          <input
            id="event-password"
            className="field-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <button className="btn-primary mt-5 w-full" type="submit">
            등록부 열기
          </button>
        </form>
      </section>
    </main>
  );
}
