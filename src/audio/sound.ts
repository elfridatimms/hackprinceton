class ForestAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  ambience: OscillatorNode[] = [];
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.3;
      this.master.connect(this.ctx.destination);
      [130.81, 196, 261.63].forEach((f, i) => {
        const o = this.ctx!.createOscillator(),
          g = this.ctx!.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.value = 0.012;
        o.connect(g);
        g.connect(this.master!);
        o.start();
        this.ambience.push(o);
        const l = this.ctx!.createOscillator(),
          lg = this.ctx!.createGain();
        l.frequency.value = 0.09 + i * 0.03;
        lg.gain.value = 0.007;
        l.connect(lg);
        lg.connect(g.gain);
        l.start();
      });
    }
    void this.ctx.resume();
  }
  mute(value: boolean) {
    this.muted = value;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.3,
        this.ctx.currentTime,
        0.1,
      );
  }
  chime(note = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].slice(note % 2).forEach((f, i) => {
      const o = this.ctx!.createOscillator(),
        g = this.ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f * [1, 1.125, 1.25, 1.5][note % 4];
      g.gain.setValueAtTime(0, t + i * 0.065);
      g.gain.linearRampToValueAtTime(0.17, t + i * 0.065 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.065 + 1.3);
      o.connect(g);
      g.connect(this.master!);
      o.start(t + i * 0.065);
      o.stop(t + i * 0.065 + 1.4);
    });
  }
  finish() {
    [0, 1, 2, 3].forEach((n) => setTimeout(() => this.chime(n), n * 280));
  }
}
export const audio = new ForestAudio();
