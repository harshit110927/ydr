// Cheap capability check, kept apart from the three.js bundle so devices that can't run the
// globe well never download it. Software rasterisers (SwiftShader, llvmpipe) don't always set
// the "major performance caveat" flag, so the unmasked renderer name is checked too.
export function fastWebGL(force = false) {
  try {
    const c = document.createElement('canvas');
    const opts = { failIfMajorPerformanceCaveat: !force };
    const gl = (c.getContext('webgl2', opts) || c.getContext('webgl', opts)) as WebGLRenderingContext | null;
    if (!gl) return false;
    if (force) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

export const forcedGL = () => /[?&]gl=force\b/.test(location.search);

/** No fast WebGL: the hero keeps its still; the explorer shows the same still plus the full list. */
export function showGlobeFallback() {
  const f = document.getElementById('g-fallback');
  if (f) f.hidden = false;
  const ui = document.querySelector<HTMLElement>('.globe-ui');
  if (ui) ui.hidden = true;
  document.getElementById('stage-globe')?.classList.add('is-still');
  const idx = document.getElementById('country-index-wrap') as HTMLDetailsElement | null;
  if (idx) idx.open = true;
}
