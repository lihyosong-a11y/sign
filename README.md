# 교사 행사 등록 및 출석부 관리

학교 행사와 교사 연수의 참가 신청, 담당 교사별 등록부 수합, 참가자 관리, 엑셀 다운로드, 인쇄용 출석부 생성을 처리하는 React 웹앱입니다.

## 로컬 실행 방법

```bash
npm install
npm run dev
```

`/admin`에서는 학교 관리자 1명이 로그인해 담당 교사 계정을 발급하고 학교 전체 행사를 관리합니다. `/user`에서는 관리자가 발급한 아이디와 비밀번호로 담당 교사가 로그인해 본인의 행사 등록부를 만들고 수합합니다.

`.env.local`을 만들면 Supabase 연결값과 관리자 로그인용 임시 비밀번호를 설정할 수 있습니다. 담당 교사 계정은 관리자 화면에서 발급합니다.

```env
VITE_ADMIN_PASSWORD=원하는_관리자_비밀번호
VITE_PUBLIC_APP_URL=https://exam-seven-chi.vercel.app/teacher
VITE_SUPABASE_URL=https://otlmlgguzosyxacaggah.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=새_Supabase_프로젝트의_publishable_key
```

`.env.local`은 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다.

## 화면 주소

- 메인 화면: `/`
- 사용자 로그인 및 담당 교사 화면: `/user`
- 관리자 로그인 및 관리 화면: `/admin`
- 공개 참가자 등록: `/event/{행사ID}`
- 행사별 출석부 인쇄: `/event/{행사ID}/attendance`

공개 등록 페이지는 행사 정보와 본인 등록 폼만 표시합니다. 참가자 전체 명단 조회, 엑셀 다운로드, 출석부 인쇄는 관리자 또는 해당 행사 담당 교사 로그인 후 접근하도록 분리했습니다.

QR 코드는 `VITE_PUBLIC_APP_URL`이 있으면 해당 주소를 기준으로 생성합니다. Vercel 배포 후에는 이 값을 실제 배포 주소로 등록하세요. 로컬 개발 주소인 `localhost`나 `127.0.0.1`로 만든 QR은 휴대폰에서 접속되지 않을 수 있습니다.

현재 localStorage 테스트 저장소에서는 행사와 참가자 데이터가 브라우저 기기별로 따로 저장됩니다. 따라서 PC에서 만든 행사 QR을 휴대폰으로 열면 주소가 맞아도 휴대폰에는 해당 행사 데이터가 없어 보이지 않을 수 있습니다. 여러 기기에서 같은 QR 등록 링크를 사용하려면 Supabase 같은 서버 저장소 연결이 필요합니다.

## 데이터 저장 구조

현재 실행 버전은 `localStorage` 기반 테스트 저장소를 사용합니다. 단, 컴포넌트가 `localStorage`를 직접 사용하지 않도록 저장 로직을 서비스 파일로 분리했습니다.

- 행사 데이터: `src/services/eventService.ts`
- 참가자 데이터: `src/services/participantService.ts`
- 담당 교사 계정 데이터: `src/services/userService.ts`
- 임시 관리자 및 담당 교사 인증: `src/services/authService.ts`
- localStorage 내부 구현: `src/services/localDatabase.ts`
- Supabase 클라이언트 준비: `src/services/supabaseClient.ts`

추후 Supabase로 전환할 때는 주로 `eventService.ts`, `participantService.ts`, `userService.ts`, `authService.ts`를 Supabase 쿼리와 Supabase Auth 또는 행사별 권한 검증 호출로 교체하면 됩니다.

## 타입 구조

행사와 참가자 타입은 `src/types/` 폴더에 분리되어 있습니다.

- `src/types/event.ts`
- `src/types/participant.ts`
- `src/types/user.ts`
- `src/types/index.ts`

주요 값:

- `registrationSource`: `admin` 또는 `self`
- `attendanceStatus`: `예정`, `참석`, `미참석`
- `TeacherUser`: 관리자가 발급하는 담당 교사 로그인 계정

## GitHub에 올리는 방법

```bash
git init
git add .
git commit -m "Initial teacher event attendance app"
git branch -M main
git remote add origin <GitHub 저장소 주소>
git push -u origin main
```

`node_modules`, `dist`, `.env.local`은 GitHub에 올리지 않습니다.

## Vercel 배포

1. GitHub 저장소를 Vercel에 Import합니다.
2. Framework Preset은 Vite로 선택합니다.
3. Build Command는 `npm run build`를 사용합니다.
4. Output Directory는 `dist`를 사용합니다.
5. Vercel 프로젝트의 Settings > Environment Variables에 아래 값을 등록합니다.

```env
VITE_ADMIN_PASSWORD=원하는_관리자_비밀번호
VITE_PUBLIC_APP_URL=https://exam-seven-chi.vercel.app/teacher
VITE_SUPABASE_URL=https://otlmlgguzosyxacaggah.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=새_Supabase_프로젝트의_publishable_key
```

React Router 새로고침 문제가 생기지 않도록 `vercel.json`에 모든 경로를 `index.html`로 rewrite하는 설정을 포함했습니다.
`VITE_PUBLIC_APP_URL`에 `/teacher`처럼 하위 경로가 포함되면 앱 라우터도 해당 경로를 기준으로 동작합니다.

## Supabase 연결 시 주의

프런트엔드에는 Supabase publishable key만 넣습니다. `service_role key`, secret key, 데이터베이스 비밀번호는 프런트엔드 코드, `.env.example`, GitHub, Vercel의 공개 환경 변수에 절대 넣지 마세요.

실제 운영 전에는 다음 설정이 필요합니다.

- Supabase 테이블 생성: `events`, `participants`
- Supabase 테이블 생성: `teacher_users` 또는 Supabase Auth 사용자 프로필
- Supabase Auth 기반 관리자 및 담당 교사 로그인
- 행사별 소유자 계정 연결
- Row Level Security 정책
- 공개 등록 insert 권한과 관리자 조회/수정/삭제 권한 분리
- HTTPS 환경에서 운영
- 개인정보 수집 및 이용 안내문, 보관 기간, 삭제 정책 작성

## 주요 기능

- 학교 관리자 로그인과 담당 교사 계정 발급
- 담당 교사 로그인 후 본인 행사 생성과 등록부 수합
- 관리자 또는 해당 담당 교사 권한 확인 후 행사 수정, 삭제, 참가자 관리, 출석부 인쇄
- 공개 등록 링크 복사와 QR 코드 이미지 제공
- 행사별 공개 등록 방식 선택: 새 참가자 등록, 사전 명단 선택 후 서명, 둘 다 허용
- 행사별 공개 등록 입력 항목 선택: 연락처와 이메일은 기본 미수집, 선택하면 필수 입력
- 관리자 사전 참가자 등록
- Excel 또는 CSV 일괄 업로드와 미리보기
- 중복 참가자 확인
- 참가자 검색, 필터, 수정, 삭제
- 참석/미참석 처리와 직접 서명, 이미지 서명 업로드 관리
- 전체 참가자 및 대면 참석자 엑셀 다운로드
- 서명이 포함된 공개 참가자 등록 폼과 사전 등록자 서명 폼
- A4 인쇄용 출석부와 `@media print` 전용 CSS
- 연락처 뒤 4자리 기본 표시, 전체 연락처 표시 옵션
- 시연용 데이터 생성 버튼
