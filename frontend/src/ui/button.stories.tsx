import { Plus, X } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";

const meta = {
  component: Button,
  title: "UI/Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button leadingIcon={<Plus aria-hidden="true" size={16} />} variant="primary">
        Primary
      </Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button leadingIcon={<X aria-hidden="true" size={16} />} variant="danger">
        Danger
      </Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button loading variant="primary">
        Saving
      </Button>
      <Button disabled>Disabled</Button>
      <Button size="sm">Small</Button>
    </div>
  ),
};
