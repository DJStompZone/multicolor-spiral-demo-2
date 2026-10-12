import { hexToRgb, type Palette } from "./palettes";

export const VERT_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Generates the palette() lookup: a hash in [0,1) snaps to one of 8 swatches. */
function paletteGLSL(palette: Palette): string {
  const lines = palette.colors.map((col, i) => {
    const [r, g, b] = hexToRgb(col.hex);
    const v = `vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`;
    const label = `// ${String(i + 1).padStart(2, "0")} ${col.name}`.padEnd(26) + col.hex;
    if (i === 0) return `    vec3 c = ${v};  ${label}`;
    return `    c = mix(c, ${v}, step(${(i / 8).toFixed(3)}, n));  ${label}`;
  });
  return `vec3 palette(float n)
{
${lines.join("\n")}
    return c;
}`;
}

/**
 * The shared shader body. The original hash / noise / fbm / mask code is
 * preserved verbatim (only reformatted); the one rewritten function is
 * voronoiHex(), which now deals discrete palette colors per cell.
 */
function buildBody(palette: Palette): string {
  return `#define FOV 35.0

float hash12(vec2 p)
{
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}

float noise_3(in vec3 p)
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = 1.0 - (--f) * f * f * f * -f;
    vec2 ii = i.xy + i.z * vec2(5.0);
    float a = hash12(ii + vec2(0.0, 0.0));
    float b = hash12(ii + vec2(1.0, 0.0));
    float c = hash12(ii + vec2(0.0, 1.0));
    float d = hash12(ii + vec2(1.0, 1.0));
    float v1 = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    ii += vec2(5.0);
    a = hash12(ii + vec2(0.0, 0.0));
    b = hash12(ii + vec2(1.0, 0.0));
    c = hash12(ii + vec2(0.0, 1.0));
    d = hash12(ii + vec2(1.0, 1.0));
    float v2 = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    return mix(v1, v2, u.z);
}

float fbm(vec3 x)
{
    float r = 0.0;
    float w = 1.0, s = 1.0;
    for (int i = 0; i < 4; i++)
    {
        w *= 0.25;
        s *= 3.0;
        r += w * noise_3(s * x);
    }
    return r;
}

float yC(float x)
{
    return cos(x * -0.134) * sin(x * 0.13) * 15.0 + fbm(vec3(x * 0.1, 0.0, 0.0) * 55.4);
}

float shader2Mask(vec2 fragCoord, vec2 res, float t)
{
    vec2 p;
    float i = 0.0, g = 0.0, d = 2.0;
    for (float j = 0.0; j < 128.0; j++)
    {
        i += 1.0;
        if (d <= 0.001) break;
        p = (fragCoord - 0.5 * res) / res.y * g
          + vec2(0.3) * mat2(cos(g * 2.0), -sin(g * 2.0), sin(g * 2.0), cos(g * 2.0));
        g += d = -(length(p) - 2.0 + g / 9.0) / 2.0;
    }
    p = vec2(atan(p.x, p.y), g) * 8.28 + t * 2.0;
    p = abs(fract(p + vec2(0.0, 0.5 * ceil(p.x))) - 0.5);
    float m = 30.0 / i - 0.5 / step(0.9, 1.0 - abs(max(p.x * 1.5 + p.y, p.y * 2.0) - 1.0));
    return clamp(m, 0.0, 1.0);
}

// ==============================================================
//  MULTICOLOR CORE
//  Every Voronoi cell hashes to ONE of eight discrete swatches.
//  step() snaps the hash into a palette slot, so colors stay
//  individual and flat: a rainbow vibe with zero gradient.
// ==============================================================
${paletteGLSL(palette)}

vec3 voronoiHex(vec2 uv, float t)
{
    vec2 g = floor(uv);
    vec2 f = fract(uv);

    float md1 = 8.0;
    float md2 = 8.0;
    vec2  cellId   = vec2(0.0);
    vec2  cellRand = vec2(0.0);

    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++)
    {
        vec2 offset = vec2(float(x), float(y));
        vec2 cell = g + offset;
        vec2 rand = vec2(hash12(cell), hash12(cell + 1.23));
        vec2 r = offset + rand - f;
        float d = dot(r, r);

        if (d < md1)      { md2 = md1; md1 = d; cellId = cell; cellRand = rand; }
        else if (d < md2) { md2 = d; }
    }

    float edge  = sqrt(md1);
    float seam  = sqrt(md2) - edge;
    float pulse = 0.9 + 0.05 * sin(t + cellRand.x * 6.2831);

    // A/B switch: the original amber ramp, untouched.
    if (ORIGINAL > 0.5)
        return vec3(pulse * edge, pulse * edge * 0.6, 0.2 + 0.8 * pulse);

    // One cell, one swatch. SEED reshuffles the assignment.
    float pick   = hash12(cellId * 1.71 + SEED);
    vec3  swatch = palette(pick);

    // Shading multiplies the flat swatch (never blends it), and the
    // F2-F1 seam darkens borders so neighbouring colors stay distinct.
    float jitter = 0.85 + 0.30 * hash12(cellId + 4.7);
    float border = mix(0.55, 1.0, smoothstep(0.0, 0.10, seam));

    return swatch * (0.30 + 0.95 * edge) * pulse * jitter * border;
}
// ==============================================================
//  END MULTICOLOR CORE — below is the original render rig.
// ==============================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 centered = uv * 2.0 - 1.0;
    centered.x *= iResolution.x / iResolution.y;
    centered += MOUSE;

    float mask = shader2Mask(fragCoord.xy, iResolution.xy, iTime);
    vec2 hexUV = mat2(1.0, 0.0, 0.5, sqrt(3.0) * 0.5) * centered * CELL_SCALE;

    vec3 baseColor = voronoiHex(hexUV, iTime);
    float turbulence = fbm(vec3(centered * 3.0, iTime * 0.2));
    baseColor *= 0.8 + TURBULENCE * turbulence;

    fragColor = vec4(baseColor * mask * GLOW, 1.0);
}`;
}

export interface KnobValues {
  scale: number;
  turb: number;
  glow: number;
  seed: number;
}

const f2 = (v: number) => v.toFixed(2);

/** Paste-ready ShaderToy source: the panel knobs become plain #defines. */
export function buildDisplaySource(palette: Palette, k: KnobValues, original: boolean): string {
  return `#ifdef GL_ES
precision mediump float;
#endif

// ---------------------------------------------------------------
//  CHROMA TUNNEL · multicolor remix of the amber voronoi tunnel
//  Palette: "${palette.name}" — 8 discrete swatches, no gradient.
//  Paste straight into ShaderToy; the knobs below are #defines.
// ---------------------------------------------------------------
#define CELL_SCALE ${f2(k.scale)}
#define TURBULENCE ${f2(k.turb)}
#define GLOW       ${f2(k.glow)}
#define SEED       ${f2(k.seed)}
#define ORIGINAL   ${original ? "1.0" : "0.0"}   // 1.0 = original amber A/B
#define MOUSE      vec2(0.0)

${buildBody(palette)}`;
}

/** Live WebGL source: the same body, driven by uniforms from the UI. */
export function buildRuntimeSource(palette: Palette): string {
  return `precision highp float;

uniform vec2  iResolution;
uniform float iTime;
uniform vec2  iMouse;
uniform float uScale;
uniform float uTurb;
uniform float uGlow;
uniform float uSeed;
uniform float uOriginal;

#define CELL_SCALE uScale
#define TURBULENCE uTurb
#define GLOW       uGlow
#define SEED       uSeed
#define ORIGINAL   uOriginal
#define MOUSE      (iMouse * 0.12)

${buildBody(palette)}

void main()
{
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
}

/** The user's original shader, byte-for-byte, for the A/B code tab. */
export const ORIGINAL_SOURCE = `#ifdef GL_ES

precision mediump float;
#endif

#define FOV 35.0

float hash12(vec2 p){float h=dot(p,vec2(127.1,311.7));return fract(sin(h)*43758.5453123);}float noise_3(in vec3 p){vec3 i=floor(p);vec3 f=fract(p);vec3 u=1.0-(--f)*f*f*f*-f;vec2 ii=i.xy+i.z*vec2(5.0);float a=hash12(ii+vec2(0.0,0.0));float b=hash12(ii+vec2(1.0,0.0));float c=hash12(ii+vec2(0.0,1.0));float d=hash12(ii+vec2(1.0,1.0));float v1=mix(mix(a,b,u.x),mix(c,d,u.x),u.y);ii+=vec2(5.0);a=hash12(ii+vec2(0.0,0.0));b=hash12(ii+vec2(1.0,0.0));c=hash12(ii+vec2(0.0,1.0));d=hash12(ii+vec2(1.0,1.0));float v2=mix(mix(a,b,u.x),mix(c,d,u.x),u.y);return mix(v1,v2,u.z);}float fbm(vec3 x){float r=0.0;float w=1.0,s=1.0;for(int i=0;i<4;i++){w*=0.25;s*=3.0;r+=w*noise_3(s*x);}return r;}float yC(float x){return cos(x*-0.134)*sin(x*0.13)*15.0+fbm(vec3(x*0.1,0.0,0.0)*55.4);}float shader2Mask(vec2 fragCoord,vec2 res,float t){vec2 p;float i=0.0,g=0.0,d=2.0;for(float j=0.0;j<128.0;j++){i+=1.0;if(d<=0.001)break;p=(fragCoord-0.5*res)/res.y*g+vec2(0.3)*mat2(cos(g*2.0),-sin(g*2.0),sin(g*2.0),cos(g*2.0));g+=d=-(length(p)-2.0+g/9.0)/2.0;}p=vec2(atan(p.x,p.y),g)*8.28+t*2.0;p=abs(fract(p+vec2(0.0,0.5*ceil(p.x)))-0.5);float m=30.0/i-0.5/step(0.9,1.0-abs(max(p.x*1.5+p.y,p.y*2.0)-1.0));return clamp(m,0.0,1.0);}vec3 voronoiHex(vec2 uv,float t){vec2 g=floor(uv);vec2 f=fract(uv);float minDist=1.0;vec2 nearest;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 offset=vec2(float(x),float(y));vec2 cell=g+offset;vec2 rand=vec2(hash12(cell),hash12(cell+1.23));vec2 r=offset+rand-f;float d=dot(r,r);if(d<minDist){minDist=d;nearest=rand;}}}float edge=sqrt(minDist);float pulse=0.9+0.05*sin(t+nearest.x*6.2831);return vec3(pulse*edge,pulse*edge*0.6,0.2+0.8*pulse);}void mainImage(out vec4 fragColor,in vec2 fragCoord){vec2 uv=fragCoord.xy/iResolution.xy;vec2 centered=uv*2.0-1.0;centered.x*=iResolution.x/iResolution.y;float mask=shader2Mask(fragCoord.xy,iResolution.xy,iTime);vec2 hexUV=mat2(1.0,0.0,0.5,sqrt(3.0)*0.5)*centered*10.0;vec3 baseColor=voronoiHex(hexUV,iTime);float turbulence=fbm(vec3(centered*3.0,iTime*0.2));baseColor*=0.8+0.5*turbulence;fragColor=vec4(baseColor*mask,1.0);}`;
