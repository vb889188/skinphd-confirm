import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-bold transition disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-accent text-paper shadow-xs hover:bg-accent-hover hover:shadow-sm",
        dark: "bg-forest text-paper shadow-xs hover:bg-forest-dark hover:shadow-sm",
        secondary: "border border-line bg-paper text-ink hover:border-accent hover:bg-ground",
        ghost: "text-accent hover:bg-ground",
        danger: "border border-danger-line bg-danger-bg text-danger-fg hover:bg-danger-line/70",
        gold: "border border-gold/35 bg-gold-soft text-gold-fg hover:bg-gold/15 hover:border-gold/60",
      },
      size: {
        sm: "min-h-9 px-3 text-[11px]",
        md: "min-h-10 px-4 text-xs",
        lg: "min-h-11 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
