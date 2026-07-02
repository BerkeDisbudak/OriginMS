"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { springs } from "./presets";

type PaletteMotionProps = ComponentPropsWithoutRef<typeof motion.div> & {
  open: boolean;
};

export function PaletteMotion({ open, ...props }: PaletteMotionProps) {
  return (
    <motion.div
      animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.98, y: open ? 0 : -8 }}
      initial={false}
      transition={springs.panel}
      {...props}
    />
  );
}
