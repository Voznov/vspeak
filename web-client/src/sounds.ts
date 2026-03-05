let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  ctx ??= new AudioContext();

  return ctx;
}

function bell(ac: AudioContext, freq: number, start: number, decay: number, vol = 0.2) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g);
  g.connect(ac.destination);
  o.type = 'sine';
  o.frequency.value = freq;
  const t = ac.currentTime;
  g.gain.setValueAtTime(0, t + start);
  g.gain.linearRampToValueAtTime(vol, t + start + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, t + start + decay);
  o.start(t + start);
  o.stop(t + start + decay + 0.05);
}

function seq(ac: AudioContext, freqs: number[], starts: number[], decay: number) {
  freqs.forEach((f, i) => bell(ac, f, starts[i], decay - i * 0.02));
}

function seqWarm(ac: AudioContext, freqs: number[], starts: number[], decay: number) {
  freqs.forEach((f, i) => {
    bell(ac, f, starts[i], decay - i * 0.02, 0.17);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = 'triangle';
    o.frequency.value = f * 2;
    const t = ac.currentTime;
    g.gain.setValueAtTime(0, t + starts[i]);
    g.gain.linearRampToValueAtTime(0.05, t + starts[i] + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + starts[i] + (decay - i * 0.02) * 0.5);
    o.start(t + starts[i]);
    o.stop(t + starts[i] + decay + 0.05);
  });
}

function fm(ac: AudioContext, freq: number, delay: number) {
  const t = ac.currentTime + delay;
  const decay = 0.4;
  const mod = ac.createOscillator();
  const modGain = ac.createGain();
  const carrier = ac.createOscillator();
  const g = ac.createGain();
  mod.frequency.value = freq * 2.8;
  modGain.gain.setValueAtTime(freq * 1.2, t);
  modGain.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.4);
  mod.connect(modGain);
  modGain.connect(carrier.frequency);
  carrier.type = 'sine';
  carrier.frequency.value = freq;
  carrier.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  mod.start(t);
  mod.stop(t + decay + 0.05);
  carrier.start(t);
  carrier.stop(t + decay + 0.05);
}

export const sounds = {
  joinChannel() {
    const ac = getCtx();
    seqWarm(ac, [659, 784, 1047], [0, 0.09, 0.18], 0.22);
  },
  leaveChannel() {
    const ac = getCtx();
    seqWarm(ac, [523, 392], [0, 0.14], 0.3);
  },

  unmute() {
    const ac = getCtx();
    seq(ac, [698, 932], [0, 0.07], 0.18);
  },
  mute() {
    const ac = getCtx();
    seq(ac, [466, 349], [0, 0.1], 0.22);
  },

  undeafen() {
    const ac = getCtx();
    fm(ac, 523, 0);
    fm(ac, 784, 0.14);
  },
  deafen() {
    const ac = getCtx();
    fm(ac, 330, 0);
    fm(ac, 247, 0.18);
  },

  cameraOn() {
    const ac = getCtx();
    seq(ac, [784, 1047], [0, 0.07], 0.16);
  },
  cameraOff() {
    const ac = getCtx();
    seq(ac, [523, 392], [0, 0.08], 0.18);
  },

  screenShareOn() {
    const ac = getCtx();
    seq(ac, [659, 784, 1047], [0, 0.08, 0.16], 0.2);
  },
  screenShareOff() {
    const ac = getCtx();
    seq(ac, [523, 392], [0, 0.1], 0.22);
  },
};
