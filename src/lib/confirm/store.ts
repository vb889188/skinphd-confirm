import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACTOR, createSeed } from "./seed";
import { randomId, randomToken, sha256Hex } from "./crypto";
import {
  assertAssigned,
  canSign,
  namesMatch,
  nextStatus,
  requiredFieldErrors,
  requiredSignatureCount,
} from "./rules";
import type { Agreement, Role, Snapshot, WorkspaceState } from "./types";
import { persistWorkspace, loadRemoteWorkspace, remoteEnabled } from "./remote";

export type CreateInput = {
  title: string;
  activity: string;
  branchId: string;
  employeeId: string;
  managerId: string;
  witnessId?: string;
  templateId: string;
  costRands?: number;
  startsOn?: string;
  endsOn?: string;
  days?: number;
  contractEndOn?: string;
  employeeIdNumber?: string;
  employeePhone?: string;
  employeeTitle?: string;
  equipmentMake?: string;
  equipmentModel?: string;
  equipmentSerial?: string;
  additionalDescription?: string;
};

type Actions = {
  createAgreement: (input: CreateInput) => Promise<string>;
  issueLink: (agreementId: string, role: Role) => Promise<{ token: string; expiresAt: string }>;
  captureSignature: (input: {
    agreementId: string;
    role: Role;
    typedName: string;
    consentAccepted: boolean;
    action: "sign" | "decline";
    token?: string;
  }) => Promise<string>;
  resetWorkspace: () => void;
  signIn: (personId: string) => void;
  signInWithPin: (email: string, pin: string) => Promise<string>;
  changePin: (currentPin: string, nextPin: string) => Promise<void>;
  expireSessionIfNeeded: () => void;
  signOut: () => void;
  ensurePilotPack: () => Promise<string | null>;
  hydrateRemote: () => Promise<void>;
  addPerson: (input: { fullName: string; email: string; role: Role; branchId: string; pin: string }) => Promise<string>;
  addBranch: (input: { name: string; code: string }) => string;
};

export const useWorkspace = create<WorkspaceState & Actions>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      resetWorkspace: () => set({ ...createSeed() }),
      signIn: (personId) => {
        const person = get().people.find((item) => item.id === personId && item.status === "active");
        if (!person) throw new Error("Choose an active workspace identity");
        set({ currentPersonId: person.id, sessionStartedAt: new Date().toISOString() });
      },
      signInWithPin: async (email, pin) => {
        const normalized = email.trim().toLowerCase();
        const person = get().people.find((item) => item.email === normalized && item.status === "active");
        if (!person || !person.pinHash) throw new Error("Check the email and PIN");
        const hash = await sha256Hex(`${person.email}|${pin.trim()}`);
        if (hash !== person.pinHash) throw new Error("Check the email and PIN");
        set({ currentPersonId: person.id, sessionStartedAt: new Date().toISOString() });
        return person.id;
      },
      changePin: async (currentPin, nextPin) => {
        const state = get();
        const person = state.people.find((item) => item.id === state.currentPersonId);
        if (!person?.pinHash) throw new Error("Sign in before changing the PIN");
        const currentHash = await sha256Hex(`${person.email}|${currentPin.trim()}`);
        if (currentHash !== person.pinHash) throw new Error("Current PIN is not correct");
        if (!/^\d{4,8}$/.test(nextPin.trim())) throw new Error("Choose a 4 to 8 digit PIN");
        const pinHash = await sha256Hex(`${person.email}|${nextPin.trim()}`);
        const now = new Date().toISOString();
        set({
          people: state.people.map((item) => (item.id === person.id ? { ...item, pinHash } : item)),
          audit: [
            { id: randomId("AUD"), agreementId: null, actor: person.email, action: "PIN changed", detail: `${person.fullName} changed their workspace PIN.`, createdAt: now },
            ...state.audit,
          ],
        });
        void persistWorkspace(get()).catch(() => undefined);
      },
      expireSessionIfNeeded: () => {
        const started = get().sessionStartedAt;
        if (!started) return;
        const age = Date.now() - new Date(started).getTime();
        if (age > 8 * 60 * 60 * 1000) set({ currentPersonId: null, sessionStartedAt: null });
      },
      signOut: () => set({ currentPersonId: null, sessionStartedAt: null }),
      hydrateRemote: async () => {
        if (!remoteEnabled()) return;
        try {
          const remote = await loadRemoteWorkspace();
          const state = get();
          set({
            branches: remote.branches.length ? remote.branches : state.branches,
            people: remote.people.length ? remote.people : state.people,
            templates: remote.templates,
            agreements: remote.agreements,
            signatures: remote.signatures,
            links: remote.links,
            audit: remote.audit.length ? remote.audit : state.audit,
          });
        } catch {
          /* keep local cache if the project is unreachable */
        }
      },
      ensurePilotPack: async () => {
        const state = get();
        if (state.agreements.length > 0) return null;
        return get().createAgreement({
          title: "Training Costs Agreement: HydroDerm — Brooklyn pilot",
          activity: "SkinPhD HydroDerm training module",
          branchId: "branch-brooklyn",
          employeeId: "person-lerato",
          managerId: "person-amelia",
          witnessId: "person-witness",
          templateId: "tpl-tr-hydroderm",
          costRands: 1500,
          startsOn: "2026-09-15",
          endsOn: "2026-09-15",
          days: 1,
          contractEndOn: "2027-10-01",
          employeeTitle: "Aesthetic Therapist",
        });
      },
      addPerson: async (input) => {
        const fullName = input.fullName.trim();
        const email = input.email.trim().toLowerCase();
        const pin = input.pin.trim();
        if (!fullName) throw new Error("Name is required");
        if (!email) throw new Error("Email is required");
        if (!/^\d{4,8}$/.test(pin)) throw new Error("Choose a 4 to 8 digit PIN");
        const state = get();
        if (!state.branches.some((branch) => branch.id === input.branchId)) throw new Error("Choose a clinic");
        if (state.people.some((person) => person.email === email)) throw new Error("That email is already in the directory");
        const id = randomId("PER");
        const now = new Date().toISOString();
        const pinHash = await sha256Hex(`${email}|${pin}`);
        set({
          people: [...state.people, { id, branchId: input.branchId, fullName, email, role: input.role, status: "active", pinHash, createdAt: now }],
          audit: [
            { id: randomId("AUD"), agreementId: null, actor: ACTOR, action: "Person added", detail: `${fullName} was added as ${input.role}.`, createdAt: now },
            ...state.audit,
          ],
        });
        void persistWorkspace(get()).catch(() => undefined);
        return id;
      },
      addBranch: (input) => {
        const name = input.name.trim();
        const code = input.code.trim().toUpperCase();
        if (!name || !code) throw new Error("Clinic name and code are required");
        const state = get();
        if (state.branches.some((branch) => branch.code === code)) throw new Error("That clinic code already exists");
        const id = randomId("BRN");
        const now = new Date().toISOString();
        set({
          branches: [...state.branches, { id, name, code, createdAt: now }],
          audit: [
            { id: randomId("AUD"), agreementId: null, actor: ACTOR, action: "Clinic added", detail: `${name} (${code}) was added to the directory.`, createdAt: now },
            ...state.audit,
          ],
        });
        void persistWorkspace(get()).catch(() => undefined);
        return id;
      },
      createAgreement: async (input) => {
        const errors = requiredFieldErrors(input);
        if (errors.length) throw new Error(errors[0]);
        const state = get();
        const template = state.templates.find((item) => item.id === input.templateId && item.status === "approved");
        if (!template) throw new Error("Choose an approved template");
        const employee = state.people.find((person) => person.id === input.employeeId && person.status === "active" && person.role === "employee");
        const manager = state.people.find((person) => person.id === input.managerId && person.status === "active" && person.role === "manager");
        const witness = input.witnessId
          ? state.people.find((person) => person.id === input.witnessId && person.status === "active" && person.role === "witness")
          : undefined;
        if (!employee) throw new Error("Choose an active employee");
        if (!manager) throw new Error("Choose an active manager");
        if (template.requiresWitness && !witness) throw new Error("This source form requires a witness");
        if (input.witnessId && !witness) throw new Error("Choose an active witness");

        const id = randomId("AGR");
        const now = new Date().toISOString();
        const snapshot: Snapshot = {
          agreementId: id,
          title: input.title.trim(),
          activity: input.activity.trim(),
          branchId: input.branchId,
          template: {
            id: template.id,
            name: template.name,
            version: template.version,
            category: template.category,
            module: template.module,
            content: template.content,
            hasWaiver: template.hasWaiver,
          },
          signers: [
            { id: employee.id, role: "employee", name: employee.fullName },
            { id: manager.id, role: "manager", name: manager.fullName },
            ...(witness ? [{ id: witness.id, role: "witness" as const, name: witness.fullName }] : []),
          ],
          fields: {
            costRands: Number(input.costRands ?? 0),
            startsOn: input.startsOn || null,
            endsOn: input.endsOn || null,
            days: input.days ? Number(input.days) : template.defaultDays,
            dailyRateRands: template.dailyRateRands,
            passPercent: template.passPercent,
            mandatoryMonths: template.mandatoryMonths,
            contractEndOn: input.contractEndOn || null,
            employeeIdNumber: input.employeeIdNumber?.trim() || null,
            employeePhone: input.employeePhone?.trim() || null,
            employeeTitle: input.employeeTitle?.trim() || null,
            equipmentMake: input.equipmentMake?.trim() || null,
            equipmentModel: input.equipmentModel?.trim() || null,
            equipmentSerial: input.equipmentSerial?.trim() || null,
            additionalDescription: input.additionalDescription?.trim() || null,
          },
          issuedAt: now,
        };
        const snapshotJson = JSON.stringify(snapshot);
        const snapshotHash = await sha256Hex(snapshotJson);
        const agreement: Agreement = {
          id,
          title: snapshot.title,
          branchId: input.branchId,
          employeeId: employee.id,
          managerId: manager.id,
          witnessId: witness?.id ?? null,
          templateId: template.id,
          status: "awaiting_signatures",
          activity: snapshot.activity,
          costCents: Math.round(Number(input.costRands ?? 0) * 100),
          startsOn: snapshot.fields.startsOn,
          endsOn: snapshot.fields.endsOn,
          requiredSignatures: requiredSignatureCount(Boolean(witness)),
          snapshot,
          snapshotJson,
          snapshotHash,
          createdBy: ACTOR,
          createdAt: now,
          updatedAt: now,
        };
        set({
          agreements: [agreement, ...state.agreements],
          audit: [
            {
              id: randomId("AUD"),
              agreementId: id,
              actor: ACTOR,
              action: "Agreement issued",
              detail: `${template.name} v${template.version} was frozen and sent for ${agreement.requiredSignatures} signatures.`,
              createdAt: now,
            },
            ...state.audit,
          ],
        });
        void persistWorkspace(get()).catch(() => undefined);
        return id;
      },
      issueLink: async (agreementId, role) => {
        const state = get();
        const agreement = state.agreements.find((item) => item.id === agreementId);
        if (!agreement) throw new Error("Agreement not found");
        if (!canSign(agreement.status)) throw new Error("Signing links cannot be issued for this agreement status");
        const signer = agreement.snapshot.signers.find((item) => item.role === role);
        if (!signer) throw new Error("That role is not required on this agreement");
        if (state.signatures.some((item) => item.agreementId === agreementId && item.role === role && item.outcome === "signed")) {
          throw new Error("This role has already signed");
        }
        const now = new Date();
        const token = randomToken();
        const tokenHash = await sha256Hex(token);
        const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const links = state.links.map((link) =>
          link.agreementId === agreementId && link.role === role && link.status === "pending"
            ? { ...link, status: "revoked" as const }
            : link,
        );
        set({
          links: [
            {
              id: randomId("LNK"),
              agreementId,
              signerId: signer.id,
              role,
              tokenHash,
              status: "pending",
              expiresAt,
              consumedAt: null,
              createdBy: ACTOR,
              createdAt: now.toISOString(),
            },
            ...links,
          ],
          audit: [
            {
              id: randomId("AUD"),
              agreementId,
              actor: ACTOR,
              action: "Signing link issued",
              detail: `Workspace signing link issued for ${role} (${signer.name}). Token ending ${token.slice(-4)}. External delivery is disabled until an approved provider is configured.`,
              createdAt: now.toISOString(),
            },
            ...state.audit,
          ],
        });
        void persistWorkspace(get()).catch(() => undefined);
        return { token, expiresAt };
      },
      captureSignature: async (input) => {
        const state = get();
        const agreement = state.agreements.find((item) => item.id === input.agreementId);
        if (!agreement) throw new Error("Agreement not found");
        const currentHash = await sha256Hex(agreement.snapshotJson);
        if (currentHash !== agreement.snapshotHash) {
          throw new Error("The frozen snapshot hash does not match the stored document");
        }
        const signer = agreement.snapshot.signers.find((item) => item.role === input.role);
        if (!signer) throw new Error("That role is not required on this agreement");
        assertAssigned(input.role, signer.id, agreement);
        const now = new Date().toISOString();
        let linkId: string | null = null;
        let links = state.links;
        if (input.token) {
          const tokenHash = await sha256Hex(input.token);
          const link = links.find((item) => item.tokenHash === tokenHash);
          if (!link || link.agreementId !== agreement.id || link.role !== input.role) {
            throw new Error("This signing link is not valid");
          }
          if (link.status === "consumed") throw new Error("This signing link has already been used");
          if (link.status === "revoked" || link.status === "declined") throw new Error("This signing link is no longer valid");
          if (link.status !== "pending" || new Date(link.expiresAt).getTime() <= Date.now()) {
            set({
              links: links.map((item) => (item.id === link.id ? { ...item, status: "expired" as const } : item)),
            });
            throw new Error("This signing link has expired");
          }
          linkId = link.id;
        }

        if (input.action === "decline") {
          if (!canSign(agreement.status)) throw new Error("This agreement can no longer be declined");
          set({
            signatures: [
              ...state.signatures,
              {
                id: randomId("SIG"),
                agreementId: agreement.id,
                signerId: signer.id,
                role: input.role,
                typedName: input.typedName.trim() || signer.name,
                method: "typed_name",
                signedAt: now,
                consentAccepted: input.consentAccepted,
                evidence: JSON.stringify({
                  consentAccepted: input.consentAccepted,
                  method: "typed_name",
                  snapshotHash: agreement.snapshotHash,
                  linkId,
                  identityAssurance: "workspace_typed_name_only",
                  capturedAt: now,
                }),
                outcome: "declined",
                linkId,
              },
            ],
            agreements: state.agreements.map((item) =>
              item.id === agreement.id ? { ...item, status: "declined" as const, updatedAt: now } : item,
            ),
            links: links.map((link) =>
              link.agreementId === agreement.id && link.status === "pending"
                ? { ...link, status: link.id === linkId ? ("declined" as const) : ("revoked" as const), consumedAt: now }
                : link,
            ),
            audit: [
              {
                id: randomId("AUD"),
                agreementId: agreement.id,
                actor: ACTOR,
                action: "Agreement declined",
                detail: `${signer.name} declined as ${input.role}. Remaining signing links were revoked.`,
                createdAt: now,
              },
              ...state.audit,
            ],
          });
          void persistWorkspace(get()).catch(() => undefined);
          return "declined";
        }

        if (!canSign(agreement.status)) throw new Error("This agreement is not open for signatures");
        if (!input.consentAccepted) throw new Error("The signer must accept the review acknowledgement");
        if (!namesMatch(input.typedName, signer.name)) throw new Error("Typed name must match the official record name");
        if (state.signatures.some((item) => item.agreementId === agreement.id && item.role === input.role && item.outcome === "signed")) {
          throw new Error(`${input.role} has already signed this agreement`);
        }
        const signatures = [
          ...state.signatures,
          {
            id: randomId("SIG"),
            agreementId: agreement.id,
            signerId: signer.id,
            role: input.role,
            typedName: input.typedName.trim(),
            method: "typed_name" as const,
            signedAt: now,
            consentAccepted: true,
            evidence: JSON.stringify({
              consentAccepted: true,
              method: "typed_name",
              snapshotHash: agreement.snapshotHash,
              linkId,
              identityAssurance: "workspace_typed_name_only",
              capturedAt: now,
            }),
            outcome: "signed" as const,
            linkId,
          },
        ];
        if (linkId) {
          links = links.map((item) => (item.id === linkId ? { ...item, status: "consumed" as const, consumedAt: now } : item));
        }
        const signedCount = signatures.filter((item) => item.agreementId === agreement.id && item.outcome === "signed").length;
        const status = nextStatus(signedCount, agreement.requiredSignatures);
        set({
          signatures,
          links,
          agreements: state.agreements.map((item) =>
            item.id === agreement.id ? { ...item, status, updatedAt: now } : item,
          ),
          audit: [
            {
              id: randomId("AUD"),
              agreementId: agreement.id,
              actor: ACTOR,
              action: "Signature recorded",
              detail: `${signer.name} signed as ${input.role} by typed name. Identity remains workspace-captured, not OTP-verified.`,
              createdAt: now,
            },
            ...state.audit,
          ],
        });
        void persistWorkspace(get()).catch(() => undefined);
        return status;
      },
    }),
    { name: "skinphd-confirm.workspace.v7" },
  ),
);
