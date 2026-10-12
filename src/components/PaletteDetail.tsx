import { useState, type ReactNode } from "react";
import { Check, Hash, Layers, Palette as PaletteIcon, ShieldCheck } from "lucide-react";
import { luminance, type Palette } from "../lib/palettes";

function Step({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/5 text-zinc-300">
        {icon}
      </span>
      <span>
        <span className="block text-[13px] font-semibold text-zinc-100">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-zinc-400">{children}</span>
      </span>
    </li>
  );
}

const code = (s: string) => (
  <code className="rounded bg-white/8 px-1 py-px font-mono text-[11px] text-zinc-200">{s}</code>
);

export default function PaletteDetail({ palette }: { palette: Palette }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      /* clipboard unavailable — tile still shows the hex */
    }
    setCopied(hex);
    setTimeout(() => setCopied((cur) => (cur === hex ? null : cur)), 1400);
  };

  return (
    <div className="flex h-full flex-col gap-6 rounded-[28px] border border-white/10 bg-[#0b0b11]/90 p-5 sm:p-6">
      {/* header */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
          Active palette
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h3 className="text-2xl font-bold tracking-tight">{palette.name}</h3>
          <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-zinc-300">
            8 swatches · 0 gradients
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">{palette.tagline}</p>
      </div>

      {/* swatch grid — click to copy */}
      <div className="grid grid-cols-4 gap-2">
        {palette.colors.map((col, i) => {
          const dark = luminance(col.hex) > 0.62;
          const isCopied = copied === col.hex;
          return (
            <button
              key={col.hex}
              onClick={() => copyHex(col.hex)}
              title={`Copy ${col.hex}`}
              className="group relative flex h-[92px] flex-col justify-between overflow-hidden rounded-2xl p-2.5 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
              style={{ background: col.hex, color: dark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.92)" }}
            >
              <span className="flex items-start justify-between font-mono text-[10px] font-semibold">
                {String(i + 1).padStart(2, "0")}
                {isCopied && <Check size={12} strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-[10.5px] leading-tight font-bold">{col.name}</span>
                <span className="block font-mono text-[9.5px] opacity-75">{col.hex}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* how it works */}
      <div>
        <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
          How the remix works
        </p>
        <ul className="flex flex-col gap-3.5">
          <Step icon={<Hash size={14} />} title="Hash the cell">
            {code("hash12(cellId)")} hands every Voronoi cell a stable fingerprint in [0, 1) — the
            same cell keeps the same color while the tunnel flows.
          </Step>
          <Step icon={<PaletteIcon size={14} />} title="Snap to one swatch">
            {code("step()")} buckets the fingerprint into exactly one of eight flat colors. No{" "}
            {code("mix()")} across hues, no rainbow ramp — that's the brief.
          </Step>
          <Step icon={<Layers size={14} />} title="Shade, never blend">
            The original pulse × edge shading multiplies the swatch, and an F2−F1 seam darkens the
            borders so neighbouring colors stay individuals.
          </Step>
          <Step icon={<ShieldCheck size={14} />} title="Rig untouched">
            {code("shader2Mask")}, the fbm turbulence and the timing are the original code — only
            the color source inside {code("voronoiHex()")} changed.
          </Step>
        </ul>
      </div>

      {/* diff chips */}
      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-white/8 pt-4">
        {["voronoiHex() — rewritten", "+ palette() — new", "mask · fbm · noise — untouched"].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[10px] text-zinc-400"
            >
              {chip}
            </span>
          )
        )}
      </div>
    </div>
  );
}
