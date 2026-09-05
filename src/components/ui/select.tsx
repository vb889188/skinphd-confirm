import type { ComponentProps, ReactNode } from "react";
import {
  Root,
  Trigger,
  Value,
  Icon,
  Portal,
  Content,
  Viewport,
  Item,
  ItemText,
  ItemIndicator,
} from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) {
  return (
    <Root value={value || "all"} onValueChange={(next) => onValueChange(next === "all" ? "" : next)}>
      {children}
    </Root>
  );
}

export function SelectTrigger({ className, ...props }: ComponentProps<typeof Trigger>) {
  return (
    <Trigger
      className={cn("inline-flex min-h-10 min-w-40 items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink", className)}
      {...props}
    />
  );
}

export function SelectValue(props: ComponentProps<typeof Value>) {
  return <Value {...props} />;
}

export function SelectContent({ children }: { children: ReactNode }) {
  return (
    <Portal>
      <Content className="z-40 overflow-hidden rounded-md border border-line bg-paper shadow-lg" position="popper" sideOffset={4}>
        <Viewport className="p-1">{children}</Viewport>
      </Content>
    </Portal>
  );
}

export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Item value={value} className="relative flex min-h-9 cursor-pointer items-center rounded px-2 text-sm text-ink outline-none data-[highlighted]:bg-ground">
      <ItemIndicator className="absolute right-2 text-[10px] text-accent">✓</ItemIndicator>
      <ItemText>{children}</ItemText>
    </Item>
  );
}

export function SelectIcon() {
  return <Icon className="text-muted">▾</Icon>;
}
