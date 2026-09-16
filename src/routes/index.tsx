import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/workspace";
import { startArchiveWatch } from "@/lib/confirm/archive-watch";

startArchiveWatch();

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    sign: typeof search.sign === "string" && search.sign.trim() ? search.sign.trim() : undefined,
  }),
  component: Home,
});

function Home() {
  const { sign } = Route.useSearch();
  return <Workspace signToken={sign} />;
}
