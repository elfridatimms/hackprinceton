import type { Landmark } from "./core";

/** Reference-inspired EMA, made time-aware, with a short median window for one-frame spikes. */
export class MovementFilter {
  private samples: number[] = [];
  private value: number | null = null;
  private lastAt: number | null = null;
  constructor(
    private tau = 0.16,
    private deadband = 0.012,
    private maxGap = 450,
  ) {}
  configure(tau: number, deadband: number) {
    if (tau === this.tau && deadband === this.deadband) return;
    this.tau = tau;
    this.deadband = deadband;
    this.reset();
  }
  reset() {
    this.samples = [];
    this.value = null;
    this.lastAt = null;
  }
  update(raw: number | null, at: number): number | null {
    if (raw === null || !Number.isFinite(raw) || !Number.isFinite(at)) {
      this.reset();
      return null;
    }
    if (
      this.lastAt !== null &&
      (at - this.lastAt > this.maxGap || at <= this.lastAt)
    )
      this.reset();
    this.samples.push(raw);
    if (this.samples.length > 3) this.samples.shift();
    const sorted = [...this.samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (this.value === null || this.lastAt === null) this.value = median;
    else if (Math.abs(median - this.value) > this.deadband) {
      const dt = (at - this.lastAt) / 1000;
      const alpha = 1 - Math.exp(-dt / this.tau);
      this.value += alpha * (median - this.value);
    }
    this.lastAt = at;
    return this.value;
  }
}

const alphaFor = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

/**
 * One Euro filter (Casiez et al. 2012): strong smoothing while still,
 * little lag while moving. Time-aware, so 15 and 60 Hz inference behave alike.
 */
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private lastAt: number | null = null;
  constructor(
    public minCutoff = 1.2,
    public beta = 6,
    public dCutoff = 1,
    private maxGap = 450,
  ) {}
  reset() {
    this.x = null;
    this.dx = 0;
    this.lastAt = null;
  }
  get value() {
    return this.x;
  }
  update(raw: number, at: number) {
    if (!Number.isFinite(raw) || !Number.isFinite(at)) {
      this.reset();
      return raw;
    }
    if (
      this.x === null ||
      this.lastAt === null ||
      at <= this.lastAt ||
      at - this.lastAt > this.maxGap
    ) {
      this.x = raw;
      this.dx = 0;
      this.lastAt = at;
      return raw;
    }
    const dt = (at - this.lastAt) / 1000;
    this.lastAt = at;
    const rawDx = (raw - this.x) / dt;
    this.dx += alphaFor(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alphaFor(cutoff, dt) * (raw - this.x);
    return this.x;
  }
}

/** Per-landmark One Euro smoothing of x/y. Visibility passes through untouched. */
export class LandmarkSmoother {
  private xs: OneEuro[] = [];
  private ys: OneEuro[] = [];
  constructor(
    private minCutoff = 1.1,
    private beta = 7,
  ) {}
  reset() {
    this.xs = [];
    this.ys = [];
  }
  update(points: Landmark[], at: number): Landmark[] {
    if (!points.length) {
      this.reset();
      return points;
    }
    if (this.xs.length !== points.length) {
      this.xs = points.map(() => new OneEuro(this.minCutoff, this.beta));
      this.ys = points.map(() => new OneEuro(this.minCutoff, this.beta));
    }
    return points.map((p, i) => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        this.xs[i].reset();
        this.ys[i].reset();
        return p;
      }
      return {
        ...p,
        x: this.xs[i].update(p.x, at),
        y: this.ys[i].update(p.y, at),
      };
    });
  }
}

/**
 * A fixed reference point for a pivot joint (elbow, shoulder, wrist).
 * Small wobbles inside `radius` keep the pinned point, which drifts only very
 * slowly; a real, sustained move re-pins it smoothly. The game input is then
 * measured from a steady pivot instead of a trembling one.
 */
export class AnchorLock {
  private pinned: { x: number; y: number } | null = null;
  private outsideSince: number | null = null;
  private lastAt: number | null = null;
  constructor(
    public radius = 0.018,
    private settleMs = 180,
    private driftTau = 1.2,
    private followTau = 0.14,
    private maxGap = 600,
  ) {}
  reset() {
    this.pinned = null;
    this.outsideSince = null;
    this.lastAt = null;
  }
  get point() {
    return this.pinned;
  }
  update(p: Landmark | undefined, at: number, aspect = 1): Landmark | undefined {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return p;
    if (
      !this.pinned ||
      this.lastAt === null ||
      at <= this.lastAt ||
      at - this.lastAt > this.maxGap
    ) {
      this.pinned = { x: p.x, y: p.y };
      this.outsideSince = null;
      this.lastAt = at;
      return { ...p };
    }
    const dt = Math.min(0.15, (at - this.lastAt) / 1000);
    this.lastAt = at;
    const distance = Math.hypot((p.x - this.pinned.x) * aspect, p.y - this.pinned.y);
    // Hysteresis: once a real move is confirmed, follow until fully re-pinned.
    const confirmed =
      this.outsideSince !== null && at - this.outsideSince >= this.settleMs;
    if (distance > this.radius) {
      if (this.outsideSince === null) this.outsideSince = at;
    } else if (!confirmed || distance < this.radius * 0.1)
      // A brief wobble outside the radius never starts a re-pin.
      this.outsideSince = null;
    const following =
      this.outsideSince !== null && at - this.outsideSince >= this.settleMs;
    const tau = following ? this.followTau : this.driftTau;
    const a = 1 - Math.exp(-dt / tau);
    this.pinned.x += (p.x - this.pinned.x) * a;
    this.pinned.y += (p.y - this.pinned.y) * a;
    return { ...p, x: this.pinned.x, y: this.pinned.y };
  }
}
