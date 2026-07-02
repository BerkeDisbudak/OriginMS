import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Select } from "./select";

const items = [
  { label: "First option", value: "first" },
  { label: "Second option", value: "second" },
  { label: "Disabled option", value: "disabled", disabled: true },
  { label: "Third option", value: "third" },
];

const meta = {
  component: Select,
  title: "UI/Select",
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: function SelectStory() {
    const [value, setValue] = useState("first");
    return <Select items={items} label="Choice" onValueChange={setValue} value={value} />;
  },
};

export const ErrorState: Story = {
  render: function SelectErrorStory() {
    const [value, setValue] = useState("");
    return (
      <Select
        error="Choose an option"
        items={items}
        label="Choice"
        onValueChange={setValue}
        value={value}
      />
    );
  },
};
