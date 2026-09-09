import { getSessionToken } from "./remote";

export function startConfirmLive(input: { linkToken?: string; onChange: () => void }) {
  if (typeof window === "undefined") return () => undefined;
  const params = new URLSearchParams();
  const session = getSessionToken();
  if (session) params.set("session", session);
  if (input.linkToken) params.set("link", input.linkToken);
  if (![...params.keys()].length) return () => undefined;

  let source: EventSource | null = null;
  let socket: WebSocket | null = null;
  let closed = false;
  let debounce = 0;
  const query = params.toString();
  const fire = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(input.onChange, 250);
  };

  const startSse = () => {
    if (closed || source) return;
    source = new EventSource(`/api/confirm-live?${query}`);
    source.addEventListener("change", fire);
    source.addEventListener("hello", fire);
  };

  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${window.location.host}/api/confirm-live?${query}`);
    socket.onmessage = (event) => {
      if (String(event.data).includes("change") || String(event.data).includes("hello")) fire();
    };
    socket.onopen = () => fire();
    socket.onerror = () => {
      socket?.close();
      socket = null;
      startSse();
    };
    window.setTimeout(() => {
      if (closed) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        socket?.close();
        socket = null;
        startSse();
      }
    }, 1200);
  } catch {
    startSse();
  }

  return () => {
    closed = true;
    window.clearTimeout(debounce);
    socket?.close();
    source?.close();
  };
}
