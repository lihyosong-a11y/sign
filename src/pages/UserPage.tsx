import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, UserRoundCheck } from "lucide-react";
import { authService } from "../services/authService";
import type { TeacherUser } from "../types";
import { AdminDashboard } from "./AdminPage";

function UserPage() {
  const [teacherUser, setTeacherUser] = useState<TeacherUser | null>(() => authService.getCurrentTeacherUser());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const signedInUser = await authService.signInTeacher(username, password);
    if (signedInUser) {
      setTeacherUser(signedInUser);
      setError("");
      setPassword("");
      return;
    }

    setError("아이디 또는 비밀번호가 올바르지 않거나 비활성화된 계정입니다.");
  };

  if (teacherUser) {
    return <AdminDashboard mode="teacher" teacherUser={teacherUser} onLogout={() => setTeacherUser(null)} />;
  }

  return (
    <main className="min-h-screen bg-ink-50 px-4 py-10">
      <section className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <form className="w-full rounded-lg border border-ink-200 bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-school-50 text-school-700">
              <UserRoundCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-school-700">사용자 로그인</p>
              <h1 className="mt-1 text-xl font-semibold text-ink-900">행사 담당자 로그인</h1>
              <p className="mt-1 text-sm leading-6 text-ink-500">
                학교 관리자가 발급한 아이디와 비밀번호로 로그인해 본인의 행사 등록부를 관리합니다.
              </p>
            </div>
          </div>

          <label className="field-label" htmlFor="teacher-login-username">
            아이디
          </label>
          <input
            id="teacher-login-username"
            className="field-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />

          <label className="field-label mt-4" htmlFor="teacher-login-password">
            비밀번호
          </label>
          <input
            id="teacher-login-password"
            className="field-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <button className="btn-primary mt-5 w-full" type="submit">
            <Lock size={18} aria-hidden="true" />
            담당자 화면 열기
          </button>

          <div className="mt-4 flex justify-center">
            <Link className="text-sm font-semibold text-school-700 hover:text-school-800" to="/">
              처음 화면으로 돌아가기
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default UserPage;
