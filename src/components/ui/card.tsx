import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("overflow-hidden border border-line bg-paper", {
  variants: {
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5",
    },
    elevation: {
      flat: "",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
    },
    radius: {
      tile: "rounded-2xl",
      section: "rounded-3xl",
    },
  },
  defaultVariants: {
    padding: "none",
    elevation: "sm",
    radius: "section",
  },
});

export interface CardProps extends ComponentProps<"div">, VariantProps<typeof cardVariants> {}

export function Card({ className, padding, elevation, radius, ...props }: CardProps) {
  return <div className={cn(cardVariants({ padding, elevation, radius }), className)} {...props} />;
}
