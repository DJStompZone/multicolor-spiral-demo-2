import type { ReactNode } from "react";

/**
 * Tiny GLSL syntax highlighter — tokenizes a single line into colored spans.
 * (Line-based on purpose: both shader sources only use // comments.)
 */
const TOKEN =
  /(\/\/.*)|(#\w+)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b(?:precision|uniform|void|float|int|bool|vec2|vec3|vec4|mat2|mat3|mat4|if|else|for|while|do|return|break|continue|const|in|out|inout|struct|highp|mediump|lowp|true|false|attribute|varying)\b)|(\b(?:sin|cos|tan|asin|acos|atan|pow|exp|log|sqrt|inversesqrt|abs|sign|floor|ceil|fract|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|reflect|refract|texture2D|gl_FragColor|gl_FragCoord|gl_Position)\b)|([A-Za-z_]\w*(?=\s*\())|([A-Za-z_]\w*)/g;

const GROUP_CLASS = [
  "",
  "text-zinc-500 italic", // comment
  "text-rose-300", // #directive
  "text-amber-300", // number
  "text-violet-300", // keyword / type
  "text-cyan-300", // builtin
  "text-sky-100 font-semibold", // function call
  "text-zinc-200", // identifier
];

export function highlightLine(line: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(line)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`${keyPrefix}-p${k++}`} className="text-zinc-500">
          {line.slice(last, m.index)}
        </span>
      );
    }
    let group = 7;
    for (let g = 1; g <= 7; g++) {
      if (m[g] !== undefined) {
        group = g;
        break;
      }
    }
    out.push(
      <span key={`${keyPrefix}-t${k++}`} className={GROUP_CLASS[group]}>
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
    if (m[0].length === 0) TOKEN.lastIndex++;
  }
  if (last < line.length) {
    out.push(
      <span key={`${keyPrefix}-p${k++}`} className="text-zinc-500">
        {line.slice(last)}
      </span>
    );
  }
  return out;
}
