import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const appUrl = process.env.APP_URL ?? "http://localhost:5173";
const port = Number(process.env.CDP_PORT) || 9300 + Math.floor(Math.random() * 400);
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  throw new Error("Chrome 실행 파일을 찾을 수 없습니다.");
}

const outDir = resolve("verification");
mkdirSync(outDir, { recursive: true });

const profileDir = resolve(tmpdir(), `teacher-event-chrome-profile-${Date.now()}`);
mkdirSync(profileDir, { recursive: true });

const sampleState = {
  events: [
    {
      id: "event-verify-ai",
      title: "AI training",
      category: "연수",
      eventDate: "2026-07-10T15:00",
      location: "Smart classroom",
      managerName: "Training manager",
      description: "Browser verification event.",
      capacity: 30,
      isPublicRegistrationOpen: true,
      registrationDeadline: "2026-07-08T17:00",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  participants: [
    {
      id: "participant-verify-1",
      eventId: "event-verify-ai",
      name: "Kim Teacher",
      organization: "Demo School",
      phone: "010-1234-5678",
      email: "teacher1@school.kr",
      attendanceType: "대면",
      note: "Prepared by admin",
      registrationSource: "admin",
      createdAt: new Date().toISOString(),
      attendanceStatus: "예정",
      signed: false,
    },
    {
      id: "participant-verify-2",
      eventId: "event-verify-ai",
      name: "Lee Teacher",
      organization: "Demo School",
      phone: "010-9876-5432",
      email: "teacher2@school.kr",
      attendanceType: "온라인",
      note: "Registered directly",
      registrationSource: "self",
      createdAt: new Date().toISOString(),
      attendanceStatus: "예정",
      signed: false,
    },
  ],
};

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function waitForJsonVersion() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
    } catch {
      await sleep(250);
    }
  }

  throw new Error("Chrome DevTools 엔드포인트에 연결할 수 없습니다.");
}

async function waitForPageTarget() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await response.json();
    const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
    if (target) return target;
    await sleep(250);
  }

  throw new Error("Chrome 페이지 타깃을 찾을 수 없습니다.");
}

function connect(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const events = new Map();
  let messageId = 0;

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { method, resolveCommand, rejectCommand } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) rejectCommand(new Error(`${method}: ${message.error.message}`));
      else resolveCommand(message.result ?? {});
      return;
    }

    if (message.method && events.has(message.method)) {
      const listeners = events.get(message.method);
      events.delete(message.method);
      listeners.forEach((listener) => listener(message.params ?? {}));
    }
  });

  const opened = new Promise((resolveOpen, rejectOpen) => {
    ws.addEventListener("open", resolveOpen, { once: true });
    ws.addEventListener("error", rejectOpen, { once: true });
  });

  const send = async (method, params = {}) => {
    await opened;
    messageId += 1;
    ws.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolveCommand, rejectCommand) => {
      pending.set(messageId, { method, resolveCommand, rejectCommand });
    });
  };

  const waitEvent = async (method, timeout = 5000) => {
    await opened;
    return new Promise((resolveEvent, rejectEvent) => {
      const timer = setTimeout(() => rejectEvent(new Error(`${method} 대기 시간 초과`)), timeout);
      const listener = (params) => {
        clearTimeout(timer);
        resolveEvent(params);
      };
      events.set(method, [...(events.get(method) ?? []), listener]);
    });
  };

  return { send, waitEvent, close: () => ws.close() };
}

async function navigate(cdp, url) {
  const loaded = cdp.waitEvent("Page.loadEventFired", 10000).catch(() => undefined);
  await cdp.send("Page.navigate", { url });
  await loaded;
  await sleep(800);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const detail =
      result.exceptionDetails.exception?.description ??
      result.exceptionDetails.exception?.value ??
      result.exceptionDetails.text ??
      "Runtime.evaluate failed";
    throw new Error(detail);
  }
  return result.result?.value;
}

async function screenshot(cdp, fileName) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(join(outDir, fileName), Buffer.from(result.data, "base64"));
}

try {
  const appResponse = await fetch(`${appUrl}/admin`);
  if (!appResponse.ok) throw new Error(`App server check failed: ${appResponse.status}`);

  await waitForJsonVersion();
  const target = await waitForPageTarget();
  const cdp = connect(target.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await navigate(cdp, `${appUrl}/admin`);
  const currentUrl = await evaluate(cdp, `location.href`);
  if (!currentUrl.startsWith(appUrl)) throw new Error(`Chrome navigation failed: ${currentUrl}`);

  await evaluate(cdp, `sessionStorage.setItem("teacher-event-admin-authenticated", "true")`);
  await evaluate(
    cdp,
    `localStorage.setItem("teacher-event-attendance:v2", ${JSON.stringify(JSON.stringify(sampleState))})`,
  );
  await navigate(cdp, `${appUrl}/admin`);
  const currentUrlAfterReload = await evaluate(cdp, `location.href`);
  if (!currentUrlAfterReload.startsWith(appUrl)) throw new Error(`Chrome reload failed: ${currentUrlAfterReload}`);
  await sleep(1000);

  const adminDiagnostics = await evaluate(
    cdp,
    `(() => {
      const state = JSON.parse(localStorage.getItem("teacher-event-attendance:v2") || "{}");
      return {
        eventCount: Array.isArray(state.events) ? state.events.length : -1,
        participantCount: Array.isArray(state.participants) ? state.participants.length : -1,
        tableCount: document.querySelectorAll("table").length,
        authenticated: sessionStorage.getItem("teacher-event-admin-authenticated"),
        bodyStart: document.body.innerText.slice(0, 120),
      };
    })()`,
  );
  const adminOk =
    adminDiagnostics.eventCount === 1 &&
    adminDiagnostics.participantCount === 2 &&
    adminDiagnostics.tableCount >= 1 &&
    adminDiagnostics.authenticated === "true";
  const firstEventId = await evaluate(
    cdp,
    `JSON.parse(localStorage.getItem("teacher-event-attendance:v2")).events[0]?.id`,
  );
  if (!adminOk || !firstEventId) throw new Error("Admin screen or sample data check failed");
  await screenshot(cdp, "admin.png");

  await navigate(cdp, `${appUrl}/event/${firstEventId}`);
  const publicOk = await evaluate(
    cdp,
    `Boolean(document.querySelector("form")) && document.querySelectorAll("input").length >= 2 && Boolean(document.querySelector("canvas"))`,
  );
  if (!publicOk) throw new Error("Public registration screen check failed");
  await screenshot(cdp, "public-registration.png");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await navigate(cdp, `${appUrl}/event/${firstEventId}`);
  const mobileOk = await evaluate(cdp, `document.body.scrollWidth <= 430`);
  if (!mobileOk) throw new Error("Mobile viewport width check failed");
  await screenshot(cdp, "public-registration-mobile.png");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(cdp, `${appUrl}/event/${firstEventId}/attendance`);
  const attendanceOk = await evaluate(
    cdp,
    `Boolean(document.querySelector(".print-table")) && document.querySelectorAll("button").length >= 3`,
  );
  if (!attendanceOk) throw new Error("Attendance print screen check failed");
  await screenshot(cdp, "attendance.png");

  cdp.close();
  console.log(`BROWSER_CHECK_OK ${outDir}`);
} finally {
  chrome.kill();
}
