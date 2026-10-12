import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Camera, Maximize, Pause, Play, Rainbow, SlidersHorizontal } from "lucide-react";
import ShaderCanvas, {
  type GlApi,
  type GlStats,
  type UniformState,
} from "./components/ShaderCanvas";
import Controls, { type KnobSettings } from "./components/Controls";
import CodePanel from "./components/CodePanel";
import PaletteDetail from "./components/PaletteDetail";
import { PALETTES } from "./lib/palettes";
import { buildDisplaySource } from "./lib/shader";

export default function App() {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [originalMode, setOriginalMode] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [knobs, setKnobs] = useState<KnobSettings>({
    speed: 1,
    scale: 10,
    turb: 0.5,
    glow: 1.05,
    seed: 0,
  });
  const [stats, setStats] = useState<GlStats>({ fps: 0, width: 0, height: 0, time: 0 });

  const palette = PALETTES[paletteIndex];

  /* Live uniform feed for the render loop (kept in refs to avoid re-renders). */
  const uniformsRef = useRef<UniformState>({
    speed: 1,
    scale: 10,
    turb: 0.5,
    glow: 1.05,
    seed: 0,
    original: false,
  });
  useEffect(() => {
    uniformsRef.current = { ...knobs, original: originalMode };
  }, [knobs, originalMode]);

  const playingRef = useRef(true);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const apiRef = useRef<GlApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const remixSource = useMemo(
    () => buildDisplaySource(palette, knobs, originalMode),
    [palette, knobs, originalMode]
  );

  const selectPalette = (i: number) => {
    setPaletteIndex(i);
    setOriginalMode(false);
  };
  const setKnob = (key: keyof KnobSettings, v: number) =>
    setKnobs((k) => ({ ...k, [key]: v }));
  const shuffleSeed = () =>
    setKnobs((k) => ({ ...k, seed: Math.round(Math.random() * 10000) / 100 }));

  const snapshot = () => {
    const url = apiRef.current?.snapshot();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `chroma-tunnel-${originalMode ? "original-amber" : palette.id}.png`;
    a.click();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  return (
    <div className="font-display relative min-h-screen overflow-x-clip bg-[#060609] text-zinc-100">
      {/* ambient color glows (solid color, heavy blur) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-160px] left-[12%] h-[380px] w-[380px] rounded-full opacity-20 blur-[130px] transition-colors duration-700"
        style={{ background: palette.colors[5].hex }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[30%] right-[-120px] h-[340px] w-[340px] rounded-full opacity-15 blur-[130px] transition-colors duration-700"
        style={{ background: palette.colors[0].hex }}
      />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-overlay" />

      {/* discrete palette stripe — the whole thesis, in one bar */}
      <div className="relative z-10 flex h-1.5">
        {palette.colors.map((col) => (
          <div
            key={col.hex}
            className="flex-1 transition-colors duration-500"
            style={{ background: col.hex }}
          />
        ))}
      </div>

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#060609]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-black transition-colors duration-500"
            style={{ background: palette.colors[2].hex }}
          >
            <Rainbow size={17} strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-bold tracking-[0.08em]">
            CHROMA<span className="text-zinc-500">//</span>TUNNEL
          </span>
          <span className="hidden rounded-full border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-zinc-400 md:block">
            ShaderToy remix · 001
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-zinc-500 lg:block">
              GLSL ES 1.00 · WebGL1 · 60 fps target
            </span>
            <a
              href="https://www.shadertoy.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold transition-all hover:bg-white/12"
            >
              ShaderToy <ArrowUpRight size={12} />
            </a>
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1480px] px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        {/* ---------- title ---------- */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.22em] text-zinc-500 uppercase">
              Fragment shader study — voronoi tunnel
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[56px] lg:leading-[1.02]">
              Same tunnel.{" "}
              <span className="whitespace-nowrap">
                {"NEW SPECTRUM.".split("").map((ch, i) =>
                  ch === " " || ch === "." ? (
                    <span key={i}>{ch}</span>
                  ) : (
                    <span
                      key={i}
                      className="transition-colors duration-500"
                      style={{ color: palette.colors[i % palette.colors.length].hex }}
                    >
                      {ch}
                    </span>
                  )
                )}
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400">
              The original shader paints every Voronoi cell from a single amber ramp. The remix
              deals each cell <span className="text-zinc-100">one flat swatch from a set of eight</span> —
              a rainbow vibe built from individual colors, never a gradient. Flip the A/B switch to
              compare against the untouched original.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-500 xl:block">
            <span className="text-zinc-300">hash12</span>(cell) → <span className="text-zinc-300">step</span>() →{" "}
            <span className="text-zinc-300">palette[0..7]</span>
            <br />
            shade = pulse × edge × seam — <span className="text-zinc-300">multiply, never blend</span>
          </div>
        </div>

        {/* ---------- stage + control deck ---------- */}
        <section className="grid gap-5 xl:grid-cols-12">
          <div
            ref={stageRef}
            className="relative aspect-[16/10] overflow-hidden rounded-[28px] border border-white/10 bg-black xl:col-span-8 xl:aspect-auto xl:min-h-[660px]"
            style={{ boxShadow: `0 44px 120px -48px ${palette.colors[4].hex}66` }}
          >
            <ShaderCanvas
              palette={palette}
              uniformsRef={uniformsRef}
              playingRef={playingRef}
              apiRef={apiRef}
              onStats={setStats}
            />

            {/* HUD — top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
              <span className="flex items-center gap-2 rounded-full border border-white/12 bg-black/45 py-1.5 pr-3.5 pl-3 font-mono text-[10.5px] text-zinc-200 backdrop-blur-md">
                <span
                  className="live-dot h-1.5 w-1.5 rounded-full"
                  style={{ background: originalMode ? "#ffb35c" : palette.colors[3].hex }}
                />
                {originalMode ? "ORIGINAL AMBER" : palette.name.toUpperCase()}
              </span>
              <span className="flex gap-2 font-mono text-[10.5px] text-zinc-300">
                <span className="rounded-full border border-white/12 bg-black/45 px-3 py-1.5 backdrop-blur-md">
                  {stats.fps} FPS
                </span>
                <span className="hidden rounded-full border border-white/12 bg-black/45 px-3 py-1.5 backdrop-blur-md sm:block">
                  {stats.width}×{stats.height}
                </span>
              </span>
            </div>

            {/* paused overlay */}
            {!playing && (
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[1px]"
                aria-label="Resume"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-black shadow-2xl transition-transform hover:scale-105">
                  <Play size={24} className="ml-1" />
                </span>
              </button>
            )}

            {/* HUD — bottom transport bar */}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-white/8 bg-black/45 px-3 py-2.5 backdrop-blur-md">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/8 text-white transition-all hover:bg-white/18 active:scale-95"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>
              <span className="font-mono text-[11px] text-zinc-300">
                t = {stats.time.toFixed(1)}s
              </span>
              <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" />
              <span className="hidden font-mono text-[10.5px] text-zinc-500 md:block">
                move cursor — parallax
              </span>
              <span className="ml-auto flex gap-2">
                <button
                  onClick={snapshot}
                  className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 text-[11px] font-semibold text-white transition-all hover:bg-white/18 active:scale-95"
                >
                  <Camera size={13} /> <span className="hidden sm:inline">Snapshot</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/8 text-white transition-all hover:bg-white/18 active:scale-95"
                  aria-label="Fullscreen"
                >
                  <Maximize size={13} />
                </button>
              </span>
            </div>
          </div>

          {/* control deck */}
          <aside className="rounded-[28px] border border-white/10 bg-[#0b0b11]/90 p-5 backdrop-blur xl:col-span-4">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/12 bg-white/5 text-zinc-300">
                <SlidersHorizontal size={14} />
              </span>
              <div>
                <h2 className="text-[15px] leading-tight font-bold">Control deck</h2>
                <p className="font-mono text-[10px] text-zinc-500">
                  every knob rewrites the shader below
                </p>
              </div>
            </div>
            <Controls
              palettes={PALETTES}
              activeIndex={paletteIndex}
              onSelectPalette={selectPalette}
              original={originalMode}
              onToggleOriginal={setOriginalMode}
              settings={knobs}
              onSetting={setKnob}
              onShuffleSeed={shuffleSeed}
            />
          </aside>
        </section>

        {/* ---------- code + palette detail ---------- */}
        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-12">
          <div className="min-h-[560px] xl:col-span-7">
            <CodePanel remixSource={remixSource} accentColor={palette.colors[4].hex} />
          </div>
          <div className="xl:col-span-5">
            <PaletteDetail palette={palette} />
          </div>
        </section>

        {/* ---------- footer ---------- */}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-6">
          <p className="text-[13px] text-zinc-500">
            <span className="font-bold text-zinc-300">CHROMA//TUNNEL</span> — a one-function
            rewrite. The tunnel, mask and turbulence are inherited; only the color got loud.
          </p>
          <p className="font-mono text-[11px] text-zinc-600">
            hash · snap · multiply — never blend
          </p>
        </footer>
      </main>
    </div>
  );
}
