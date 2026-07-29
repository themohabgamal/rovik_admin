export const CONTENT_ICONS = [
  "sun",
  "sliders",
  "mount",
  "bar",
  "cable",
  "manual",
  "plus",
  "check",
  "star",
  "shield",
  "zap",
  "box",
  "lightbulb",
  "wrench",
] as const;

export type ContentIcon = (typeof CONTENT_ICONS)[number];
