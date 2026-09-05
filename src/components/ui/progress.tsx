import type { ComponentProps } from "react";
import { Root, Indicator } from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ className, value = 0, ...props }: ComponentProps<typeof Root>) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-line", className)} value={pct} {...props}>
      <Indicator className="h-full bg-accent transition-transform duration-500 ease-out" style={{ transform: `translateX(-${100 - pct}%)` }} />
    </Root>
  );
}
