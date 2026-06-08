// Speaks "Welcome to the MS World" using the browser's speech synthesis,
// layered over a short synth chord for a futuristic vibe.
export function playWelcome(name?: string) {
  if (typeof window === "undefined") return;

  // Synth chord
  try {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      const now = ctx.currentTime;
      const notes = [261.63, 392.0, 523.25, 659.25];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.12, now + 0.05 + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        o.connect(g).connect(ctx.destination);
        o.start(now + i * 0.08);
        o.stop(now + 1.7);
      });
    }
  } catch {
    /* ignore */
  }

  // Voice
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const text = name
      ? `Welcome to the M S World, ${name}`
      : "Welcome to the M S World";
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.05;
    utter.volume = 1;
    // Pick a slightly futuristic voice if available
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /Google.*English/i.test(v.name)) ||
      voices.find((v) => /Samantha|Victoria|Daniel|Alex/i.test(v.name)) ||
      voices[0];
    if (preferred) utter.voice = preferred;
    setTimeout(() => synth.speak(utter), 350);
  } catch {
    /* ignore */
  }
}
