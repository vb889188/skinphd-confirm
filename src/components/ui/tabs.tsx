import type { ComponentProps } from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = Root;

export function TabsList({ className, ...props }: ComponentProps<typeof List>) {
  return <List className={cn("mb-4 grid grid-cols-3 gap-1 rounded-md border border-line bg-ground p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof Trigger>) {
  return (
    <Trigger
      className={cn(
        "min-h-10 rounded-md px-3 text-xs font-bold text-muted data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof Content>) {
  return <Content className={cn("outline-none", className)} {...props} />;
}
