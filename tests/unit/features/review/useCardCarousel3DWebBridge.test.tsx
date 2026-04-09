// @vitest-environment jsdom
import React, { useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { useCardCarousel3DWebBridge } from "@/features/review/infra/web/useCardCarousel3DWebBridge";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

const scrollToMock = vi.fn(function scrollTo(
  this: HTMLDivElement,
  options: ScrollToOptions,
) {
  this.scrollLeft = options.left ?? this.scrollLeft;
});

const disconnectMock = vi.fn();
const observeMock = vi.fn();

class ResizeObserverMock {
  observe = observeMock;
  disconnect = disconnectMock;
  unobserve = vi.fn();
}

const setup = (element: React.ReactElement) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  flushSync(() => {
    root.render(element);
  });
};

const HookHarness = ({
  activeIndex = 0,
  itemCount = 3,
  onSettledIndexChange = vi.fn(),
  triggerScroll = false,
}: {
  activeIndex?: number;
  itemCount?: number;
  onSettledIndexChange?: (index: number) => void;
  triggerScroll?: boolean;
}) => {
  const bridge = useCardCarousel3DWebBridge({
    activeIndex,
    itemCount,
    itemSpan: 100,
    scrollDebounceMs: 120,
    onSettledIndexChange,
  });

  useLayoutEffect(() => {
    const item = document.createElement("div");
    Object.defineProperty(item, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ height: 240 }),
    });
    bridge.itemRefs.current[activeIndex] = item;
    bridge.trackRef.current = document.createElement("div");
    bridge.trackRef.current.scrollLeft = 180;

    if (triggerScroll) {
      bridge.handleScroll();
    }
  }, [activeIndex, bridge, triggerScroll]);

  return <div ref={bridge.stageRef} />;
};

beforeEach(() => {
  vi.useFakeTimers();
  observeMock.mockClear();
  disconnectMock.mockClear();
});

afterEach(() => {
  flushSync(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
  vi.clearAllMocks();
});

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value: scrollToMock,
});

Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverMock,
});

describe("useCardCarousel3DWebBridge", () => {
  it("unmount 時に observer を cleanup する", () => {
    setup(<HookHarness />);

    flushSync(() => {
      root.unmount();
    });

    expect(observeMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("unmount 後に保留中の scroll settle 通知を発火しない", () => {
    const onSettledIndexChange = vi.fn();
    setup(
      <HookHarness
        onSettledIndexChange={onSettledIndexChange}
        triggerScroll={true}
      />,
    );

    flushSync(() => {
      root.unmount();
    });

    vi.runAllTimers();

    expect(onSettledIndexChange).not.toHaveBeenCalled();
  });
});
