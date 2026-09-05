import type { ReactNode } from "react";
import { Provider, Root, Trigger, Portal, Content } from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <Provider delayDuration={200}>{children}</Provider>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Root>
      <Trigger asChild>{children}</Trigger>
      <Portal>
        <Content className="z-40 max-w-xs rounded-md bg-forest px-2 py-1.5 text-[11px] leading-relaxed text-paper" sideOffset={6}>
          {label}
        </Content>
      </Portal>
    </Root>
  );
}
