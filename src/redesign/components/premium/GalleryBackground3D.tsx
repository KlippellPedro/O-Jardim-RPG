import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
  color?: string;
  count?: number;
  size?: number;
  speed?: number;
}

const ParticleField: React.FC<ParticleFieldProps> = ({ 
  color = '#ffffff', 
  count = 3000,
  size = 0.05,
  speed = 1
}) => {
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 25 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  const { pointer } = useThree();

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05 * speed;
      ref.current.rotation.x += delta * 0.02 * speed;
      
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, pointer.x * 3, 0.05);
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, pointer.y * 3, 0.05);
    }
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface GalleryBackground3DProps {
  color?: string;
  particleCount?: number;
  particleSize?: number;
  speed?: number;
  bgColor?: string;
}

export const GalleryBackground3D: React.FC<GalleryBackground3DProps> = ({ 
  color = '#ffffff', 
  particleCount = 5000,
  particleSize = 0.08,
  speed = 1,
  bgColor = '#000000'
}) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundColor: bgColor }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }} dpr={[1, 2]}>
        {/* Soft fog to blend particles in the distance */}
        <fog attach="fog" args={[bgColor, 10, 30]} />
        <ParticleField color={color} count={particleCount} size={particleSize} speed={speed} />
      </Canvas>
    </div>
  );
};
