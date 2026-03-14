export let lastPlayTime = 0;

export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  if (now - lastPlayTime < 2000) return; // Prevent double chiming within 2 seconds
  lastPlayTime = now;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Mix of sine (fundamental) and triangle (overtone) for a richer bell/marimba sound
      osc1.type = "sine";
      osc2.type = "triangle";
      
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2.01, startTime); // Subtle overtone
      
      // Envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02); // Very fast attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Smooth, long decay
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    const ctxNow = ctx.currentTime;
    // A modern, pleasant rising two-note chime
    playTone(659.25, ctxNow, 0.6); // E5
    playTone(830.61, ctxNow + 0.12, 0.9); // G#5

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
