import React, { Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { usePerformanceProfile } from '../hooks/usePerformance';
import { temModeloFruto } from '../services/frutoEdenModelo';

const TAMANHO_ALVO = 2.6;

function FrutoModelo({ id, animar }: { id: string; animar: boolean }) {
  const { scene } = useGLTF(`/models/frutos/${id}.glb`);
  const grupo = React.useRef<THREE.Group>(null);
  // Centraliza e normaliza o tamanho: cada fruto tem proporções próprias.
  const { objeto, escala } = useMemo(() => {
    const clone = scene.clone(true);
    const caixa = new THREE.Box3().setFromObject(clone);
    const centro = caixa.getCenter(new THREE.Vector3());
    const tamanho = caixa.getSize(new THREE.Vector3());
    clone.position.sub(centro);
    return { objeto: clone, escala: TAMANHO_ALVO / Math.max(tamanho.x, tamanho.y, tamanho.z, 0.001) };
  }, [scene]);

  useFrame((state) => {
    if (!animar || !grupo.current) return;
    grupo.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
  });

  return (
    <group ref={grupo} scale={escala}>
      <primitive object={objeto} dispose={null} />
    </group>
  );
}

interface FrutoEdenViewerProps {
  /** Id do item no catálogo (ex.: `fruto-chamas`). */
  id: string;
  className?: string;
}

/** Fruto do Éden girando em 3D. Carregue com React.lazy: traz three.js junto. */
export const FrutoEdenViewer: React.FC<FrutoEdenViewerProps> = ({ id, className = 'h-56 w-full' }) => {
  const { world } = usePerformanceProfile();
  if (!temModeloFruto(id)) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_55%,rgba(251,191,36,0.14),rgba(0,0,0,0)_68%)] ${className}`}
      role="img"
      aria-label="Modelo 3D do fruto; arraste para girar"
    >
      <Canvas
        camera={{ position: [0, 0.5, 4.4], fov: 34 }}
        dpr={world.dpr}
        frameloop={world.animate ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#b9a6ff" />
        {/* Ambiente gerado na hora: dá reflexo aos frutos metálicos sem baixar HDR. */}
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} />
          <Lightformer intensity={1.2} position={[-4, 0, 2]} scale={[2, 6, 1]} color="#c7b5ff" />
          <Lightformer intensity={1.2} position={[4, 0, -2]} scale={[2, 6, 1]} color="#ffd89a" />
        </Environment>
        <Suspense fallback={null}>
          <FrutoModelo id={id} animar={world.animate} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={world.animate}
          autoRotateSpeed={2.2}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.7}
        />
      </Canvas>
    </div>
  );
};

export default FrutoEdenViewer;
