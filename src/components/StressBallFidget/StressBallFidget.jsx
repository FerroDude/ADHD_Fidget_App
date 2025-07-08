import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import * as THREE from 'three';
import './StressBallFidget.css';

const StressBallFidget = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [pressure, setPressure] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPressPoint, setCurrentPressPoint] = useState(null);
  
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const holdTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  
  // Three.js refs
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const ballMeshRef = useRef(null);
  const mouseLightRef = useRef(null);
  const secondaryLightRef = useRef(null);
  const originalPositionsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const activeDeformationsRef = useRef([]);
  const lastUpdateTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const canvasSize = window.innerWidth <= 480 ? 350 : window.innerWidth <= 768 ? 400 : 500;
    
    // Use orthographic camera for perfect circular appearance - bigger ball
    const size = 2.6; // Decreased to make ball appear bigger
    const camera = new THREE.OrthographicCamera(
      -size, size, // left, right - perfectly square
      size, -size, // top, bottom - perfectly square
      0.1, 1000 // near, far
    );
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    });
    
    renderer.setSize(canvasSize, canvasSize);
    renderer.setViewport(0, 0, canvasSize, canvasSize); // Ensure square viewport
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Camera position - orthographic for perfect circle
    camera.position.z = 5;
    
    // Create stress ball geometry - perfect circle
    const geometry = new THREE.SphereGeometry(2.0, 96, 48); // High detail sphere
    
    // Keep the sphere perfectly round - no flattening
    // The 2D appearance will come from the camera angle and lighting
    
    // Store original positions for deformation calculations
    originalPositionsRef.current = geometry.attributes.position.array.slice();
    
    // Create material with stress ball appearance - better contrast for dark mode
    const material = new THREE.MeshPhongMaterial({
      color: 0x6bb6ff, // Brighter, more vibrant blue
      shininess: 40,
      transparent: true,
      opacity: 0.95,
      emissive: 0x001122, // Slight blue glow for dark mode visibility
      emissiveIntensity: 0.1
    });
    
    // Create mesh
    const ballMesh = new THREE.Mesh(geometry, material);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);
    
    // Lighting setup - mouse as primary light source
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    
    // Mouse-controlled spotlight - acts as the primary light source
    const mouseLight = new THREE.SpotLight(0xffffff, 6.0, 20, Math.PI / 4, 0.5, 1);
    mouseLight.position.set(0, 0, 3);
    mouseLight.target.position.set(0, 0, 0);
    mouseLight.castShadow = true;
    mouseLight.shadow.mapSize.width = 4096;
    mouseLight.shadow.mapSize.height = 4096;
    mouseLight.shadow.camera.near = 0.1;
    mouseLight.shadow.camera.far = 20;
    mouseLight.shadow.bias = -0.0001;
    scene.add(mouseLight);
    scene.add(mouseLight.target);
    
    // Secondary point light for enhanced deformation visibility
    const secondaryLight = new THREE.PointLight(0xffffff, 2.0, 8);
    secondaryLight.position.set(0, 0, 2);
    scene.add(secondaryLight);
    
    // Subtle fill light to prevent complete darkness
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
    fillLight.position.set(-3, 3, 5);
    scene.add(fillLight);
    
    // Store refs
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    ballMeshRef.current = ballMesh;
    mouseLightRef.current = mouseLight;
    secondaryLightRef.current = secondaryLight;
    
    // Start animation loop
    const animate = () => {
      updateDeformations();
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Deformation update function - optimized for performance
  const updateDeformations = useCallback(() => {
    if (!ballMeshRef.current || !originalPositionsRef.current) return;
    
    const currentTime = performance.now();
    frameCountRef.current++;
    
    // Skip every other frame for better performance when not interacting
    if (!isPressed && frameCountRef.current % 2 === 0) return;
    
    const geometry = ballMeshRef.current.geometry;
    const positions = geometry.attributes.position.array;
    const originalPositions = originalPositionsRef.current;
    
    // Smooth interpolation back to original positions instead of hard reset
    const smoothingFactor = 0.05; // Gentle return to original shape
    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const original = originalPositions[i];
      positions[i] = current + (original - current) * smoothingFactor;
    }
    
    // Apply current press deformation (stable while pressed) - optimized
    if (currentPressPoint && isPressed) {
      const { point, intensity, radius } = currentPressPoint;
      const radiusSquared = radius * radius; // Optimize distance calculation
      
      for (let i = 0; i < positions.length; i += 3) {
        const dx = originalPositions[i] - point.x;
        const dy = originalPositions[i + 1] - point.y;
        const dz = originalPositions[i + 2] - point.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        
        if (distanceSquared < radiusSquared) {
          const distance = Math.sqrt(distanceSquared);
          
          // Create surface-level circular deformation with ultra-smooth transitions
          const influence = Math.max(0, (1 - distance / radius)) * intensity;
          // Use smoothstep function for ultra-smooth edges
          const smoothstep = influence * influence * (3.0 - 2.0 * influence);
          const falloff = Math.pow(smoothstep, 2.0); // Extra smooth falloff
          
          // Calculate direction toward ball center for inward deformation - optimized
          const vertexLength = Math.sqrt(originalPositions[i] * originalPositions[i] + 
                                       originalPositions[i + 1] * originalPositions[i + 1] + 
                                       originalPositions[i + 2] * originalPositions[i + 2]);
          const invLength = -falloff * 0.15 / vertexLength;
          
          // Apply deformation directly to positions array
          positions[i] = originalPositions[i] + originalPositions[i] * invLength;
          positions[i + 1] = originalPositions[i + 1] + originalPositions[i + 1] * invLength;
          positions[i + 2] = originalPositions[i + 2] + originalPositions[i + 2] * invLength;
        }
      }
    }
    
    // Apply fading deformations (from previous presses)
    activeDeformationsRef.current.forEach(deformation => {
      const { point, intensity, radius } = deformation;
      
      for (let i = 0; i < positions.length; i += 3) {
        const vertex = new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        );
        
        const originalVertex = new THREE.Vector3(
          originalPositions[i],
          originalPositions[i + 1],
          originalPositions[i + 2]
        );
        
        const distance = originalVertex.distanceTo(point);
        
        if (distance < radius) {
          // Create smooth, surface-level fading deformation with ultra-smooth edges
          const influence = Math.max(0, (1 - distance / radius)) * intensity;
          // Use smoothstep function for ultra-smooth edges
          const smoothstep = influence * influence * (3.0 - 2.0 * influence);
          const falloff = Math.pow(smoothstep, 2.0); // Extra smoothing
          
          // Calculate direction toward ball center for inward deformation
          const centerDirection = originalVertex.clone().normalize().multiplyScalar(-1);
          
          // Apply shallow fading deformation with ultra-smooth transitions
          const deformationVector = centerDirection.multiplyScalar(falloff * 0.15);
          vertex.add(deformationVector);
          
          positions[i] = vertex.x;
          positions[i + 1] = vertex.y;
          positions[i + 2] = vertex.z;
        }
      }
    });
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Smooth fade out with gradual intensity and radius reduction - optimized
    const fadeRate = 0.98;
    const radiusFadeRate = 0.999;
    const minIntensity = 0.005;
    
    for (let i = activeDeformationsRef.current.length - 1; i >= 0; i--) {
      const def = activeDeformationsRef.current[i];
      def.intensity *= fadeRate;
      def.radius *= radiusFadeRate;
      
      if (def.intensity <= minIntensity) {
        activeDeformationsRef.current.splice(i, 1);
             }
     }
   }, [isPressed, currentPressPoint]);

  // Update mouse light position - more accurate to mouse position with throttling
  const updateMouseLight = useCallback((event) => {
    if (!mouseLightRef.current || !canvasRef.current) return;
    
    const currentTime = performance.now();
    if (currentTime - lastUpdateTimeRef.current < 16) return; // Throttle to ~60fps
    lastUpdateTimeRef.current = currentTime;
    
    // Get canvas bounds for accurate positioning
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Convert to normalized coordinates relative to canvas
    const x = (canvasX / rect.width) * 2 - 1;
    const y = -(canvasY / rect.height) * 2 + 1;
    
    // Position spotlight to act as mouse light source - further from surface for better lighting
    const lightDistance = 4.0;
    mouseLightRef.current.position.set(x * 2.5, y * 2.5, lightDistance);
    
    // Update spotlight target to point at the mouse position on the ball surface
    if (mouseLightRef.current.target) {
      mouseLightRef.current.target.position.set(x * 2.0, y * 2.0, 0);
    }
    
    // Update secondary light to follow mouse closely for deformation highlighting
    if (secondaryLightRef.current) {
      secondaryLightRef.current.position.set(x * 1.5, y * 1.5, 1.5);
    }
  }, []);

  // Global mouse tracking for light
  useEffect(() => {
    const handleGlobalMouseMove = (event) => {
      updateMouseLight(event);
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [updateMouseLight]);

  // Convert mouse position to 3D world coordinates
  const getWorldPosition = useCallback((event) => {
    if (!canvasRef.current || !cameraRef.current || !ballMeshRef.current) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersects = raycasterRef.current.intersectObject(ballMeshRef.current);
    
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    
    return null;
  }, []);

  // Initialize audio context for haptic feedback
  useEffect(() => {
    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.log('Audio context not available');
      }
    };

    initAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio feedback function
  const playAudioFeedback = useCallback((frequency = 200, duration = 50) => {
    if (!audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.log('Audio feedback failed');
    }
  }, []);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((intensity = 0.5) => {
    if (navigator.vibrate) {
      navigator.vibrate(Math.floor(intensity * 50));
    } else {
      playAudioFeedback(150 + intensity * 100, 30);
    }
  }, [playAudioFeedback]);

  // Handle press start
  const handlePressStart = useCallback((event) => {
    event.preventDefault();
    setIsPressed(true);
    setIsDragging(false);
    setPressure(0.6);
    
    const worldPos = getWorldPosition(event);
    if (worldPos) {
      // Set current press point for stable deformation
      setCurrentPressPoint({
        point: worldPos.clone(),
        intensity: 0.8,
        radius: 0.35
      });
    }
    
    // Clear any existing hold timeout
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    
    // Set hold timeout
    holdTimeoutRef.current = setTimeout(() => {
      setIsHolding(true);
      setPressure(0.9);
      triggerHapticFeedback(0.4);
    }, 300);

    triggerHapticFeedback(0.3);
    playAudioFeedback(200, 60);
  }, [getWorldPosition, triggerHapticFeedback, playAudioFeedback]);

  // Handle press end
  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
    setIsHolding(false);
    setIsDragging(false);
    setPressure(0);
    
    // Move current press deformation to fading list
    if (currentPressPoint) {
      activeDeformationsRef.current.push({
        ...currentPressPoint,
        id: Date.now()
      });
      setCurrentPressPoint(null);
    }
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    triggerHapticFeedback(0.2);
    playAudioFeedback(150, 40);
  }, [currentPressPoint, triggerHapticFeedback, playAudioFeedback]);

  // Handle drag movement
  const handleDrag = useCallback((event) => {
    if (!isPressed) return;
    
    setIsDragging(true);
    const worldPos = getWorldPosition(event);
    
    if (worldPos) {
      // Calculate pressure based on position
      const distance = worldPos.length();
      const newPressure = Math.min(1, 0.6 + distance * 0.3);
      setPressure(newPressure);
      
      // Update current press point position for stable deformation
      setCurrentPressPoint({
        point: worldPos.clone(),
        intensity: 0.8 + newPressure * 0.2,
        radius: 0.35
      });
      
      // Add groove trail points for smooth dragging effect
      activeDeformationsRef.current.push({
        point: worldPos.clone(),
        intensity: 0.6 + newPressure * 0.1,
        radius: 0.25,
        id: Date.now() + Math.random()
      });
      
      // Limit trail points for performance - allow more simultaneous deformations
      if (activeDeformationsRef.current.length > 30) {
        activeDeformationsRef.current = activeDeformationsRef.current.slice(-25);
      }
      
      // Trigger haptic feedback
      if (newPressure > 0.7) {
        triggerHapticFeedback(0.15);
      }
    }
  }, [isPressed, getWorldPosition, triggerHapticFeedback]);

  // Event handlers
  const handleMouseDown = useCallback((event) => {
    handlePressStart(event);
  }, [handlePressStart]);

  const handleMouseUp = useCallback(() => {
    handlePressEnd();
  }, [handlePressEnd]);

  const handleMouseMove = useCallback((event) => {
    // Always update light position, regardless of press state
    updateMouseLight(event);
    
    if (isPressed) {
      handleDrag(event);
    }
  }, [isPressed, handleDrag, updateMouseLight]);

  const handleTouchStart = useCallback((event) => {
    event.preventDefault();
    handlePressStart(event.touches[0]);
  }, [handlePressStart]);

  const handleTouchEnd = useCallback((event) => {
    event.preventDefault();
    handlePressEnd();
  }, [handlePressEnd]);

  const handleTouchMove = useCallback((event) => {
    event.preventDefault();
    if (event.touches[0]) {
      // Always update light position for touch
      updateMouseLight(event.touches[0]);
      
      if (isPressed) {
        handleDrag(event.touches[0]);
      }
    }
  }, [isPressed, handleDrag, updateMouseLight]);

  // Spring animation for container effects
  const containerSpring = useSpring({
    transform: isPressed ? 'scale(0.98)' : 'scale(1)',
    config: config.gentle,
  });

  // Pressure rings animation
  const ringsSpring = useSpring({
    opacity: isPressed && pressure > 0.3 ? 0.6 : 0,
    transform: `scale(${1 + pressure * 1.5})`,
    config: config.wobbly,
  });

  return (
    <div className="stress-ball-container" ref={containerRef}>
      {/* Pressure rings */}
      <animated.div 
        className="pressure-rings"
        style={ringsSpring}
      >
        <div className="pressure-ring ring-1" />
        <div className="pressure-ring ring-2" />
        <div className="pressure-ring ring-3" />
      </animated.div>

      {/* Three.js Canvas */}
      <animated.div
        className="threejs-container"
        style={containerSpring}
      >
        <canvas
          ref={canvasRef}
          className={`stress-ball-canvas ${isPressed ? 'pressed' : ''} ${isHolding ? 'holding' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onKeyDown={(e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
              e.preventDefault();
              handlePressStart(e);
            }
          }}
          onKeyUp={(e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
              handlePressEnd();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="3D Stress ball fidget"
          aria-pressed={isPressed}
        />
      </animated.div>

      {/* Pressure indicator */}
      <div className="pressure-indicator">
        <div className="pressure-bar">
          <div 
            className="pressure-fill" 
            style={{ width: `${pressure * 100}%` }}
          />
        </div>
        <div className="pressure-text">
          Pressure: {Math.round(pressure * 100)}%
        </div>
      </div>
    </div>
  );
};

export default StressBallFidget; 