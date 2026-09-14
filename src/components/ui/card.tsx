import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = cva("confirm-card overflow-hidden border border-line bg-paper", {
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

export interface CardProps extends Omit<HTMLMotionProps<"div">, "children">, VariantProps<typeof cardVariants> {
  children?: ReactNode;
}

export function Card({ className, padding, elevation, radius, children, ...props }: CardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(cardVariants({ padding, elevation, radius }), className)}
      initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(4px)" }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -24px 0px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
