import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  Check,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Link as LinkIcon,
  Lock,
  LogOut,
  PenLine,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { SignatureInput } from "../components/SignatureInput";
import { buildSampleData } from "../data/sampleData";
import { authService } from "../services/authService";
import { eventService } from "../services/eventService";
import { participantService } from "../services/participantService";
import { userService } from "../services/userService";
import {
  attendanceStatusLabels,
  defaultPublicRegistrationSettings,
  registrationSourceLabels,
  type AttendanceStatus,
  type EventCategory,
  type Event,
  type Participant,
  type ParticipantDraft,
  type PublicRegistrationSettings,
  type RegistrationSource,
  type TeacherUser,
} from "../types";
import {
  createId,
  findDuplicateGroups,
  formatDateTime,
  formatShortDateTime,
  getEventStatusText,
  getPublicEventUrl,
  isDeadlinePassed,
} from "../utils/format";
import {
  downloadParticipantTemplate,
  downloadParticipantsExcel,
  type ImportParticipantRow,
  parseParticipantFile,
} from "../utils/files";

type EventFormState = {
  title: string;
  category: EventCategory;
  eventDate: string;
  location: string;
  managerName: string;
  description: string;
  capacity: string;
  isPublicRegistrationOpen: boolean;
  registrationDeadline: string;
  publicRegistrationSettings: PublicRegistrationSettings;
};

type ParticipantFilter = {
  name: string;
  organization: string;
  source: "전체" | RegistrationSource;
  attendanceStatus: "전체" | AttendanceStatus;
};

type ImportPreviewRow = ImportParticipantRow & {
  duplicateWithExisting: boolean;
  duplicateInFile: boolean;
};

type TeacherFormState = {
  username: string;
  name: string;
  organization: string;
  password: string;
  passwordConfirm: string;
  active: boolean;
};

type EventRosterRow = ParticipantDraft;

type AdminDashboardProps = {
  mode?: "admin" | "teacher";
  teacherUser?: TeacherUser;
  onLogout?: () => void;
};

type DashboardTab = "teachers" | "events" | "eventForm" | "participants";

const emptyEventForm: EventFormState = {
  title: "",
  category: "행사",
  eventDate: "",
  location: "",
  managerName: "",
  description: "",
  capacity: "",
  isPublicRegistrationOpen: true,
  registrationDeadline: "",
  publicRegistrationSettings: { ...defaultPublicRegistrationSettings, mode: "both" },
};

const emptyParticipantForm: ParticipantDraft = {
  name: "",
  organization: "",
  position: "",
  phone: "",
  email: "",
  attendanceType: "대면",
  note: "",
};

const emptyTeacherForm: TeacherFormState = {
  username: "",
  name: "",
  organization: "",
  password: "",
  passwordConfirm: "",
  active: true,
};

const emptyFilters: ParticipantFilter = {
  name: "",
  organization: "",
  source: "전체",
  attendanceStatus: "전체",
};

const sourceBadgeClass: Record<RegistrationSource, string> = {
  admin: "bg-sky-50 text-sky-700",
  self: "bg-school-50 text-school-700",
};

const statusBadgeClass: Record<AttendanceStatus, string> = {
  예정: "bg-amber-50 text-amber-700",
  참석: "bg-school-50 text-school-700",
  미참석: "bg-red-50 text-red-700",
};

const getPublicStatus = (event: Event) => {
  if (!event.isPublicRegistrationOpen) return { label: "비공개", className: "bg-ink-100 text-ink-700" };
  if (isDeadlinePassed(event)) return { label: "마감", className: "bg-red-50 text-red-700" };
  return { label: "공개 등록 중", className: "bg-school-50 text-school-700" };
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    alert("등록 링크를 복사했습니다.");
  } catch {
    window.prompt("아래 주소를 복사해 주세요.", text);
  }
};

const normalizeParticipantDraft = (draft: ParticipantDraft): ParticipantDraft => ({
  name: draft.name.trim(),
  organization: draft.organization.trim(),
  position: draft.position.trim(),
  phone: "",
  email: "",
  attendanceType: draft.attendanceType,
  note: draft.note.trim(),
});

const validateParticipantDraft = (draft: ParticipantDraft) => {
  const normalized = normalizeParticipantDraft(draft);
  const errors: string[] = [];

  if (!normalized.name) errors.push("성명을 입력해 주세요.");
  if (!normalized.organization) errors.push("소속을 입력해 주세요.");
  if (!normalized.position) errors.push("직위를 입력해 주세요.");

  return errors;
};

const emptyRosterRow = (): EventRosterRow => ({ ...emptyParticipantForm });

const getRosterRowCount = (capacity: string) => {
  const parsed = Number(capacity);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 200) : 5;
};

const resizeRosterRows = (rows: EventRosterRow[], capacity: string) => {
  const count = getRosterRowCount(capacity);
  if (rows.length === count) return rows;
  if (rows.length > count) return rows.slice(0, count);
  return [...rows, ...Array.from({ length: count - rows.length }, emptyRosterRow)];
};

const hasRosterRowValue = (row: EventRosterRow) =>
  Boolean(row.name.trim() || row.organization.trim() || row.position.trim() || row.note.trim());

const normalizeRosterRow = (row: EventRosterRow): EventRosterRow => {
  const normalized = normalizeParticipantDraft(row);
  const isOnline = normalized.note.includes("온라인") || normalized.attendanceType === "온라인";
  return {
    ...normalized,
    attendanceType: isOnline ? "온라인" : "대면",
    note: isOnline ? "온라인" : normalized.note,
  };
};

const participantListNote = (participant: Participant) =>
  participant.attendanceType === "온라인" ? "온라인" : (participant.note ?? "");

const rosterDuplicateKey = (row: Pick<ParticipantDraft, "name" | "organization" | "position">) =>
  [row.name, row.organization, row.position].map((value) => value.trim().replace(/\s+/g, "")).join("::");

function AdminPage() {
  return <AdminDashboard mode="admin" />;
}

export function AdminDashboard({ mode = "admin", teacherUser, onLogout }: AdminDashboardProps) {
  const isTeacherMode = mode === "teacher";
  const isAdminMode = mode === "admin";
  const [activeTab, setActiveTab] = useState<DashboardTab>("events");
  const [revision, setRevision] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [eventRosterRows, setEventRosterRows] = useState<EventRosterRow[]>(() =>
    resizeRosterRows([], emptyEventForm.capacity),
  );
  const [eventRosterFileName, setEventRosterFileName] = useState("");
  const [eventError, setEventError] = useState("");

  const [participantForm, setParticipantForm] = useState<ParticipantDraft>(emptyParticipantForm);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [participantNotice, setParticipantNotice] = useState("");
  const [filters, setFilters] = useState<ParticipantFilter>(emptyFilters);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [importRows, setImportRows] = useState<ImportParticipantRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [qrEvent, setQrEvent] = useState<Event | null>(null);
  const [signatureParticipant, setSignatureParticipant] = useState<Participant | null>(null);
  const [signatureDraft, setSignatureDraft] = useState<string | undefined>();
  const [unlockedEventIds, setUnlockedEventIds] = useState<Set<string>>(() => new Set());
  const [events, setEvents] = useState<Event[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [teacherUsers, setTeacherUsers] = useState<TeacherUser[]>([]);
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>(emptyTeacherForm);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherNotice, setTeacherNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [storeError, setStoreError] = useState("");

  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    let active = true;

    setLoading(true);
    const loadDashboard = async () => {
      const nextEvents =
        isTeacherMode && teacherUser
          ? await eventService.getEventsByOwner(teacherUser.id)
          : await eventService.getEvents();
      const nextParticipants =
        isTeacherMode
          ? await participantService.getParticipantsByEventIdsForAdmin(nextEvents.map((event) => event.id))
          : await participantService.getAllParticipantsForAdmin();
      const nextTeacherUsers = isAdminMode ? await userService.getTeacherUsers() : [];

      return { nextEvents, nextParticipants, nextTeacherUsers };
    };

    loadDashboard()
      .then(({ nextEvents, nextParticipants, nextTeacherUsers }) => {
        if (!active) return;
        setEvents(nextEvents);
        setAllParticipants(nextParticipants);
        setTeacherUsers(nextTeacherUsers);
        setStoreError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStoreError(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdminMode, isTeacherMode, revision, teacherUser]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
    if (selectedEventId && !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0]?.id ?? null);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    setUnlockedEventIds(new Set(events.filter((event) => authService.isEventAuthenticated(event.id)).map((event) => event.id)));
  }, [events]);

  useEffect(() => {
    if (isTeacherMode && activeTab === "teachers") {
      setActiveTab("events");
    }
  }, [activeTab, isTeacherMode]);

  useEffect(() => {
    setParticipantNotice("");
    setEditingParticipant(null);
    setImportRows([]);
    setImportFileName("");
  }, [selectedEventId]);

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const canManageDashboardEvent = (event: Event) =>
    isAdminMode || (isTeacherMode && event.ownerUserId === teacherUser?.id) || unlockedEventIds.has(event.id);
  const selectedEventUnlocked = selectedEvent ? canManageDashboardEvent(selectedEvent) : false;
  const selectedParticipants = useMemo(
    () =>
      selectedEvent && selectedEventUnlocked
        ? allParticipants
            .filter((participant) => participant.eventId === selectedEvent.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [allParticipants, selectedEvent, selectedEventUnlocked],
  );

  const duplicateGroups = useMemo(() => findDuplicateGroups(selectedParticipants), [selectedParticipants]);
  const duplicateIds = useMemo(() => new Set(duplicateGroups.flatMap((group) => group.map((participant) => participant.id))), [duplicateGroups]);

  const filteredParticipants = useMemo(() => {
    return selectedParticipants.filter((participant) => {
      if (filters.name && !participant.name.includes(filters.name.trim())) return false;
      if (filters.organization && !participant.organization.includes(filters.organization.trim())) return false;
      if (filters.source !== "전체" && participant.registrationSource !== filters.source) return false;
      if (filters.attendanceStatus !== "전체" && participant.attendanceStatus !== filters.attendanceStatus) return false;
      if (showDuplicatesOnly && !duplicateIds.has(participant.id)) return false;
      return true;
    });
  }, [duplicateIds, filters, selectedParticipants, showDuplicatesOnly]);

  const importPreviewRows = useMemo<ImportPreviewRow[]>(() => {
    const fileKeys = new Map<string, number>();

    importRows.forEach((row) => {
      const key = rosterDuplicateKey(row);
      fileKeys.set(key, (fileKeys.get(key) ?? 0) + 1);
    });

    return importRows.map((row) => {
      const key = rosterDuplicateKey(row);
      return {
        ...row,
        duplicateWithExisting: selectedParticipants.some(
          (participant) => rosterDuplicateKey(participant) === key,
        ),
        duplicateInFile: (fileKeys.get(key) ?? 0) > 1,
      };
    });
  }, [importRows, selectedParticipants]);

  const eventCounts = useMemo(() => {
    return events.reduce<Record<string, number>>((acc, event) => {
      acc[event.id] = allParticipants.filter((participant) => participant.eventId === event.id).length;
      return acc;
    }, {});
  }, [allParticipants, events]);

  const handleEventSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setEventError("");

    if (!eventForm.title.trim()) {
      setEventError("행사명을 입력해 주세요.");
      return;
    }

    if (!eventForm.eventDate) {
      setEventError("행사 일시를 입력해 주세요.");
      return;
    }

    const now = new Date().toISOString();
    const previous = editingEventId ? events.find((item) => item.id === editingEventId) : undefined;

    const publicRegistrationSettings: PublicRegistrationSettings = {
      ...eventForm.publicRegistrationSettings,
      mode: "both",
      collectPhone: false,
      requirePhone: false,
      collectEmail: false,
      requireEmail: false,
      collectAttendanceType: false,
      collectNote: false,
    };

    const rosterRowsToSave = eventRosterRows.filter(hasRosterRowValue).map(normalizeRosterRow);
    const incompleteRosterRow = rosterRowsToSave.find(
      (row) => !row.name.trim() || !row.organization.trim() || !row.position.trim(),
    );

    if (incompleteRosterRow) {
      setEventError("사전 명단은 소속, 직위, 성명을 모두 입력해 주세요.");
      return;
    }

    const savedEvent: Event = {
      id: previous?.id ?? createId("event"),
      title: eventForm.title.trim(),
      category: eventForm.category,
      eventDate: eventForm.eventDate,
      location: eventForm.location.trim(),
      managerName: eventForm.managerName.trim() || teacherUser?.name || "",
      description: eventForm.description.trim(),
      capacity: eventForm.capacity ? Number(eventForm.capacity) : undefined,
      isPublicRegistrationOpen: eventForm.isPublicRegistrationOpen,
      registrationDeadline: eventForm.registrationDeadline || undefined,
      publicRegistrationSettings,
      adminPasswordHash: previous?.adminPasswordHash,
      ownerUserId: previous?.ownerUserId ?? teacherUser?.id,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      await eventService.saveEvent(savedEvent);
      if (rosterRowsToSave.length > 0) {
        await participantService.saveParticipants(
          rosterRowsToSave.map((row) => ({
            id: createId("participant"),
            eventId: savedEvent.id,
            name: row.name,
            organization: row.organization,
            position: row.position,
            phone: "",
            email: undefined,
            attendanceType: row.attendanceType,
            note: row.note || undefined,
            registrationSource: "admin",
            createdAt: now,
            attendanceStatus: "예정",
            signed: false,
          })),
        );
      }
      setEventForm(emptyEventForm);
      setEventRosterRows(resizeRosterRows([], emptyEventForm.capacity));
      setEventRosterFileName("");
      setEditingEventId(null);
      setSelectedEventId(savedEvent.id);
      setActiveTab("events");
      setUnlockedEventIds((current) => new Set([...current, savedEvent.id]));
      refresh();
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "행사를 저장하지 못했습니다.");
    }
  };

  const handleEditEvent = (event: Event) => {
    if (!canManageDashboardEvent(event)) {
      setSelectedEventId(event.id);
      setStoreError("이 행사를 수정할 권한이 없습니다.");
      return;
    }

    setEditingEventId(event.id);
    setActiveTab("eventForm");
    setEventForm({
      title: event.title,
      category: event.category,
      eventDate: event.eventDate,
      location: event.location ?? "",
      managerName: event.managerName ?? "",
      description: event.description ?? "",
      capacity: event.capacity ? String(event.capacity) : "",
      isPublicRegistrationOpen: event.isPublicRegistrationOpen,
      registrationDeadline: event.registrationDeadline ?? "",
      publicRegistrationSettings: {
        ...defaultPublicRegistrationSettings,
        ...event.publicRegistrationSettings,
        mode: "both",
      },
    });
    setEventRosterRows(resizeRosterRows([], event.capacity ? String(event.capacity) : ""));
    setEventRosterFileName("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!canManageDashboardEvent(event)) {
      setSelectedEventId(event.id);
      setStoreError("이 행사를 삭제할 권한이 없습니다.");
      return;
    }

    if (!confirm(`"${event.title}" 행사를 삭제할까요? 참가자 명단도 함께 삭제됩니다.`)) return;
    try {
      await eventService.deleteEvent(event.id);
      authService.signOutEvent(event.id);
      setUnlockedEventIds((current) => {
        const next = new Set(current);
        next.delete(event.id);
        return next;
      });
      if (selectedEventId === event.id) setSelectedEventId(null);
      refresh();
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : "행사를 삭제하지 못했습니다.");
    }
  };

  const handleSeedSampleData = async () => {
    if (events.length > 0 && !confirm("기존 데이터를 시연용 데이터로 교체할까요?")) return;
    try {
      await eventService.seedSampleData(buildSampleData());
      setSelectedEventId(null);
      setImportRows([]);
      setEventRosterRows(resizeRosterRows([], emptyEventForm.capacity));
      setEventRosterFileName("");
      setActiveTab("events");
      refresh();
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : "시연용 데이터를 넣지 못했습니다.");
    }
  };

  const resetTeacherForm = () => {
    setTeacherForm(emptyTeacherForm);
    setEditingTeacherId(null);
    setTeacherNotice("");
  };

  const handleTeacherSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdminMode) return;

    const username = userService.normalizeUsername(teacherForm.username);
    const name = teacherForm.name.trim();
    const organization = teacherForm.organization.trim();
    const password = teacherForm.password.trim();
    const passwordConfirm = teacherForm.passwordConfirm.trim();
    const previous = editingTeacherId ? teacherUsers.find((user) => user.id === editingTeacherId) : undefined;

    if (!username) {
      setTeacherNotice("아이디를 입력해 주세요.");
      return;
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      setTeacherNotice("아이디는 영문 소문자, 숫자, 마침표, 밑줄, 하이픈을 사용해 3자 이상으로 입력해 주세요.");
      return;
    }

    if (!name) {
      setTeacherNotice("담당 교사 이름을 입력해 주세요.");
      return;
    }

    if (!previous && !password) {
      setTeacherNotice("초기 비밀번호를 입력해 주세요.");
      return;
    }

    if (password || passwordConfirm) {
      if (password.length < 4) {
        setTeacherNotice("비밀번호는 4자 이상으로 입력해 주세요.");
        return;
      }

      if (password !== passwordConfirm) {
        setTeacherNotice("비밀번호 확인이 일치하지 않습니다.");
        return;
      }
    }

    if (await userService.isUsernameTaken(username, previous?.id)) {
      setTeacherNotice("이미 사용 중인 아이디입니다.");
      return;
    }

    const now = new Date().toISOString();

    try {
      await userService.saveTeacherUser({
        id: previous?.id ?? createId("teacher"),
        username,
        name,
        organization: organization || undefined,
        passwordHash: password ? authService.hashPassword(password) : previous?.passwordHash ?? "",
        active: teacherForm.active,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      });
      setTeacherNotice(previous ? "담당 교사 계정을 수정했습니다." : "담당 교사 계정을 만들었습니다.");
      setTeacherForm(emptyTeacherForm);
      setEditingTeacherId(null);
      refresh();
    } catch (error) {
      setTeacherNotice(error instanceof Error ? error.message : "담당 교사 계정을 저장하지 못했습니다.");
    }
  };

  const handleEditTeacher = (user: TeacherUser) => {
    setEditingTeacherId(user.id);
    setActiveTab("teachers");
    setTeacherForm({
      username: user.username,
      name: user.name,
      organization: user.organization ?? "",
      password: "",
      passwordConfirm: "",
      active: user.active,
    });
    setTeacherNotice("비밀번호는 변경할 때만 입력해 주세요.");
  };

  const handleToggleTeacherActive = async (user: TeacherUser) => {
    try {
      await userService.setTeacherUserActive(user.id, !user.active);
      setTeacherNotice(user.active ? "비활성화했습니다. 이제 삭제할 수 있습니다." : "활성화했습니다.");
      refresh();
    } catch (error) {
      setTeacherNotice(error instanceof Error ? error.message : "계정 상태를 변경하지 못했습니다.");
    }
  };

  const handleDeleteTeacher = async (user: TeacherUser) => {
    if (!confirm(`"${user.name}" 담당 교사 계정을 삭제할까요?`)) return;

    try {
      await userService.deleteTeacherUser(user.id);
      setTeacherNotice("담당 교사 계정을 삭제했습니다.");
      if (editingTeacherId === user.id) resetTeacherForm();
      refresh();
    } catch (error) {
      setTeacherNotice(error instanceof Error ? error.message : "담당 교사 계정을 삭제하지 못했습니다.");
    }
  };

  const handleParticipantSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEvent) return;
    if (!selectedEventUnlocked) {
      setParticipantNotice("이 행사를 관리할 권한이 없습니다.");
      return;
    }

    const errors = validateParticipantDraft(participantForm);
    if (errors.length > 0) {
      setParticipantNotice(errors.join(" "));
      return;
    }

    const normalized = normalizeParticipantDraft(participantForm);
    const hasDuplicate = await participantService.hasNameInEvent(selectedEvent.id, normalized.name);
    const duplicateMessage = "같은 이름으로 등록된 참가자가 있습니다. 그래도 등록할까요?";

    if (hasDuplicate && !confirm(duplicateMessage)) {
      return;
    }

    try {
      await participantService.saveParticipant({
        id: createId("participant"),
        eventId: selectedEvent.id,
        ...normalized,
        attendanceType: normalized.note.includes("온라인") ? "온라인" : "대면",
        note: normalized.note || undefined,
        registrationSource: "admin",
        createdAt: new Date().toISOString(),
        attendanceStatus: "예정",
        signed: false,
      });

      setParticipantForm(emptyParticipantForm);
      setParticipantNotice("참가자를 등록했습니다.");
      refresh();
    } catch (error) {
      setParticipantNotice(error instanceof Error ? error.message : "참가자를 등록하지 못했습니다.");
    }
  };

  const handleEditParticipantSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingParticipant || !selectedEvent) return;
    if (!selectedEventUnlocked) {
      setParticipantNotice("이 행사를 관리할 권한이 없습니다.");
      return;
    }

    const draft: ParticipantDraft = {
      name: editingParticipant.name,
      organization: editingParticipant.organization,
      position: editingParticipant.position,
      phone: "",
      email: "",
      attendanceType: editingParticipant.attendanceType,
      note: editingParticipant.note ?? "",
    };
    const errors = validateParticipantDraft(draft);

    if (errors.length > 0) {
      setParticipantNotice(errors.join(" "));
      return;
    }

    const hasDuplicate = await participantService.hasNameInEvent(selectedEvent.id, draft.name, editingParticipant.id);
    const duplicateMessage = "같은 이름으로 등록된 참가자가 있습니다. 수정 내용을 저장할까요?";

    if (hasDuplicate && !confirm(duplicateMessage)) {
      return;
    }

    const normalized = normalizeParticipantDraft(draft);
    try {
      await participantService.saveParticipant({
        ...editingParticipant,
        ...normalized,
        attendanceType: normalized.note.includes("온라인") ? "온라인" : "대면",
        note: normalized.note || undefined,
      });
      setEditingParticipant(null);
      setParticipantNotice("참가자 정보를 수정했습니다.");
      refresh();
    } catch (error) {
      setParticipantNotice(error instanceof Error ? error.message : "참가자 정보를 수정하지 못했습니다.");
    }
  };

  const handleParticipantDelete = async (participant: Participant) => {
    if (!confirm(`${participant.name} 참가자를 삭제할까요?`)) return;
    try {
      await participantService.deleteParticipant(participant.id);
      if (editingParticipant?.id === participant.id) setEditingParticipant(null);
      refresh();
    } catch (error) {
      setParticipantNotice(error instanceof Error ? error.message : "참가자를 삭제하지 못했습니다.");
    }
  };

  const handleAttendanceChange = async (participantId: string, attendanceStatus: AttendanceStatus) => {
    await participantService.setAttendanceStatus(participantId, attendanceStatus);
    refresh();
  };

  const handleSignedChange = async (participantId: string, signed: boolean) => {
    await participantService.setSigned(participantId, signed);
    refresh();
  };

  const openSignatureDialog = (participant: Participant) => {
    setSignatureParticipant(participant);
    setSignatureDraft(participant.signatureDataUrl);
  };

  const handleSaveSignature = async () => {
    if (!signatureParticipant) return;

    if (signatureDraft) {
      await participantService.saveSignature(signatureParticipant.id, signatureDraft);
    } else {
      await participantService.setSigned(signatureParticipant.id, false);
    }

    setSignatureParticipant(null);
    setSignatureDraft(undefined);
    refresh();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseParticipantFile(file);
      setImportFileName(file.name);
      setImportRows(rows);
    } catch {
      alert("파일을 읽을 수 없습니다. Excel 또는 CSV 파일인지 확인해 주세요.");
    }
  };

  const handleEventRosterImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseParticipantFile(file);
      setEventRosterFileName(file.name);
      setEventRosterRows(
        rows.length > 0
          ? rows.map((row) => normalizeRosterRow(row))
          : resizeRosterRows([], eventForm.capacity),
      );
    } catch {
      alert("파일을 읽을 수 없습니다. Excel 또는 CSV 파일인지 확인해 주세요.");
    }
  };

  const updateEventRosterRow = (index: number, patch: Partial<EventRosterRow>) => {
    setEventRosterRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  };

  const handleConfirmImport = async () => {
    if (!selectedEvent) return;
    if (!selectedEventUnlocked) {
      setParticipantNotice("이 행사를 관리할 권한이 없습니다.");
      return;
    }
    if (importPreviewRows.length === 0) {
      alert("업로드할 참가자 파일을 먼저 선택해 주세요.");
      return;
    }

    if (importPreviewRows.some((row) => row.errors.length > 0)) {
      alert("오류가 있는 행을 수정한 뒤 다시 업로드해 주세요.");
      return;
    }

    if (
      importPreviewRows.some((row) => row.duplicateWithExisting || row.duplicateInFile) &&
      !confirm("중복 가능성이 있는 참가자가 포함되어 있습니다. 그래도 등록할까요?")
    ) {
      return;
    }

    const now = new Date().toISOString();
    const participants: Participant[] = importPreviewRows.map((row) => ({
      id: createId("participant"),
      eventId: selectedEvent.id,
      name: row.name.trim(),
      organization: row.organization.trim(),
      position: row.position.trim(),
      phone: "",
      email: undefined,
      attendanceType: row.attendanceType,
      note: row.attendanceType === "온라인" ? "온라인" : (row.note.trim() || undefined),
      registrationSource: "admin",
      createdAt: now,
      attendanceStatus: "예정",
      signed: false,
    }));

    try {
      await participantService.saveParticipants(participants);
      setImportRows([]);
      setImportFileName("");
      setParticipantNotice(`${participants.length}명을 일괄 등록했습니다.`);
      refresh();
    } catch (error) {
      setParticipantNotice(error instanceof Error ? error.message : "참가자를 일괄 등록하지 못했습니다.");
    }
  };

  const handleLogout = () => {
    if (isTeacherMode) {
      authService.signOutTeacher();
    } else {
      authService.signOut();
    }
    setUnlockedEventIds(new Set());
    setEditingEventId(null);
    setEventForm(emptyEventForm);
    onLogout?.();
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById("event-qr-canvas") as HTMLCanvasElement | null;
    if (!canvas || !qrEvent) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${qrEvent.title.replace(/[\\/:*?"<>|]/g, "_")}_등록_QR.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const dashboardTabs: Array<{ id: DashboardTab; label: string }> = [
    ...(isAdminMode
      ? [
          {
            id: "teachers" as const,
            label: "교사 계정관리",
          },
        ]
      : []),
    {
      id: "events",
      label: "행사 관리",
    },
    {
      id: "eventForm",
      label: "행사 등록",
    },
  ];

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{isTeacherMode ? "담당자" : "관리자"}</h1>
            {teacherUser ? (
              <p className="mt-1 text-sm text-ink-500">
                {teacherUser.name}
                {teacherUser.organization ? ` · ${teacherUser.organization}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdminMode ? (
              <button className="btn-secondary" type="button" onClick={handleSeedSampleData}>
                <ClipboardList size={18} aria-hidden="true" />
                시연용 데이터 넣기
              </button>
            ) : null}
            <button className="btn-secondary" type="button" onClick={handleLogout}>
              <LogOut size={18} aria-hidden="true" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <nav className="rounded-lg border border-ink-200 bg-white p-2 shadow-soft" aria-label="관리 화면 탭">
          <div className={`grid gap-2 ${isAdminMode ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {dashboardTabs.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  className={`rounded-md border px-4 py-3 text-left transition ${
                    selected
                      ? "border-school-600 bg-school-50 text-school-800"
                      : "border-transparent text-ink-700 hover:border-ink-200 hover:bg-ink-50"
                  }`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={selected ? "page" : undefined}
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "teachers" && isAdminMode ? (
          <section className="rounded-lg border border-ink-200 bg-white p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">교사 계정관리</h2>
              </div>
              {editingTeacherId ? (
                <button className="btn-secondary" type="button" onClick={resetTeacherForm}>
                  <X size={18} aria-hidden="true" />
                  계정 수정 취소
                </button>
              ) : null}
            </div>

            <form className="grid gap-4 lg:grid-cols-12" onSubmit={handleTeacherSubmit}>
              <div className="lg:col-span-3">
                <label className="field-label" htmlFor="teacher-username">
                  아이디 *
                </label>
                <input
                  id="teacher-username"
                  className="field-input"
                  value={teacherForm.username}
                  onChange={(event) => setTeacherForm((form) => ({ ...form, username: event.target.value }))}
                  placeholder="예: kim"
                  autoComplete="username"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="field-label" htmlFor="teacher-name">
                  담당 교사 이름 *
                </label>
                <input
                  id="teacher-name"
                  className="field-input"
                  value={teacherForm.name}
                  onChange={(event) => setTeacherForm((form) => ({ ...form, name: event.target.value }))}
                  placeholder="예: 김지윤"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="field-label" htmlFor="teacher-organization">
                  부서 또는 소속
                </label>
                <input
                  id="teacher-organization"
                  className="field-input"
                  value={teacherForm.organization}
                  onChange={(event) => setTeacherForm((form) => ({ ...form, organization: event.target.value }))}
                  placeholder="예: 교육연구부"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="field-label" htmlFor="teacher-active">
                  계정 상태
                </label>
                <select
                  id="teacher-active"
                  className="field-input"
                  value={teacherForm.active ? "active" : "inactive"}
                  onChange={(event) => setTeacherForm((form) => ({ ...form, active: event.target.value === "active" }))}
                >
                  <option value="active">사용 가능</option>
                  <option value="inactive">비활성화</option>
                </select>
              </div>
              <div className="lg:col-span-4">
                <label className="field-label" htmlFor="teacher-password">
                  {editingTeacherId ? "새 비밀번호" : "초기 비밀번호 *"}
                </label>
                <input
                  id="teacher-password"
                  className="field-input"
                  type="password"
                  value={teacherForm.password}
                  onChange={(event) => setTeacherForm((form) => ({ ...form, password: event.target.value }))}
                  autoComplete="new-password"
                  placeholder={editingTeacherId ? "변경할 때만 입력" : "담당 교사 로그인 비밀번호"}
                />
              </div>
              <div className="lg:col-span-4">
                <label className="field-label" htmlFor="teacher-password-confirm">
                  비밀번호 확인
                </label>
                <input
                  id="teacher-password-confirm"
                  className="field-input"
                  type="password"
                  value={teacherForm.passwordConfirm}
                  onChange={(event) => setTeacherForm((form) => ({ ...form, passwordConfirm: event.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-end lg:col-span-4">
                <button className="btn-primary w-full" type="submit">
                  <Plus size={18} aria-hidden="true" />
                  {editingTeacherId ? "계정 수정 저장" : "담당 교사 계정 만들기"}
                </button>
              </div>
              {teacherNotice ? <p className="font-medium text-ink-700 lg:col-span-12">{teacherNotice}</p> : null}
            </form>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse">
                <thead className="bg-ink-50 text-sm text-ink-700">
                  <tr>
                    <th className="table-cell">아이디</th>
                    <th className="table-cell">이름</th>
                    <th className="table-cell">부서 또는 소속</th>
                    <th className="table-cell">상태</th>
                    <th className="table-cell">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {teacherUsers.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-ink-500" colSpan={5}>
                        등록된 담당 교사 계정이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    teacherUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="table-cell font-semibold text-ink-900">{user.username}</td>
                        <td className="table-cell text-ink-700">{user.name}</td>
                        <td className="table-cell text-ink-700">{user.organization || "-"}</td>
                        <td className="table-cell">
                          <span className={`badge ${user.active ? "bg-school-50 text-school-700" : "bg-ink-100 text-ink-700"}`}>
                            {user.active ? "사용 가능" : "비활성화"}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => handleEditTeacher(user)}>
                              <Edit3 size={16} aria-hidden="true" />
                              수정
                            </button>
                            <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => handleToggleTeacherActive(user)}>
                              <Check size={16} aria-hidden="true" />
                              {user.active ? "비활성화" : "활성화"}
                            </button>
                            <button className="btn-danger min-h-9 px-3 py-1.5" type="button" onClick={() => handleDeleteTeacher(user)}>
                              <Trash2 size={16} aria-hidden="true" />
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "eventForm" ? (
          <div className="grid gap-6">
        <section className="rounded-lg border border-ink-200 bg-white p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{editingEventId ? "행사 수정" : "새 행사 등록"}</h2>
            </div>
            {editingEventId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setEventForm(emptyEventForm);
                  setEventRosterRows(resizeRosterRows([], emptyEventForm.capacity));
                  setEventRosterFileName("");
                  setEventError("");
                }}
              >
                <X size={18} aria-hidden="true" />
                수정 취소
              </button>
            ) : null}
          </div>

          <form className="grid gap-4 lg:grid-cols-12" onSubmit={handleEventSubmit}>
            <div className="lg:col-span-8">
              <label className="field-label" htmlFor="event-title">
                행사명 *
              </label>
              <input
                id="event-title"
                className="field-input"
                value={eventForm.title}
                onChange={(event) => setEventForm((form) => ({ ...form, title: event.target.value }))}
                placeholder="예: AI 활용 수업 연수"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="field-label" htmlFor="event-start-at">
                행사 일시 *
              </label>
              <input
                id="event-start-at"
                className="field-input"
                type="datetime-local"
                value={eventForm.eventDate}
                onChange={(event) => setEventForm((form) => ({ ...form, eventDate: event.target.value }))}
              />
            </div>
            <div className="lg:col-span-4">
              <label className="field-label" htmlFor="event-location">
                장소
              </label>
              <input
                id="event-location"
                className="field-input"
                value={eventForm.location}
                onChange={(event) => setEventForm((form) => ({ ...form, location: event.target.value }))}
                placeholder="예: 본관 3층 스마트교실"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="field-label" htmlFor="event-manager">
                담당자
              </label>
              <input
                id="event-manager"
                className="field-input"
                value={eventForm.managerName}
                onChange={(event) => setEventForm((form) => ({ ...form, managerName: event.target.value }))}
                placeholder="예: 교육연구부 김지윤"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="field-label" htmlFor="event-capacity">
                최대 참여 인원
              </label>
              <input
                id="event-capacity"
                className="field-input"
                min={1}
                type="number"
                value={eventForm.capacity}
                onChange={(event) => {
                  const capacity = event.target.value;
                  setEventForm((form) => ({ ...form, capacity }));
                  setEventRosterRows((rows) => resizeRosterRows(rows, capacity));
                }}
                placeholder="예: 30"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="field-label" htmlFor="event-public">
                공개 등록
              </label>
              <select
                id="event-public"
                className="field-input"
                value={eventForm.isPublicRegistrationOpen ? "on" : "off"}
                onChange={(event) =>
                  setEventForm((form) => ({
                    ...form,
                    isPublicRegistrationOpen: event.target.value === "on",
                  }))
                }
              >
                <option value="on">켜기</option>
                <option value="off">끄기</option>
              </select>
            </div>
            <div className="lg:col-span-4">
              <label className="field-label" htmlFor="event-deadline">
                등록 마감 일시
              </label>
              <input
                id="event-deadline"
                className="field-input"
                type="datetime-local"
                value={eventForm.registrationDeadline}
                onChange={(event) => setEventForm((form) => ({ ...form, registrationDeadline: event.target.value }))}
              />
            </div>
            <div className="lg:col-span-8">
              <label className="field-label" htmlFor="event-description">
                행사 안내문
              </label>
              <textarea
                id="event-description"
                className="field-input min-h-24 resize-y"
                value={eventForm.description}
                onChange={(event) => setEventForm((form) => ({ ...form, description: event.target.value }))}
                placeholder="참가자에게 보여 줄 안내 내용을 입력하세요."
              />
            </div>
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 lg:col-span-12">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold text-ink-900">사전 명단</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={downloadParticipantTemplate}>
                    <Download size={16} aria-hidden="true" />
                    양식
                  </button>
                  <label className="btn-secondary min-h-9 cursor-pointer px-3 py-1.5">
                    <Upload size={16} aria-hidden="true" />
                    {eventRosterFileName || "엑셀 업로드"}
                    <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={handleEventRosterImportFile} />
                  </label>
                </div>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-md border border-ink-200 bg-white">
                <table className="min-w-[780px] w-full border-collapse">
                  <thead className="sticky top-0 bg-ink-50 text-sm text-ink-700">
                    <tr>
                      <th className="table-cell w-14 text-center">순</th>
                      <th className="table-cell">소속</th>
                      <th className="table-cell">직위</th>
                      <th className="table-cell">성명</th>
                      <th className="table-cell">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {eventRosterRows.map((row, index) => (
                      <tr key={`event-roster-${index}`}>
                        <td className="table-cell text-center text-ink-500">{index + 1}</td>
                        <td className="table-cell">
                          <input
                            className="field-input"
                            value={row.organization}
                            onChange={(event) => updateEventRosterRow(index, { organization: event.target.value })}
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            className="field-input"
                            value={row.position}
                            onChange={(event) => updateEventRosterRow(index, { position: event.target.value })}
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            className="field-input"
                            value={row.name}
                            onChange={(event) => updateEventRosterRow(index, { name: event.target.value })}
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            className="field-input"
                            value={row.note}
                            onChange={(event) => updateEventRosterRow(index, { note: event.target.value })}
                            placeholder="온라인"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-end lg:col-span-4">
              <button className="btn-primary w-full" type="submit">
                <Plus size={18} aria-hidden="true" />
                {editingEventId ? "행사 수정 저장" : "행사 등록"}
              </button>
            </div>
            {eventError ? <p className="font-medium text-red-600 lg:col-span-12">{eventError}</p> : null}
          </form>
        </section>
          </div>
        ) : null}

        {activeTab === "events" ? (
        <section className="rounded-lg border border-ink-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-ink-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">행사 목록</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="bg-ink-50 text-sm text-ink-700">
                <tr>
                  <th className="table-cell">행사명</th>
                  <th className="table-cell">행사 일시</th>
                  <th className="table-cell">장소</th>
                  <th className="table-cell">등록 현황</th>
                  <th className="table-cell">공개 등록</th>
                  <th className="table-cell">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {events.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-ink-500" colSpan={6}>
                      행사가 없습니다.
                      </td>
                    </tr>
                ) : (
                  events.map((event) => {
                    const publicStatus = getPublicStatus(event);
                    const count = eventCounts[event.id] ?? 0;

                    return (
                      <tr key={event.id} className={selectedEventId === event.id ? "bg-school-50/50" : "bg-white"}>
                        <td className="table-cell">
                          <p className="font-semibold text-ink-900">{event.title}</p>
                        </td>
                        <td className="table-cell text-ink-700">{formatDateTime(event.eventDate)}</td>
                        <td className="table-cell text-ink-700">{event.location || "-"}</td>
                        <td className="table-cell">
                          <span className="badge bg-ink-100 text-ink-700">{getEventStatusText(event, count)}</span>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${publicStatus.className}`}>{publicStatus.label}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => copyText(getPublicEventUrl(event.id))}>
                              <Copy size={16} aria-hidden="true" />
                              등록 링크
                            </button>
                            <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => setQrEvent(event)}>
                              <QrCode size={16} aria-hidden="true" />
                              QR 코드
                            </button>
                            <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => handleEditEvent(event)}>
                              <Edit3 size={16} aria-hidden="true" />
                              수정
                            </button>
                            <button className="btn-danger min-h-9 px-3 py-1.5" type="button" onClick={() => handleDeleteEvent(event)}>
                              <Trash2 size={16} aria-hidden="true" />
                              삭제
                            </button>
                            <button
                              className="btn-primary min-h-9 px-3 py-1.5"
                              type="button"
                              onClick={() => {
                                setSelectedEventId(event.id);
                                setActiveTab("participants");
                              }}
                            >
                              <Users size={16} aria-hidden="true" />
                              참가자 관리
                            </button>
                            <Link className="btn-secondary min-h-9 px-3 py-1.5" to={`/event/${event.id}/attendance`}>
                              <Printer size={16} aria-hidden="true" />
                              등록부 인쇄
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}

        {activeTab === "participants" ? (
          <>
        {selectedEvent ? selectedEventUnlocked ? (
          <section className="rounded-lg border border-ink-200 bg-white">
            <div className="border-b border-ink-200 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-school-700">참가자 관리</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink-900">{selectedEvent.title}</h2>
                  <p className="mt-1 text-sm text-ink-500">
                    {formatDateTime(selectedEvent.eventDate)} · {selectedEvent.location || "장소 미정"} ·{" "}
                    {getEventStatusText(selectedEvent, selectedParticipants.length)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => setActiveTab("events")}>
                    행사 목록
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => copyText(getPublicEventUrl(selectedEvent.id))}>
                    <LinkIcon size={18} aria-hidden="true" />
                    공개 등록 링크 복사
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setQrEvent(selectedEvent)}>
                    <QrCode size={18} aria-hidden="true" />
                    QR 코드
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => downloadParticipantsExcel(selectedEvent, selectedParticipants, "전체_참가자")}
                    disabled={selectedParticipants.length === 0}
                  >
                    <Download size={18} aria-hidden="true" />
                    전체 엑셀
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-5 xl:grid-cols-[minmax(280px,420px)_1fr]">
              <div className="grid gap-5">
                <section className="rounded-lg border border-ink-200 p-4">
                  <h3 className="font-semibold text-ink-900">한 명씩 사전 등록</h3>
                  <form className="mt-4 grid gap-3" onSubmit={handleParticipantSubmit}>
                    <label>
                      <span className="field-label">성명 *</span>
                      <input
                        className="field-input"
                        value={participantForm.name}
                        onChange={(event) => setParticipantForm((form) => ({ ...form, name: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="field-label">소속 학교 또는 부서 *</span>
                      <input
                        className="field-input"
                        value={participantForm.organization}
                        onChange={(event) => setParticipantForm((form) => ({ ...form, organization: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="field-label">직위 *</span>
                      <input
                        className="field-input"
                        value={participantForm.position}
                        onChange={(event) => setParticipantForm((form) => ({ ...form, position: event.target.value }))}
                      />
                      </label>
                    <label>
                      <span className="field-label">비고</span>
                      <textarea
                        className="field-input min-h-20 resize-y"
                        value={participantForm.note}
                        onChange={(event) => setParticipantForm((form) => ({ ...form, note: event.target.value }))}
                      />
                    </label>
                    <button className="btn-primary" type="submit">
                      <Plus size={18} aria-hidden="true" />
                      사전 등록
                    </button>
                  </form>
                </section>

                <section className="rounded-lg border border-ink-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-ink-900">여러 명 일괄 등록</h3>
                    <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={downloadParticipantTemplate}>
                      <Download size={16} aria-hidden="true" />
                      예시 파일
                    </button>
                  </div>
                  <label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50 px-4 py-5 text-center transition hover:border-school-200 hover:bg-school-50">
                    <Upload className="text-school-700" size={24} aria-hidden="true" />
                    <span className="mt-2 text-sm font-semibold text-ink-800">{importFileName || "Excel 또는 CSV 파일 선택"}</span>
                    <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />
                  </label>

                  {importPreviewRows.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-ink-700">미리보기 {importPreviewRows.length}명</p>
                        <button className="btn-primary min-h-9 px-3 py-1.5" type="button" onClick={handleConfirmImport}>
                          <Check size={16} aria-hidden="true" />
                          최종 확인 후 등록
                        </button>
                      </div>
                      <div className="max-h-80 overflow-auto rounded-md border border-ink-200">
                        <table className="min-w-[680px] w-full border-collapse">
                          <thead className="bg-ink-50">
                            <tr>
                              <th className="table-cell">행</th>
                              <th className="table-cell">소속</th>
                              <th className="table-cell">직위</th>
                              <th className="table-cell">성명</th>
                              <th className="table-cell">비고</th>
                              <th className="table-cell">확인</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink-100">
                            {importPreviewRows.map((row) => (
                              <tr key={`${row.rowNumber}-${row.name}-${row.organization}-${row.position}`} className={row.errors.length ? "bg-red-50" : row.duplicateWithExisting || row.duplicateInFile ? "bg-amber-50" : "bg-white"}>
                                <td className="table-cell">{row.rowNumber}</td>
                                <td className="table-cell">{row.organization}</td>
                                <td className="table-cell">{row.position}</td>
                                <td className="table-cell">{row.name}</td>
                                <td className="table-cell">{row.attendanceType === "온라인" ? "온라인" : row.note}</td>
                                <td className="table-cell">
                                  {row.errors.length ? (
                                    <span className="text-red-700">{row.errors.join(", ")}</span>
                                  ) : row.duplicateWithExisting || row.duplicateInFile ? (
                                    <span className="text-amber-700">중복 가능성</span>
                                  ) : (
                                    <span className="text-school-700">등록 가능</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              <div className="grid gap-5">
                {participantNotice ? (
                  <div className="rounded-md border border-school-100 bg-school-50 px-4 py-3 text-sm font-medium text-school-700">
                    {participantNotice}
                  </div>
                ) : null}

                {editingParticipant ? (
                  <section className="rounded-lg border border-school-200 bg-school-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-ink-900">참가자 정보 수정</h3>
                      <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => setEditingParticipant(null)}>
                        <X size={16} aria-hidden="true" />
                        닫기
                      </button>
                    </div>
                    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleEditParticipantSubmit}>
                      <label>
                        <span className="field-label">성명 *</span>
                        <input
                          className="field-input"
                          value={editingParticipant.name}
                          onChange={(event) => setEditingParticipant((item) => (item ? { ...item, name: event.target.value } : item))}
                        />
                      </label>
                      <label>
                        <span className="field-label">소속 *</span>
                        <input
                          className="field-input"
                          value={editingParticipant.organization}
                          onChange={(event) => setEditingParticipant((item) => (item ? { ...item, organization: event.target.value } : item))}
                        />
                      </label>
                      <label>
                        <span className="field-label">직위 *</span>
                        <input
                          className="field-input"
                          value={editingParticipant.position}
                          onChange={(event) => setEditingParticipant((item) => (item ? { ...item, position: event.target.value } : item))}
                        />
                      </label>
                      <label>
                        <span className="field-label">비고</span>
                        <input
                          className="field-input"
                          value={editingParticipant.note ?? ""}
                          onChange={(event) => setEditingParticipant((item) => (item ? { ...item, note: event.target.value } : item))}
                        />
                      </label>
                      <div className="md:col-span-2">
                        <button className="btn-primary" type="submit">
                          <Check size={18} aria-hidden="true" />
                          수정 저장
                        </button>
                      </div>
                    </form>
                  </section>
                ) : null}

                <section className="rounded-lg border border-ink-200 p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <h3 className="font-semibold text-ink-900">참가자 목록</h3>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => setShowDuplicatePanel((value) => !value)}>
                        <Search size={16} aria-hidden="true" />
                        중복 참가자 확인
                      </button>
                      <Link className="btn-secondary min-h-9 px-3 py-1.5" to={`/event/${selectedEvent.id}/attendance`}>
                        <Printer size={16} aria-hidden="true" />
                        등록부
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <label>
                      <span className="field-label">이름 검색</span>
                      <input
                        className="field-input"
                        value={filters.name}
                        onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="field-label">소속 검색</span>
                      <input
                        className="field-input"
                        value={filters.organization}
                        onChange={(event) => setFilters((current) => ({ ...current, organization: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="field-label">등록 경로</span>
                      <select
                        className="field-input"
                        value={filters.source}
                        onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as ParticipantFilter["source"] }))}
                      >
                        <option value="전체">전체</option>
                        <option value="admin">관리자 사전 등록</option>
                        <option value="public">본인 직접 등록</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label">참석 확인</span>
                      <select
                        className="field-input"
                        value={filters.attendanceStatus}
                        onChange={(event) => setFilters((current) => ({ ...current, attendanceStatus: event.target.value as ParticipantFilter["attendanceStatus"] }))}
                      >
                        <option value="전체">전체</option>
                        <option value="예정">확인 전</option>
                        <option value="참석">참석</option>
                        <option value="미참석">미참석</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-700">
                      <input
                        className="h-4 w-4 rounded border-ink-300 text-school-600 focus:ring-school-600"
                        type="checkbox"
                        checked={showDuplicatesOnly}
                        onChange={(event) => setShowDuplicatesOnly(event.target.checked)}
                      />
                      중복 가능성만 보기
                    </label>
                    <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => setFilters(emptyFilters)}>
                      필터 초기화
                    </button>
                  </div>

                  {showDuplicatePanel ? (
                    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-amber-700">중복 가능성 {duplicateGroups.length}건</p>
                        <button className="text-sm font-semibold text-amber-700" type="button" onClick={() => setShowDuplicatePanel(false)}>
                          닫기
                        </button>
                      </div>
                      {duplicateGroups.length === 0 ? (
                        <p className="mt-2 text-sm text-ink-700">같은 이름의 참가자가 없습니다.</p>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {duplicateGroups.map((group) => (
                            <div key={group.map((participant) => participant.id).join("-")} className="rounded-md border border-amber-100 bg-white p-3">
                              <p className="text-sm font-semibold text-ink-900">
                                {group[0].name}
                              </p>
                              <div className="mt-2 grid gap-2">
                                {group.map((participant) => (
                                  <div key={participant.id} className="flex flex-col gap-2 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                      {participant.organization} · {participant.position || "-"} · {registrationSourceLabels[participant.registrationSource]}
                                    </span>
                                    <button className="btn-danger min-h-8 px-3 py-1" type="button" onClick={() => handleParticipantDelete(participant)}>
                                      <Trash2 size={14} aria-hidden="true" />
                                      이 등록 삭제
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-4 overflow-x-auto rounded-lg border border-ink-200">
                    <table className="min-w-[980px] w-full border-collapse">
                      <thead className="bg-ink-50 text-sm text-ink-700">
                        <tr>
                          <th className="table-cell">번호</th>
                          <th className="table-cell">소속</th>
                          <th className="table-cell">직위</th>
                          <th className="table-cell">성명</th>
                          <th className="table-cell">등록 경로</th>
                          <th className="table-cell">등록 시각</th>
                          <th className="table-cell">참석 확인 여부</th>
                          <th className="table-cell">서명</th>
                          <th className="table-cell">비고</th>
                          <th className="table-cell">수정</th>
                          <th className="table-cell">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {filteredParticipants.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-sm text-ink-500" colSpan={11}>
                              조건에 맞는 참가자가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          filteredParticipants.map((participant, index) => (
                            <tr key={participant.id} className={duplicateIds.has(participant.id) ? "bg-amber-50" : "bg-white"}>
                              <td className="table-cell">{index + 1}</td>
                              <td className="table-cell">{participant.organization}</td>
                              <td className="table-cell">{participant.position || "-"}</td>
                              <td className="table-cell font-semibold text-ink-900">{participant.name}</td>
                              <td className="table-cell">
                                <span className={`badge ${sourceBadgeClass[participant.registrationSource]}`}>{registrationSourceLabels[participant.registrationSource]}</span>
                              </td>
                              <td className="table-cell">{formatShortDateTime(participant.createdAt)}</td>
                              <td className="table-cell">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`badge ${statusBadgeClass[participant.attendanceStatus]}`}>{attendanceStatusLabels[participant.attendanceStatus]}</span>
                                  <button className="btn-secondary min-h-8 px-2 py-1" type="button" onClick={() => handleAttendanceChange(participant.id, "참석")}>
                                    <UserCheck size={14} aria-hidden="true" />
                                    참석
                                  </button>
                                  <button className="btn-secondary min-h-8 px-2 py-1" type="button" onClick={() => handleAttendanceChange(participant.id, "미참석")}>
                                    <UserX size={14} aria-hidden="true" />
                                    미참석
                                  </button>
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-700">
                                    <input
                                      className="h-4 w-4 rounded border-ink-300 text-school-600 focus:ring-school-600"
                                      type="checkbox"
                                      checked={participant.signed}
                                      onChange={(event) => handleSignedChange(participant.id, event.target.checked)}
                                    />
                                    {participant.signed ? "서명 완료" : "미서명"}
                                  </label>
                                  <button className="btn-secondary min-h-8 px-3 py-1" type="button" onClick={() => openSignatureDialog(participant)}>
                                    <PenLine size={14} aria-hidden="true" />
                                    서명
                                  </button>
                                </div>
                              </td>
                              <td className="table-cell max-w-64 truncate">{participantListNote(participant) || "-"}</td>
                              <td className="table-cell">
                                <button className="btn-secondary min-h-8 px-3 py-1" type="button" onClick={() => setEditingParticipant(participant)}>
                                  <Edit3 size={14} aria-hidden="true" />
                                  수정
                                </button>
                              </td>
                              <td className="table-cell">
                                <button className="btn-danger min-h-8 px-3 py-1" type="button" onClick={() => handleParticipantDelete(participant)}>
                                  <Trash2 size={14} aria-hidden="true" />
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-ink-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Lock size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-school-700">행사 관리 권한 필요</p>
                <h2 className="mt-1 text-xl font-semibold text-ink-900">{selectedEvent.title}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-600">
                  참가자 명단, 엑셀 다운로드, 등록부 인쇄, 행사 수정은 학교 관리자 또는 이 행사의 담당 교사만 사용할 수 있습니다.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => copyText(getPublicEventUrl(selectedEvent.id))}>
                    <LinkIcon size={18} aria-hidden="true" />
                    공개 등록 링크 복사
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setQrEvent(selectedEvent)}>
                    <QrCode size={18} aria-hidden="true" />
                    QR 코드
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-dashed border-ink-200 bg-white p-8 text-center">
            <Users className="mx-auto text-ink-500" size={36} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">참가자를 관리할 행사를 선택해 주세요</h2>
            <p className="mt-1 text-sm text-ink-500">행사를 먼저 등록하거나 시연용 데이터를 넣으면 참가자 관리 화면이 열립니다.</p>
          </section>
        )}
          </>
        ) : null}
      </div>

      {qrEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4 py-6">
          <section className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-school-700">공개 등록 QR 코드</p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">{qrEvent.title}</h2>
              </div>
              <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={() => setQrEvent(null)}>
                <X size={16} aria-hidden="true" />
                닫기
              </button>
            </div>

            <div className="mt-5 grid place-items-center rounded-lg border border-ink-200 bg-white p-5">
              <QRCodeCanvas id="event-qr-canvas" value={getPublicEventUrl(qrEvent.id)} size={220} includeMargin />
            </div>

            <p className="mt-4 break-all rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">
              {getPublicEventUrl(qrEvent.id)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={() => copyText(getPublicEventUrl(qrEvent.id))}>
                <Copy size={18} aria-hidden="true" />
                링크 복사
              </button>
              <a className="btn-secondary" href={getPublicEventUrl(qrEvent.id)} target="_blank" rel="noreferrer">
                <ExternalLink size={18} aria-hidden="true" />
                등록 페이지 열기
              </a>
              <button className="btn-primary" type="button" onClick={handleDownloadQr}>
                <Download size={18} aria-hidden="true" />
                QR 이미지 저장
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {signatureParticipant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4 py-6">
          <section className="w-full max-w-2xl rounded-lg border border-ink-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-school-700">참가자 직접 서명</p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">
                  {signatureParticipant.name} · {signatureParticipant.organization}
                </h2>
              </div>
              <button
                className="btn-secondary min-h-9 px-3 py-1.5"
                type="button"
                onClick={() => {
                  setSignatureParticipant(null);
                  setSignatureDraft(undefined);
                }}
              >
                <X size={16} aria-hidden="true" />
                닫기
              </button>
            </div>

            <div className="mt-5">
              <SignatureInput value={signatureDraft} onChange={setSignatureDraft} />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setSignatureParticipant(null);
                  setSignatureDraft(undefined);
                }}
              >
                취소
              </button>
              <button className="btn-primary" type="button" onClick={handleSaveSignature}>
                <Check size={18} aria-hidden="true" />
                서명 저장
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default AdminPage;
