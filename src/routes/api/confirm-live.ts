import { createFileRoute } from "@tanstack/react-router";
import { allowConfirmLive } from "@/lib/confirm/gate.server";
import { liveStamp, onConfirmLive } from "@/lib/confirm/live-bus.server";

export const Route = createFileRoute("/api/confirm-live")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const session = url.searchParams.get("session") ?? "";
        const link = url.searchParams.get("link") ?? "";
        if (!(await allowConfirmLive(session, link))) {
          return new Response("Sign in, or open a personal pack link.", { status: 401 });
        }

        const encoder = new TextEncoder();
        let unsubscribe = () => undefined as void;
        let ping = 0;
        const stream = new ReadableStream({
          start(controller) {
            const send = (event: string, data: Record<string, number>) => {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };
            send("hello", { stamp: liveStamp() });
            unsubscribe = onConfirmLive((stamp) => send("change", { stamp }));
            ping = setInterval(() => send("ping", { stamp: liveStamp() }), 15_000) as unknown as number;
          },
          cancel() {
            unsubscribe();
            clearInterval(ping);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
