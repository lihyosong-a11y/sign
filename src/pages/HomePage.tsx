import { Link } from "react-router-dom";
import { ClipboardList, Lock, QrCode, UserRoundCheck } from "lucide-react";

function HomePage() {
  return (
    <main className="min-h-screen bg-ink-50">
      <div className="mx-auto grid min-h-screen max-w-5xl content-center gap-6 px-4 py-10 sm:px-6">
        <section className="rounded-lg border border-ink-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-school-700">학교 행사 등록 및 출석 확인</p>
              <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">서명 등록부 만들기</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600">
                교사 연수, 회의, 워크숍의 참가 신청을 받고 행사 당일에는 QR 코드나 등록 링크로 서명을 받을 수 있습니다.
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-school-50 text-school-700">
              <ClipboardList size={30} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link className="rounded-lg border border-ink-200 bg-white p-5 shadow-soft transition hover:border-school-200 hover:bg-school-50" to="/admin">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Lock size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-900">관리자 로그인</h2>
                <p className="mt-1 text-sm leading-6 text-ink-600">행사를 만들고 참가자 명단, QR 코드, 엑셀 다운로드, 인쇄용 등록부를 관리합니다.</p>
              </div>
            </div>
          </Link>

          <Link className="rounded-lg border border-ink-200 bg-white p-5 shadow-soft transition hover:border-school-200 hover:bg-school-50" to="/user">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-school-50 text-school-700">
                <UserRoundCheck size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-900">사용자 로그인</h2>
                <p className="mt-1 text-sm leading-6 text-ink-600">공개된 행사를 찾아 참가 신청을 하거나 전달받은 행사 링크에서 서명을 진행합니다.</p>
              </div>
            </div>
          </Link>
        </section>

        <section className="rounded-lg border border-ink-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <QrCode className="mt-0.5 shrink-0 text-school-700" size={22} aria-hidden="true" />
            <p className="text-sm leading-6 text-ink-700">
              QR 코드를 받은 경우 스캔하면 해당 행사 등록 화면으로 바로 이동합니다. 사용자 화면에서는 공개 등록 중인 행사만 확인할 수 있습니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HomePage;
