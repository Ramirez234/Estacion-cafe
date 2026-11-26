// Timbre "ding-dong" generado con Web Audio (sin archivos de sonido).
let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export function ring() {
  unlockAudio();
  const ac = ctx!;
  const now = ac.currentTime;
  [
    [988, 0],
    [784, 0.32],
    [988, 0.9],
    [784, 1.22],
  ].forEach(([freq, at]) => {
    for (const [mult, vol] of [[1, 0.35], [2.01, 0.08], [3, 0.04]]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(vol, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.1);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + at);
      osc.stop(now + at + 1.2);
    }
  });
}
