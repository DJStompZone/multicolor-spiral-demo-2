import type { CSSProperties } from "react";
import { Check, Shuffle } from "lucide-react";
import type { Palette } from "../lib/palettes";

export interface KnobSettings {
  speed: number;
  scale: number;
  turb: number;
  glow: number;
  seed: number;
}

interface Props {
  palettes: Palette[];
  activeIndex: number;
  onSelectPalette: (i: number) => void;
  original: boolean;
  onToggleOriginal: (v: boolean) => void;
  settings: KnobSettings;
  onSetting: (key: keyof KnobSettings, v: number) => void;
  onShuffleSeed: () => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  accent: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
          {label}
        </span>
        <span className="font-mono text-[11px] text-zinc-300">{format(value)}</span>
      </span>
      <input
        type="range"
        className="chroma-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--thumb": accent } as CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export default function Controls({
  palettes,
  activeIndex,
  onSelectPalette,
  original,
  onToggleOriginal,
  settings,
  onSetting,
  onShuffleSeed,
}: Props) {
  const accent = palettes[activeIndex].colors[2].hex;

  return (
    <div className="flex flex-col gap-5">
      {/* ------- A/B switch ------- */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
          Render mode
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/40 p-1">
          <button
            onClick={() => onToggleOriginal(false)}
            className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
              !original
                ? "bg-white text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Multicolor remix
          </button>
          <button
            onClick={() => onToggleOriginal(true)}
            className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
              original
                ? "bg-[#ffb35c] text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Original amber
          </button>
        </div>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-500">
          {original
            ? "ORIGINAL = 1.0 — the untouched amber ramp, for comparison."
            : "ORIGINAL = 0.0 — discrete per-cell swatches engaged."}
        </p>
      </div>

      <div className="h-px bg-white/8" />

      {/* ------- palette picker ------- */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
          Palette · 8 individual colors
        </p>
        <div className={`flex flex-col gap-2 transition-opacity ${original ? "opacity-40" : ""}`}>
          {palettes.map((p, i) => {
            const active = i === activeIndex && !original;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPalette(i)}
                className={`group rounded-2xl border p-2.5 text-left transition-all ${
                  active
                    ? "border-white/35 bg-white/8"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                <span className="mb-2 flex overflow-hidden rounded-md">
                  {p.colors.map((col) => (
                    <span key={col.hex} className="h-3.5 flex-1" style={{ background: col.hex }} />
                  ))}
                </span>
                <span className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-zinc-100">{p.name}</span>
                  {active ? (
                    <Check size={14} style={{ color: p.colors[4].hex }} />
                  ) : (
                    <span className="font-mono text-[10px] text-zinc-500">0{i + 1}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-white/8" />

      {/* ------- knobs ------- */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
          Live knobs <span className="ml-1 font-mono normal-case tracking-normal text-zinc-600">→ written into the code below</span>
        </p>
        <Slider
          label="Flow speed"
          value={settings.speed}
          min={0}
          max={2.5}
          step={0.01}
          format={(v) => `${v.toFixed(2)}×`}
          accent={accent}
          onChange={(v) => onSetting("speed", v)}
        />
        <Slider
          label="Cell scale"
          value={settings.scale}
          min={4}
          max={22}
          step={0.1}
          format={(v) => v.toFixed(1)}
          accent={accent}
          onChange={(v) => onSetting("scale", v)}
        />
        <Slider
          label="Turbulence"
          value={settings.turb}
          min={0}
          max={1.4}
          step={0.01}
          format={(v) => v.toFixed(2)}
          accent={accent}
          onChange={(v) => onSetting("turb", v)}
        />
        <Slider
          label="Glow"
          value={settings.glow}
          min={0.3}
          max={2.2}
          step={0.01}
          format={(v) => v.toFixed(2)}
          accent={accent}
          onChange={(v) => onSetting("glow", v)}
        />
      </div>

      <div className="h-px bg-white/8" />

      {/* ------- seed ------- */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
            Color seed
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
            SEED = {settings.seed.toFixed(2)} · reshuffles cell → swatch
          </p>
        </div>
        <button
          onClick={onShuffleSeed}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[12px] font-semibold text-zinc-100 transition-all hover:bg-white/12 active:scale-95"
        >
          <Shuffle size={13} />
          Shuffle
        </button>
      </div>
    </div>
  );
}
