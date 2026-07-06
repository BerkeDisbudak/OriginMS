"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Palette, type PaletteItem, type PaletteSection } from "@/ui";

// TODO: move this to a shared route registry once Phase 3 adds more than 2-3 routes.
const routesById: Record<string, string> = {
  "approval-inbox": "/",
  dashboard: "/dashboard",
  employees: "/employees",
};

const sections: PaletteSection[] = [
  {
    id: "navigate",
    label: "Navigate",
    items: [
      { id: "approval-inbox", label: "Approval Inbox" },
      { id: "employees", label: "Employees" },
      { id: "dashboard", label: "Dashboard" },
    ],
  },
];

export function GlobalPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTextInput =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !isTextInput) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleSelect(item: PaletteItem) {
    const path = routesById[item.id];
    if (path) {
      router.push(path);
    }
    setOpen(false);
  }

  return <Palette onOpenChange={setOpen} onSelect={handleSelect} open={open} sections={sections} />;
}
