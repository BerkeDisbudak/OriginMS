"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { springs } from "./presets";

type PanelMotionProps = ComponentPropsWithoutRef<typeof motion.aside> & {
  open: boolean;
};

export function PanelMotion({ open, ...props }: PanelMotionProps) {
  return (
    <motion.aside
      animate={{ x: open ? 0 : "100%" }}
      initial={false}
      transition={springs.panel}
      {...props}
    />
  );
}
