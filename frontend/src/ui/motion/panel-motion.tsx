"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";
import { springs } from "./presets";

type PanelMotionProps = ComponentPropsWithoutRef<typeof motion.aside> & {
  disableEntrySlide?: boolean;
  open: boolean;
};

export function PanelMotion({ disableEntrySlide = false, open, ...props }: PanelMotionProps) {
  const wasOpen = useRef(open);
  const skipEntry = disableEntrySlide && open && !wasOpen.current;

  useEffect(() => {
    wasOpen.current = open;
  }, [open]);

  return (
    <motion.aside
      animate={{ x: open ? 0 : "100%" }}
      initial={false}
      transition={skipEntry ? { duration: 0 } : springs.panel}
      {...props}
    />
  );
}
