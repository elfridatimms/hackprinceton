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
