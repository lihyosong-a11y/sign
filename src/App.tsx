import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import AttendancePrintPage from "./pages/AttendancePrintPage";
import PublicRegistrationPage from "./pages/PublicRegistrationPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/event/:eventId" element={<PublicRegistrationPage />} />
      <Route path="/event/:eventId/attendance" element={<AttendancePrintPage />} />
      <Route
        path="*"
        element={
          <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
            <section className="max-w-md rounded-lg border border-ink-200 bg-white p-6 text-center shadow-soft">
              <h1 className="text-xl font-semibold text-ink-900">페이지를 찾을 수 없습니다</h1>
              <p className="mt-2 text-sm text-ink-500">주소를 다시 확인해 주세요.</p>
            </section>
          </main>
        }
      />
    </Routes>
  );
}

export default App;
