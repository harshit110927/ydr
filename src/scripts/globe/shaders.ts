// GLSL for the globe, recovered verbatim from the original concept build.

export const surfaceVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const earthFrag = /* glsl */ `
uniform sampler2D uDay, uNight, uClouds, uBump, uWater, uId, uLut;
uniform vec3 uSun;
uniform float uCloudShift, uCloudAmt, uProgress, uHover, uSel, uOverlay, uBumpScale;
uniform vec2 uTexel;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  vec3 L = normalize(uSun);
  float h0 = texture2D(uBump, vUv).r;
  float hE = texture2D(uBump, vUv + vec2(uTexel.x, 0.0)).r;
  float hN = texture2D(uBump, vUv + vec2(0.0, uTexel.y)).r;
  vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), N) + vec3(1e-6, 0.0, 0.0));
  vec3 north = normalize(cross(N, east));
  vec3 Nb = normalize(N - uBumpScale * ((hE - h0) * east + (hN - h0) * north));

  float ndl = dot(N, L);
  float dayAmt = smoothstep(-0.10, 0.24, ndl);
  float diff = clamp(dot(Nb, L), 0.0, 1.0);
  vec3 albedo = texture2D(uDay, vUv).rgb;
  float waterM = texture2D(uWater, vUv).r;
  // The source imagery shades the sea floor; from space the open ocean reads as an even deep blue
  albedo = mix(albedo, vec3(0.006, 0.022, 0.06) + albedo * 0.35, waterM * 0.62);
  float cloud = texture2D(uClouds, vUv + vec2(uCloudShift, 0.0)).r * uCloudAmt;
  float shade = 1.0 - 0.38 * texture2D(uClouds, vUv + vec2(uCloudShift + 0.0016, 0.0016)).r * uCloudAmt;
  vec3 col = albedo * diff * 1.3 * shade;

  float water = waterM;
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float glint = (pow(nh, 700.0) * 0.75 + pow(nh, 110.0) * 0.022) * water * smoothstep(0.0, 0.2, ndl);
  col += vec3(1.0, 0.93, 0.8) * glint * (1.0 - cloud);

  float dusk = (1.0 - smoothstep(0.0, 0.32, ndl)) * dayAmt;
  col *= mix(vec3(1.0), vec3(1.18, 0.82, 0.6), dusk);

  float lights = texture2D(uNight, vUv).r;
  col += vec3(1.0, 0.66, 0.33) * lights * lights * 2.1 * (1.0 - dayAmt) * (1.0 - 0.7 * cloud);

  // His countries
  float idx = floor(texture2D(uId, vUv).r * 255.0 + 0.5);
  vec4 lut = texture2D(uLut, vec2((idx + 0.5) / 256.0, 0.5));
  float status = floor(lut.r * 255.0 + 0.5);
  float has = step(0.5, status) * step(0.5, idx);
  float lit = has * smoothstep(lut.g - 0.012, lut.g + 0.002, uProgress);
  float flash = has * exp(-pow((uProgress - lut.g) * 48.0, 2.0)) * (1.0 - step(1.0, uProgress));
  float strength = status > 3.5 ? 0.06 : status > 2.5 ? 0.30 : status > 1.5 ? 0.08 : 0.16;
  vec3 gold = vec3(1.0, 0.70, 0.30);
  float t = strength * lit * uOverlay;
  col = mix(col, col * vec3(1.18, 1.0, 0.72) + gold * 0.05, t * dayAmt);
  col += gold * (0.05 * lit * uOverlay * (1.0 - dayAmt) * step(0.5, status) + 0.2 * flash * uOverlay);
  float veil = step(0.5, idx) * (1.0 - lit) * uOverlay;
  float grey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, mix(col, vec3(grey), 0.6) * 0.5, veil * 0.9);
  float hov = step(0.5, idx) * (1.0 - step(0.5, abs(idx - uHover)));
  float sel = step(0.5, idx) * (1.0 - step(0.5, abs(idx - uSel)));
  col += vec3(1.0, 0.86, 0.58) * (0.10 * hov + 0.16 * sel) * (0.35 + 0.65 * dayAmt);

  // Thin air at the edge of the disc
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 sky = mix(vec3(1.0, 0.45, 0.16), vec3(0.30, 0.56, 1.0), smoothstep(-0.08, 0.4, ndl));
  col = mix(col, sky, fres * 0.55 * smoothstep(-0.25, 0.22, ndl));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const cloudsFrag = /* glsl */ `
uniform sampler2D uClouds; uniform vec3 uSun; uniform float uCloudShift, uOpacity;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 N = normalize(vN); vec3 L = normalize(uSun); vec3 V = normalize(cameraPosition - vP);
  float c = texture2D(uClouds, vUv + vec2(uCloudShift, 0.0)).r;
  float ndl = dot(N, L);
  float dayAmt = smoothstep(-0.14, 0.26, ndl);
  vec3 col = mix(vec3(0.015, 0.02, 0.035), vec3(1.0), dayAmt);
  col *= mix(vec3(1.0), vec3(1.0, 0.7, 0.48), (1.0 - smoothstep(0.0, 0.3, ndl)) * dayAmt);
  float edge = 1.0 - max(dot(N, V), 0.0);
  float a = c * uOpacity * (0.35 + 0.65 * dayAmt) * (1.0 - 0.5 * pow(edge, 5.0));
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const atmosphereFrag = /* glsl */ `
uniform vec3 uSun; uniform float uR;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  vec3 C = cameraPosition;
  vec3 D = normalize(vP - C);
  float t = -dot(C, D);
  vec3 Q = C + D * t;
  float d = length(Q);
  float x = clamp((d - 1.0) / (uR - 1.0), 0.0, 1.0);
  float dens = exp(-x * 4.2) * (1.0 - x);
  vec3 L = normalize(uSun);
  float s = dot(normalize(Q), L);
  float lightAmt = smoothstep(-0.32, 0.3, s);
  vec3 col = mix(vec3(1.0, 0.42, 0.14), vec3(0.30, 0.56, 1.0), smoothstep(0.0, 0.42, s)) * lightAmt;
  float mu = max(dot(D, L), 0.0);
  col += vec3(1.0, 0.78, 0.52) * pow(mu, 10.0) * 0.8 * lightAmt;
  gl_FragColor = vec4(col * dens * 1.7, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const starsVert = /* glsl */ `
attribute float aSize; attribute vec3 aColor; uniform float uPx; varying vec3 vC;
void main() { vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uPx; }
`;

export const starsFrag = /* glsl */ `
varying vec3 vC;
void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a, 1.0); }
`;

export const markersVert = /* glsl */ `
attribute float aOrder; attribute float aIdx; uniform float uPx, uProgress, uHover; varying float vLit; varying float vHov;
void main() {
  vLit = smoothstep(aOrder - 0.01, aOrder + 0.002, uProgress);
  vHov = 1.0 - step(0.5, abs(aIdx - uHover));
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (7.0 + 5.0 * vHov) * (0.4 + 0.6 * vLit);
}
`;

export const markersFrag = /* glsl */ `
varying float vLit; varying float vHov;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.26, 0.18, d);
  float ring = smoothstep(0.5, 0.36, d) * (1.0 - smoothstep(0.36, 0.24, d));
  vec3 c = mix(vec3(1.0, 0.76, 0.38), vec3(1.0, 0.92, 0.72), vHov);
  float a = (core + ring * 0.55) * vLit;
  if (a < 0.02) discard;
  gl_FragColor = vec4(c, a);
}
`;
