import { act, render, screen } from "@testing-library/react";
import pngFile from "../exampleFiles/png-image.png?url";
import DocViewer from "../index";

// A ResizeObserver whose callbacks the test fires by hand.
const callbacks: Array<() => void> = [];
class FakeResizeObserver {
  constructor(callback: () => void) {
    callbacks.push(callback);
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  fetchMock.resetMocks();
  fetchMock.mockResponse("", { headers: { "content-type": "image/png" } });
  callbacks.length = 0;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("measures on the next frame after a resize, not inside the observer callback", async () => {
  render(<DocViewer documents={[{ uri: pngFile }]} />);
  const node = screen.getByTestId("proxy-renderer");
  expect(callbacks).toHaveLength(1);

  Object.defineProperty(node, "clientWidth", {
    value: 640,
    configurable: true,
  });
  act(() => callbacks[0]());
  // Synchronously touching layout here is what triggers the browser's
  // "ResizeObserver loop completed with undelivered notifications" error.
  expect(node.style.getPropertyValue("--rdv-scrollport-width")).not.toBe(
    "640px",
  );

  act(() => {
    vi.advanceTimersToNextFrame();
  });
  expect(node.style.getPropertyValue("--rdv-scrollport-width")).toBe("640px");
});

test("coalesces bursts of resize notifications into one measurement", () => {
  render(<DocViewer documents={[{ uri: pngFile }]} />);
  const node = screen.getByTestId("proxy-renderer");
  const setProperty = vi.spyOn(node.style, "setProperty");

  act(() => {
    callbacks[0]();
    callbacks[0]();
    callbacks[0]();
    vi.advanceTimersToNextFrame();
  });
  expect(setProperty).toHaveBeenCalledTimes(1);
});
