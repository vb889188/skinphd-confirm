import type { ComponentProps } from "react";
import {
  Root,
  Portal,
  Close,
  Overlay as OverlayPrimitive,
  Content as ContentPrimitive,
  Title as TitlePrimitive,
  Description as DescriptionPrimitive,
} from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Dialog = Root;
export const DialogPortal = Portal;
export const DialogClose = Close;

export function DialogOverlay({ className, ...props }: ComponentProps<typeof OverlayPrimitive>) {
  return <OverlayPrimitive className={cn("fixed inset-0 z-20 bg-forest-dark/60 backdrop-blur-sm", className)} {...props} />;
}

export function DialogContent({ className, children, ...props }: ComponentProps<typeof ContentPrimitive>) {
  return (
    <Portal>
      <DialogOverlay />
      <ContentPrimitive
        className={cn(
          "fixed top-1/2 left-1/2 z-30 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl bg-paper shadow-2xl",
          className,
        )}
        {...props}
      >
        {children}
      </ContentPrimitive>
    </Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof TitlePrimitive>) {
  return <TitlePrimitive className={cn("font-display text-xl font-medium", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DescriptionPrimitive>) {
  return <DescriptionPrimitive className={cn("text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase", className)} {...props} />;
}
