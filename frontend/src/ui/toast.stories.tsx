import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { useToast } from "./toast";

const meta = {
  title: "UI/Toast",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ToastDemo({ tone = "info" }: { tone?: "danger" | "info" | "success" | "warning" }) {
  const { showToast } = useToast();
  return (
    <Button
      onClick={() =>
        showToast({
          action: { label: "Undo", onClick: () => undefined },
          description: "One visible toast, queued by replacement.",
          title: "Action acknowledged",
          tone,
        })
      }
      variant="primary"
    >
      Show toast
    </Button>
  );
}

export const Default: Story = {
  render: () => <ToastDemo tone="success" />,
};

export const InterruptSpam: Story = {
  render: () => <ToastDemo tone="warning" />,
};

export const ReducedMotion: Story = {
  render: () => <ToastDemo tone="info" />,
};
