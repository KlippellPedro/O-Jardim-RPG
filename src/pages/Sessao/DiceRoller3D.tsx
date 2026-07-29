import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { Text, Float, Billboard, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { sfx } from '../../utils/audioSynth';

// Geometria padrão de Icosaedro do Three.js
// Os índices das faces e suas normais locais podem ser usados para descobrir a face para cima.
const D20 = ({ position, onSleep, forceResult }: { position: [number, number, number], onSleep?: (result: number) => void, forceResult?: number }) => {
  const rigidBody = React.useRef<RapierRigidBody>(null);
  const [isCritical, setIsCritical] = React.useState(false);
  const [color, setColor] = React.useState('#3b82f6'); // azul padrão
  const [finalResult, setFinalResult] = React.useState<number | null>(null);

  React.useEffect(() => {
    // Aplica um impulso aleatório no spawn
    if (rigidBody.current) {
      sfx.playDiceClack();
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
    const result = forceResult ?? (Math.floor(Math.random() * 20) + 1);
    
    if (result >= 20) {
      setIsCritical(true);
      setColor('#fbbf24'); // dourado para crítico
      sfx.playCritSound();
    } else if (result <= 1) {
      setIsCritical(false);
      setColor('#ef4444'); // vermelho para desastre
      sfx.playDisasterSound();
    } else {
      setIsCritical(false);
      setColor('#3b82f6');
    }

    setFinalResult(result);
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
          emissive={isCritical ? '#fbbf24' : '#000000'}
          emissiveIntensity={isCritical ? 5 : 0}
        />
        {/* Adiciona arestas para ficar estiloso */}
        <lineSegments>
          <edgesGeometry args={[new THREE.IcosahedronGeometry(1, 0)]} />
          <lineBasicMaterial color={isCritical ? "#ffffff" : "#60a5fa"} linewidth={2} />
        </lineSegments>
      </mesh>

      {/* Holograma do Resultado */}
      {finalResult !== null && (
        <Billboard position={[0, 2, 0]}>
          <Float speed={5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
              fontSize={1.5}
              color={color}
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/cinzel/v11/8vI-7wQzO2jQ8-h3i2K-.woff2" // Exemplo Fonte Cinzel
              outlineWidth={0.05}
              outlineColor="#000000"
            >
              {finalResult}
            </Text>
          </Float>
        </Billboard>
      )}
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
  forceResult?: number;
}

export const DiceRoller3D: React.FC<DiceRoller3DProps> = ({ onRollComplete, isRolling, forceResult }) => {
  const [dices, setDices] = React.useState<{ id: string; key: number }[]>([]);

  // Toda vez que isRolling vira true, disparamos um novo dado
  React.useEffect(() => {
    if (isRolling) {
      setDices(prev => [...prev, { id: crypto.randomUUID(), key: Date.now() }]);
    }
  }, [isRolling]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        shadows
        camera={{ position: [0, 15, 10], fov: 45 }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight 
          position={[10, 20, 10]} 
          castShadow 
          intensity={2}
          shadow-mapSize={[1024, 1024]}
        />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Physics gravity={[0, -30, 0]}>
          <FloorAndWalls />
          {dices.map((dice) => (
            <D20 
              key={dice.key} 
              position={[(Math.random() - 0.5) * 5, 5, (Math.random() - 0.5) * 5]} 
              forceResult={forceResult}
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
      </Canvas>
    </div>
  );
};
