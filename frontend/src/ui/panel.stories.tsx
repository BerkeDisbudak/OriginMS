import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Button } from "./button";
import { Panel } from "./panel";
import { StatusPill } from "./status-pill";

const meta = {
  component: Panel,
  title: "UI/Panel",
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj;

function PanelDemo({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-reduced-motion={reducedMotion}>
      <Button onClick={() => setOpen(true)} variant="primary">
        Open panel
      </Button>
      <Panel
        footer={<Button variant="primary">Confirm</Button>}
        onOpenChange={setOpen}
        open={open}
        status={<StatusPill label="Ready" tone="success" />}
        title="Panel title"
      >
        <div className="grid gap-4">
          <p className="m-0 text-base text-text-secondary">Summary block content.</p>
          <p className="m-0 text-base text-text-secondary">
            Detailed content remains product-neutral.
          </p>
        </div>
      </Panel>
    </div>
  );
}

export const Default: Story = {
  render: () => <PanelDemo />,
};

export const InterruptSpam: Story = {
  render: () => <PanelDemo />,
};

export const ReducedMotion: Story = {
  render: () => <PanelDemo reducedMotion />,
};
