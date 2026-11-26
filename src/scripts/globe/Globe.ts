// The live Earth. Real-time sun position, night lights, clouds, ocean glint, and a
// country-ID texture that lets the shader light up every country he has filmed in the
// order he first filmed it. Ported from the original single-file build to readable TS.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Texture, DataTexture, ShaderMaterial, SphereGeometry, Mesh,
  BufferGeometry, BufferAttribute, Points, CanvasTexture, Sprite, SpriteMaterial, Raycaster, Sphere, Vector2, Vector3,
  Quaternion, MathUtils, ACESFilmicToneMapping, SRGBColorSpace, RepeatWrapping, ClampToEdgeWrapping, NearestFilter,
  RGBAFormat, BackSide, AdditiveBlending,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { mesh as topoMesh } from 'topojson-client';
import { geoInterpolate } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import * as S from './shaders';
import { fastWebGL } from './support';

const D2R = MathUtils.DEG2RAD;

export const latLonToVec3 = (lat: number, lon: number, r = 1) => {
  const a = lat * D2R, b = lon * D2R;
  return new Vector3(r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b));
};
export const vec3ToLatLon = (v: Vector3) => ({
  lat: Math.asin(MathUtils.clamp(v.y / v.length(), -1, 1)) / D2R,
  lon: Math.atan2(-v.z, v.x) / D2R,
});

/** Where the sun is directly overhead right now (low-precision solar ephemeris). */
export function subsolarPoint(date = new Date()) {
  const d = date.getTime() / 864e5 + 2440587.5 - 2451545;
  const L = (280.46 + 0.9856474 * d) % 360;
  const g = ((357.528 + 0.9856003 * d) % 360) * D2R;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R;
  const eps = (23.439 - 4e-7 * d) * D2R;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (280.46061837 + 360.98564736629 * d) % 360;
  let lon = ra / D2R - gmst;
  lon = ((lon % 360) + 540) % 360 - 180;
  return { lat: dec / D2R, lon };
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

export type CountryState = { i: number; status: number; order: number; small: boolean; lx: number; ly: number; vec?: Vector3 };
export type TextureSet = Record<'day' | 'night' | 'clouds' | 'bump' | 'water' | 'id', string>;
type Mode = 'hero' | 'explore';
type Flight = { from: Vector3; fromLen: number; to: Vector3; toLen: number; t: number; dur: number };

export class Globe {
  small: boolean;
  reduced: boolean;
  mode: Mode = 'hero';
  progress: number;
  live = true;
  spin: boolean;
  cloudsOn = true;
  hover = 0;
  sel = 0;
  interacted = false;
  visible = false;
  ready = false;

  private status = new Uint8Array(256);
  private order = new Float32Array(256);
  private markers: CountryState[] = [];
  private onHover: (id: number, e?: PointerEvent) => void;
  private onSelect: (id: number) => void;

  renderer!: WebGLRenderer;
  canvas!: HTMLCanvasElement;
  private scene!: Scene;
  camera!: PerspectiveCamera;
  controls!: OrbitControls;
  private uniforms!: Record<string, { value: any }>;
  private cloudUniforms!: Record<string, { value: any }>;
  private lutData!: Uint8Array;
  private lut!: DataTexture;
  private earth!: Mesh;
  private clouds!: Mesh;
  private sun!: Sprite;
  private sunLive = new Vector3(1, 0, 0);
  private pick!: Uint8Array;
  private pickW = 2048;
  private pickH = 1024;
  private ray = new Raycaster();
  private outline?: LineSegments2;
  private outlineMat?: LineMaterial;
  private hoverMat?: LineMaterial;
  private hoverLine: LineSegments2 | null = null;
  private dots?: Points;
  private stageEl?: HTMLElement;
  private placedExplore = false;
  private heroDist = 3.75;
  private flight: Flight | null = null;
  private raf: number | null = null;
  private last = 0;
  private revealing = false;
  private revealStart = 0;
  private revealDur = 5.2;
  private revealFrom = 0;

  constructor(
    private tex: TextureSet,
    private topo: Topology,
    opts: { onHover?: (id: number, e?: PointerEvent) => void; onSelect?: (id: number) => void } = {},
  ) {
    const nav = navigator as Navigator & { deviceMemory?: number };
    this.small = Math.min(screen.width, screen.height) < 820 || (!!nav.deviceMemory && nav.deviceMemory <= 4);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.progress = this.reduced ? 1.2 : 0;
    this.spin = !this.reduced;
    this.onHover = opts.onHover || (() => {});
    this.onSelect = opts.onSelect || (() => {});
  }

  static supported(force = false) {
    return fastWebGL(force);
  }

  async init() {
    const r = (this.renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(devicePixelRatio || 1, this.small ? 1.6 : 2));
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = SRGBColorSpace;
    r.setClearColor(0x000000, 1);
    this.canvas = r.domElement;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(30, 1, 0.05, 400);
    this.camera.position.copy(latLonToVec3(18, 92, 3.4));

    const [day, night, clouds, bump, water, id] = await Promise.all(
      (['day', 'night', 'clouds', 'bump', 'water', 'id'] as const).map((k) => loadImage(this.tex[k])),
    );
    const maxW = this.small ? 2048 : 4096;
    const mk = (img: HTMLImageElement, { srgb = false, nearest = false } = {}) => {
      let src: HTMLImageElement | HTMLCanvasElement = img;
      if (img.width > maxW) {
        const c = document.createElement('canvas');
        c.width = maxW;
        c.height = maxW / 2;
        const g = c.getContext('2d')!;
        g.imageSmoothingEnabled = !nearest;
        g.drawImage(img, 0, 0, c.width, c.height);
        src = c;
      }
      const t = new Texture(src);
      t.wrapS = RepeatWrapping;
      t.wrapT = ClampToEdgeWrapping;
      if (srgb) t.colorSpace = SRGBColorSpace;
      if (nearest) {
        t.magFilter = t.minFilter = NearestFilter;
        t.generateMipmaps = false;
      } else t.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      return t;
    };

    this.lutData = new Uint8Array(256 * 4);
    this.lut = new DataTexture(this.lutData, 256, 1, RGBAFormat);
    this.lut.magFilter = this.lut.minFilter = NearestFilter;
    this.lut.needsUpdate = true;

    this.uniforms = {
      uDay: { value: mk(day, { srgb: true }) },
      uNight: { value: mk(night) },
      uClouds: { value: mk(clouds) },
      uBump: { value: mk(bump) },
      uWater: { value: mk(water) },
      uId: { value: mk(id, { nearest: true }) },
      uLut: { value: this.lut },
      uSun: { value: new Vector3(1, 0, 0) },
      uCloudShift: { value: 0 },
      uCloudAmt: { value: 1 },
      uProgress: { value: this.progress },
      uHover: { value: 0 },
      uSel: { value: 0 },
      uOverlay: { value: 1 },
      uBumpScale: { value: 2.6 },
      uTexel: { value: new Vector2(1 / bump.width, 1 / bump.height) },
    };

    this.earth = new Mesh(new SphereGeometry(1, 192, 128), new ShaderMaterial({ uniforms: this.uniforms, vertexShader: S.surfaceVert, fragmentShader: S.earthFrag }));
    this.scene.add(this.earth);

    this.cloudUniforms = { uClouds: this.uniforms.uClouds, uSun: this.uniforms.uSun, uCloudShift: this.uniforms.uCloudShift, uOpacity: { value: 0.92 } };
    this.clouds = new Mesh(
      new SphereGeometry(1.007, 160, 110),
      new ShaderMaterial({ uniforms: this.cloudUniforms, vertexShader: S.surfaceVert, fragmentShader: S.cloudsFrag, transparent: true, depthWrite: false }),
    );
    this.clouds.renderOrder = 2;
    this.scene.add(this.clouds);

    const R = 1.055;
    const atmo = new Mesh(
      new SphereGeometry(R, 96, 64),
      new ShaderMaterial({ uniforms: { uSun: this.uniforms.uSun, uR: { value: R } }, vertexShader: S.surfaceVert, fragmentShader: S.atmosphereFrag, side: BackSide, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    );
    atmo.renderOrder = 3;
    this.scene.add(atmo);
    this.addStars();
    this.addSun();

    // CPU copy of the country-ID map for picking
    const pc = document.createElement('canvas');
    pc.width = this.pickW;
    pc.height = this.pickH;
    const pg = pc.getContext('2d', { willReadFrequently: true })!;
    pg.imageSmoothingEnabled = false;
    pg.drawImage(id, 0, 0, this.pickW, this.pickH);
    const px = pg.getImageData(0, 0, this.pickW, this.pickH).data;
    this.pick = new Uint8Array(this.pickW * this.pickH);
    for (let i = 0; i < this.pick.length; i++) this.pick[i] = px[i * 4];

    this.controls = new OrbitControls(this.camera, this.canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, minDistance: 1.32, maxDistance: 9, zoomSpeed: 0.7, rotateSpeed: 0.55 });
    this.controls.enabled = false;
    this.controls.addEventListener('start', () => { this.interacted = true; this.flight = null; });
    this.canvas.style.touchAction = 'pan-y';
    this.bindPointer();
    this.bindWheel();
    this.updateSun();
    setInterval(() => this.updateSun(), 60_000);
    this.last = performance.now();
    this.ready = true;
    return this;
  }

  private addStars() {
    const n = this.small ? 3500 : 6500;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos.set([140 * s * Math.cos(th), 140 * u, 140 * s * Math.sin(th)], i * 3);
      const b = Math.pow(Math.random(), 7);
      size[i] = 0.7 + b * 2.6;
      const f = 0.25 + b * 0.95, k = Math.random();
      const tint = k < 0.18 ? [0.75, 0.84, 1] : k > 0.9 ? [1, 0.86, 0.7] : [1, 0.98, 0.95];
      col.set([tint[0] * f, tint[1] * f, tint[2] * f], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    g.setAttribute('aColor', new BufferAttribute(col, 3));
    const stars = new Points(g, new ShaderMaterial({ uniforms: { uPx: { value: this.renderer.getPixelRatio() } }, vertexShader: S.starsVert, fragmentShader: S.starsFrag, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    stars.renderOrder = -1;
    this.scene.add(stars);
  }

  private addSun() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,250,1)');
    grad.addColorStop(0.07, 'rgba(255,246,220,0.95)');
    grad.addColorStop(0.2, 'rgba(255,210,150,0.28)');
    grad.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    this.sun = new Sprite(new SpriteMaterial({ map: t, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    this.sun.scale.set(16, 16, 1);
    this.scene.add(this.sun);
  }

  private updateSun() {
    const s = subsolarPoint(new Date());
    this.sunLive = latLonToVec3(s.lat, s.lon, 1).normalize();
    this.sun.position.copy(this.sunLive).multiplyScalar(120);
  }

  setCountries(list: CountryState[]) {
    this.status.fill(0);
    this.order.fill(0);
    for (const c of list) { this.status[c.i] = c.status; this.order[c.i] = c.order; }
    for (let i = 0; i < 256; i++) {
      this.lutData[i * 4] = this.status[i];
      this.lutData[i * 4 + 1] = Math.round(this.order[i] * 255);
      this.lutData[i * 4 + 3] = 255;
    }
    this.lut.needsUpdate = true;
    this.buildOutlines();
    this.buildMarkers(list);
  }

  private lineGeometry(m: { coordinates: number[][][] }, radius: number) {
    const pos: number[] = [];
    for (const line of m.coordinates) {
      for (let k = 0; k < line.length - 1; k++) {
        const a = line[k] as [number, number], b = line[k + 1] as [number, number];
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.8));
        const interp = steps > 1 ? geoInterpolate(a, b) : null;
        let prev = a;
        for (let s = 1; s <= steps; s++) {
          const cur = interp ? interp(s / steps) : b;
          const p = latLonToVec3(prev[1], prev[0], radius), q = latLonToVec3(cur[1], cur[0], radius);
          pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
          prev = cur;
        }
      }
    }
    const g = new LineSegmentsGeometry();
    g.setPositions(pos);
    return g;
  }

  private get countries() {
    return this.topo.objects[Object.keys(this.topo.objects)[0]] as GeometryCollection;
  }

  private buildOutlines() {
    const visited = (g: { id?: string | number }) => { const s = this.status[+(g.id ?? 0)]; return s > 0 && s < 4; };
    if (this.outline) { this.scene.remove(this.outline); this.outline.geometry.dispose(); }
    const m = topoMesh(this.topo, this.countries, (a, b) => visited(a) || visited(b));
    this.outlineMat = new LineMaterial({ color: 0xf2c46d, linewidth: this.small ? 1 : 1.1, transparent: true, opacity: 0, depthWrite: false });
    this.outline = new LineSegments2(this.lineGeometry(m as any, 1.0016), this.outlineMat);
    this.outline.renderOrder = 4;
    this.scene.add(this.outline);
    this.hoverMat = new LineMaterial({ color: 0xfff0cf, linewidth: 2, transparent: true, opacity: 0.95, depthWrite: false });
    this.resizeLines();
  }

  private hoverOutline(id: number) {
    if (this.hoverLine) { this.scene.remove(this.hoverLine); this.hoverLine.geometry.dispose(); this.hoverLine = null; }
    if (!id || !this.hoverMat) return;
    const sub = { type: 'GeometryCollection', geometries: this.countries.geometries.filter((g) => +(g.id ?? 0) === id) } as GeometryCollection;
    const m = topoMesh(this.topo, sub) as any;
    if (!m.coordinates.length) return;
    this.hoverLine = new LineSegments2(this.lineGeometry(m, 1.0022), this.hoverMat);
    this.hoverLine.renderOrder = 5;
    this.hoverLine.visible = this.mode === 'explore';
    this.scene.add(this.hoverLine);
  }

  private buildMarkers(list: CountryState[]) {
    if (this.dots) { this.scene.remove(this.dots); this.dots.geometry.dispose(); }
    // Countries too small to see get a glowing pin
    this.markers = list.filter((c) => c.small && c.status > 0 && c.status < 4);
    const n = this.markers.length;
    const pos = new Float32Array(n * 3), ord = new Float32Array(n), idx = new Float32Array(n);
    this.markers.forEach((c, k) => {
      const v = latLonToVec3(c.ly, c.lx, 1.004);
      pos.set([v.x, v.y, v.z], k * 3);
      ord[k] = c.order;
      idx[k] = c.i;
      c.vec = v;
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aOrder', new BufferAttribute(ord, 1));
    g.setAttribute('aIdx', new BufferAttribute(idx, 1));
    this.dots = new Points(g, new ShaderMaterial({
      uniforms: { uPx: { value: this.renderer.getPixelRatio() }, uProgress: this.uniforms.uProgress, uHover: this.uniforms.uHover },
      vertexShader: S.markersVert, fragmentShader: S.markersFrag, transparent: true, depthWrite: false,
    }));
    this.dots.renderOrder = 6;
    this.scene.add(this.dots);
  }

  /** Move the single canvas between the hero stage and the explorer stage. */
  mount(el: HTMLElement, mode: Mode) {
    if (this.canvas.parentElement !== el) el.appendChild(this.canvas);
    this.stageEl = el;
    this.mode = mode;
    if (this.hoverLine) this.hoverLine.visible = mode === 'explore';
    this.controls.enabled = mode === 'explore';
    this.resize();
    if (mode === 'explore') {
      this.controls.maxDistance = this.fitDistance() + 0.01;
      if (!this.placedExplore) {
        this.placedExplore = true;
        this.camera.position.copy(this.camera.position.clone().normalize().multiplyScalar(this.fitDistance()));
      }
    }
  }

  private fitDistance() {
    const w = this.stageEl!.clientWidth, h = this.stageEl!.clientHeight;
    const v = (this.camera.fov * D2R) / 2;
    const hz = Math.atan(Math.tan(v) * (w / h));
    return 1.06 / Math.sin(Math.min(v, hz) * 0.86);
  }

  resize() {
    if (!this.stageEl) return;
    const w = this.stageEl.clientWidth, h = this.stageEl.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.mode === 'hero') {
      const narrow = w < 820;
      // Push the planet right of the copy on desktop, below it on phones
      this.camera.setViewOffset(w, h, narrow ? 0 : -w * 0.25, narrow ? -h * 0.56 : 0, w, h);
      if (narrow) {
        const v = (this.camera.fov * D2R) / 2;
        const hz = Math.atan(Math.tan(v) * (w / h));
        this.heroDist = 1 / Math.sin(Math.min(v, hz) * 1.75);
      } else this.heroDist = 3.75;
    } else if (w > 1100) this.camera.setViewOffset(w, h, -w * 0.08, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    if (this.mode === 'explore') this.controls.maxDistance = this.fitDistance() + 0.01;
    this.resizeLines();
  }

  private resizeLines() {
    const v = new Vector2();
    this.renderer.getDrawingBufferSize(v);
    this.outlineMat?.resolution.copy(v);
    this.hoverMat?.resolution.copy(v);
  }

  private idAt(lat: number, lon: number) {
    const x = Math.min(this.pickW - 1, Math.max(0, Math.floor(((lon + 180) / 360) * this.pickW)));
    const y = Math.min(this.pickH - 1, Math.max(0, Math.floor(((90 - lat) / 180) * this.pickH)));
    return this.pick[y * this.pickW + x];
  }

  private pickAt(cx: number, cy: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = cx - rect.left, y = cy - rect.top;
    const facing = this.camera.position.clone().normalize();
    let best = 0, bestD = 196; // 14px radius for small-country pins
    for (const m of this.markers) {
      if (!m.vec || m.vec.clone().normalize().dot(facing) < 0.25) continue;
      const p = m.vec.clone().project(this.camera);
      const sx = ((p.x + 1) / 2) * rect.width, sy = ((1 - p.y) / 2) * rect.height;
      const d = (sx - x) ** 2 + (sy - y) ** 2;
      if (d < bestD) { bestD = d; best = m.i; }
    }
    if (best) return best;
    this.ray.setFromCamera(new Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1), this.camera);
    const hit = this.ray.ray.intersectSphere(new Sphere(new Vector3(), 1), new Vector3());
    if (!hit) return 0;
    const ll = vec3ToLatLon(hit);
    return this.idAt(ll.lat, ll.lon);
  }

  private overGlobe(cx: number, cy: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1), this.camera);
    return !!this.ray.ray.intersectSphere(new Sphere(new Vector3(), 1.02), new Vector3());
  }

  /**
   * Wheel over the planet zooms it; anywhere else (or at a zoom limit) the page scrolls.
   * Zoom events are flagged so Lenis ignores them; page-scroll events keep flowing to Lenis.
   */
  private bindWheel() {
    this.canvas.addEventListener('wheel', (e) => {
      if (this.mode !== 'explore' || !this.controls.enabled) return;
      const dist = this.camera.position.length();
      const out = e.deltaY > 0;
      const atLimit = (out && dist >= this.controls.maxDistance - 0.02) || (!out && dist <= this.controls.minDistance + 0.02);
      if (!this.overGlobe(e.clientX, e.clientY) || atLimit) {
        this.controls.enableZoom = false;
        setTimeout(() => (this.controls.enableZoom = true), 0);
      } else {
        (e as WheelEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
        this.interacted = true;
        this.flight = null;
      }
    }, { capture: true, passive: true });
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.mode !== 'explore') return;
      const t = e.touches[0];
      if (t && this.overGlobe(t.clientX, t.clientY)) e.preventDefault();
    }, { passive: false });
  }

  setHover(id: number) {
    if (id === this.hover) return;
    this.hover = id;
    this.uniforms.uHover.value = id;
    this.hoverOutline(id || this.sel);
  }

  select(id: number) {
    this.sel = id;
    this.uniforms.uSel.value = id;
    this.hoverOutline(id);
  }

  private bindPointer() {
    let down: { x: number; y: number; t: number } | null = null;
    const c = this.canvas;
    c.addEventListener('pointermove', (e) => {
      if (this.mode !== 'explore' || (e.pointerType === 'touch' && down)) return;
      const id = this.pickAt(e.clientX, e.clientY);
      this.setHover(id);
      this.onHover(id, e);
    });
    c.addEventListener('pointerleave', () => { if (this.mode === 'explore') { this.setHover(0); this.onHover(0); } });
    c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    c.addEventListener('pointerup', (e) => {
      if (!down || this.mode !== 'explore') { down = null; return; }
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 600) {
        const id = this.pickAt(e.clientX, e.clientY);
        this.select(id);
        this.onSelect(id);
      }
      down = null;
    });
  }

  /** Camera flight: slerp around the planet with a gentle altitude arc. */
  flyTo(lat: number, lon: number, dist?: number) {
    const from = this.camera.position.clone();
    const toLen = Math.min(dist || Math.max(2.1, Math.min(from.length(), 3.2)), this.controls.maxDistance);
    this.flight = { from, fromLen: from.length(), to: latLonToVec3(lat, lon, 1), toLen, t: 0, dur: this.reduced ? 0.01 : 1.6 };
    this.interacted = true;
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v && !this.raf) { this.last = performance.now(); this.loop(); }
  }

  private loop() {
    if (!this.visible || document.hidden) { this.raf = null; return; }
    this.raf = requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.frame(dt);
  }

  /** External drive (the hero counter owns the clock while it runs). */
  setProgress(p: number) {
    if (this.reduced) return;
    this.revealing = false;
    this.progress = Math.min(1.2, Math.max(0, p));
    this.uniforms.uProgress.value = this.progress;
  }

  reveal(dur = 5.2) {
    if (this.reduced) { this.progress = 1.2; this.uniforms.uProgress.value = 1.2; return; }
    this.revealFrom = this.progress >= 1 ? 0 : this.progress;
    if (this.progress >= 0.999 && dur < 1) this.revealFrom = this.progress; // just settle the flash
    this.revealDur = dur;
    this.revealStart = performance.now();
    this.revealing = true;
  }

  private frame(dt: number) {
    const u = this.uniforms;
    if (this.revealing && this.progress < 1.2) {
      const t = Math.min(1, (performance.now() - this.revealStart) / 1000 / this.revealDur);
      this.progress = this.revealFrom + (1.2 - this.revealFrom) * t;
      u.uProgress.value = this.progress;
      if (t >= 1) this.revealing = false;
    }
    if (this.outlineMat) this.outlineMat.opacity = MathUtils.clamp((u.uProgress.value - 0.75) * 3, 0, 0.5);
    u.uCloudShift.value = (u.uCloudShift.value + dt * 6e-4) % 1;

    const dist = this.camera.position.length();
    const target = this.cloudsOn ? MathUtils.clamp((dist - 1.25) / 1.4, 0.18, 1) : 0;
    u.uCloudAmt.value += (target - u.uCloudAmt.value) * Math.min(1, dt * 4);
    this.cloudUniforms.uOpacity.value = 0.92 * u.uCloudAmt.value;
    this.clouds.visible = u.uCloudAmt.value > 0.01;

    if (this.live) u.uSun.value.copy(this.sunLive);
    else {
      // Studio lighting: sun just over the viewer's shoulder
      const view = this.camera.position.clone().normalize();
      const side = new Vector3(0, 1, 0).cross(view).normalize();
      u.uSun.value.copy(view).addScaledVector(side, -0.45).add(new Vector3(0, 0.35, 0)).normalize();
    }
    this.sun.visible = this.live;

    if (this.mode === 'hero') {
      const p = this.camera.position;
      const len = p.length();
      if (this.spin) p.applyAxisAngle(new Vector3(0, 1, 0), dt * 0.035);
      p.setLength(len + (this.heroDist - len) * Math.min(1, dt * 3));
      this.camera.lookAt(0, 0, 0);
    } else {
      if (this.flight) {
        const f = this.flight;
        f.t = Math.min(1, f.t + dt / f.dur);
        const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
        const a = f.from.clone().normalize();
        const q = new Quaternion().setFromUnitVectors(a, f.to.clone().normalize());
        const qs = new Quaternion().slerp(q, e);
        const len = f.fromLen + (f.toLen - f.fromLen) * e + Math.sin(e * Math.PI) * 0.35;
        this.camera.position.copy(a.applyQuaternion(qs).multiplyScalar(len));
        if (f.t >= 1) this.flight = null;
      } else if (this.spin && !this.interacted) {
        this.camera.position.applyAxisAngle(new Vector3(0, 1, 0), dt * 0.06);
      }
      this.controls.rotateSpeed = 0.18 + 0.3 * MathUtils.clamp((this.camera.position.length() - 1.3) / 3, 0, 1);
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }
}
