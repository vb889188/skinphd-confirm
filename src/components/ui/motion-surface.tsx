/* eslint-disable react-refresh/only-export-components -- stagger variants are imported with Reveal */
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type SurfaceTag = "div" | "section" | "article";

type RevealProps = {
  as?: SurfaceTag;
  className?: string;
  delay?: number;
  children?: ReactNode;
} & Omit<HTMLMotionProps<"div">, "children">;

export function Reveal({ as = "div", className, delay = 0, children, ...props }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -28px 0px" }}
      transition={{ duration: 0.48, delay, ease }}
      {...props}
    >
      {children}
    </Comp>
  );
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
};
