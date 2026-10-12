import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { highlightLine } from "../lib/highlight";
import { ORIGINAL_SOURCE } from "../lib/shader";

interface Props {
  remixSource: string;
  accentColor: string;
}

type Tab = "remix" | "original";

export default function CodePanel({ remixSource, accentColor }: Props) {
  const [tab, setTab] = useState<Tab>("remix");
  const [copied, setCopied] = useState(false);

  const source = tab === "remix" ? remixSource : ORIGINAL_SOURCE;
  const lines = useMemo(() => source.split("\n"), [source]);

  // Locate the rewritten block in the remix so it can be visually flagged.
  const accentRange = useMemo(() => {
    if (tab !== "remix") return null;
    const start = lines.findIndex((l) => l.includes("MULTICOLOR CORE") && l.includes("===="));
    const end = lines.findIndex((l) => l.includes("END MULTICOLOR CORE"));
    return start >= 0 && end > start ? { start, end } : null;
  }, [lines, tab]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = source;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "remix" ? "chroma-tunnel-multicolor.glsl" : "original-amber.glsl";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a10]">
      {/* window chrome */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>

        <div className="flex gap-1 rounded-full border border-white/10 bg-black/40 p-0.5">
          {(
            [
              ["remix", "chroma-tunnel.glsl"],
              ["original", "original.glsl"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition-all ${
                tab === id ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto hidden font-mono text-[11px] text-zinc-500 sm:block">
          {lines.length} lines · GLSL ES 1.00
        </span>

        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 transition-all hover:bg-white/12 active:scale-95"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={download}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 transition-all hover:bg-white/12 active:scale-95"
        >
          <Download size={12} />
          .glsl
        </button>
      </div>

      {/* code body */}
      <div className="slim-scroll min-h-0 flex-1 overflow-auto">
        <pre className="min-w-max px-0 py-4 font-mono text-[12px] leading-[1.55]">
          {lines.map((line, i) => {
            const inAccent =
              accentRange !== null && i >= accentRange.start && i <= accentRange.end;
            return (
              <div
                key={i}
                className="flex"
                style={
                  inAccent
                    ? {
                        background: "rgba(255,255,255,0.045)",
                        boxShadow: `inset 2px 0 0 ${accentColor}`,
                      }
                    : undefined
                }
              >
                <span className="w-12 shrink-0 pr-4 text-right text-zinc-600 select-none">
                  {i + 1}
                </span>
                <code className="pr-6 whitespace-pre">{highlightLine(line, `l${i}`)}</code>
              </div>
            );
          })}
        </pre>
      </div>

      <div className="border-t border-white/8 bg-white/[0.02] px-4 py-2.5 font-mono text-[11px] text-zinc-500">
        {tab === "remix" ? (
          <>
            Highlighted block = the rewrite. Everything else is the original rig, so it drops
            straight back into ShaderToy.
          </>
        ) : (
          <>The original shader, byte-for-byte as supplied — single amber ramp and all.</>
        )}
      </div>
    </div>
  );
}
