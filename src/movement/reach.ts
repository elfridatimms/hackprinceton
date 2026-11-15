/** Confirmation of genuinely new observations, without falling back to another arm.
 * A large landmark jump pauses output until three nearby observations agree. */
export class ReachStability {
  private accepted: number | null = null;
  private lastAt: number | null = null;
  private pending: { value: number; at: number }[] = [];
  reset() {
    this.accepted = null;
    this.lastAt = null;
    this.pending = [];
  }
  update(value: number | null, at: number): number | null {
    if (value === null || !Number.isFinite(value) || !Number.isFinite(at)) {
      this.reset();
      return null;
    }
    if (this.lastAt !== null && at <= this.lastAt) return null;
    if (this.lastAt !== null && at - this.lastAt > 450) this.reset();
    this.lastAt = at;
    if (this.accepted !== null && Math.abs(value - this.accepted) < 0.18) {
      this.accepted = value;
      this.pending = [];
      return value;
    }
    if (this.pending.some((s) => Math.abs(s.value - value) > 0.08))
      this.pending = [];
    this.pending.push({ value, at });
    if (this.pending.length < 3 || at - this.pending[0].at < 120) return null;
    this.accepted = this.pending.map((s) => s.value).sort((a, b) => a - b)[
      Math.floor(this.pending.length / 2)
    ];
    this.pending = [];
    return this.accepted;
  }
}
