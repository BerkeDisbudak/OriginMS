import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusPill } from "./status-pill";

const meta = {
  component: StatusPill,
  title: "UI/StatusPill",
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusPill label="Neutral" />
      <StatusPill label="Success" tone="success" />
      <StatusPill label="Warning" tone="warning" />
      <StatusPill label="Danger" tone="danger" />
      <StatusPill label="Info" tone="info" />
    </div>
  ),
};

export const Compact: Story = {
  args: {
    compact: true,
    label: "Compact",
    tone: "success",
  },
};
