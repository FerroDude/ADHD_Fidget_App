import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  SoundOnIcon,
  SoundOffIcon,
  VibrationOnIcon,
  VibrationOffIcon,
} from '../Icons/Icons';
import './bubblewrapfidget.css';

const BubbleWrapFidget = () => {
  const rows = 7;
  const cols = 7;
  const totalBubbles = rows * cols;

  const [poppedBubbles, setPoppedBubbles] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Pre-initialize audio context and haptic feedback for iOS
  const audioContextRef = useRef(null);
  const isIOSRef = useRef(/iPad|iPhone|iPod/.test(navigator.userAgent));

  // Refs
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const bubblesRef = useRef(Array(totalBubbles).fill(null));
  const popSoundRef = useRef(null);
  // Add a ref to track popped bubbles immediately (not waiting for state update)
  const poppedBubblesRef = useRef(new Set());

  // Initialize audio on first user interaction
  const initAudio = () => {
    if (!popSoundRef.current || !audioInitialized) {
      popSoundRef.current = new Audio('/pop.mp3');
      popSoundRef.current.preload = 'auto';
      popSoundRef.current.volume = 0.25;
      
      // Initialize audio context for haptic feedback (iOS)
      if (isIOSRef.current && typeof window !== 'undefined' && window.AudioContext) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(console.error);
          }
        } catch (error) {
          console.error('AudioContext initialization failed:', error);
        }
      }
      
      if (isIOSRef.current) {
        // For iOS, we need to play a silent audio first to unlock the audio context
        popSoundRef.current.muted = true;
        popSoundRef.current.play().then(() => {
          popSoundRef.current.muted = false;
          popSoundRef.current.currentTime = 0;
          setAudioInitialized(true);
        }).catch(console.error);
      } else {
        popSoundRef.current.load();
        setAudioInitialized(true);
      }
    }
  };

  // Auto reset bubbles when all popped
  useEffect(() => {
    if (poppedBubbles.size === totalBubbles) {
      const timer = setTimeout(() => {
        resetBubbles();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [poppedBubbles, totalBubbles]);

  // Manual reset function
  const resetBubbles = () => {
    poppedBubblesRef.current = new Set();
    setPoppedBubbles(new Set());
  };

  const popBubble = (index) => {
    // Check if already popped using the ref
    if (poppedBubblesRef.current.has(index)) return;

    // Update ref immediately (synchronous)
    poppedBubblesRef.current.add(index);

    // Update state (asynchronous)
    setPoppedBubbles(new Set(poppedBubblesRef.current));

    // Handle audio and vibration asynchronously to avoid blocking UI
    if (soundEnabled || vibrationEnabled) {
      // Use setTimeout to defer audio/vibration to next tick
      setTimeout(() => {
        // Handle sound
        if (soundEnabled && popSoundRef.current && audioInitialized) {
          popSoundRef.current.currentTime = 0;
          popSoundRef.current.play().catch(console.error);
        }

        // Handle vibration
        if (vibrationEnabled) {
          if (isIOSRef.current && audioContextRef.current) {
            // Optimized iOS haptic feedback - reuse existing audio context
            try {
              const oscillator = audioContextRef.current.createOscillator();
              const gainNode = audioContextRef.current.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContextRef.current.destination);
              
              oscillator.frequency.value = 200;
              gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.05, audioContextRef.current.currentTime + 0.01);
              gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.03);
              
              oscillator.start(audioContextRef.current.currentTime);
              oscillator.stop(audioContextRef.current.currentTime + 0.03);
            } catch (error) {
              // Silently fail for haptic feedback
            }
          } else if ('vibrate' in navigator) {
            // Android and other devices
            navigator.vibrate(40);
          }
        }
      }, 0);
    }
  };

  const getCoords = (e) => {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleStart = (e) => {
    isDragging.current = true;
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    handleMove(e);
  };

  const handleMove = (e) => {
    if (!isDragging.current) return;
    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoords(e);
    const containerRect = containerRef.current.getBoundingClientRect();

    const relX = x - containerRect.left;
    const relY = y - containerRect.top;

    bubblesRef.current.forEach((bubbleEl, index) => {
      if (!bubbleEl) return;
      // Check using the ref for immediate feedback
      if (poppedBubblesRef.current.has(index)) return;

      const bubbleRect = bubbleEl.getBoundingClientRect();
      const bubbleX = bubbleRect.left - containerRect.left;
      const bubbleY = bubbleRect.top - containerRect.top;

      if (
        relX >= bubbleX &&
        relX <= bubbleX + bubbleRect.width &&
        relY >= bubbleY &&
        relY <= bubbleY + bubbleRect.height
      ) {
        popBubble(index);
      }
    });
  };

  const handleEnd = () => {
    isDragging.current = false;
    document.removeEventListener('pointermove', handleMove);
    document.removeEventListener('pointerup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  };

  return (
    <div
      className="bubble-wrap-container"
      ref={containerRef}
      onPointerDown={handleStart}
      onTouchStart={handleStart}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div className="fidget-toggles">
        <button
          className={`toggle-btn${soundEnabled ? ' active' : ''}`}
          aria-label={soundEnabled ? 'Disable pop sound' : 'Enable pop sound'}
          onClick={() => {
            if (!audioInitialized) {
              initAudio(); // Initialize audio on first click
            }
            setSoundEnabled((v) => !v);
          }}
          type="button"
        >
          {soundEnabled ? (
            <SoundOnIcon size={18} />
          ) : (
            <SoundOffIcon size={18} />
          )}
        </button>
        <button
          className={`toggle-btn${vibrationEnabled ? ' active' : ''}`}
          aria-label={
            vibrationEnabled ? 'Disable vibration' : 'Enable vibration'
          }
          onClick={() => setVibrationEnabled((v) => !v)}
          type="button"
        >
          {vibrationEnabled ? (
            <VibrationOnIcon size={18} />
          ) : (
            <VibrationOffIcon size={18} />
          )}
        </button>
      </div>

      <div className="bubble-grid">
        {Array.from({ length: totalBubbles }, (_, index) => (
          <motion.div
            key={index}
            ref={(el) => (bubblesRef.current[index] = el)}
            className={`bubble ${poppedBubbles.has(index) ? 'popped' : ''}`}
            initial={{ scale: 1 }}
            animate={
              poppedBubbles.has(index)
                ? {
                    scale: 0.6,
                    opacity: 0.7,
                    transition: { type: 'spring', stiffness: 500, damping: 30 },
                  }
                : { scale: 1, opacity: 1 }
            }
          />
        ))}
      </div>

      <button
        className="reset-button"
        onClick={resetBubbles}
        aria-label="Reset all bubbles"
        type="button"
      >
        Reset Bubbles
      </button>
    </div>
  );
};

export default BubbleWrapFidget;
