import type { ReactNode } from "react";
import { FormEvent, useState } from "react";
import { Lock } from "lucide-react";
import { authService } from "../services/authService";

interface AdminAuthGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AdminAuthGate({
  children,
  title = "관리자 확인",
  description = "행사와 참가자 정보를 관리하려면 관리자 비밀번호를 입력해 주세요.",
}: AdminAuthGateProps) {
  const [authenticated, setAuthenticated] = useState(authService.isAdminAuthenticated());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (await authService.signInWithPassword(password)) {
      setAuthenticated(true);
      setError("");
      return;
    }

    setError("비밀번호가 올바르지 않습니다.");
  };

  if (authenticated) return <>{children}</>;

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
            </div>
          </div>

          <label className="block text-sm font-medium text-ink-700" htmlFor="admin-password">
            관리자 비밀번호
          </label>
          <input
            id="admin-password"
            className="mt-2 w-full rounded-md border border-ink-200 px-3 py-2.5 text-base outline-none transition focus:border-school-600 focus:ring-2 focus:ring-school-100"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <button className="mt-5 w-full rounded-md bg-school-600 px-4 py-2.5 font-semibold text-white transition hover:bg-school-700" type="submit">
            관리자 화면 열기
          </button>
        </form>
      </section>
    </main>
  );
}
