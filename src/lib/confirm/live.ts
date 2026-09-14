import { getSessionToken } from "./remote";

export function startConfirmLive(input: { linkToken?: string; onChange: () => void }) {
  if (typeof window === "undefined") return () => undefined;
  const params = new URLSearchParams();
  const session = getSessionToken();
  if (session) params.set("session", session);
  if (input.linkToken) params.set("link", input.linkToken);
  if (![...params.keys()].length) return () => undefined;

  let source: EventSource | null = null;
  let closed = false;
  let debounce = 0;
  const fire = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(input.onChange, 250);
  };

  source = new EventSource(`/api/confirm-live?${params.toString()}`);
  source.addEventListener("change", fire);
  source.addEventListener("hello", fire);
  source.onerror = () => {
    if (closed) return;
    source?.close();
    source = null;
  };

  return () => {
    closed = true;
    window.clearTimeout(debounce);
    source?.close();
  };
}
