import ExcelJS from "exceljs";
import type { AttendanceType, Event, Participant, ParticipantDraft } from "../types";
import { attendanceStatusLabels, registrationSourceLabels } from "../types";
import { formatDateTime, isValidPhone } from "./format";

export interface ImportParticipantRow extends ParticipantDraft {
  rowNumber: number;
  errors: string[];
}

const headerCandidates: Record<keyof ParticipantDraft, string[]> = {
  name: ["성명", "이름", "name"],
  organization: ["소속", "소속 학교 또는 부서", "학교", "부서", "organization"],
  phone: ["연락처", "전화번호", "phone"],
  email: ["이메일", "email"],
  attendanceType: ["참석 형태", "참석형태", "mode"],
  note: ["비고", "기타", "note"],
};

const getCell = (row: Record<string, unknown>, field: keyof ParticipantDraft) => {
  const key = headerCandidates[field].find((candidate) => candidate in row);
  return key ? String(row[key] ?? "").trim() : "";
};

const normalizeAttendanceMode = (value: string): AttendanceType => {
  if (value.includes("온라인")) return "온라인";
  if (value.includes("대면")) return "대면";
  return "미정";
};

const parseCsvText = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const rowsToObjects = (rows: string[][]) => {
  const [headerRow = [], ...bodyRows] = rows;
  const headers = headerRow.map((header) => header.replace(/^\uFEFF/, "").trim());

  return bodyRows.map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = row[index] ?? "";
      return record;
    }, {}),
  );
};

const getWorksheetRows = (worksheet: ExcelJS.Worksheet) => {
  const headerRow = worksheet.getRow(1);
  const headers = headerRow.actualCellCount
    ? Array.from({ length: headerRow.actualCellCount }, (_, index) => headerRow.getCell(index + 1).text.trim())
    : [];
  const rows: Record<string, string>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row.getCell(index + 1).text.trim();
      return acc;
    }, {});
    if (Object.values(record).some(Boolean)) rows.push(record);
  });

  return rows;
};

export const parseParticipantFile = async (file: File): Promise<ImportParticipantRow[]> => {
  const extension = file.name.toLowerCase().split(".").pop();
  let rows: Record<string, unknown>[];

  if (extension === "csv") {
    rows = rowsToObjects(parseCsvText(await file.text()));
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];
    rows = getWorksheetRows(worksheet);
  }

  return rows.map((row, index) => {
    const parsed: ImportParticipantRow = {
      rowNumber: index + 2,
      name: getCell(row, "name"),
      organization: getCell(row, "organization"),
      phone: getCell(row, "phone"),
      email: getCell(row, "email"),
      attendanceType: normalizeAttendanceMode(getCell(row, "attendanceType")),
      note: getCell(row, "note"),
      errors: [],
    };

    if (!parsed.name) parsed.errors.push("성명 누락");
    if (!parsed.organization) parsed.errors.push("소속 누락");
    if (!parsed.phone) {
      parsed.errors.push("연락처 누락");
    } else if (!isValidPhone(parsed.phone)) {
      parsed.errors.push("연락처 형식 확인");
    }

    return parsed;
  });
};

const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadParticipantTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("참가자 업로드 양식");
  worksheet.addRows([
    ["성명", "소속", "연락처", "이메일", "참석 형태", "비고"],
    ["홍길동", "새빛초등학교", "010-1234-5678", "teacher@school.kr", "대면", "예시 행은 삭제 후 업로드"],
  ]);
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = [{ width: 14 }, { width: 22 }, { width: 18 }, { width: 24 }, { width: 14 }, { width: 28 }];

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "참가자_업로드_양식.xlsx",
  );
};

export const downloadParticipantsExcel = async (event: Event, participants: Participant[], suffix = "참가자명단") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("참가자 명단");

  worksheet.columns = [
    { header: "번호", key: "index", width: 8 },
    { header: "성명", key: "name", width: 14 },
    { header: "소속", key: "organization", width: 24 },
    { header: "연락처", key: "phone", width: 18 },
    { header: "이메일", key: "email", width: 28 },
    { header: "참석 형태", key: "attendanceType", width: 14 },
    { header: "등록 경로", key: "source", width: 18 },
    { header: "등록 시각", key: "createdAt", width: 24 },
    { header: "참석 확인 여부", key: "attendanceStatus", width: 16 },
    { header: "서명 여부", key: "signed", width: 14 },
    { header: "비고", key: "note", width: 30 },
  ];
  worksheet.getRow(1).font = { bold: true };

  participants.forEach((participant, index) => {
    worksheet.addRow({
      index: index + 1,
      name: participant.name,
      organization: participant.organization,
      phone: participant.phone,
      email: participant.email ?? "",
      attendanceType: participant.attendanceType,
      source: registrationSourceLabels[participant.registrationSource],
      createdAt: formatDateTime(participant.createdAt),
      attendanceStatus: attendanceStatusLabels[participant.attendanceStatus],
      signed: participant.signed ? "서명 완료" : "미서명",
      note: participant.note ?? "",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${sanitizeFileName(event.title)}_${suffix}.xlsx`,
  );
};
