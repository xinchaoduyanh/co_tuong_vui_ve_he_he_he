// Âm thanh hiệu ứng tổng hợp bằng WebAudio (không cần file). Có thể thay bằng asset thật sau.
export type SoundKind = "move" | "capture" | "check" | "win" | "lose";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, endFreq?: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(c: AudioContext, start: number, dur: number, gain: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start(start);
}

export function playSound(kind: SoundKind, enabled = true) {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  switch (kind) {
    case "move": // tiếng gõ quân lên bàn gỗ
      tone(c, 320, t, 0.08, "triangle", 0.25, 140);
      break;
    case "capture": // gõ mạnh + tiếng vỡ
      tone(c, 220, t, 0.14, "triangle", 0.4, 70);
      noise(c, t, 0.18, 0.3);
      break;
    case "check": // hai nốt cảnh báo
      tone(c, 660, t, 0.14, "square", 0.12);
      tone(c, 880, t + 0.16, 0.2, "square", 0.12);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.13, 0.3, "triangle", 0.22));
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(c, f, t + i * 0.2, 0.35, "sine", 0.22));
      break;
  }
}
