import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './bubblewrapfidget.css';

const BubbleWrapFidget = () => {
  const rows = 7;
  const cols = 7;
  const totalBubbles = rows * cols;

  const [poppedBubbles, setPoppedBubbles] = useState(new Set());
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const bubblesRef = useRef(Array(totalBubbles).fill(null));

  // Reset bubbles automatically when all are popped
  useEffect(() => {
    if (poppedBubbles.size === totalBubbles) {
      const timer = setTimeout(() => setPoppedBubbles(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [poppedBubbles, totalBubbles]);

  const popBubble = (index) => {
    setPoppedBubbles((prev) => new Set([...prev, index]));
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    handlePointerMove(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    bubblesRef.current.forEach((bubbleEl, index) => {
      if (!bubbleEl || poppedBubbles.has(index)) return;

      const bubbleRect = bubbleEl.getBoundingClientRect();
      const bubbleX = bubbleRect.left - containerRect.left;
      const bubbleY = bubbleRect.top - containerRect.top;

      // Check if pointer is within bubble bounds
      if (
        x >= bubbleX &&
        x <= bubbleX + bubbleRect.width &&
        y >= bubbleY &&
        y <= bubbleY + bubbleRect.height
      ) {
        popBubble(index);
      }
    });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      className="bubble-wrap-container"
      ref={containerRef}
      onPointerDown={handlePointerDown}
    >
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
