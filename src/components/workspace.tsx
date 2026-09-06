import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Check,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Download,
} from "lucide-react";
import { consentCopy, STATUS_LABEL, STATUS_TONE } from "@/lib/confirm/rules";
import type { Agreement, Role, WorkspaceState } from "@/lib/confirm/types";
import { useWorkspace } from "@/lib/confirm/store";
import { can, canViewAgreement } from "@/lib/confirm/access";
import { isProductionMode } from "@/lib/confirm/remote";
import { buildEmployeeMail, buildFranchiseeIssuedMail, buildNextSignerMail, buildReminderMail, buildSignedRecordMail, buildSignCodeMail, buildWelcomeMail, employeeMailHref } from "@/lib/confirm/email";
import { extractSourceDocument } from "@/lib/confirm/extract";
import { haptic } from "@/lib/confirm/haptics";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectIcon, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type View = "overview" | "agreements" | "templates" | "people" | "locations" | "audit" | "settings";

function nextStep(state: WorkspaceState, agreement: Agreement) {
  if (agreement.status === "completed") return "Finished. Print or email the pack.";
  if (agreement.status === "declined") return "Declined. Issue a new pack if needed.";
  if (agreement.status === "superseded") return "Replaced by a newer record.";
  const signed = new Set(
    state.signatures.filter((item) => item.agreementId === agreement.id && item.outcome === "signed").map((item) => item.role),
  );
  if (!signed.has("employee")) return "Next: the employee signs.";
  if (!signed.has("manager")) return "Next: the franchisee signs.";
  if (agreement.witnessId && !signed.has("witness")) return "Next: the witness signs.";
  return "Signatures still outstanding.";
}

function roleLabel(role: string) {
  if (role === "manager") return "Franchisee";
  if (role === "witness") return "Witness";
  return "Employee";
}

function signedRoles(state: WorkspaceState, agreement: Agreement) {
  return new Set(
    state.signatures.filter((item) => item.agreementId === agreement.id && item.outcome === "signed").map((item) => item.role),
  );
}

function progressSteps(state: WorkspaceState, agreement: Agreement) {
  const signed = signedRoles(state, agreement);
  const done = agreement.status === "completed";
  const declined = agreement.status === "declined";
  const steps = [
    { id: "issued", label: "Issued", done: true },
    { id: "employee", label: "Employee", done: signed.has("employee") || done },
    { id: "manager", label: "Franchisee", done: signed.has("manager") || done },
  ];
  if (agreement.witnessId) steps.push({ id: "witness", label: "Witness", done: signed.has("witness") || done });
  steps.push({ id: "complete", label: "Complete", done });
  return { steps, declined, current: steps.findIndex((step) => !step.done) };
}

function ProgressTrack({ state, agreement, compact = false }: { state: WorkspaceState; agreement: Agreement; compact?: boolean }) {
  const { steps, declined, current } = progressSteps(state, agreement);
  const completeCount = steps.filter((step) => step.done).length;
  return (
    <div className={compact ? "min-w-40" : "my-4 rounded-md border border-line bg-ground px-4 py-3"} aria-label="Agreement progress">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">
          {declined ? "Stopped" : `${completeCount} of ${steps.length} steps`}
        </p>
        {!compact && <span className="text-[11px] text-muted">{nextStep(state, agreement)}</span>}
      </div>
      <Progress value={(completeCount / steps.length) * 100} className="mb-3" />
      <div className="flex items-center gap-1">
        {steps.map((step, index) => (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold",
                declined && !step.done && "bg-danger-bg text-danger-fg",
                step.done && "bg-accent text-paper",
                !step.done && !declined && index === current && "bg-status-amber-bg text-status-amber-fg",
                !step.done && !declined && index !== current && "bg-paper text-muted border border-line",
              )}
            >
              {step.done ? "✓" : index + 1}
            </span>
            {!compact && (
              <span className={cn("truncate text-[11px]", step.done ? "text-ink" : "text-muted")}>
                {step.label}
              </span>
            )}
            {index < steps.length - 1 && (
              <span className={cn("h-0.5 min-w-2 flex-1 rounded-full", step.done ? "bg-accent" : "bg-line")} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function rands(cents: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

function packTitle(value: string) {
  return value
    .replace(/\s+You have been accepted for:[\s\S]*$/i, "")
    .replace(/\s+DATE OF ATTENDANCE:[\s\S]*$/i, "")
    .replace(/_{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim() || value;
}

function personName(state: Pick<WorkspaceState, "people">, id: string) {
  return state.people.find((person) => person.id === id)?.fullName ?? id;
}

function branchLabel(state: Pick<WorkspaceState, "branches">, id: string) {
  const branch = state.branches.find((item) => item.id === id);
  return branch ? `${branch.name} · ${branch.code}` : id;
}

const toneClass: Record<string, string> = {
  amber: "bg-status-amber-bg text-status-amber-fg",
  blue: "bg-status-blue-bg text-status-blue-fg",
  violet: "bg-status-violet-bg text-status-violet-fg",
  green: "bg-status-green-bg text-status-green-fg",
  red: "bg-status-red-bg text-status-red-fg",
  slate: "bg-status-slate-bg text-status-slate-fg",
};

export function Workspace() {
  const store = useWorkspace();
  const current = store.people.find((person) => person.id === store.currentPersonId) ?? null;
  const [view, setView] = useState<View>("overview");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBoundary, setShowBoundary] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [archivePersonId, setArchivePersonId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<Role | "">("");
  const [typedName, setTypedName] = useState("");
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [issuedToken, setIssuedToken] = useState("");
  const [notice, setNotice] = useState("");
  const [deskFilter, setDeskFilter] = useState<"all" | "today" | "employee" | "franchisee" | "witness" | "remind">("all");
  const [draftTemplateId, setDraftTemplateId] = useState("");

  useEffect(() => {
    store.expireSessionIfNeeded();
    void store.hydrateRemote();
  }, [store]);

  useEffect(() => {
    if (current?.role === "manager") void store.ensurePilotPack();
  }, [current?.role, store]);

  const selected = store.agreements.find((item) => item.id === selectedId) ?? null;
  const editingPerson = store.people.find((person) => person.id === editingPersonId) ?? null;
  const editingTemplate = store.templates.find((template) => template.id === editingTemplateId) ?? null;
  const employees = store.people.filter((person) => person.role === "employee" && person.status === "active");
  const managers = store.people.filter((person) => person.role === "manager" && person.status === "active");
  const witnesses = store.people.filter((person) => person.role === "witness" && person.status === "active");
  const approvedTemplates = store.templates.filter((item) => item.status === "approved");
  const draftTemplate = approvedTemplates.find((item) => item.id === draftTemplateId) ?? approvedTemplates[0];
  const isManager = current?.role === "manager";
  const visibleAgreements = store.agreements.filter((item) => {
    if (!current) return false;
    return canViewAgreement(current, current.id, item);
  });

  const stats = useMemo(() => {
    const open = visibleAgreements.filter((item) => item.status === "awaiting_signatures" || item.status === "partially_signed");
    const signed = (agreementId: string, role: Role) =>
      store.signatures.some((item) => item.agreementId === agreementId && item.role === role && item.outcome === "signed");
    const today = new Date().toISOString().slice(0, 10);
    const reminderMs = 3 * 24 * 60 * 60 * 1000;
    return {
      completed: visibleAgreements.filter((item) => item.status === "completed").length,
      needsAction: open.length,
      awaiting: visibleAgreements.filter((item) => item.status === "awaiting_signatures").length,
      templates: approvedTemplates.length,
      issuedToday: visibleAgreements.filter((item) => item.createdAt.slice(0, 10) === today).length,
      waitingEmployee: open.filter((item) => !signed(item.id, "employee")).length,
      waitingFranchisee: open.filter((item) => !signed(item.id, "manager")).length,
      waitingWitness: open.filter((item) => item.witnessId && !signed(item.id, "witness")).length,
      remindersDue: open.filter((item) => !item.lastRemindedAt || Date.now() - new Date(item.lastRemindedAt).getTime() > reminderMs).length,
    };
  }, [visibleAgreements, approvedTemplates.length, store.signatures]);

  const filtered = visibleAgreements.filter((item) => {
    const haystack = `${item.title} ${item.activity} ${personName(store, item.employeeId)}`.toLowerCase();
    return (
      (!query || haystack.includes(query.toLowerCase())) &&
      (!statusFilter || item.status === statusFilter) &&
      (!clinicFilter || item.branchId === clinicFilter) &&
      (!templateFilter || item.templateId === templateFilter)
    );
  });

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const id = await store.createAgreement({
        title: String(values.title),
        activity: String(values.activity),
        branchId: String(values.branchId),
        employeeId: String(values.employeeId),
        managerId: String(values.managerId),
        witnessId: String(values.witnessId || "") || undefined,
        templateId: String(values.templateId),
        costRands: Number(values.costRands || 0),
        startsOn: String(values.startsOn || ""),
        endsOn: String(values.endsOn || ""),
        days: values.days ? Number(values.days) : undefined,
        contractEndOn: String(values.contractEndOn || ""),
        employeeIdNumber: String(values.employeeIdNumber || ""),
        employeePhone: String(values.employeePhone || ""),
        employeeTitle: String(values.employeeTitle || ""),
        equipmentMake: String(values.equipmentMake || ""),
        equipmentModel: String(values.equipmentModel || ""),
        equipmentSerial: String(values.equipmentSerial || ""),
        additionalDescription: String(values.additionalDescription || ""),
      });
      form.reset();
      setShowCreate(false);
      setSelectedId(id);
      const created = useWorkspace.getState().agreements.find((item) => item.id === id);
      const franchisee = store.people.find((person) => person.id === String(values.managerId));
      const employee = store.people.find((person) => person.id === String(values.employeeId));
      if (franchisee?.email && created) {
        window.open(
          employeeMailHref(
            buildFranchiseeIssuedMail({
              toName: franchisee.fullName,
              toEmail: franchisee.email,
              title: created.title,
              employeeName: employee?.fullName ?? "Employee",
              siteUrl: window.location.origin,
            }),
          ),
          "_self",
        );
      }
      setNotice("Pack issued. Tell the franchisee and send the employee the pack email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the agreement");
    } finally {
      setSaving(false);
    }
  }

  async function onSign(action: "sign" | "decline") {
    if (!selected) return;
    const role = activeRole;
    if (!role) {
      setError("Select whose name you are recording first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await store.captureSignature({
        agreementId: selected.id,
        role,
        typedName,
        consentAccepted: consent,
        action,
        token: token || undefined,
      });
      const latest = useWorkspace.getState().agreements.find((item) => item.id === selected.id);
      haptic(action === "decline" ? "warn" : latest?.status === "completed" ? "complete" : "success");
      setNotice(
        action === "decline"
          ? "Decline recorded."
          : latest?.status === "completed"
            ? "Saved. The signed pack is now the kept copy."
            : "Saved. Signature recorded on the frozen snapshot.",
      );
      if (action === "sign" && latest?.status === "completed") {
        const mail = buildSignedRecordMail(useWorkspace.getState(), latest, window.location.origin);
        if (mail.to) window.open(employeeMailHref(mail), "_self");
      } else if (action === "sign" && latest) {
        const snapshot = useWorkspace.getState();
        const next = latest.snapshot.signers.find(
          (signer) => !snapshot.signatures.some((item) => item.agreementId === latest.id && item.role === signer.role && item.outcome === "signed"),
        );
        const person = next ? snapshot.people.find((item) => item.id === next.id) : null;
        if (person?.email && next) {
          window.open(
            employeeMailHref(
              buildNextSignerMail({
                toName: person.fullName,
                toEmail: person.email,
                title: latest.title,
                role: next.role === "manager" ? "franchisee" : next.role,
                previousSigner: typedName,
                siteUrl: window.location.origin,
              }),
            ),
            "_self",
          );
        }
      }
      setTypedName(current?.fullName ?? "");
      setToken("");
      setConsent(false);
      setIssuedToken("");
      setActiveRole("");
    } catch (err) {
      haptic("warn");
      setError(err instanceof Error ? err.message : "Could not record the signature");
    } finally {
      setSaving(false);
    }
  }

  async function onIssueCode(role: Role) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const result = await store.issueSignCode(selected.id, role);
      setActiveRole(role);
      setToken(result.code);
      setIssuedToken(result.code);
      setNotice(`Sign code ${result.code} prepared for ${result.email}.`);
      const signer = selected.snapshot.signers.find((item) => item.role === role);
      window.location.href = employeeMailHref(
        buildSignCodeMail({
          fullName: signer?.name ?? "",
          email: result.email,
          title: selected.title,
          code: result.code,
          siteUrl: window.location.origin,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not email the sign code");
    } finally {
      setSaving(false);
    }
  }

  async function onIssue(role: Role) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const result = await store.issueLink(selected.id, role);
      setActiveRole(role);
      setIssuedToken(result.token);
      setToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue a signing link");
    } finally {
      setSaving(false);
    }
  }

  function downloadExport() {
    const payload = {
      branches: store.branches,
      people: store.people,
      templates: store.templates,
      agreements: store.agreements,
      signatures: store.signatures,
      links: store.links,
      audit: store.audit,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skinphd-confirm-workspace.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const headings: Record<View, string> = {
    overview: stats.needsAction ? "Waiting on a signature" : "Records are up to date",
    agreements: "Agreements",
    templates: "Source forms",
    people: "Staff directory",
    locations: "SkinPhD branches",
    audit: "What changed",
    settings: "Workspace settings",
  };
  const summaries: Record<View, string> = {
    overview: "Confirm keeps the signed pack when paper is missing. Open a waiting record and type the next name.",
    agreements: "Each row is a frozen pack. Open it to sign or to retrieve the stored copy.",
    templates: "Approved SkinPhD wording. Upload stores the original file with the text.",
    people: "Employees, franchisees and witnesses who can appear on an agreement.",
    locations: "SkinPhD branch names and codes used on issued packs.",
    audit: "Issue, sign, reminder and update actions.",
    settings: "PIN reset, export of records, and what this system will not decide.",
  };

  if (!current) {
    return (
      <WorkspaceGate
        onEnter={async (email, pin) => {
          await store.hydrateRemote();
          await store.signInWithPin(email, pin);
        }}
      />
    );
  }

  return (
    <TooltipProvider>
    <main className="min-h-screen bg-transparent text-ink lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="flex flex-col bg-linear-to-b from-forest to-forest-dark px-4 py-7 text-sidebar-text shadow-[8px_0_40px_rgba(10,36,29,0.18)] lg:sticky lg:top-0 lg:h-screen">
        <div className="mb-7 flex items-center gap-3 border-b border-white/10 px-2 pb-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-sage font-display text-2xl font-semibold text-forest shadow-inner">S</span>
          <span>
            <strong className="block font-display text-lg font-semibold tracking-tight text-paper">SkinPhD</strong>
            <small className="mt-0.5 block text-[11px] tracking-[0.16em] text-sidebar-soft uppercase">Confirm</small>
          </span>
        </div>
        <nav aria-label="Primary navigation" className="flex gap-2 overflow-x-auto lg:block lg:overflow-visible">
          <p className="mb-2 hidden px-2 text-[10px] font-bold tracking-[0.12em] text-sidebar-label uppercase lg:block">Work</p>
          <NavButton current={view} id="overview" label="Home" count={stats.needsAction} onSelect={setView} />
          <NavButton current={view} id="agreements" label="Agreements" count={visibleAgreements.length} onSelect={setView} />
          {can(current, "templates") && <NavButton current={view} id="templates" label="Source forms" count={approvedTemplates.length} onSelect={setView} />}
          {can(current, "staff") && <NavButton current={view} id="people" label="Staff" count={store.people.length} onSelect={setView} />}
          {can(current, "clinics") && <NavButton current={view} id="locations" label="SkinPhD branches" count={store.branches.length} onSelect={setView} />}
          <p className="mt-7 mb-2 hidden px-2 text-[10px] font-bold tracking-[0.12em] text-sidebar-label uppercase lg:block">Record</p>
          {can(current, "audit") && <NavButton current={view} id="audit" label="History" onSelect={setView} />}
          <NavButton current={view} id="settings" label="Settings" onSelect={setView} />
        </nav>
        <div className="mt-auto hidden items-center gap-2.5 border-t border-white/10 px-2 pt-4 lg:grid lg:grid-cols-[38px_1fr]">
          <span className="grid size-9 place-items-center rounded-full bg-sage text-[11px] font-extrabold text-forest">{initials(current.fullName)}</span>
          <span>
            <strong className="block text-xs text-paper">{current.fullName}</strong>
            <small className="capitalize text-[11px] text-sidebar-label">{roleLabel(current.role)}</small>
          </span>
        </div>
      </aside>

      <section className="min-w-0 px-4 py-6 sm:px-8 lg:px-14">
        <header className="mx-auto mb-6 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">SkinPhD Confirm</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{headings[view]}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{summaries[view]}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-paper px-3 text-[11px] font-bold text-muted shadow-sm">
              <b className={cn("grid size-6 place-items-center rounded-full bg-sage text-[10px] text-accent tabular-nums", stats.needsAction > 0 && "live-dot")}>{stats.needsAction}</b>
              {stats.needsAction ? "live" : "clear"}
            </span>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line bg-paper px-4 text-xs font-bold text-muted"
              onClick={() => store.signOut()}
            >
              Sign out
            </button>
            {isManager && (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-bold text-paper shadow-sm hover:bg-accent-hover"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-3.5" />
                Issue agreement
              </button>
            )}
          </div>
        </header>

        {isManager && (
        <div className="mx-auto mb-4 flex max-w-7xl items-start gap-3 rounded-[10px] border border-warn-line bg-warn-bg px-3 py-2.5 text-[11px] text-warn-fg">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-status-amber-fg" />
          <p className="m-0">
            <strong>Employee agreement workspace</strong> · Client consultation and consent remain locked until approved forms are supplied.
          </p>
          <button type="button" className="ml-auto shrink-0 font-bold no-print" onClick={() => setShowBoundary(true)}>
            View launch boundary
          </button>
        </div>
        )}

        {error && (
          <div className="mx-auto mb-4 max-w-7xl rounded-[10px] border border-danger-line bg-danger-bg px-3 py-2.5 text-[11px] text-danger-fg" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="mx-auto mb-4 max-w-7xl rounded-[10px] border border-status-green-bg bg-status-green-bg px-3 py-2.5 text-[12px] font-medium text-status-green-fg" role="status">
            {notice}
          </div>
        )}

        {view === "overview" && (
          <div className="mx-auto grid max-w-7xl gap-4">
            {isManager && (
              <section className="overflow-hidden rounded-2xl border border-line bg-paper p-4" aria-label="Head Office desk">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold tracking-[0.12em] text-muted uppercase">Who is next</p>
                    <p className="mt-1 text-sm text-muted">Tap a count to show only those packs.</p>
                  </div>
                  {deskFilter !== "all" && (
                    <button type="button" className="text-[11px] font-bold text-accent" onClick={() => setDeskFilter("all")}>
                      Show all waiting
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    ["today", stats.issuedToday, "Issued today", "Created today"],
                    ["employee", stats.waitingEmployee, "Employee", "Name not stored yet"],
                    ["franchisee", stats.waitingFranchisee, "Franchisee", "Name not stored yet"],
                    ["witness", stats.waitingWitness, "Witness", "Name not stored yet"],
                    ["remind", stats.remindersDue, "Remind", "No nudge in 3 days"],
                  ].map(([id, value, label, hint]) => (
                    <button
                      key={String(id)}
                      type="button"
                      onClick={() => setDeskFilter(id as typeof deskFilter)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
                        deskFilter === id ? "border-accent bg-sage" : "border-line bg-ground hover:border-accent/40",
                      )}
                    >
                      <strong className="block font-display text-2xl font-medium tabular-nums">{value}</strong>
                      <span className="mt-1 block text-[12px] font-bold text-ink">{label}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="overflow-hidden rounded-lg border border-line bg-paper">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Open these first</p>
                <h2 className="font-display text-xl font-medium">
                  {deskFilter === "employee"
                    ? "Waiting on the employee"
                    : deskFilter === "franchisee"
                      ? "Waiting on the franchisee"
                      : deskFilter === "witness"
                        ? "Waiting on the witness"
                        : deskFilter === "today"
                          ? "Issued today"
                          : deskFilter === "remind"
                            ? "Need a reminder"
                            : "Waiting on a signature"}
                </h2>
              </div>
              <div className="divide-y divide-line">
                {visibleAgreements.filter((item) => {
                  const open = item.status === "awaiting_signatures" || item.status === "partially_signed";
                  const signed = (role: Role) => store.signatures.some((entry) => entry.agreementId === item.id && entry.role === role && entry.outcome === "signed");
                  const today = new Date().toISOString().slice(0, 10);
                  if (deskFilter === "today") return item.createdAt.slice(0, 10) === today;
                  if (!open) return false;
                  if (deskFilter === "employee") return !signed("employee");
                  if (deskFilter === "franchisee") return !signed("manager");
                  if (deskFilter === "witness") return Boolean(item.witnessId) && !signed("witness");
                  if (deskFilter === "remind") return !item.lastRemindedAt || Date.now() - new Date(item.lastRemindedAt).getTime() > 3 * 24 * 60 * 60 * 1000;
                  return true;
                }).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full flex-col gap-2 px-5 py-4 text-left hover:bg-ground sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => {
                      setSelectedId(item.id);
                      setView("agreements");
                      const signer = item.snapshot.signers.find((entry) => entry.id === current.id);
                      if (signer) {
                        setActiveRole(signer.role);
                        setTypedName(current.fullName);
                      }
                    }}
                  >
                    <span className="min-w-0">
                      <strong className="block text-sm">{packTitle(item.title)}</strong>
                      <small className="text-[12px] text-muted">{nextStep(store, item)}</small>
                    </span>
                    <span className="flex items-center gap-3">
                      <ProgressTrack state={store} agreement={item} compact />
                      <span className="rounded-md bg-accent px-3 py-2 text-[11px] font-bold text-paper">Open to sign</span>
                    </span>
                  </button>
                ))}
                {visibleAgreements.every((item) => item.status !== "awaiting_signatures" && item.status !== "partially_signed") && (
                  <p className="px-5 py-8 text-[13px] leading-relaxed text-muted">
                    Nothing is waiting. {isManager ? "Issue an agreement to start a record." : "When Head Office assigns a pack, it will show here."}
                  </p>
                )}
              </div>
            </section>
            {isManager && (
            <section className="overflow-hidden rounded-lg border border-line bg-paper">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Why this exists</p>
                <h2 className="font-display text-xl font-medium">Paper can go missing. This copy stays.</h2>
              </div>
              <ol className="grid gap-0 px-5 sm:grid-cols-4">
                {[
                  ["Source", "Use an approved SkinPhD form."],
                  ["Issue", "Fill names, SkinPhD branch, dates and cost. Freeze that snapshot."],
                  ["Sign", "Employee, franchisee and witness type their names."],
                  ["Keep", "The signed record stays here even if the print is lost."],
                ].map(([title, copy]) => (
                  <li key={title} className="border-b border-line py-4 sm:border-b-0 sm:border-r sm:px-3 sm:last:border-r-0">
                    <strong className="block text-sm">{title}</strong>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{copy}</p>
                  </li>
                ))}
              </ol>
            </section>
            )}
          </div>
        )}

        {view === "agreements" && (
          <>
            <section className="mx-auto mb-4 grid max-w-7xl grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Agreement summary">
              <Stat icon="↗" tone="green" label="Completed agreements" value={stats.completed} note="Locked with signature evidence" />
              <Stat icon="!" tone="amber" label="Needs your action" value={stats.needsAction} note="Draft or partially signed" />
              <Stat icon="→" tone="blue" label="Awaiting signatures" value={stats.awaiting} note="Employee, franchisee or witness" />
              {can(current, "templates") && (
                <Stat icon="✓" tone="slate" label="Approved source templates" value={stats.templates} note="Allocated from supplied SkinPhD forms" />
              )}
            </section>
            <div className="mx-auto mb-3.5 flex max-w-7xl flex-wrap gap-2 no-print">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, employee or activity"
                aria-label="Search agreements"
                className="min-h-10 min-w-48 flex-1 rounded-md border border-line bg-paper px-3 text-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {can(current, "clinics") && (
              <Select value={clinicFilter} onValueChange={setClinicFilter}>
                <SelectTrigger aria-label="Filter by SkinPhD branch">
                  <SelectValue placeholder="All SkinPhD branches" />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SkinPhD branches</SelectItem>
                  {store.branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
              {can(current, "templates") && (
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger aria-label="Filter by source form">
                  <SelectValue placeholder="All source forms" />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All source forms</SelectItem>
                  {approvedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>
            <div className={cn("mx-auto grid max-w-7xl gap-4", current.role === "manager" && can(current, "audit") && "xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.75fr)]")}>
              <AgreementQueue
                state={store}
                items={filtered}
                canCreate={isManager}
                onOpen={(id) => {
                  setSelectedId(id);
                  const agreement = store.agreements.find((item) => item.id === id);
                  const signer = agreement?.snapshot.signers.find((item) => item.id === current.id);
                  if (signer) {
                    setActiveRole(signer.role);
                    setTypedName(current.fullName);
                  }
                }}
                onCreate={() => setShowCreate(true)}
              />
              {current.role === "manager" && can(current, "audit") && (
              <aside className="overflow-hidden rounded-lg border border-line bg-paper">
                <div className="border-b border-line px-5 py-4">
                  <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Live record</p>
                  <h2 className="font-display text-xl font-medium">Recent activity</h2>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-status-green-fg">
                    <span className="live-dot size-2 rounded-full bg-accent" />
                    Updating with this workspace
                  </p>
                </div>
                <div className="px-5">
                  {store.audit.slice(0, 8).map((item) => (
                    <article key={item.id} className="grid grid-cols-[34px_1fr] gap-3 border-b border-line py-3.5">
                      <span className="grid size-8 place-items-center rounded-full bg-ground text-[10px] font-extrabold text-muted">
                        {initials(item.actor)}
                      </span>
                      <p className="m-0">
                        <strong className="block text-[11px]">{item.action}</strong>
                        <span className="mt-1 block text-[10px] leading-relaxed text-muted">{item.detail}</span>
                        <small className="mt-1 block text-[9px] text-muted">
                          {shortTime(item.createdAt)} · {item.actor}
                        </small>
                      </p>
                    </article>
                  ))}
                </div>
                <div className="m-4 flex gap-2.5 rounded-[10px] bg-sage px-3 py-3 text-status-green-fg">
                  <Check className="mt-0.5 size-3.5 shrink-0" />
                  <p className="m-0">
                    <strong className="block text-[10px]">Every action is recorded</strong>
                    <small className="mt-1 block text-[9px] leading-relaxed text-muted">
                      Document versions, signers and timestamps stay linked to the agreement.
                    </small>
                  </p>
                </div>
              </aside>
              )}
            </div>
          </>
        )}

        {view === "templates" && can(current, "templates") && (
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.4fr)_360px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {store.templates.map((template) => (
                <article key={template.id} className="rounded-lg border border-line bg-paper p-5">
                  <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">
                    {template.category} · v{template.version}
                    {template.hasWaiver ? " · waiver addendum" : ""}
                  </p>
                  <strong className="mt-2 block text-sm">{template.name}</strong>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">{template.module}</p>
                  <p className="mt-2 text-[11px] text-muted">{template.sourceFile}</p>
                  <p className="mt-2 text-[11px] text-muted">
                    {template.dailyRateRands ? `Source rate R${template.dailyRateRands.toLocaleString("en-ZA")} per day` : "Deemed cost entered at issue"}
                    {template.passPercent ? ` · ${template.passPercent}% pass` : ""}
                    {template.mandatoryMonths ? ` · ${template.mandatoryMonths} month stay` : ""}
                  </p>
                  <p className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-muted">
                    {template.content ? template.content.slice(0, 280) : "No wording stored yet."}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">{template.content.length} characters stored</p>
                  <b className={cn("mt-3 inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold", toneClass[template.status === "approved" ? "green" : "slate"])}>
                    {template.status}
                  </b>
                  <button type="button" className="mt-3 block rounded-md border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-accent" onClick={() => setEditingTemplateId(template.id)}>
                    View / edit wording
                  </button>
                </article>
              ))}
            </div>
            {current.role === "manager" && (
              <form
                className="h-fit rounded-lg border border-line bg-paper p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const values = Object.fromEntries(new FormData(form).entries());
                  void store.addTemplate({
                      name: String(values.name),
                      category: String(values.category) as "training" | "equipment" | "internal_waiver",
                      module: String(values.module),
                      sourceFile: String(values.sourceFile),
                      content: String(values.content),
                      dailyRateRands: values.dailyRateRands ? Number(values.dailyRateRands) : null,
                      defaultDays: values.defaultDays ? Number(values.defaultDays) : null,
                      passPercent: values.passPercent ? Number(values.passPercent) : null,
                      mandatoryMonths: values.mandatoryMonths ? Number(values.mandatoryMonths) : null,
                      hasWaiver: values.hasWaiver === "on",
                      equipmentLabel: String(values.equipmentLabel || "") || null,
                      fileBase64: String(values.fileBase64 || "") || undefined,
                      mimeType: String(values.mimeType || "") || undefined,
                      byteSize: values.byteSize ? Number(values.byteSize) : undefined,
                    }).then(() => {
                    form.reset();
                    setError("");
                  }).catch((err) => {
                    setError(err instanceof Error ? err.message : "Could not add the document");
                  });
                }}
              >
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">New source document</p>
                <h2 className="mb-3 font-display text-xl font-medium">Upload wording</h2>
                <p className="mb-3 text-[11px] leading-relaxed text-muted">
                  Keep the original file name. Paste the exact source wording. Do not invent clauses, rates, or waiver text.
                </p>
                <div className="grid gap-2.5">
                  <input
                    type="file"
                    accept=".txt,.pptx,.pdf,.docx"
                    className="min-h-10 rounded-md border border-line px-2.5 py-2 text-sm"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      const form = event.currentTarget.form;
                      if (!file || !form) return;
                      const setValue = (name: string, value: string) => {
                        const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
                        if (field) field.value = value;
                      };
                      setValue("sourceFile", file.name);
                      if (file.size > 6_000_000) {
                        setError("Keep source files under 6 MB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = String(reader.result || "");
                        const base64 = result.includes(",") ? result.split(",")[1] : result;
                        setValue("fileBase64", base64);
                        setValue("mimeType", file.type || "application/octet-stream");
                        setValue("byteSize", String(file.size));
                      };
                      reader.readAsDataURL(file);
                      void extractSourceDocument(file)
                        .then((extracted) => {
                          setValue("sourceFile", extracted.fileName);
                          setValue("name", extracted.name);
                          setValue("module", extracted.module);
                          setValue("category", extracted.category);
                          setValue("content", extracted.content);
                          setValue("dailyRateRands", extracted.dailyRateRands ? String(extracted.dailyRateRands) : "");
                          setValue("defaultDays", extracted.defaultDays ? String(extracted.defaultDays) : "");
                          setValue("passPercent", extracted.passPercent ? String(extracted.passPercent) : "");
                          setValue("mandatoryMonths", extracted.mandatoryMonths ? String(extracted.mandatoryMonths) : "");
                          setValue("equipmentLabel", extracted.equipmentLabel ?? "");
                          const waiver = form.elements.namedItem("hasWaiver") as HTMLInputElement | null;
                          if (waiver) waiver.checked = extracted.hasWaiver;
                          setError("");
                        })
                        .catch((err) => setError(err instanceof Error ? err.message : "Could not read that file"));
                    }}
                  />
                  <input name="sourceFile" required placeholder="Original file name" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input type="hidden" name="fileBase64" />
                  <input type="hidden" name="mimeType" />
                  <input type="hidden" name="byteSize" />
                  <input name="name" required placeholder="Template name as printed" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input name="module" placeholder="Module / machine name" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <select name="category" required className="min-h-10 rounded-md border border-line px-2.5 text-sm">
                    <option value="training">Training cost agreement</option>
                    <option value="equipment">Equipment cost agreement</option>
                    <option value="internal_waiver">Internal waiver addendum</option>
                  </select>
                  <input name="dailyRateRands" type="number" min={0} placeholder="Daily rate if printed (optional)" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input name="defaultDays" type="number" min={0} placeholder="Days if printed (optional)" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input name="passPercent" type="number" min={0} max={100} placeholder="Pass % if printed (optional)" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input name="mandatoryMonths" type="number" min={0} placeholder="Mandatory months if printed (optional)" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input name="equipmentLabel" placeholder="Equipment label if printed (optional)" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <label className="flex items-center gap-2 text-[11px] text-muted">
                    <input name="hasWaiver" type="checkbox" />
                    Source file includes a waiver addendum
                  </label>
                  <textarea name="content" required rows={10} placeholder="Paste the exact source wording here" className="rounded-md border border-line px-2.5 py-2 text-sm" />
                  <button className="min-h-10 rounded-md bg-accent text-xs font-bold text-paper">Save source template</button>
                </div>
              </form>
            )}
          </div>
        )}

        {view === "people" && can(current, "staff") && (
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.4fr)_320px]">
            <div className="grid gap-3">
              <input
                value={peopleQuery}
                onChange={(event) => setPeopleQuery(event.target.value)}
                placeholder="Search name, email, role or SkinPhD branch"
                aria-label="Search staff"
                className="min-h-10 rounded-md border border-line bg-paper px-3 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
              {store.people
                .filter((person) => {
                  const haystack = `${person.fullName} ${person.email} ${person.role} ${branchLabel(store, person.branchId)}`.toLowerCase();
                  return !peopleQuery || haystack.includes(peopleQuery.toLowerCase());
                })
                .map((person) => (
                <article key={person.id} className="rounded-lg border border-line bg-paper p-5">
                  <strong className="block text-sm">{person.fullName}</strong>
                  <small className="mt-1.5 block text-[11px] text-muted capitalize">
                    {roleLabel(person.role)} · {branchLabel(store, person.branchId)} · {person.status}
                  </small>
                  <small className="mt-1 block text-[11px] text-muted">{person.email}</small>
                  <p className="mt-2 text-[11px] text-muted">
                    {(store.records ?? []).filter((item) => item.personId === person.id).length} stored paper pack(s)
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="rounded-md border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-accent" onClick={() => setArchivePersonId(person.id)}>
                      Upload completed pack
                    </button>
                    <button type="button" className="rounded-md border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-accent" onClick={() => setEditingPersonId(person.id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-danger-line bg-danger-bg px-3 py-1.5 text-[11px] font-bold text-danger-fg"
                      onClick={() => {
                        try {
                          store.removePerson(person.id);
                          setError("");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not remove the person");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              </div>
            </div>
            <form
              className="h-fit rounded-lg border border-line bg-paper p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const values = Object.fromEntries(new FormData(form).entries());
                void (async () => {
                  try {
                    await store.addPerson({
                      fullName: String(values.fullName),
                      email: String(values.email),
                      role: String(values.role) as Role,
                      branchId: String(values.branchId),
                      pin: String(values.pin),
                    });
                    const mail = buildWelcomeMail({
                      fullName: String(values.fullName),
                      email: String(values.email),
                      role: String(values.role),
                      clinic: branchLabel(store, String(values.branchId)),
                      pin: String(values.pin),
                      siteUrl: window.location.origin,
                    });
                    form.reset();
                    setError("");
                    window.location.href = employeeMailHref(mail);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not add the person");
                  }
                })();
              }}
            >
              <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Add to directory</p>
              <h2 className="mb-3 font-display text-xl font-medium">New person</h2>
              <div className="grid gap-2.5">
                <input name="fullName" required placeholder="Full name" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                <input name="email" required type="email" placeholder="Work email" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                <input name="pin" required inputMode="numeric" minLength={4} maxLength={8} placeholder="4–8 digit PIN" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                <select name="role" required className="min-h-10 rounded-md border border-line px-2.5 text-sm">
                  <option value="employee">Employee / applicant</option>
                  <option value="manager">Franchisee / manager</option>
                  <option value="witness">Witness</option>
                </select>
                <select name="branchId" required className="min-h-10 rounded-md border border-line px-2.5 text-sm">
                  {store.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <button className="min-h-10 rounded-md bg-accent text-xs font-bold text-paper">Add person</button>
              </div>
            </form>
          </div>
        )}

        {view === "locations" && can(current, "clinics") && (
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.6fr)_300px]">
            <section className="overflow-hidden rounded-lg border border-line bg-paper">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">SkinPhD branch directory</p>
                <h2 className="font-display text-xl font-medium">SkinPhD branches</h2>
              </div>
              <div>
                {store.branches.map((branch) => (
                  <article key={branch.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0">
                    <strong className="text-sm">{branch.name}</strong>
                    <span className="font-mono text-xs tracking-wide text-muted tabular-nums">{branch.code}</span>
                  </article>
                ))}
              </div>
            </section>
            <form
              className="h-fit rounded-lg border border-line bg-paper p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const values = Object.fromEntries(new FormData(event.currentTarget).entries());
                try {
                  store.addBranch({ name: String(values.name), code: String(values.code) });
                  event.currentTarget.reset();
                  setError("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not add the SkinPhD branch");
                }
              }}
            >
              <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Missing branch</p>
              <h2 className="mb-3 font-display text-xl font-medium">Add a SkinPhD branch</h2>
              <div className="grid gap-2.5">
                <input name="name" required placeholder="SkinPhD branch name" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                <input name="code" required placeholder="SKIN0000" className="min-h-10 rounded-md border border-line px-2.5 text-sm uppercase" />
                <button className="min-h-10 rounded-md bg-accent text-xs font-bold text-paper">Add SkinPhD branch</button>
              </div>
            </form>
          </div>
        )}

        {view === "audit" && can(current, "audit") && (
          <section className="mx-auto max-w-7xl overflow-hidden rounded-lg border border-line bg-paper">
            <div className="border-b border-line px-5 py-4">
              <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Control</p>
              <h2 className="font-display text-xl font-medium">Full audit history</h2>
            </div>
            <div className="px-5">
              {store.audit.map((item) => (
                <article key={item.id} className="grid grid-cols-[34px_1fr] gap-3 border-b border-line py-3.5">
                  <span className="grid size-8 place-items-center rounded-full bg-ground text-[10px] font-extrabold text-muted">
                    {initials(item.actor)}
                  </span>
                  <p className="m-0">
                    <strong className="block text-[11px]">{item.action}</strong>
                    <span className="mt-1 block text-[10px] leading-relaxed text-muted">{item.detail}</span>
                    <small className="mt-1 block text-[9px] text-muted">
                      {shortTime(item.createdAt)} · {item.actor}
                      {item.agreementId ? ` · ${item.agreementId}` : ""}
                    </small>
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === "settings" && (
          <div className="mx-auto grid max-w-3xl gap-4">
            <section className="overflow-hidden rounded-lg border border-line bg-paper">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Make this workable</p>
                <h2 className="font-display text-xl font-medium">Pilot path</h2>
              </div>
              <ol className="grid gap-0 px-5 py-2 text-[12px] leading-relaxed">
                <li className="border-b border-line py-3">1. Add the remaining clinics and the real franchisee, employee and witness names in People and Locations.</li>
                <li className="border-b border-line py-3">2. Issue one training form and one equipment form, sign all three roles, then print the frozen snapshot.</li>
                <li className="border-b border-line py-3">3. SkinPhD legal must confirm the source wording, the 80%/90% inconsistencies, and whether payroll-deduction sentences may stay as recorded text only.</li>
                <li className="border-b border-line py-3">4. Before live staff use: private hosting, named logins, and an approved signing method. Do not put live ID numbers into this browser pilot.</li>
                <li className="py-3">5. Client consultation and treatment consent stay locked until those forms are supplied separately.</li>
              </ol>
            </section>
            <section className="overflow-hidden rounded-lg border border-line bg-paper">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Production controls</p>
                <h2 className="font-display text-xl font-medium">PIN and records</h2>
              </div>
              <div className="px-5 py-5">
                <p className="text-[11px] leading-relaxed text-muted">
                  Records sync to the SkinPhD tenant with a workspace key. Sessions expire after 8 hours. Client contacts stay closed.
                </p>
                <form
                  className="mt-4 grid gap-2 sm:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const values = Object.fromEntries(new FormData(form).entries());
                    void store
                      .changePin(String(values.currentPin), String(values.nextPin))
                      .then(() => {
                        form.reset();
                        setError("");
                      })
                      .catch((err) => setError(err instanceof Error ? err.message : "Could not change PIN"));
                  }}
                >
                  <input name="currentPin" type="password" required placeholder="Current PIN" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <input name="nextPin" type="password" required placeholder="New PIN" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
                  <button className="min-h-10 rounded-md bg-accent text-xs font-bold text-paper">Change PIN</button>
                </form>
                <div className="mt-4 rounded-md bg-ground px-3 py-3 text-[12px] leading-relaxed text-muted">
                  <strong className="block text-ink">PIN issue and reset</strong>
                  Head Office creates the person in Staff with a 4–8 digit PIN and tells that person privately. The person signs in and changes the PIN immediately. If a PIN is lost, Head Office issues a new one here. Do not put PINs in the agreement email.
                </div>
                <div className="mt-3 rounded-md bg-ground px-3 py-3 text-[12px] leading-relaxed text-muted">
                  <strong className="block text-ink">Backup</strong>
                  Use Export JSON after each training day. On the server also run scripts/backup-confirm.sh so Confirm tables have a dated copy. The signed snapshot in this workspace is the record if paper is misplaced.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {can(current, "export") && (
                  <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line bg-paper px-4 text-xs font-bold text-muted" onClick={downloadExport}>
                    <Download className="size-3.5" />
                    Export JSON
                  </button>
                  )}
                  {!isProductionMode() && (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-danger-line bg-danger-bg px-4 text-xs font-bold text-danger-fg"
                      onClick={() => {
                        store.resetWorkspace();
                        setSelectedId(null);
                        setError("");
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                      Reset seed data
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        <footer className="mx-auto mt-5 flex max-w-7xl justify-between text-[9px] text-muted">
          <span>SkinPhD Confirm</span>
          <span>Private employee agreement workspace</span>
        </footer>
      </section>

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Create an agreement" eyebrow="Controlled issue flow">
          <form onSubmit={onCreate}>
            <div className="grid gap-3.5 p-5 sm:grid-cols-2">
              <p className="sm:col-span-2 rounded-md bg-sage px-3 py-3 text-[10px] leading-relaxed text-status-green-fg">
                Source wording from the selected SkinPhD form will be frozen into a SHA-256 snapshot. This workspace records the issued fields and signatures. It does not run payroll deductions or decide competence.
              </p>
              <label className="sm:col-span-2 grid gap-1.5 text-[10px] font-extrabold text-muted">
                Source template
                <select
                  name="templateId"
                  required
                  value={draftTemplate?.id}
                  onChange={(event) => setDraftTemplateId(event.target.value)}
                  className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink"
                >
                  {approvedTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 grid gap-1.5 text-[10px] font-extrabold text-muted">
                Agreement title
                <input key={draftTemplate?.id} name="title" required defaultValue={draftTemplate?.name} className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                SkinPhD branch
                <select name="branchId" required className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink">
                  {store.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name} · {branch.code}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Date of attendance
                <input name="startsOn" type="date" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Employee
                <select name="employeeId" required className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink">
                  {employees.map((person) => (
                    <option key={person.id} value={person.id}>{person.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Franchisee / manager
                <select name="managerId" required className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink">
                  {managers.map((person) => (
                    <option key={person.id} value={person.id}>{person.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Witness
                <select name="witnessId" required={Boolean(draftTemplate?.requiresWitness)} className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink">
                  <option value="">{draftTemplate?.requiresWitness ? "Required on this source form" : "Not required"}</option>
                  {witnesses.map((person) => (
                    <option key={person.id} value={person.id}>{person.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Position / title
                <input name="employeeTitle" placeholder="e.g. Aesthetic Therapist" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                ID number
                <input name="employeeIdNumber" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Phone
                <input name="employeePhone" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
              </label>
              {draftTemplate?.category === "training" && (
                <>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Course days
                    <input name="days" min="1" step="1" type="number" defaultValue={draftTemplate.defaultDays ?? undefined} className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Completion date
                    <input name="endsOn" type="date" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Contract end date
                    <input name="contractEndOn" type="date" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
                  </label>
                  <p className="rounded-md bg-ground px-3 py-3 text-[10px] leading-relaxed text-muted sm:col-span-2">
                    Source rate {draftTemplate.dailyRateRands ? `R${draftTemplate.dailyRateRands.toLocaleString("en-ZA")} per day` : "not stated"}.
                    Pass mark {draftTemplate.passPercent ?? "not stated"}%.
                    Mandatory stay {draftTemplate.mandatoryMonths ?? "not stated"} months.
                    Enter the deemed cost shown on the issued form. This app does not calculate or collect repayment.
                  </p>
                </>
              )}
              {draftTemplate?.category === "equipment" && (
                <>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Make
                    <input name="equipmentMake" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Model
                    <input name="equipmentModel" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Serial number
                    <input name="equipmentSerial" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
                  </label>
                  <label className="sm:col-span-2 grid gap-1.5 text-[10px] font-extrabold text-muted">
                    Additional description
                    <textarea name="additionalDescription" className="min-h-16 rounded-md border border-line px-2.5 py-2 text-sm font-normal text-ink" />
                  </label>
                </>
              )}
              <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
                Deemed cost (ZAR)
                <input name="costRands" min="0" step="0.01" type="number" defaultValue={draftTemplate?.defaultDays && draftTemplate.dailyRateRands ? draftTemplate.defaultDays * draftTemplate.dailyRateRands : undefined} placeholder="0.00" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
              </label>
              <label className="sm:col-span-2 grid gap-1.5 text-[10px] font-extrabold text-muted">
                Module / activity
                <textarea name="activity" required defaultValue={draftTemplate?.module} key={`${draftTemplate?.id}-activity`} className="min-h-16 rounded-md border border-line px-2.5 py-2 text-sm font-normal text-ink" />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button type="button" className="min-h-10 rounded-md border border-line bg-paper px-4 text-xs font-bold text-muted" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="min-h-10 rounded-md bg-accent px-4 text-xs font-bold text-paper disabled:opacity-65" disabled={saving}>
                {saving ? "Creating…" : "Freeze and issue agreement"}
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {editingPerson && (
        <Modal onClose={() => setEditingPersonId(null)} title={editingPerson.fullName} eyebrow="Edit directory">
          <form
            className="grid gap-2.5 px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(new FormData(event.currentTarget).entries());
              void store
                .updatePerson({
                  id: editingPerson.id,
                  fullName: String(values.fullName),
                  email: String(values.email),
                  role: String(values.role) as Role,
                  branchId: String(values.branchId),
                  status: String(values.status) as "active" | "inactive",
                  pin: String(values.pin || "") || undefined,
                })
                .then(() => {
                  const pin = String(values.pin || "");
                  if (pin) {
                    window.location.href = employeeMailHref(
                      buildWelcomeMail({
                        fullName: String(values.fullName),
                        email: String(values.email),
                        role: String(values.role),
                        clinic: branchLabel(store, String(values.branchId)),
                        pin,
                        siteUrl: window.location.origin,
                      }),
                    );
                  }
                  setEditingPersonId(null);
                  setError("");
                })
                .catch((err) => setError(err instanceof Error ? err.message : "Could not update the person"));
            }}
          >
            <input name="fullName" required defaultValue={editingPerson.fullName} className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="email" required type="email" defaultValue={editingPerson.email} className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="pin" inputMode="numeric" minLength={4} maxLength={8} placeholder="New PIN (leave blank to keep)" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <select name="role" required defaultValue={editingPerson.role} className="min-h-10 rounded-md border border-line px-2.5 text-sm">
              <option value="employee">Employee / applicant</option>
              <option value="manager">Franchisee / manager</option>
              <option value="witness">Witness</option>
            </select>
            <select name="branchId" required defaultValue={editingPerson.branchId} className="min-h-10 rounded-md border border-line px-2.5 text-sm">
              {store.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <select name="status" required defaultValue={editingPerson.status} className="min-h-10 rounded-md border border-line px-2.5 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="text-[11px] leading-relaxed text-muted">
              If this person is named on an agreement, Delete deactivates them so the signed record stays intact.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="min-h-10 rounded-md border border-line px-4 text-xs font-bold text-muted" onClick={() => setEditingPersonId(null)}>
                Cancel
              </button>
              <button className="min-h-10 rounded-md bg-accent px-4 text-xs font-bold text-paper">Save details</button>
            </div>
          </form>
        </Modal>
      )}

      {archivePersonId && (
        <Modal
          onClose={() => setArchivePersonId(null)}
          title={store.people.find((person) => person.id === archivePersonId)?.fullName ?? "Staff"}
          eyebrow="Completed paper pack"
        >
          <form
            className="grid gap-2.5 px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const values = Object.fromEntries(new FormData(form).entries());
              void store
                .addEmployeeRecord({
                  personId: archivePersonId,
                  fileName: String(values.fileName),
                  mimeType: String(values.mimeType || "application/octet-stream"),
                  byteSize: Number(values.byteSize || 0),
                  contentBase64: String(values.fileBase64),
                  note: String(values.note || ""),
                })
                .then(() => {
                  setArchivePersonId(null);
                  setNotice("Completed pack stored against this employee. This is paper evidence, not a Confirm typed signature.");
                })
                .catch((err) => setError(err instanceof Error ? err.message : "Could not store the file"));
            }}
          >
            <p className="text-[12px] leading-relaxed text-muted">
              Upload a PDF or photo of a pack that is already signed on paper. Confirm stores the file and a hash. It does not treat this as a new typed signature.
            </p>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              required
              className="min-h-10 rounded-md border border-line px-2.5 py-2 text-sm"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                const form = event.currentTarget.form;
                if (!file || !form) return;
                if (file.size > 6_000_000) {
                  setError("Keep completed files under 6 MB");
                  return;
                }
                const setValue = (name: string, value: string) => {
                  const field = form.elements.namedItem(name) as HTMLInputElement | null;
                  if (field) field.value = value;
                };
                setValue("fileName", file.name);
                setValue("mimeType", file.type || "application/octet-stream");
                setValue("byteSize", String(file.size));
                const reader = new FileReader();
                reader.onload = () => {
                  const result = String(reader.result || "");
                  setValue("fileBase64", result.includes(",") ? result.split(",")[1] : result);
                };
                reader.readAsDataURL(file);
              }}
            />
            <input type="hidden" name="fileName" />
            <input type="hidden" name="mimeType" />
            <input type="hidden" name="byteSize" />
            <input type="hidden" name="fileBase64" />
            <textarea name="note" rows={3} placeholder="What this paper pack is (course, date, branch)" className="rounded-md border border-line px-2.5 py-2 text-sm" />
            <ul className="grid gap-1 text-[11px] text-muted">
              {(store.records ?? []).filter((item) => item.personId === archivePersonId).map((item) => (
                <li key={item.id}>{item.fileName} · {shortTime(item.createdAt)}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button type="button" className="min-h-10 rounded-md border border-line px-4 text-xs font-bold text-muted" onClick={() => setArchivePersonId(null)}>
                Close
              </button>
              <button className="min-h-10 rounded-md bg-accent px-4 text-xs font-bold text-paper">Store file</button>
            </div>
          </form>
        </Modal>
      )}

      {editingTemplate && (
        <Modal onClose={() => setEditingTemplateId(null)} title={editingTemplate.name} eyebrow={`Source form v${editingTemplate.version}`}>
          <form
            className="grid gap-2.5 px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(new FormData(event.currentTarget).entries());
              try {
                store.updateTemplate({
                  id: editingTemplate.id,
                  name: String(values.name),
                  module: String(values.module),
                  category: String(values.category) as "training" | "equipment" | "internal_waiver",
                  sourceFile: String(values.sourceFile),
                  content: String(values.content),
                  dailyRateRands: values.dailyRateRands ? Number(values.dailyRateRands) : null,
                  defaultDays: values.defaultDays ? Number(values.defaultDays) : null,
                  passPercent: values.passPercent ? Number(values.passPercent) : null,
                  mandatoryMonths: values.mandatoryMonths ? Number(values.mandatoryMonths) : null,
                  hasWaiver: values.hasWaiver === "on",
                  requiresWitness: values.requiresWitness === "on",
                  equipmentLabel: String(values.equipmentLabel || "") || null,
                  status: String(values.status) as "approved" | "superseded" | "draft",
                });
                setEditingTemplateId(null);
                setError("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not update the source form");
              }
            }}
          >
            <p className="text-[11px] leading-relaxed text-muted">
              This is the stored source wording. Issued packs keep the snapshot they were frozen with. Do not invent new legal clauses.
            </p>
            <input name="name" required defaultValue={editingTemplate.name} className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="module" defaultValue={editingTemplate.module} className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="sourceFile" required defaultValue={editingTemplate.sourceFile} className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <select name="category" required defaultValue={editingTemplate.category} className="min-h-10 rounded-md border border-line px-2.5 text-sm">
              <option value="training">Training cost agreement</option>
              <option value="equipment">Equipment cost agreement</option>
              <option value="internal_waiver">Internal waiver addendum</option>
            </select>
            <select name="status" required defaultValue={editingTemplate.status} className="min-h-10 rounded-md border border-line px-2.5 text-sm">
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="superseded">Superseded</option>
            </select>
            <input name="dailyRateRands" type="number" min={0} defaultValue={editingTemplate.dailyRateRands ?? ""} placeholder="Daily rate if printed" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="defaultDays" type="number" min={0} defaultValue={editingTemplate.defaultDays ?? ""} placeholder="Days if printed" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="passPercent" type="number" min={0} max={100} defaultValue={editingTemplate.passPercent ?? ""} placeholder="Pass % if printed" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="mandatoryMonths" type="number" min={0} defaultValue={editingTemplate.mandatoryMonths ?? ""} placeholder="Mandatory months if printed" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <input name="equipmentLabel" defaultValue={editingTemplate.equipmentLabel ?? ""} placeholder="Equipment label if printed" className="min-h-10 rounded-md border border-line px-2.5 text-sm" />
            <label className="flex items-center gap-2 text-[11px] text-muted">
              <input name="hasWaiver" type="checkbox" defaultChecked={editingTemplate.hasWaiver} />
              Source file includes a waiver addendum
            </label>
            <label className="flex items-center gap-2 text-[11px] text-muted">
              <input name="requiresWitness" type="checkbox" defaultChecked={editingTemplate.requiresWitness} />
              Requires a witness signature
            </label>
            <textarea name="content" required rows={16} defaultValue={editingTemplate.content} className="rounded-md border border-line px-2.5 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" className="min-h-10 rounded-md border border-line px-4 text-xs font-bold text-muted" onClick={() => setEditingTemplateId(null)}>
                Close
              </button>
              <button className="min-h-10 rounded-md bg-accent px-4 text-xs font-bold text-paper">Save wording</button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal onClose={() => setSelectedId(null)} title={packTitle(selected.title)} eyebrow={selected.id}>
          <Detail
            state={store}
            agreement={selected}
            activeRole={activeRole}
            typedName={typedName}
            token={token}
            consent={consent}
            issuedToken={issuedToken}
            saving={saving}
            setActiveRole={setActiveRole}
            setTypedName={setTypedName}
            setToken={setToken}
            setConsent={setConsent}
            onIssue={onIssue}
            onIssueCode={onIssueCode}
            onSign={onSign}
            error={error}
            notice={notice}
          />
        </Modal>
      )}

      {showBoundary && (
        <Modal onClose={() => setShowBoundary(false)} title="What this system does not decide" eyebrow="Launch boundary">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-muted">
            <p>
              SkinPhD Confirm records employee training and equipment agreements, frozen wording, signatures and audit evidence. It does not independently determine legal enforceability, employee competence, treatment authorization, payroll deductions, repayment amounts, medical suitability, or client treatment consent.
            </p>
            <p>Client consultation, medical screening, treatment-specific consent and aftercare remain locked until approved client forms are supplied.</p>
          </div>
        </Modal>
      )}
    </main>
    </TooltipProvider>
  );
}

function NavButton({
  current,
  id,
  label,
  count,
  onSelect,
}: {
  current: View;
  id: View;
  label: string;
  count?: number;
  onSelect: (view: View) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "mb-1 flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-[13px] whitespace-nowrap transition-colors",
        current === id ? "bg-white/12 text-paper shadow-sm" : "text-sidebar-text hover:bg-white/8 hover:text-paper",
      )}
      onClick={() => onSelect(id)}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <b className="min-w-6 rounded-full bg-white/10 px-1.5 py-0.5 text-center text-[10px] font-bold text-sidebar-soft">{count}</b>
      )}
    </button>
  );
}

function Stat({ icon, tone, label, value, note }: { icon: string; tone: "green" | "amber" | "blue" | "slate" | "violet"; label: string; value: number; note: string }) {
  const iconTone = {
    green: "bg-status-green-bg text-status-green-fg",
    amber: "bg-status-amber-bg text-status-amber-fg",
    blue: "bg-status-blue-bg text-status-blue-fg",
    slate: "bg-status-slate-bg text-status-slate-fg",
    violet: "bg-status-violet-bg text-status-violet-fg",
  }[tone];
  return (
    <article className="min-h-32 rounded-2xl border border-line bg-paper p-5 shadow-[0_8px_24px_rgba(20,63,50,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(20,63,50,0.08)]">
      <span className={cn("grid size-7 place-items-center rounded-md text-xs font-extrabold", iconTone)}>{icon}</span>
      <p className="mt-4 mb-1 text-[11px] text-muted">{label}</p>
      <strong className="block font-display text-3xl font-medium tabular-nums">{value}</strong>
      <small className="mt-2 block text-[10px] text-muted">{note}</small>
    </article>
  );
}

function AgreementQueue({
  state,
  items,
  canCreate,
  onOpen,
  onCreate,
}: {
  state: WorkspaceState;
  items: Agreement[];
  canCreate: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Records</p>
          <h2 className="font-display text-xl font-medium">Who still needs to act</h2>
        </div>
        {canCreate && (
          <button type="button" className="text-[11px] font-bold text-accent no-print" onClick={onCreate}>
            Create new →
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="grid min-h-64 place-content-center justify-items-center px-8 py-10 text-center text-muted">
          <span className="grid size-12 place-items-center rounded-[10px] border border-line bg-sage font-display text-lg font-bold text-accent">A</span>
          <h3 className="mt-3 font-display text-lg text-ink">No agreements yet</h3>
          <p className="mt-1 mb-4 text-[11px]">
            {canCreate ? "Create the first agreement from an allocated SkinPhD source form." : "No agreements are assigned to this identity yet."}
          </p>
          {canCreate && (
            <button type="button" className="min-h-10 rounded-md bg-accent px-4 text-xs font-bold text-paper" onClick={onCreate}>
              Create first agreement
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-xl grid-cols-[minmax(220px,1.7fr)_minmax(140px,0.85fr)_minmax(90px,0.6fr)_minmax(110px,0.7fr)] items-center gap-3 bg-ground px-5 py-2 text-[9px] font-extrabold tracking-[0.09em] text-muted uppercase">
            <span>Agreement</span>
            <span>Status</span>
            <span>Signatures</span>
            <span />
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid min-w-xl grid-cols-[minmax(220px,1.7fr)_minmax(140px,0.85fr)_minmax(90px,0.6fr)_minmax(110px,0.7fr)] items-center gap-3 border-t border-line px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-10 w-8 shrink-0 place-items-center rounded-md border border-line bg-sage font-display text-sm font-bold text-accent">
                  <FileText className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs">{item.title}</strong>
                  <small className="mt-0.5 block truncate text-[10px] text-muted">
                    {personName(state, item.employeeId)} · {nextStep(state, item)}
                  </small>
                </span>
              </div>
              <span>
                <b className={cn("inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold", toneClass[STATUS_TONE[item.status]])}>
                  {STATUS_LABEL[item.status]}
                </b>
                <ProgressTrack state={state} agreement={item} compact />
              </span>
              <span className="text-[10px] text-muted tabular-nums">
                {state.signatures.filter((sig) => sig.agreementId === item.id && sig.outcome === "signed").length} of {item.requiredSignatures}
              </span>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-2 text-[11px] font-bold",
                  item.status === "completed" ? "border border-line bg-paper text-accent" : "bg-accent text-paper",
                )}
                onClick={() => onOpen(item.id)}
              >
                {item.status === "completed" || item.status === "declined" ? "Open record" : "Open to sign"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Modal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogDescription>{eyebrow}</DialogDescription>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <button type="button" className="grid size-8 place-items-center rounded-md bg-ground text-lg text-muted" onClick={onClose} aria-label="Close">
            ×
          </button>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  state,
  agreement,
  activeRole,
  typedName,
  token,
  consent,
  issuedToken,
  saving,
  setActiveRole,
  setTypedName,
  setToken,
  setConsent,
  onIssue,
  onIssueCode,
  onSign,
  error,
  notice,
}: {
  state: WorkspaceState;
  agreement: Agreement;
  activeRole: Role | "";
  typedName: string;
  token: string;
  consent: boolean;
  issuedToken: string;
  saving: boolean;
  setActiveRole: (role: Role | "") => void;
  setTypedName: (value: string) => void;
  setToken: (value: string) => void;
  setConsent: (value: boolean) => void;
  onIssue: (role: Role) => Promise<void>;
  onIssueCode: (role: Role) => Promise<void>;
  onSign: (action: "sign" | "decline") => Promise<void>;
  error: string;
  notice: string;
}) {
  const open = agreement.status === "awaiting_signatures" || agreement.status === "partially_signed";
  const actor = state.people.find((person) => person.id === state.currentPersonId);
  const nextSigner = agreement.snapshot.signers.find((signer) => {
    const signature = state.signatures.find((item) => item.agreementId === agreement.id && item.role === signer.role);
    return signature?.outcome !== "signed";
  });
  const signingRole = activeRole || (nextSigner && (actor?.role === "manager" || actor?.id === nextSigner.id) ? nextSigner.role : "");
  useEffect(() => {
    if (!signingRole || activeRole === signingRole) return;
    setActiveRole(signingRole);
    const signer = agreement.snapshot.signers.find((item) => item.role === signingRole);
    if (signer) setTypedName(signer.name);
  }, [signingRole, activeRole, agreement.snapshot.signers, setActiveRole, setTypedName]);
  const mail = buildEmployeeMail(state, agreement, typeof window === "undefined" ? "https://confirm.relpdev.uk" : window.location.origin);
  const recordEmail = useWorkspace((store) => store.noteEmailSent);
  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex flex-wrap justify-end gap-2 no-print">
        {actor?.role === "manager" && (
          <>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-paper px-3 text-[11px] font-bold text-muted"
          onClick={() => {
            void useWorkspace
              .getState()
              .issueTemporaryPin(agreement.employeeId)
              .then((pin) => {
                const pack = buildEmployeeMail(useWorkspace.getState(), agreement, window.location.origin, pin);
                if (!pack.to) return;
                recordEmail(agreement.id, pack.to);
                window.location.href = employeeMailHref(pack);
              })
              .catch((err) => {
                const pack = buildEmployeeMail(state, agreement, window.location.origin);
                if (pack.to) window.location.href = employeeMailHref(pack);
                console.warn(err);
              });
          }}
        >
          Email employee pack
        </button>
        {open && (
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-paper px-3 text-[11px] font-bold text-muted"
            onClick={() => {
              const reminder = buildReminderMail(state, agreement, window.location.origin);
              if (!reminder.to) return;
              recordEmail(agreement.id, reminder.to);
              useWorkspace.getState().markReminded(agreement.id);
              window.location.href = employeeMailHref(reminder);
            }}
          >
            Remind outstanding signers
          </button>
        )}
          </>
        )}
        <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-paper px-3 text-[11px] font-bold text-muted" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          Print issued pack
        </button>
      </div>
      <ProgressTrack state={state} agreement={agreement} />
      {error && <p className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-[12px] text-danger-fg">{error}</p>}
      {notice && <p className="mb-3 rounded-md bg-status-green-bg px-3 py-2 text-[12px] text-status-green-fg">{notice}</p>}
      <Row label="Employee" value={personName(state, agreement.employeeId)} />
      <Row label="Franchisee" value={personName(state, agreement.managerId)} />
      <Row label="SkinPhD branch" value={branchLabel(state, agreement.branchId)} />
      <Row label="Source form" value={`${agreement.snapshot.template.category.replaceAll("_", " ")} · v${agreement.snapshot.template.version}`} />
      {agreement.snapshot.template.hasWaiver && <Row label="Waiver addendum" value="Included from source form" />}
      <div className="flex justify-between gap-5 border-b border-line py-3.5 text-[11px]">
        <span className="text-muted">Status</span>
        <b className={cn("inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold", toneClass[STATUS_TONE[agreement.status]])}>
          {STATUS_LABEL[agreement.status]}
        </b>
      </div>
      <Row label="Next step" value={nextStep(state, agreement)} />
      {open && (
        <div className="my-4 rounded-md border border-accent/20 bg-sage p-4 no-print">
          <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Who signs</p>
          <p className="mt-1 mb-3 text-[12px] leading-relaxed text-status-green-fg">{nextStep(state, agreement)}</p>
      <div className="grid gap-2">
        {agreement.snapshot.signers.map((signer) => {
          const signature = state.signatures.find((item) => item.agreementId === agreement.id && item.role === signer.role);
          const isCurrent = signingRole === signer.role;
          return (
            <article key={signer.role} className={cn("rounded-[10px] border bg-paper p-3", isCurrent ? "border-accent" : "border-line")}>
              <strong className="block text-sm">{signer.name}</strong>
              <small className="mt-1 block text-[11px] text-muted">
                {roleLabel(signer.role)}
                {signature?.outcome === "signed"
                  ? ` · signed ${shortTime(signature.signedAt)}`
                  : signature?.outcome === "declined"
                    ? " · declined"
                    : isCurrent
                      ? " · signing now"
                      : " · waiting"}
              </small>
            </article>
          );
        })}
      </div>
      {signingRole && (
        <form
          className="mt-3 grid gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!activeRole && signingRole) setActiveRole(signingRole);
            void onSign("sign");
          }}
        >
          <p className="text-[11px] font-bold text-ink">
            Record {roleLabel(signingRole)} signature
          </p>
          <button
            type="button"
            className="min-h-10 rounded-md border border-line bg-paper text-xs font-bold text-accent disabled:opacity-65"
            disabled={saving}
            onClick={() => {
              if (!activeRole && signingRole) setActiveRole(signingRole);
              void onIssueCode(signingRole as Role);
            }}
          >
            Email 6-digit code to this signer
          </button>
          {actor?.role === "manager" && issuedToken && (
            <div className="rounded-md border border-line bg-paper px-3 py-3">
              <p className="text-[10px] font-extrabold tracking-[0.12em] text-muted uppercase">Head Office sign code</p>
              <p className="mt-1 font-display text-3xl tracking-[0.2em] text-ink">{issuedToken}</p>
              <p className="mt-1 text-[11px] text-muted">Valid 15 minutes. Email also opened to the signer.</p>
            </div>
          )}
          <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
            Email code
            <input value={token} onChange={(event) => setToken(event.target.value)} required inputMode="numeric" minLength={6} maxLength={6} placeholder="6-digit code" className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal tracking-[0.3em] text-ink" />
          </label>
          <label className="grid gap-1.5 text-[10px] font-extrabold text-muted">
            Typed name
            <input autoFocus value={typedName} onChange={(event) => setTypedName(event.target.value)} required className="min-h-10 rounded-md border border-line px-2.5 text-sm font-normal text-ink" />
          </label>
          <label className="grid grid-cols-[18px_1fr] items-start gap-2 text-[11px] font-medium text-status-green-fg">
            <Checkbox checked={consent} onCheckedChange={setConsent} />
            <span>{consentCopy()}</span>
          </label>
          <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-wrap justify-end gap-2 border-t border-line bg-sage/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-1">
            <button type="button" className="min-h-11 rounded-md border border-danger-line bg-danger-bg px-4 text-xs font-bold text-danger-fg disabled:opacity-65" disabled={saving} onClick={() => void onSign("decline")}>
              Decline
            </button>
            <button className="min-h-11 min-w-40 rounded-md bg-accent px-4 text-xs font-bold text-paper disabled:opacity-65" disabled={saving}>
              {saving ? "Saving…" : "Record typed signature"}
            </button>
          </div>
        </form>
      )}
        </div>
      )}
      <Row label="Deemed cost" value={rands(agreement.costCents)} />
      <Row label="Attendance / dates" value={`${agreement.startsOn || "Not set"} → ${agreement.endsOn || "Not set"}`} />
      {agreement.snapshot.fields.days != null && <Row label="Course days" value={String(agreement.snapshot.fields.days)} />}
      {agreement.snapshot.fields.dailyRateRands != null && <Row label="Source daily rate" value={`R${agreement.snapshot.fields.dailyRateRands.toLocaleString("en-ZA")}`} />}
      {agreement.snapshot.fields.passPercent != null && <Row label="Pass mark on form" value={`${agreement.snapshot.fields.passPercent}%`} />}
      {agreement.snapshot.fields.mandatoryMonths != null && <Row label="Mandatory stay on form" value={`${agreement.snapshot.fields.mandatoryMonths} months`} />}
      {agreement.snapshot.fields.contractEndOn && <Row label="Contract end date" value={agreement.snapshot.fields.contractEndOn} />}
      {agreement.snapshot.fields.employeeTitle && <Row label="Position" value={agreement.snapshot.fields.employeeTitle} />}
      {agreement.snapshot.fields.employeeIdNumber && can(actor, "view_id_number") && <Row label="ID number" value={agreement.snapshot.fields.employeeIdNumber} />}
      {agreement.snapshot.fields.employeePhone && <Row label="Phone" value={agreement.snapshot.fields.employeePhone} />}
      {agreement.snapshot.fields.equipmentMake && <Row label="Equipment make" value={agreement.snapshot.fields.equipmentMake} />}
      {agreement.snapshot.fields.equipmentModel && <Row label="Equipment model" value={agreement.snapshot.fields.equipmentModel} />}
      {agreement.snapshot.fields.equipmentSerial && <Row label="Serial number" value={agreement.snapshot.fields.equipmentSerial} />}
      {agreement.snapshot.fields.additionalDescription && <Row label="Additional description" value={agreement.snapshot.fields.additionalDescription} />}
      <Tabs defaultValue="pack" className="mt-4">
        <TabsList className="no-print grid-cols-2">
          <TabsTrigger value="pack">Issued pack</TabsTrigger>
          <TabsTrigger value="wording">Frozen wording</TabsTrigger>
        </TabsList>
        <TabsContent value="pack">
      <article className="print-document my-4 rounded-md border border-line bg-paper p-5">
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-muted uppercase">SkinPhD Confirm · issued document</p>
        <h3 className="mt-2 font-display text-xl">{agreement.title}</h3>
        <p className="mt-1 text-[12px] text-muted">{agreement.snapshot.template.module}</p>
        <dl className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2">
          <div><dt className="text-muted">Employee</dt><dd>{personName(state, agreement.employeeId)}</dd></div>
          <div><dt className="text-muted">Franchisee</dt><dd>{personName(state, agreement.managerId)}</dd></div>
          <div><dt className="text-muted">SkinPhD branch</dt><dd>{branchLabel(state, agreement.branchId)}</dd></div>
          <div><dt className="text-muted">Deemed cost</dt><dd>{rands(agreement.costCents)}</dd></div>
          <div><dt className="text-muted">Attendance</dt><dd>{agreement.startsOn || "Not set"}</dd></div>
          <div><dt className="text-muted">Completion</dt><dd>{agreement.endsOn || "Not set"}</dd></div>
        </dl>
        <p className="mt-4 whitespace-pre-wrap text-[12px] leading-relaxed">{agreement.snapshot.template.content}</p>
        <p className="mt-4 text-[10px] text-muted">Snapshot {agreement.snapshotHash}</p>
      </article>
        </TabsContent>
        <TabsContent value="wording">
          <div className="my-4 rounded-md border border-line bg-ground p-3">
            <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Frozen snapshot SHA-256</p>
            <Tooltip label="SHA-256 of the frozen issued wording and fields. If paper is lost, this hash identifies the stored copy.">
              <code className="mt-1 block break-all text-[10px] text-status-green-fg">{agreement.snapshotHash}</code>
            </Tooltip>
          </div>
          <div className="my-4 rounded-md border border-line bg-ground p-3">
            <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">Issued template wording</p>
            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-status-green-fg">{agreement.snapshot.template.content}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-5 border-b border-line py-3.5 text-[11px]">
      <span className="text-muted">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function WorkspaceGate({ onEnter }: { onEnter: (email: string, pin: string) => Promise<void> }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-linear-to-br from-forest to-forest-dark px-12 py-16 text-paper lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-sage uppercase">SkinPhD Confirm</p>
          <h1 className="mt-8 max-w-lg font-display text-5xl leading-[1.1] font-medium">The signed pack stays here.</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-sidebar-soft">
            Issue an approved form, collect three names, and keep the snapshot when a printed page goes missing.
          </p>
        </div>
        <ol className="grid max-w-md gap-3 text-sm text-sidebar-soft">
          <li>1. Head Office issues the pack</li>
          <li>2. Employee, franchisee and witness type their names</li>
          <li>3. Confirm stores the hash and history</li>
        </ol>
      </section>
      <section className="grid place-items-center bg-ground px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_20px_50px_rgba(20,63,50,0.08)]">
        <div className="border-b border-line px-6 py-6">
          <p className="text-[10px] font-extrabold tracking-[0.14em] text-muted uppercase">Sign in</p>
          <h2 className="mt-2 font-display text-3xl font-medium">Open the kept copy</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Use the work email and PIN issued for this workspace.
          </p>
        </div>
        <form
          className="grid gap-3 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(event.currentTarget).entries());
            setSaving(true);
            setError("");
            void onEnter(String(values.email), String(values.pin))
              .catch((err) => setError(err instanceof Error ? err.message : "Could not sign in"))
              .finally(() => setSaving(false));
          }}
        >
          {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-[11px] text-danger-fg">{error}</p>}
          <label className="grid gap-1.5 text-[10px] font-extrabold tracking-wide text-muted uppercase">
            Email
            <input name="email" type="email" required autoComplete="username" className="min-h-11 rounded-xl border border-line px-3 text-sm font-normal text-ink" />
          </label>
          <label className="grid gap-1.5 text-[10px] font-extrabold tracking-wide text-muted uppercase">
            PIN
            <input name="pin" type="password" inputMode="numeric" required minLength={4} maxLength={8} autoComplete="current-password" className="min-h-11 rounded-xl border border-line px-3 text-sm font-normal text-ink" />
          </label>
          <button className="mt-1 min-h-11 rounded-xl bg-accent text-sm font-bold text-paper shadow-sm hover:bg-accent-hover disabled:opacity-65" disabled={saving}>
            {saving ? "Signing in…" : "Sign in"}
          </button>
          {isProductionMode() ? (
            <p className="text-[12px] leading-relaxed text-muted">
              Sessions expire after 8 hours. Change the PIN after first use.
            </p>
          ) : (
            <p className="text-[12px] leading-relaxed text-muted">
              Pilot: amelia@pilot.local / 2468. Change every PIN before live staff use.
            </p>
          )}
        </form>
      </div>
      </section>
    </main>
  );
}
