export const BUILDER_HEADING_LEVELS = [
  { id: "h1", label: "Heading 1 (largest)" },
  { id: "h2", label: "Heading 2" },
  { id: "h3", label: "Heading 3" },
  { id: "p", label: "Standard text" },
] as const;

export type BuilderHeadingLevel = (typeof BUILDER_HEADING_LEVELS)[number]["id"];

export type BuilderTheme = {
  pageBackground: string
  textColor: string
  headingColor: string
  buttonBackground: string
  buttonText: string
};

export const EMPTY_BUILDER_THEME: BuilderTheme = {
  pageBackground: "",
  textColor: "",
  headingColor: "",
  buttonBackground: "",
  buttonText: "",
};

export const BUILDER_BACKGROUND_SWATCHES = [
  { label: "Default", value: "" },
  { label: "White", value: "#ffffff" },
  { label: "Cream", value: "#f7f3ea" },
  { label: "Light gray", value: "#f4f4f5" },
  { label: "Sky", value: "#e8f1f8" },
  { label: "Navy", value: "#0f2744" },
  { label: "Forest", value: "#14352c" },
  { label: "Charcoal", value: "#18181b" },
  { label: "Brick", value: "#6b2d2d" },
] as const;

export const BUILDER_TEXT_SWATCHES = [
  { label: "Default", value: "" },
  { label: "Black", value: "#18181b" },
  { label: "Gray", value: "#52525b" },
  { label: "White", value: "#ffffff" },
  { label: "Navy", value: "#0f2744" },
  { label: "Cream", value: "#f7f3ea" },
] as const;

export function isBuilderHeadingLevel(value: string): value is BuilderHeadingLevel {
  return BUILDER_HEADING_LEVELS.some((level) => level.id === value);
}

export function parseBuilderColor(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return "";
  return trimmed.toLowerCase();
}

export function parseBuilderTheme(raw: unknown): BuilderTheme {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    pageBackground: parseBuilderColor(source.pageBackground),
    textColor: parseBuilderColor(source.textColor),
    headingColor: parseBuilderColor(source.headingColor),
    buttonBackground: parseBuilderColor(source.buttonBackground),
    buttonText: parseBuilderColor(source.buttonText),
  };
}

export function parseHeadingLevel(
  value: unknown,
  fallback: BuilderHeadingLevel,
): BuilderHeadingLevel {
  if (typeof value === "string" && isBuilderHeadingLevel(value)) return value;
  return fallback;
}

export function headingClassName(level: BuilderHeadingLevel, dense: boolean): string {
  if (level === "h1") {
    return dense ? "text-2xl font-semibold tracking-tight" : "text-4xl font-semibold tracking-tight";
  }
  if (level === "h2") {
    return dense ? "text-xl font-semibold tracking-tight" : "text-2xl font-semibold tracking-tight";
  }
  if (level === "h3") {
    return dense ? "text-base font-semibold tracking-tight" : "text-xl font-semibold tracking-tight";
  }
  return dense ? "text-sm leading-6" : "text-base leading-7";
}

export function isDarkBuilderColor(value: string): boolean {
  const color = parseBuilderColor(value);
  if (!color) return false;
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 140;
}

export function builderButtonColors(
  theme: BuilderTheme,
  darkRow: boolean,
): { backgroundColor: string; color: string } {
  const background = theme.buttonBackground || (darkRow ? "#ffffff" : "#18181b");
  const color = theme.buttonText || (darkRow ? "#18181b" : "#ffffff");
  if (darkRow && isDarkBuilderColor(background)) {
    return { backgroundColor: "#ffffff", color: "#18181b" };
  }
  return { backgroundColor: background, color };
}
