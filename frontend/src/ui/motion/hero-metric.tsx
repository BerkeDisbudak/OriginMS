"use client";

import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { hasSessionFlag, setSessionFlag } from "@/domain/lib/session-flag";

const TICKER_SESSION_FLAG = "dashboard-hero-ticker-played";

/**
 * MOTION_SPEC §4's "Hero ticker" row: 600ms ease-out-cubic count, once per
 * session (sessionStorage flag), final value only under reduced motion.
 * Initial state mirrors the target value so SSR/first paint never shows a
 * stray 0 -- useLayoutEffect (not useEffect) decides before paint whether to
 * reset to 0 and animate, or hold the value, so only a genuine first-play
 * shows the count-up.
 */
export function HeroNumeral({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const playedRef = useRef(false);
  const displayRef = useRef(display);
  displayRef.current = display;

  useLayoutEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const alreadyPlayed = playedRef.current || hasSessionFlag(TICKER_SESSION_FLAG);
    const from = alreadyPlayed ? displayRef.current : 0;

    if (from === value) {
      setDisplay(value);
      return;
    }

    const controls = animate(from, value, {
      duration: 0.6,
      ease: "easeOut",
      onComplete: () => {
        playedRef.current = true;
        setSessionFlag(TICKER_SESSION_FLAG);
      },
      onUpdate: (current) => setDisplay(Math.round(current)),
    });

    return () => controls.stop();
  }, [value, reduceMotion]);

  return <span className="tabular-nums">{display}</span>;
}
