import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Button } from "./button";
import { Palette, type PaletteItem } from "./palette";

const sections = [
  {
    id: "navigate",
    label: "Navigate",
    items: [
      { id: "home", label: "Home", shortcut: "G H" },
      { id: "records", label: "Records", shortcut: "G R" },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    items: [
      { id: "create", label: "Create item", shortcut: "C" },
      { id: "archive", label: "Archive item", shortcut: "A" },
    ],
  },
];

const meta = {
  component: Palette,
  title: "UI/Palette",
} satisfies Meta<typeof Palette>;

export default meta;
type Story = StoryObj;

function PaletteDemo({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PaletteItem | null>(null);
  return (
    <div data-reduced-motion={reducedMotion}>
      <Button onClick={() => setOpen(true)} variant="primary">
        Open palette
      </Button>
      {selected ? (
        <p className="text-base text-text-secondary">Selected: {selected.label}</p>
      ) : null}
      <Palette onOpenChange={setOpen} onSelect={setSelected} open={open} sections={sections} />
    </div>
  );
}

export const Default: Story = {
  render: () => <PaletteDemo />,
};

export const InterruptSpam: Story = {
  render: () => <PaletteDemo />,
};

export const ReducedMotion: Story = {
  render: () => <PaletteDemo reducedMotion />,
};
