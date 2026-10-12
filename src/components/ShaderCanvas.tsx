import { useEffect, useRef, useState } from "react";
import { buildRuntimeSource, VERT_SRC } from "../lib/shader";
import type { Palette } from "../lib/palettes";

export interface UniformState {
  speed: number;
  scale: number;
  turb: number;
  glow: number;
  seed: number;
  original: boolean;
}

export interface GlStats {
  fps: number;
  width: number;
  height: number;
  time: number;
}

export interface GlApi {
  snapshot: () => string | null;
}

interface Props {
  palette: Palette;
  uniformsRef: React.MutableRefObject<UniformState>;
  playingRef: React.MutableRefObject<boolean>;
  apiRef: React.MutableRefObject<GlApi | null>;
  onStats: (s: GlStats) => void;
}

type UniformMap = Record<string, WebGLUniformLocation | null>;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function ShaderCanvas({ palette, uniformsRef, playingRef, apiRef, onStats }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const uniformsRefGl = useRef<UniformMap>({});
  const statsCbRef = useRef(onStats);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statsCbRef.current = onStats;
  }, [onStats]);

  /* ---------- one-time GL setup + render loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) {
      setError("WebGL is not available in this browser.");
      return;
    }
    glRef.current = gl;

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.max(2, Math.floor(wrap.clientWidth * dpr));
      const h = Math.max(2, Math.floor(wrap.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseRef.current.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    canvas.addEventListener("pointermove", onPointer);

    apiRef.current = {
      snapshot: () => {
        try {
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    };

    let raf = 0;
    let last = performance.now();
    let simTime = 0;
    let fpsEma = 60;
    let lastReport = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (dt > 0) fpsEma += (1 / Math.max(dt, 1e-4) - fpsEma) * 0.05;

      const u = uniformsRef.current;
      if (playingRef.current) simTime += dt * u.speed;

      const prog = progRef.current;
      if (!prog) return;
      gl.useProgram(prog);
      const loc = uniformsRefGl.current;
      gl.uniform2f(loc.iResolution, canvas.width, canvas.height);
      gl.uniform1f(loc.iTime, simTime);
      const ms = mouseRef.current;
      ms.x += (ms.tx - ms.x) * 0.045;
      ms.y += (ms.ty - ms.y) * 0.045;
      gl.uniform2f(loc.iMouse, ms.x, ms.y);
      gl.uniform1f(loc.uScale, u.scale);
      gl.uniform1f(loc.uTurb, u.turb);
      gl.uniform1f(loc.uGlow, u.glow);
      gl.uniform1f(loc.uSeed, u.seed);
      gl.uniform1f(loc.uOriginal, u.original ? 1 : 0);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (now - lastReport > 250) {
        lastReport = now;
        statsCbRef.current({
          fps: Math.round(fpsEma),
          width: canvas.width,
          height: canvas.height,
          time: simTime,
        });
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onPointer);
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- (re)build fragment program when palette changes ---------- */
  useEffect(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    if (!gl || !canvas) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, buildRuntimeSource(palette));
    if (!vs || !fs) {
      setError("Shader failed to compile — see console.");
      return;
    }
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      setError("Shader failed to link — see console.");
      return;
    }
    const old = progRef.current;
    progRef.current = prog;
    gl.useProgram(prog);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    uniformsRefGl.current = {
      iResolution: gl.getUniformLocation(prog, "iResolution"),
      iTime: gl.getUniformLocation(prog, "iTime"),
      iMouse: gl.getUniformLocation(prog, "iMouse"),
      uScale: gl.getUniformLocation(prog, "uScale"),
      uTurb: gl.getUniformLocation(prog, "uTurb"),
      uGlow: gl.getUniformLocation(prog, "uGlow"),
      uSeed: gl.getUniformLocation(prog, "uSeed"),
      uOriginal: gl.getUniformLocation(prog, "uOriginal"),
    };
    if (old) gl.deleteProgram(old);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    setError(null);
  }, [palette]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center font-mono text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
