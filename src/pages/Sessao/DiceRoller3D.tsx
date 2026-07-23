import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Geometria padrão de Icosaedro do Three.js
// Os índices das faces e suas normais locais podem ser usados para descobrir a face para cima.
const D20 = ({ position, onSleep, forceResult }: { position: [number, number, number], onSleep?: (result: number) => void, forceResult?: boolean }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const [isCritical, setIsCritical] = useState(false);
  const [color, setColor] = useState('#3b82f6'); // azul padrão

  useEffect(() => {
    // Aplica um impulso aleatório no spawn
    if (rigidBody.current) {
      const impulse = {
        x: (Math.random() - 0.5) * 10,
        y: 10 + Math.random() * 5,
        z: (Math.random() - 0.5) * 10
      };
      const torque = {
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 5,
        z: (Math.random() - 0.5) * 5
      };
      rigidBody.current.applyImpulse(impulse, true);
      rigidBody.current.applyTorqueImpulse(torque, true);
    }
  }, []);

  const handleSleep = () => {
    if (!rigidBody.current) return;
    
    // Para simplificar na V1 e focar no Hype visual:
    // Sorteamos o valor simulado para garantir distribuição perfeita,
    // já que ler a normal exata do IcosahedronGeometry exige mapeamento rígido das faces.
    // Em uma V2 com modelo GLTF, leríamos o osso/face.
    const result = Math.floor(Math.random() * 20) + 1;
    
    if (result === 20) {
      setIsCritical(true);
      setColor('#fbbf24'); // dourado para crítico
    } else if (result === 1) {
      setIsCritical(false);
      setColor('#ef4444'); // vermelho para desastre
    } else {
      setIsCritical(false);
      setColor('#3b82f6');
    }

    if (onSleep) onSleep(result);
  };

  return (
    <RigidBody
      ref={rigidBody}
      position={position}
      colliders="hull"
      restitution={0.6}
      friction={0.2}
      onSleep={handleSleep}
    >
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2}
          metalness={0.8}
          emissive={isCritical ? new THREE.Color('#fbbf24') : new THREE.Color('#000000')}
          emissiveIntensity={isCritical ? 5 : 0}
        />
        {/* Adiciona arestas para ficar estiloso */}
        <lineSegments>
          <edgesGeometry args={[new THREE.IcosahedronGeometry(1, 0)]} />
          <lineBasicMaterial color={isCritical ? "#ffffff" : "#60a5fa"} linewidth={2} />
        </lineSegments>
      </mesh>
    </RigidBody>
  );
};

const FloorAndWalls = () => {
  return (
    <group>
      {/* Chão */}
      <RigidBody type="fixed" restitution={0.5} friction={0.5}>
        <mesh position={[0, -5, 0]} receiveShadow>
          <boxGeometry args={[50, 1, 50]} />
          <meshStandardMaterial color="#0b0a12" opacity={0.5} transparent />
        </mesh>
      </RigidBody>
      
      {/* Paredes invisíveis para manter o dado na tela */}
      <RigidBody type="fixed">
        <CuboidCollider args={[25, 10, 1]} position={[0, 0, -10]} />
        <CuboidCollider args={[25, 10, 1]} position={[0, 0, 10]} />
        <CuboidCollider args={[1, 10, 25]} position={[-15, 0, 0]} />
        <CuboidCollider args={[1, 10, 25]} position={[15, 0, 0]} />
      </RigidBody>
    </group>
  );
};

interface DiceRoller3DProps {
  onRollComplete?: (result: number) => void;
  isRolling?: boolean;
}

export const DiceRoller3D: React.FC<DiceRoller3DProps> = ({ onRollComplete, isRolling }) => {
  const [dices, setDices] = useState<{ id: string; key: number }[]>([]);

  // Toda vez que isRolling vira true, disparamos um novo dado
  useEffect(() => {
    if (isRolling) {
      setDices(prev => [...prev, { id: crypto.randomUUID(), key: Date.now() }]);
    }
  }, [isRolling]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        shadows
        camera={{ position: [0, 15, 10], fov: 45 }}
        frameloop="demand" // <-- Otimização de performance extrema!
      >
        <ambientLight intensity={1.5} />
        <directionalLight 
          position={[10, 20, 10]} 
          castShadow 
          intensity={2}
          shadow-mapSize={[1024, 1024]}
        />
        
        <Physics gravity={[0, -30, 0]}>
          <FloorAndWalls />
          {dices.map((dice) => (
            <D20 
              key={dice.key} 
              position={[(Math.random() - 0.5) * 5, 5, (Math.random() - 0.5) * 5]} 
              onSleep={(res) => {
                // Notificamos e também removemos o dado antigo depois de alguns segundos para limpar a tela
                if (onRollComplete) onRollComplete(res);
                setTimeout(() => {
                  setDices(prev => prev.filter(d => d.id !== dice.id));
                }, 5000);
              }}
            />
          ))}
        </Physics>

        {/* Efeito de Bloom para Hype do Crítico */}
        <EffectComposer>
          <Bloom 
            luminanceThreshold={1} // Apenas objetos com emissive > 1 brilham
            mipmapBlur 
            intensity={1.5} 
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
