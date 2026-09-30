import type { DocRenderer } from "../models";
import { selectRenderer } from "./useRendererSelector";

const make = (fileTypes: string[], weight = 0): DocRenderer => {
  const renderer = (() => null) as unknown as DocRenderer;
  renderer.fileTypes = fileTypes;
  renderer.weight = weight;
  return renderer;
};

describe("selectRenderer", () => {
  const png = make(["png", "image/png"]);
  const heavyPng = make(["IMAGE/PNG"], 5);

  it("is undefined while the type is unknown and null when nothing matches", () => {
    expect(selectRenderer(undefined, [png])).toBeUndefined();
    expect(selectRenderer("", [png])).toBeUndefined();
    expect(selectRenderer("application/zip", [png])).toBeNull();
  });

  it("matches case-insensitively, ignores parameters and prefers weight", () => {
    expect(selectRenderer("Image/PNG; charset=binary", [png, heavyPng])).toBe(
      heavyPng,
    );
    expect(selectRenderer("PNG", [png])).toBe(png);
  });
});
