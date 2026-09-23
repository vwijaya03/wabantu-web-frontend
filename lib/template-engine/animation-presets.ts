export type AnimationPreset = "minimal" | "smooth" | "playful" | "glass" | "bold";

export type AnimationStyle = {
  enter: string;
  durationMs: number;
};

const PRESETS: Record<AnimationPreset, AnimationStyle> = {
  minimal: { enter: "opacity", durationMs: 200 },
  smooth: { enter: "opacity, transform", durationMs: 280 },
  playful: { enter: "opacity, transform", durationMs: 360 },
  glass: { enter: "opacity, transform, filter", durationMs: 300 },
  bold: { enter: "opacity, transform", durationMs: 320 },
};

export function animationStyle(preset?: string): AnimationStyle {
  const key = (preset ?? "minimal") as AnimationPreset;
  return PRESETS[key] ?? PRESETS.minimal;
}
