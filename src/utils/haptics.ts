/**
 * Utility for triggering responsive physical and auditory haptic feedback.
 * Works on mobile using standard device vibration and desktop/general browsers
 * using custom synthesized audio context wave triggers.
 */
export function triggerHaptic(type: 'adjust' | 'warning' | 'success') {
  // 1. Mobile Physical Vibration (uses navigator.vibrate if available)
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'adjust') {
        navigator.vibrate(30); // Quick short pulse
      } else if (type === 'warning') {
        navigator.vibrate([100, 50, 100]); // Two heavy pulses with gap
      } else if (type === 'success') {
        navigator.vibrate([50, 30, 50]); // Up-beat success pulse
      }
    } catch (e) {
      // Ignore vibration errors when blocked inside sandboxed frames
    }
  }

  // 2. Synthesized Sound Feedback using Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      
      // Auto-unlock AudioContext if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'adjust') {
        // High-pitched clicky sine sound for simple tick up/down
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'warning') {
        // Deeper sawtooth buzzer warning sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        
        // Let's sweep the pitch down a bit for a sliding buzzer sound
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'success') {
        // Quick upward double-beep chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    }
  } catch (e) {
    // Audio context might be blocked or unsupported; swallow silently
    console.warn('Audio check support: blocked or unavailable');
  }
}
