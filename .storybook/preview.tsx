import type { Preview } from "@storybook/nextjs-vite";
import "../frontend/src/app/globals.css";
import { MotionProvider } from "../frontend/src/ui/motion/motion-provider";
import { ToastProvider } from "../frontend/src/ui/toast";

const preview: Preview = {
  decorators: [
    (Story) => (
      <MotionProvider>
        <ToastProvider>
          <div className="min-h-dvh bg-bg p-6 text-text-primary">
            <Story />
          </div>
        </ToastProvider>
      </MotionProvider>
    ),
  ],
  parameters: {
    a11y: {
      test: "todo",
    },
    backgrounds: {
      default: "doctrine dark",
      values: [{ name: "doctrine dark", value: "var(--bg)" }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;
