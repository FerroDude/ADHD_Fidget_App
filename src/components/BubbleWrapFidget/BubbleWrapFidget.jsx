import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './bubblewrapfidget.css';

const BubbleWrapFidget = () => {
  // Explicitly set grid dimensions to 8×8
  const rows = 7;
  const cols = 7;
  const totalBubbles = rows * cols;

  const [poppedBubbles, setPoppedBubbles] = useState(new Set());

  // Reset bubbles automatically when all are popped
  useEffect(() => {
    if (poppedBubbles.size === totalBubbles) {
      const timer = setTimeout(() => {
        setPoppedBubbles(new Set());
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [poppedBubbles, totalBubbles]);

  const popBubble = (index) => {
    if (poppedBubbles.has(index)) return;
    const newPopped = new Set(poppedBubbles);
    newPopped.add(index);
    setPoppedBubbles(newPopped);
  };

  return (
    <div className="bubble-wrap-container">
      <div className="bubble-grid">
        {Array.from({ length: totalBubbles }, (_, index) => (
          <motion.div
            key={index}
            className={`bubble ${poppedBubbles.has(index) ? 'popped' : ''}`}
            // Use onPointerDown instead of onClick for immediate response
            onPointerDown={() => popBubble(index)}
            // Immediate animation on press using initial/animate instead of whileTap
            initial={{ scale: 1 }}
            animate={
              poppedBubbles.has(index)
                ? {
                    scale: 0.6,
                    opacity: 0.7,
                    transition: {
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    },
                  }
                : {
                    scale: 1,
                    opacity: 1,
                  }
            }
          />
        ))}
      </div>
    </div>
  );
};

export default BubbleWrapFidget;
