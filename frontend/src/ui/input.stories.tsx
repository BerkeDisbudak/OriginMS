import { MagnifyingGlass } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";

const meta = {
  component: Input,
  title: "UI/Input",
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    helpText: "Visible helper text",
    label: "Label",
    name: "demo-input",
    placeholder: "Placeholder",
  },
};

export const WithPrefix: Story = {
  args: {
    label: "Search",
    name: "search-input",
    placeholder: "Search records",
    prefix: <MagnifyingGlass aria-hidden="true" size={16} />,
  },
};

export const ErrorState: Story = {
  args: {
    error: "Use a valid value",
    label: "Label",
    name: "error-input",
    placeholder: "Placeholder",
  },
};
