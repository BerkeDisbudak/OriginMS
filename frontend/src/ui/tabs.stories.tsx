import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Tabs } from "./tabs";

const items = [
  { id: "overview", label: "Overview" },
  { id: "employment", label: "Employment" },
  { id: "time", label: "Time" },
];

const meta = {
  component: Tabs,
  title: "UI/Tabs",
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj;

function TabsDemo({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [activeId, setActiveId] = useState("overview");
  return (
    <div data-reduced-motion={reducedMotion}>
      <Tabs activeId={activeId} items={items} onActiveIdChange={setActiveId}>
        <p className="m-0 text-base text-text-secondary">{activeId} tab content.</p>
      </Tabs>
    </div>
  );
}

export const Default: Story = {
  render: () => <TabsDemo />,
};

export const InterruptSpam: Story = {
  render: () => <TabsDemo />,
};

export const ReducedMotion: Story = {
  render: () => <TabsDemo reducedMotion />,
};
