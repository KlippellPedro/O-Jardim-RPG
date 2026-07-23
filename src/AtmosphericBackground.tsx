import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Stars() {
  const ref = useRef<THREE.Points>(null!);
  
  const { positions, circleTexture } = useMemo(() => {
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath();
      context.arc(8, 8, 8, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fill();
    }
    return { positions, circleTexture: new THREE.CanvasTexture(canvas) };
  }, []);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 25;
      ref.current.rotation.y -= delta / 35;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <points ref={ref} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial map={circleTexture} transparent color="#ffffff" size={0.04} sizeAttenuation={true} depthWrite={false} alphaTest={0.1} opacity={0.3} />
      </points>
    </group>
  );
}

function DistantTrees() {
  const ref = useRef<THREE.Points>(null!);
  
  const { positions, colors, circleTexture } = useMemo(() => {
    const treeColors = [
      new THREE.Color('#2d6a4f'), // Verde denso
      new THREE.Color('#7b2cbf'), // Roxo místico
      new THREE.Color('#c4a052'), // Dourado principal
      new THREE.Color('#00b4d8')  // Azul etéreo
    ];
    const positions = new Float32Array(treeColors.length * 3);
    const colors = new Float32Array(treeColors.length * 3);
    
    for (let i = 0; i < treeColors.length; i++) {
      // Colocar as árvores um pouco mais espalhadas e garantidas em posições distantes
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      colors[i * 3] = treeColors[i].r;
      colors[i * 3 + 1] = treeColors[i].g;
      colors[i * 3 + 2] = treeColors[i].b;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath();
      context.arc(16, 16, 16, 0, Math.PI * 2);
      
      // Criar um efeito de brilho (glow) para as árvores
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      context.fillStyle = gradient;
      context.fill();
    }
    return { positions, colors, circleTexture: new THREE.CanvasTexture(canvas) };
  }, []);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 25;
      ref.current.rotation.y -= delta / 35;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <points ref={ref} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial map={circleTexture} transparent vertexColors size={0.12} sizeAttenuation={true} depthWrite={false} alphaTest={0.01} opacity={1} />
      </points>
    </group>
  );
}

export default function AtmosphericBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-background pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars />
        <DistantTrees />
      </Canvas>
    </div>
  );
}