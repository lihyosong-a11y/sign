import { Link } from "react-router-dom";
import { Lock, UserRoundCheck } from "lucide-react";

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-ink-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10">
        <section className="text-center">
          <p className="text-sm font-semibold text-school-700">교사 행사 등록부</p>
          <h1 className="mt-3 text-3xl font-bold text-ink-900">서명 등록부 만들기</h1>
        </section>

        <section className="grid gap-3">
          <Link className="flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-5 py-4 font-semibold text-ink-900 shadow-soft transition hover:border-school-200 hover:bg-school-50" to="/admin">
            <Lock size={20} aria-hidden="true" />
            관리자 로그인
          </Link>

          <Link className="flex items-center justify-center gap-2 rounded-lg bg-school-600 px-5 py-4 font-semibold text-white shadow-soft transition hover:bg-school-700" to="/user">
            <UserRoundCheck size={20} aria-hidden="true" />
            담당자 로그인
          </Link>
        </section>
      </div>
      <footer className="pb-6 text-center text-sm font-medium text-ink-500">전남물리교육연구회</footer>
    </main>
  );
}

export default HomePage;
