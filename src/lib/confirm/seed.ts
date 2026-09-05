import { SOURCE_TEMPLATES } from "./templates";
import type { WorkspaceState } from "./types";

const now = "2026-09-04T20:00:00.000Z";

export const ACTOR = "workspace-manager@pilot.local";

export function createSeed(): WorkspaceState {
  return {
    currentPersonId: null,
    sessionStartedAt: null,
    branches: [
      { id: "branch-george", name: "SkinPhD George", code: "SKIN3902", createdAt: now },
      { id: "branch-moreleta-corner", name: "SkinPhD Moreleta Corner", code: "SKIN3921", createdAt: now },
      { id: "branch-zambesi", name: "SkinPhD Zambesi", code: "SKIN7878", createdAt: now },
      { id: "branch-queenswood", name: "SkinPhD Queenswood", code: "SKIN9132", createdAt: now },
      { id: "branch-kolonnade", name: "SkinPhD Kolonnade", code: "SKIN6039", createdAt: now },
      { id: "branch-olympus", name: "SkinPhD Olympus", code: "SKIN8088", createdAt: now },
      { id: "branch-lynnwood", name: "SkinPhD Lynnwood", code: "SKIN2671", createdAt: now },
      { id: "branch-mall-at-reds", name: "SkinPhD Mall@Reds", code: "SKIN4828", createdAt: now },
      { id: "branch-eldovillage", name: "SkinPhD Eldovillage", code: "SKIN4809", createdAt: now },
      { id: "branch-brooklyn", name: "SkinPhD Brooklyn", code: "SKIN6821", createdAt: now },
      { id: "branch-waterfall-corner", name: "SkinPhD Waterfall Corner", code: "SKIN7269", createdAt: now },
    ],
    people: [
      { id: "person-amelia", branchId: "branch-brooklyn", fullName: "SkinPhD Head Office", email: "amelia@pilot.local", role: "manager", status: "active", pinHash: "898ef9927844ff735a94e9c23a044607b805b87e7c59c21218be0294a54403c8", scope: "organisation", createdAt: now },
      { id: "person-lerato", branchId: "branch-brooklyn", fullName: "Lerato Mokoena", email: "lerato@pilot.local", role: "employee", status: "active", pinHash: "7af10ad98e2b25f0e2b2f4c881cd533e88ba555ab4e1f5802b2d5fb02aa3441e", createdAt: now },
      { id: "person-naledi", branchId: "branch-moreleta-corner", fullName: "Naledi Jacobs", email: "naledi@pilot.local", role: "employee", status: "active", pinHash: "0f8e063faae5f27a5f6bff7d49770344ba903a6dd0f6860ef9540b7f04ba3d72", createdAt: now },
      { id: "person-thandi", branchId: "branch-queenswood", fullName: "Thandi Maseko", email: "thandi@pilot.local", role: "employee", status: "active", pinHash: "796a0f50db919fb1883087db1b2237bd456741fd9fcc1e198daad64d1556ad70", createdAt: now },
      { id: "person-witness", branchId: "branch-lynnwood", fullName: "David Smith", email: "david@pilot.local", role: "witness", status: "active", pinHash: "4532791dfb4b1f86c0704870dbafb5ff00737a94670f77436a2a5b685b4d8869", createdAt: now },
    ],
    templates: SOURCE_TEMPLATES,
    agreements: [],
    signatures: [],
    links: [],
    audit: [
      {
        id: "audit-seed",
        agreementId: null,
        actor: "System",
        action: "Source templates allocated",
        detail: "Twelve SkinPhD employee training and equipment source forms were loaded. Client consultation remains locked. The workspace records wording and signatures; it does not run payroll deductions.",
        createdAt: now,
      },
    ],
  };
}
