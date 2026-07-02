"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { springs } from "./presets";

export function ToastMotion(props: ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 8 }}
      transition={springs.layout}
      {...props}
    />
  );
}
