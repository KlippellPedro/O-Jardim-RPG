import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';

const CosmicEntity = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.2;
      meshRef.current.rotation.z = time * 0.1;
    }
    if (coreRef.current) {
      // Pulsação sutil do core
      const scale = 1 + Math.sin(time * 2) * 0.05;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* O núcleo emissivo (Semente da Árvore) */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial 
            color="#4FD1C5" 
            emissive="#4FD1C5" 
            emissiveIntensity={2} 
            wireframe 
            transparent 
            opacity={0.8}
          />
        </mesh>
      </Float>

      {/* Halo ou ramificações místicas ao redor */}
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.5, 0.05, 128, 16]} />
        <meshStandardMaterial 
          color="#3b82f6" 
          emissive="#3b82f6"
          emissiveIntensity={1.5}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
};

export const CosmicTreeViewer: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-white/10 relative">
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-primary uppercase tracking-widest">
        Projeção Astral das Árvores
      </div>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
      >
        <color attach="background" args={['#050508']} />
        
        <ambientLight intensity={0.5} />
        
        <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <CosmicEntity />
        
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={0.5} 
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />
        
        <EffectComposer>
          <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={2.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
