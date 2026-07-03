"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { springs } from "./presets";

export { AnimatePresence };

type SharedElementProps = ComponentPropsWithoutRef<typeof motion.div> & {
  layoutId: string;
  onMorphComplete?: () => void;
};

/**
 * The row<->panel identity block per MOTION_SPEC §5. Reduced motion collapses
 * this to a plain fade (no shared layoutId attempt), per MOTION_SPEC §11.
 */
export function SharedElement({ layoutId, onMorphComplete, ...props }: SharedElementProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        onAnimationComplete={onMorphComplete}
        transition={{ duration: 0.12 }}
        {...props}
      />
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      onLayoutAnimationComplete={onMorphComplete}
      transition={springs.layout}
      {...props}
    />
  );
}

type SharedElementTextProps = ComponentPropsWithoutRef<typeof motion.span>;

/** `layout="position"` crossfades text-scale changes without squishing font-size. */
export function SharedElementText(props: SharedElementTextProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.span {...props} />;
  }

  return <motion.span layout="position" {...props} />;
}

const revealContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const revealItem = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, transition: { duration: 0.12 }, y: 0 },
};

/**
 * MOTION_SPEC §5's last bullet: panel body blocks fade in (3 x 30ms stagger,
 * +4px rise) only after the shared-element morph settles -- One Mover
 * preserved as a sequence, not simultaneous with the morph.
 */
export function MorphRevealGroup({ children, reveal }: { children: ReactNode; reveal: boolean }) {
  return (
    <motion.div animate={reveal ? "visible" : "hidden"} initial="hidden" variants={revealContainer}>
      {children}
    </motion.div>
  );
}

export function MorphRevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={revealItem}>
      {children}
    </motion.div>
  );
}
