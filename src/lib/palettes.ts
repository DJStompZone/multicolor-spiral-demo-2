export interface PaletteColor {
  hex: string;
  name: string;
}

export interface Palette {
  id: string;
  name: string;
  tagline: string;
  colors: PaletteColor[];
}

const c = (hex: string, name: string): PaletteColor => ({ hex, name });

/**
 * Four curated sets of eight *individual* colors.
 * The shader snaps each Voronoi cell to exactly one swatch via step(),
 * so these are never blended into a gradient — that's the whole point.
 */
export const PALETTES: Palette[] = [
  {
    id: "spectrum-pop",
    name: "Spectrum Pop",
    tagline: "Eight loud solids with a rainbow heartbeat.",
    colors: [
      c("#FF3858", "Punch Red"),
      c("#FF7A1A", "Tangerine"),
      c("#FFC21C", "Solar Amber"),
      c("#5ED93B", "Acid Lime"),
      c("#12C2A0", "Lagoon"),
      c("#2E8CFF", "Hyper Blue"),
      c("#7B5CFF", "Ultra Violet"),
      c("#FF4FD8", "Bubblegum"),
    ],
  },
  {
    id: "neon-arcade",
    name: "Neon Arcade",
    tagline: "Coin-op phosphor, turned all the way up.",
    colors: [
      c("#FF2A6D", "Neon Rose"),
      c("#FF7300", "Arcade Orange"),
      c("#F9F002", "Laser Lemon"),
      c("#3BFF4F", "Toxic Green"),
      c("#00F5D4", "Cyber Mint"),
      c("#00BBF9", "Plasma Blue"),
      c("#9B5DE5", "Synthwave"),
      c("#F15BB5", "Vice Pink"),
    ],
  },
  {
    id: "sorbet",
    name: "Sorbet",
    tagline: "Soft-serve pastels, still strictly flat.",
    colors: [
      c("#FFB3C1", "Strawberry Milk"),
      c("#FFD6A5", "Apricot Sorbet"),
      c("#FDFFB6", "Lemon Cream"),
      c("#CAFFBF", "Honeydew"),
      c("#9BF6FF", "Glacier"),
      c("#A0C4FF", "Powder Blue"),
      c("#BDB2FF", "Lilac Haze"),
      c("#FFC6FF", "Orchid Mist"),
    ],
  },
  {
    id: "jewel-box",
    name: "Jewel Box",
    tagline: "Deep gem tones with a hard polish.",
    colors: [
      c("#EF476F", "Ruby"),
      c("#FF9F1C", "Amber Jewel"),
      c("#FFE74C", "Topaz"),
      c("#06D6A0", "Emerald"),
      c("#118AB2", "Sapphire"),
      c("#4361EE", "Royal"),
      c("#B5179E", "Amethyst"),
      c("#FF5D8F", "Tourmaline"),
    ],
  },
];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Relative luminance — used to pick readable text on top of a swatch. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
