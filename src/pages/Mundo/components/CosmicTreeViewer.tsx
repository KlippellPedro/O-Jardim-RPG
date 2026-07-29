import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Text, Billboard, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface TreeData {
  id: string;
  deidadeId: string;
  name: string;
  color: string;
  radius: number; // Distância do centro
  speed: number;  // Velocidade de órbita
  modelPath: string; // Caminho pro modelo GLB
}

export const COSMIC_TREES: TreeData[] = [
  { id: 'limiar', deidadeId: 'mulher-carmesim', name: 'Limiar', color: '#8b1a2a', radius: 0, speed: 0, modelPath: '/models/trees/mulher-carmesim.glb' }, // Centro
  { id: 'genese', deidadeId: 'aethel', name: 'Gênese', color: '#c9a227', radius: 8, speed: 0.1, modelPath: '/models/trees/aethel.glb' },
  { id: 'abismo', deidadeId: 'erebus', name: 'Abismo', color: '#644488', radius: 12, speed: 0.08, modelPath: '/models/trees/erebus.glb' },
  { id: 'aletheia', deidadeId: 'ousias', name: 'Alétheia', color: '#d2c3a8', radius: 15, speed: 0.12, modelPath: '/models/trees/ousias.glb' },
  { id: 'anima', deidadeId: 'haemus', name: 'Anima', color: '#78b982', radius: 18, speed: 0.09, modelPath: '/models/trees/haemus.glb' },
  { id: 'baluarte', deidadeId: 'moros', name: 'Baluarte', color: '#8c9eae', radius: 22, speed: 0.07, modelPath: '/models/trees/moros.glb' },
  { id: 'matriz', deidadeId: 'aperion', name: 'Matriz', color: '#55aacc', radius: 26, speed: 0.06, modelPath: '/models/trees/aperion.glb' },
  { id: 'axis', deidadeId: 'keryx', name: 'A.X.I.S', color: '#4a9ebb', radius: 30, speed: 0.15, modelPath: '/models/trees/axis.glb' },
  { id: 'vortice', deidadeId: 'ignis', name: 'Vórtice', color: '#c8643c', radius: 35, speed: 0.2, modelPath: '/models/trees/ignis.glb' },
  { id: 'eon', deidadeId: 'chronus', name: 'Éon', color: '#bea03c', radius: 40, speed: 0.05, modelPath: '/models/trees/chronus.glb' },
];

// Posição global para a câmera seguir
const globalTargetPosition = new THREE.Vector3(0, 0, 0);

const GlowSprite = ({ color, isSelected }: { color: string, isSelected: boolean }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <sprite scale={isSelected ? [7, 7, 1] : [4, 4, 1]} position={[0, 1.2, 0]}>
      <spriteMaterial 
        map={texture} 
        color={color} 
        transparent={true} 
        opacity={isSelected ? 0.9 : 0.5} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </sprite>
  );
};

const EasterEggUniverses = () => {
  const frozenRef = useRef<THREE.Mesh>(null);
  const bubbleRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (frozenRef.current) frozenRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    if (bubbleRef.current) {
      bubbleRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      bubbleRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={[350, -100, 400]}>
      {/* Mundo Congelado */}
      <mesh ref={frozenRef} position={[0, 0, 0]}>
        <sphereGeometry args={[15, 64, 64]} />
        <meshStandardMaterial 
          color="#d0f4ff" 
          emissive="#0a2a3a" 
          roughness={0.4} 
          metalness={0.1}
        />
        {/* Camada de "Gelo" por cima */}
        <mesh>
          <sphereGeometry args={[15.2, 64, 64]} />
          <meshPhysicalMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.4} 
            roughness={0.1} 
            transmission={0.8} 
            thickness={2} 
            clearcoat={1}
          />
        </mesh>
        <Billboard position={[0, 22, 0]}>
          <Text fontSize={3} color="#a0e6ff" anchorX="center" anchorY="middle" fillOpacity={0.6}>
            O Mundo Gélido
          </Text>
        </Billboard>
      </mesh>

      {/* Bolha do RPG do Amigo */}
      <mesh ref={bubbleRef} position={[40, 20, -30]}>
        <sphereGeometry args={[10, 64, 64]} />
        <meshPhysicalMaterial 
          color="#ffb6ff"
          emissive="#ff0088"
          emissiveIntensity={0.15}
          transparent={true}
          opacity={0.25}
          metalness={0.1}
          roughness={0}
          ior={1.1}
          specularIntensity={2}
          clearcoat={1}
          iridescence={1}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[100, 400]}
          side={THREE.DoubleSide}
        />
        <Billboard position={[0, 15, 0]}>
          <Text fontSize={2.5} color="#ffb6ff" anchorX="center" anchorY="middle" fillOpacity={0.6}>
            Universo Bolha
          </Text>
        </Billboard>
      </mesh>
    </group>
  );
};

const TreeModel = ({ tree }: { tree: TreeData }) => {
  const { scene } = useGLTF(tree.modelPath);
  const clone = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive object={clone} />
  );
};

interface CosmicNodeProps {
  tree: TreeData;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClickNode: () => void;
}

const CosmicNode = ({ tree, isSelected, onClick, onDoubleClickNode }: CosmicNodeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (groupRef.current) {
      if (!isSelected) {
        if (tree.radius > 0) {
          const time = state.clock.elapsedTime;
          const angle = time * tree.speed + offset;
          groupRef.current.position.x = Math.cos(angle) * tree.radius;
          groupRef.current.position.z = Math.sin(angle) * tree.radius;
        }
      } else {
        // Se a árvore está selecionada, define ela como alvo da câmera
        globalTargetPosition.copy(groupRef.current.position);
      }
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={tree.radius === 0 ? [0,0,0] : [Math.cos(offset) * tree.radius, 0, Math.sin(offset) * tree.radius]}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (isSelected) {
          onDoubleClickNode();
        } else {
          onClick(); 
        }
      }}
    >
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Glow de fundo */}
        <GlowSprite color={tree.color} isSelected={isSelected} />
        
        {/* Hitbox maior invisível para facilitar o clique */}
        <mesh>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Modelo 3D Oficial do Blender */}
        <TreeModel tree={tree} />
      </Float>

      <Billboard position={[0, isSelected ? 3.5 : 2, 0]}>
        <Text
          fontSize={isSelected ? 0.8 : 0.4}
          color={tree.color}
          anchorX="center"
          anchorY="middle"
        >
          {tree.name}
        </Text>
      </Billboard>
    </group>
  );
};

// Componente que controla a câmera suavemente
type OrbitControlsRef = React.ElementRef<typeof OrbitControls>;

interface CameraRigProps {
  selectedDeidadeId: string | null;
  controlsRef: React.RefObject<OrbitControlsRef>;
}

const CameraRig = ({ selectedDeidadeId, controlsRef }: CameraRigProps) => {
  useFrame((state, delta) => {
    if (controlsRef.current) {
      if (!selectedDeidadeId) {
        globalTargetPosition.set(0, 0, 0);
        
        // Retorna a câmera para a visão geral se estiver muito perto
        const camPos = state.camera.position;
        if (camPos.distanceTo(globalTargetPosition) < 30) {
          camPos.lerp(new THREE.Vector3(0, 20, 40), delta * 1.5);
        }
      } else {
        // Se tem uma árvore selecionada, dá zoom suave nela
        const camPos = state.camera.position;
        const dist = camPos.distanceTo(globalTargetPosition);
        if (dist > 15) {
          // Aproxima a câmera mantendo o ângulo
          const dir = camPos.clone().sub(globalTargetPosition).normalize();
          camPos.lerp(globalTargetPosition.clone().add(dir.multiplyScalar(15)), delta * 2);
        }
      }
      
      // Move o ponto de foco (target) da câmera suavemente
      controlsRef.current.target.lerp(globalTargetPosition, delta * 3);
      controlsRef.current.update();
    }
  });
  return null;
};

interface CosmicTreeViewerProps {
  selectedDeidadeId: string | null;
  onSelectDeidade: (id: string | null) => void;
  onOpenInfo: (id: string) => void;
  lockedDeidades?: string[];
}

export const CosmicTreeViewer: React.FC<CosmicTreeViewerProps> = ({ selectedDeidadeId, onSelectDeidade, onOpenInfo, lockedDeidades = [] }) => {
  const controlsRef = useRef<OrbitControlsRef>(null);

  return (
    <div className="w-full h-full min-h-[500px] lg:min-h-[700px] rounded-3xl overflow-hidden border border-white/10 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-primary uppercase tracking-widest pointer-events-none">
        Projeção Astral das Árvores
      </div>
      
      <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 text-xs text-gray-400 pointer-events-none">
        <p className="font-bold text-gray-300 mb-1">Dicas de Controle:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Clique Esquerdo (Arraste):</strong> Rotacionar câmera</li>
          <li><strong>Scroll do Mouse:</strong> Dar Zoom (Afastar/Aproximar)</li>
          <li><strong>Clique Esquerdo na Árvore:</strong> Focar câmera</li>
          <li><strong>Duplo Clique na Árvore:</strong> Entrar/Abrir Lore</li>
          <li><strong>Clique fora das árvores:</strong> Voltar para visão geral</li>
        </ul>
      </div>
      
      {selectedDeidadeId && (
        <button 
          onClick={(e) => { e.stopPropagation(); onSelectDeidade(null); }}
          className="absolute top-4 right-4 z-10 bg-primary/20 hover:bg-primary/40 backdrop-blur-md px-4 py-2 rounded-full border border-primary/50 text-xs text-white uppercase tracking-widest transition-colors cursor-pointer"
        >
          Visão Geral
        </button>
      )}

      <Canvas 
        camera={{ position: [0, 20, 40], fov: 45 }}
        onPointerMissed={() => onSelectDeidade(null)}
      >
        <color attach="background" args={['#050508']} />
        <ambientLight intensity={0.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {COSMIC_TREES.map(tree => {
          const isLocked = lockedDeidades.includes(tree.deidadeId);
          return (
            <CosmicNode 
              key={tree.id} 
              tree={isLocked ? { ...tree, name: 'Desconhecida', color: '#444444' } : tree} 
              isSelected={selectedDeidadeId === tree.deidadeId}
              onClick={() => onSelectDeidade(tree.deidadeId)}
              onDoubleClickNode={() => onOpenInfo(tree.deidadeId)}
            />
          );
        })}

        {COSMIC_TREES.map(tree => tree.radius > 0 && (
          <mesh key={`orbit-${tree.id}`} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[tree.radius - 0.05, tree.radius + 0.05, 64]} />
            <meshBasicMaterial color={tree.color} transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        ))}
        
        <OrbitControls 
          ref={controlsRef}
          enableZoom={true} 
          enablePan={true} 
          autoRotate={!selectedDeidadeId} 
          autoRotateSpeed={0.2} 
          maxPolarAngle={Math.PI / 1.5}
          maxDistance={800}
        />
        
        <CameraRig selectedDeidadeId={selectedDeidadeId} controlsRef={controlsRef} />
        
        {/* Mundos Secretos - Easter Eggs */}
        <EasterEggUniverses />
      </Canvas>
    </div>
  );
};

export default CosmicTreeViewer;

// Preload dos modelos GLTF
COSMIC_TREES.forEach(tree => {
  useGLTF.preload(tree.modelPath);
});
