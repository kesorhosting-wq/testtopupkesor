import { useCallback, useRef } from 'react';

// Notification sound frequencies (simple beep sounds)
const SOUNDS = {
  newOrder: { frequency: 800, duration: 200, type: 'sine' as OscillatorType },
  completed: { frequency: 600, duration: 150, type: 'sine' as OscillatorType },
  failed: { frequency: 300, duration: 300, type: 'square' as OscillatorType },
  statusChange: { frequency: 500, duration: 100, type: 'sine' as OscillatorType },
};

export type NotificationSoundType = keyof typeof SOUNDS;

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: NotificationSoundType = 'newOrder') => {
    try {
      const audioContext = getAudioContext();
      const sound = SOUNDS[type];

      // Create oscillator for the beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);

      // Fade out for smoother sound
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration / 1000);

      // Play a second beep for new orders (double beep)
      if (type === 'newOrder') {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.type = sound.type;
          osc2.frequency.setValueAtTime(sound.frequency * 1.2, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + sound.duration / 1000);
        }, 250);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [getAudioContext]);

  const playNewOrderSound = useCallback(() => playSound('newOrder'), [playSound]);
  const playCompletedSound = useCallback(() => playSound('completed'), [playSound]);
  const playFailedSound = useCallback(() => playSound('failed'), [playSound]);
  const playStatusChangeSound = useCallback(() => playSound('statusChange'), [playSound]);

  return {
    playSound,
    playNewOrderSound,
    playCompletedSound,
    playFailedSound,
    playStatusChangeSound,
  };
};
