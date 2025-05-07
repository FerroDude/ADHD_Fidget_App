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

  useEffect(() => {
    if (poppedBubbles.size === totalBubbles) {
      const timer = setTimeout(() => setPoppedBubbles(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [poppedBubbles, totalBubbles]);

  // Helper to get pointer/touch coordinates
  const getCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const popBubble = (index) => {
    setPoppedBubbles((prev) => new Set([...prev, index]));
  };

  // DRAG LOGIC
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
    // Prevent scrolling on touch devices
    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoords(e);
    const containerRect = containerRef.current.getBoundingClientRect();

    const relX = x - containerRect.left;
    const relY = y - containerRect.top;

    bubblesRef.current.forEach((bubbleEl, index) => {
      if (!bubbleEl || poppedBubbles.has(index)) return;
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
