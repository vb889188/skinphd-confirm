import { ACTOR } from "./seed";
import { randomId } from "./crypto";
import { useWorkspace } from "./store";
import { sendArchiveMailIfDue } from "./archive";
import { persistWorkspace } from "./remote";

let watching = false;

export function startArchiveWatch() {
  if (watching) return;
  watching = true;
  useWorkspace.subscribe((state, previous) => {
    for (const agreement of state.agreements) {
      if (agreement.status !== "completed" || agreement.archiveMailedAt) continue;
      const before = previous.agreements.find((item) => item.id === agreement.id);
      if (before && before.status === "completed" && before.archiveMailError === agreement.archiveMailError) {
        continue;
      }
      void sendArchiveMailIfDue(state, agreement.id).then((result) => {
        const now = new Date().toISOString();
        const latest = useWorkspace.getState();
        if (result === "sent") {
          useWorkspace.setState({
            agreements: latest.agreements.map((item) =>
              item.id === agreement.id ? { ...item, archiveMailedAt: now, archiveMailError: null } : item,
            ),
            audit: [
              {
                id: randomId("AUD"),
                agreementId: agreement.id,
                actor: ACTOR,
                action: "Archive mail sent",
                detail: "Sealed PDF sent to v@bdroyalengine.co.za.",
                createdAt: now,
              },
              ...latest.audit,
            ],
          });
          void persistWorkspace(useWorkspace.getState());
        } else if (result === "failed") {
          useWorkspace.setState({
            agreements: latest.agreements.map((item) =>
              item.id === agreement.id ? { ...item, archiveMailError: "mail_not_landed" } : item,
            ),
            audit: [
              {
                id: randomId("AUD"),
                agreementId: agreement.id,
                actor: ACTOR,
                action: "Archive mail failed",
                detail: "Sealed PDF did not leave. Confirm still holds the live record.",
                createdAt: now,
              },
              ...latest.audit,
            ],
          });
        }
      });
    }
  });
}
