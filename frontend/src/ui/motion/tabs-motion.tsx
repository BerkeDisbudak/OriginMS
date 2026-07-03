"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { springs } from "./presets";

export function TabIndicator({ layoutId }: { layoutId: string }) {
  return (
    <motion.div
      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
      layoutId={layoutId}
      transition={springs.layout}
    />
  );
}

export function TabContentMotion({
  activeId,
  children,
}: {
  activeId: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.div
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        key={activeId}
        transition={{ duration: 0.12 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
