import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Button, Input, Palette, Panel, Select, StatusPill, ToastProvider, useToast } from "@/ui";

beforeAll(() => {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("ui primitives", () => {
  it("renders button variants and disables loading buttons", () => {
    render(h(Button, { loading: true, variant: "primary" }, "Saving"));

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Saving" }).disabled).toBe(true);
  });

  it("connects input label and inline error state", () => {
    render(h(Input, { error: "Required", label: "Display name", name: "display-name" }));

    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Required");
  });

  it("renders status pill semantic label", () => {
    render(h(StatusPill, { label: "Ready", tone: "success" }));

    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("selects an option with keyboard navigation", () => {
    const onValueChange = vi.fn();
    render(
      h(Select, {
        items: [
          { label: "First", value: "first" },
          { label: "Second", value: "second" },
        ],
        label: "Choice",
        onValueChange,
        value: "first",
      }),
    );

    const select = screen.getByRole("button", { name: /choice first/i });
    fireEvent.keyDown(select, { key: "ArrowDown" });
    fireEvent.keyDown(select, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("second");
  });

  it("closes panel from its close control", () => {
    const onOpenChange = vi.fn();
    render(h(Panel, { children: "Content", onOpenChange, open: true, title: "Panel title" }));

    const closeControls = screen.getAllByRole("button", { name: "Close panel" });
    const closeControl = closeControls.at(-1);
    if (!closeControl) {
      throw new Error("Panel close control was not rendered");
    }
    fireEvent.click(closeControl);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("selects a palette item", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    render(
      h(Palette, {
        onOpenChange,
        onSelect,
        open: true,
        sections: [
          { id: "actions", label: "Actions", items: [{ id: "create", label: "Create item" }] },
        ],
      }),
    );

    fireEvent.click(screen.getByText("Create item"));

    expect(onSelect).toHaveBeenCalledWith({ id: "create", label: "Create item" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows and dismisses toast action", () => {
    function ToastDemo() {
      const { showToast } = useToast();
      return h(
        Button,
        {
          onClick: () =>
            showToast({
              action: { label: "Undo", onClick: () => undefined },
              title: "Saved",
            }),
        },
        "Trigger",
      );
    }

    render(h(ToastProvider, null, h(ToastDemo)));

    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

    expect(screen.getByText("Saved")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
