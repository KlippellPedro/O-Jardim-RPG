import React, { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, OrbitControls, Stars, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { BANCO_LUNAR_INFO } from '../bancoLunarInfo';
import { VAZIO_INFO } from '../vazioInfo';
import {
  BANCO_LUNAR_HEIGHT,
  BANCO_LUNAR_MODEL_PATH,
  BANCO_LUNAR_RADIUS,
  BANCO_LUNAR_SPEED,
  COSMIC_TREES,
  TreeData,
} from '../cosmicTrees';
import { toR3fElapsedSeconds } from '../animationTiming';
import {
  type ModelCacheStorage,
  readLoadedWorldModels,
  rememberLoadedWorldModel,
} from '../modelLoadCache';
import { usePerformanceProfile } from '../../../hooks/usePerformance';

export { COSMIC_TREES } from '../cosmicTrees';

const BANK_MODEL_KEY = 'banco-lunar';
const VALID_MODEL_IDS = new Set([
  ...COSMIC_TREES.map((tree) => tree.deidadeId),
  BANK_MODEL_KEY,
]);
const rememberedModelIds = new Set<string>();
let modelCacheHydrated = false;
const globalTargetPosition = new THREE.Vector3();
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function getBrowserModelStorage(): ModelCacheStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getRememberedModelIds() {
  if (!modelCacheHydrated) {
    modelCacheHydrated = true;
    for (const modelId of readLoadedWorldModels(getBrowserModelStorage(), VALID_MODEL_IDS)) {
      rememberedModelIds.add(modelId);
    }
  }
  return new Set(rememberedModelIds);
}

function simplifyTransmissiveMaterials(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) continue;
      const physicalMaterial = material as THREE.MeshPhysicalMaterial;
      if (physicalMaterial.transmission <= 0) continue;

      // Sem refração, a cúpula vira uma grande esfera opaca e altera toda a
      // escala visual. Ocultá-la mantém a silhueta original das Árvores e ainda
      // elimina completamente os passes caros de transmission.
      physicalMaterial.transmission = 0;
      physicalMaterial.thickness = 0;
      physicalMaterial.visible = false;
      physicalMaterial.needsUpdate = true;
    }
  });
  return scene;
}

let sharedGlowTexture: THREE.CanvasTexture | null = null;
function getGlowTexture() {
  if (sharedGlowTexture) return sharedGlowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  return sharedGlowTexture;
}

const GlowSprite = memo(({ color, isSelected }: { color: string; isSelected: boolean }) => {
  const texture = useMemo(getGlowTexture, []);
  return (
    <sprite scale={isSelected ? [7, 7, 1] : [4, 4, 1]} position={[0, 1.2, 0]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={isSelected ? 0.8 : 0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
});

const TreePlaceholder = memo(({ color }: { color: string }) => (
  <group dispose={null}>
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.16, 0.22, 1.1, 7]} />
      <meshStandardMaterial color="#3b2c24" roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.45, 0]}>
      <coneGeometry args={[0.9, 1.9, 9]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.16} roughness={0.75} />
    </mesh>
  </group>
));

const TreeModel = memo(({ tree, onLoaded }: { tree: TreeData; onLoaded: (modelId: string) => void }) => {
  const { scene: sourceScene } = useGLTF(tree.modelPath);
  const scene = useMemo(() => simplifyTransmissiveMaterials(sourceScene), [sourceScene]);
  useEffect(() => onLoaded(tree.deidadeId), [onLoaded, tree.deidadeId]);
  // Cada arquivo representa uma única árvore na cena; clonar duplicava toda a
  // hierarquia sem oferecer isolamento útil de geometria ou materiais.
  return <primitive object={scene} dispose={null} />;
});

const MoonBankModel = memo(({ onLoaded }: { onLoaded: (modelId: string) => void }) => {
  const { scene: sourceScene } = useGLTF(BANCO_LUNAR_MODEL_PATH);
  const scene = useMemo(() => simplifyTransmissiveMaterials(sourceScene), [sourceScene]);
  useEffect(() => onLoaded(BANK_MODEL_KEY), [onLoaded]);
  return <primitive object={scene} scale={2.2} dispose={null} />;
});

function useProgressiveModels(performanceMode: boolean, selectedDeidadeId: string | null) {
  const [loadedModels, setLoadedModels] = useState<Set<string>>(
    () => {
      const remembered = getRememberedModelIds();
      remembered.add(COSMIC_TREES[0].deidadeId);
      return remembered;
    },
  );
  const initiallyLoadedModels = useRef(loadedModels);

  const onModelLoaded = useCallback((modelId: string) => {
    rememberLoadedWorldModel(
      getBrowserModelStorage(),
      rememberedModelIds,
      modelId,
      VALID_MODEL_IDS,
    );
  }, []);

  useEffect(() => {
    if (!selectedDeidadeId) return;
    setLoadedModels((current) => {
      if (current.has(selectedDeidadeId)) return current;
      const next = new Set(current);
      next.add(selectedDeidadeId);
      return next;
    });
  }, [selectedDeidadeId]);

  useEffect(() => {
    if (performanceMode) return undefined;
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const queue = [
      ...COSMIC_TREES.slice(1).map((tree) => tree.deidadeId),
      BANK_MODEL_KEY,
    ].filter((modelId) => !initiallyLoadedModels.current.has(modelId));
    if (queue.length === 0) return undefined;
    let index = 0;
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    let cancelled = false;

    const loadNext = () => {
      if (cancelled || index >= queue.length) return;
      const modelId = queue[index++];
      setLoadedModels((current) => {
        if (current.has(modelId)) return current;
        const next = new Set(current);
        next.add(modelId);
        return next;
      });
      timeoutId = window.setTimeout(scheduleNext, 320);
    };

    const scheduleNext = () => {
      if (cancelled || index >= queue.length) return;
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(loadNext, { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(loadNext, 500);
      }
    };

    timeoutId = window.setTimeout(scheduleNext, 450);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [performanceMode]);

  const detailedModels = useMemo(() => {
    if (!performanceMode) return loadedModels;
    const reducedModels = new Set([COSMIC_TREES[0].deidadeId]);
    if (selectedDeidadeId) reducedModels.add(selectedDeidadeId);
    return reducedModels;
  }, [loadedModels, performanceMode, selectedDeidadeId]);

  return { detailedModels, onModelLoaded };
}

const EasterEggUniverses = memo(({ animate }: { animate: boolean }) => {
  const frozenRef = useRef<THREE.Mesh>(null);
  const bubbleRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!animate) return;
    if (frozenRef.current) frozenRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    if (bubbleRef.current) {
      bubbleRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      bubbleRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={[350, -100, 400]}>
      <mesh ref={frozenRef}>
        <sphereGeometry args={[15, 24, 24]} />
        <meshStandardMaterial color="#d0f4ff" emissive="#0a2a3a" roughness={0.4} metalness={0.1} />
        <mesh>
          <sphereGeometry args={[15.2, 24, 24]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.35} roughness={0.15} transmission={0.65} thickness={1.5} />
        </mesh>
        <Billboard position={[0, 22, 0]}>
          <Text fontSize={3} color="#a0e6ff" anchorX="center" anchorY="middle" fillOpacity={0.6}>O Mundo Gélido</Text>
        </Billboard>
      </mesh>

      <mesh ref={bubbleRef} position={[40, 20, -30]}>
        <sphereGeometry args={[10, 24, 24]} />
        <meshPhysicalMaterial
          color="#ffb6ff"
          emissive="#ff0088"
          emissiveIntensity={0.12}
          transparent
          opacity={0.22}
          roughness={0.05}
          clearcoat={0.7}
          side={THREE.DoubleSide}
        />
        <Billboard position={[0, 15, 0]}>
          <Text fontSize={2.5} color="#ffb6ff" anchorX="center" anchorY="middle" fillOpacity={0.6}>Universo Bolha</Text>
        </Billboard>
      </mesh>
    </group>
  );
});

const MoonBankNode = memo(({
  onClick,
  onModelLoaded,
  detailed,
  animate,
  showGlow,
}: {
  onClick: () => void;
  onModelLoaded: (modelId: string) => void;
  detailed: boolean;
  animate: boolean;
  showGlow: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const offset = COSMIC_TREES.length * GOLDEN_ANGLE;

  useFrame((state) => {
    if (!animate) return;
    const time = state.clock.elapsedTime;
    const angle = time * BANCO_LUNAR_SPEED + offset;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angle) * BANCO_LUNAR_RADIUS;
      groupRef.current.position.z = Math.sin(angle) * BANCO_LUNAR_RADIUS;
      groupRef.current.position.y = BANCO_LUNAR_HEIGHT;
    }
    if (visualRef.current) {
      visualRef.current.position.y = Math.sin(time * 0.8 + offset) * 0.45;
      visualRef.current.rotation.y = Math.sin(time * 0.4 + offset) * 0.18;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[Math.cos(offset) * BANCO_LUNAR_RADIUS, BANCO_LUNAR_HEIGHT, Math.sin(offset) * BANCO_LUNAR_RADIUS]}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
    >
      <group ref={visualRef}>
        {showGlow && <GlowSprite color={BANCO_LUNAR_INFO.cor} isSelected={false} />}
        <mesh>
          <sphereGeometry args={[2, 10, 10]} />
          <meshBasicMaterial visible={false} />
        </mesh>
        <Suspense fallback={<TreePlaceholder color={BANCO_LUNAR_INFO.cor} />}>
          {detailed ? <MoonBankModel onLoaded={onModelLoaded} /> : <TreePlaceholder color={BANCO_LUNAR_INFO.cor} />}
        </Suspense>
      </group>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.5} color={BANCO_LUNAR_INFO.cor} anchorX="center" anchorY="middle">{BANCO_LUNAR_INFO.nome}</Text>
      </Billboard>
    </group>
  );
});

interface CosmicNodeProps {
  tree: TreeData;
  isLocked: boolean;
  isSelected: boolean;
  detailed: boolean;
  animate: boolean;
  showGlow: boolean;
  onClick: () => void;
  onOpenInfo: () => void;
  onModelLoaded: (modelId: string) => void;
  orbitOffset: number;
}

const CosmicNode = memo(({
  tree,
  isLocked,
  isSelected,
  detailed,
  animate,
  showGlow,
  onClick,
  onOpenInfo,
  onModelLoaded,
  orbitOffset,
}: CosmicNodeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const offset = orbitOffset;
  const color = isLocked ? '#444444' : tree.color;
  const name = isLocked ? 'Desconhecida' : tree.name;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    if (animate && !isSelected && tree.radius > 0) {
      const angle = state.clock.elapsedTime * tree.speed + offset;
      group.position.x = Math.cos(angle) * tree.radius;
      group.position.z = Math.sin(angle) * tree.radius;
    }
    if (animate && visualRef.current) {
      visualRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.1 + offset) * 0.35;
      visualRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.45 + offset) * 0.22;
    }
    if (isSelected) globalTargetPosition.copy(group.position);
  });

  return (
    <group
      ref={groupRef}
      position={tree.radius === 0 ? [0, 0, 0] : [Math.cos(offset) * tree.radius, 0, Math.sin(offset) * tree.radius]}
      onClick={(event) => {
        event.stopPropagation();
        if (isSelected) onOpenInfo();
        else onClick();
      }}
    >
      <group ref={visualRef}>
        {showGlow && <GlowSprite color={color} isSelected={isSelected} />}
        <mesh>
          <sphereGeometry args={[1.5, 10, 10]} />
          <meshBasicMaterial visible={false} />
        </mesh>
        <Suspense fallback={<TreePlaceholder color={color} />}>
          {detailed ? <TreeModel tree={tree} onLoaded={onModelLoaded} /> : <TreePlaceholder color={color} />}
        </Suspense>
      </group>
      <Billboard position={[0, isSelected ? 3.5 : 2, 0]}>
        <Text fontSize={isSelected ? 0.8 : 0.4} color={color} anchorX="center" anchorY="middle">{name}</Text>
      </Billboard>
    </group>
  );
});

type OrbitControlsRef = React.ElementRef<typeof OrbitControls>;

const CameraRig = memo(({
  selectedDeidadeId,
  controlsRef,
  animate,
  staticScene,
}: {
  selectedDeidadeId: string | null;
  controlsRef: React.RefObject<OrbitControlsRef>;
  animate: boolean;
  staticScene: boolean;
}) => {
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  // No modo estático, enquadra a seleção uma única vez. A câmera não pode ser
  // reescrita em cada frame, pois isso anula imediatamente OrbitControls.
  useEffect(() => {
    if (!staticScene) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const selectedIndex = COSMIC_TREES.findIndex((tree) => tree.deidadeId === selectedDeidadeId);
    const selectedTree = selectedIndex >= 0 ? COSMIC_TREES[selectedIndex] : null;

    if (!selectedTree) {
      globalTargetPosition.set(0, 0, 0);
      camera.position.set(0, 20, 40);
    } else {
      const offset = Math.max(0, selectedIndex - 1) * GOLDEN_ANGLE;
      globalTargetPosition.set(
        selectedTree.radius === 0 ? 0 : Math.cos(offset) * selectedTree.radius,
        0,
        selectedTree.radius === 0 ? 0 : Math.sin(offset) * selectedTree.radius,
      );
      scratch.copy(camera.position).sub(globalTargetPosition);
      if (scratch.lengthSq() < 0.0001) scratch.set(0, 0.55, 1);
      camera.position.copy(scratch.normalize().multiplyScalar(15).add(globalTargetPosition));
    }

    controls.target.copy(globalTargetPosition);
    controls.update();
    invalidate();
  }, [camera, controlsRef, invalidate, scratch, selectedDeidadeId, staticScene]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cameraPosition = state.camera.position;
    if (!animate) return;
    const step = Math.min(delta, 1 / 20);

    if (!selectedDeidadeId) {
      globalTargetPosition.set(0, 0, 0);
      if (cameraPosition.distanceToSquared(globalTargetPosition) < 900) {
        scratch.set(0, 20, 40);
        cameraPosition.lerp(scratch, step * 1.5);
      }
    } else if (cameraPosition.distanceToSquared(globalTargetPosition) > 225) {
      scratch.copy(cameraPosition).sub(globalTargetPosition).normalize().multiplyScalar(15).add(globalTargetPosition);
      cameraPosition.lerp(scratch, step * 2);
    }

    controls.target.lerp(globalTargetPosition, step * 3);
    controls.update();
  });
  return null;
});

const FrameScheduler = memo(({ targetFps }: { targetFps: number }) => {
  const invalidate = useThree((state) => state.invalidate);
  const advance = useThree((state) => state.advance);

  useEffect(() => {
    invalidate();
    if (targetFps <= 0) return undefined;
    const interval = 1000 / targetFps;
    let lastFrame = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const elapsed = now - lastFrame;
      if (elapsed >= interval) {
        lastFrame = now - (elapsed % interval);
        // O modo `never` ignora invalidações internas do OrbitControls. Assim,
        // o renderer respeita de fato o teto, em vez de voltar a 60 Hz.
        advance(toR3fElapsedSeconds(now));
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [advance, invalidate, targetFps]);

  return null;
});

interface CosmicTreeViewerProps {
  selectedDeidadeId: string | null;
  onSelectDeidade: (id: string | null) => void;
  onOpenInfo: (id: string) => void;
  onOpenBancoLunar: () => void;
  onOpenVazio: () => void;
  lockedDeidades?: string[];
}

export const CosmicTreeViewer: React.FC<CosmicTreeViewerProps> = ({
  selectedDeidadeId,
  onSelectDeidade,
  onOpenInfo,
  onOpenBancoLunar,
  onOpenVazio,
  lockedDeidades = [],
}) => {
  const controlsRef = useRef<OrbitControlsRef>(null);
  const { performanceMode, prefersReducedMotion, world } = usePerformanceProfile();
  const { detailedModels, onModelLoaded } = useProgressiveModels(performanceMode, selectedDeidadeId);
  const lockedSet = useMemo(() => new Set(lockedDeidades), [lockedDeidades]);

  return (
    <div className="performance-expensive-effects relative h-full min-h-[500px] w-full overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] lg:min-h-[700px]">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-primary pointer-events-none">
        Projeção Astral das Árvores
      </div>

      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onOpenVazio(); }}
        className="absolute bottom-4 right-4 z-10 cursor-pointer rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-colors hover:bg-white/5"
        style={{ borderColor: `${VAZIO_INFO.cor}55`, color: VAZIO_INFO.cor, backgroundColor: 'rgba(0,0,0,0.7)' }}
      >
        {VAZIO_INFO.nome}
      </button>
      <div className="absolute bottom-4 left-4 z-10 hidden rounded-xl border border-white/5 bg-black/75 px-4 py-2 text-xs text-gray-400 pointer-events-none sm:block">
        <p className="mb-1 font-bold text-gray-300">Dicas de Controle:</p>
        <ul className="list-disc space-y-1 pl-4">
          <li><strong>Arraste:</strong> rotacionar câmera</li>
          <li><strong>Scroll:</strong> aproximar ou afastar</li>
          <li><strong>Clique na Árvore:</strong> focar; clique novamente para abrir</li>
        </ul>
      </div>

      {selectedDeidadeId && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelectDeidade(null); }}
          className="absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-primary/50 bg-[#2a2134] px-4 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-primary/40"
        >
          Visão Geral
        </button>
      )}

      <Canvas
        key={performanceMode ? 'performance' : 'complete'}
        camera={{ position: [0, 20, 40], fov: 45 }}
        dpr={world.dpr}
        frameloop={world.targetFps > 0 ? 'never' : 'demand'}
        gl={{ antialias: !performanceMode, alpha: false, powerPreference: 'high-performance', stencil: false }}
        onPointerMissed={() => onSelectDeidade(null)}
      >
        <FrameScheduler targetFps={world.targetFps} />
        <color attach="background" args={['#050508']} />
        <ambientLight intensity={0.5} />
        {world.starCount > 0 && (
          <Stars radius={100} depth={50} count={world.starCount} factor={3.5} saturation={0} fade speed={world.animate ? 0.35 : 0} />
        )}

        {COSMIC_TREES.map((tree, index) => (
          <CosmicNode
            key={tree.id}
            tree={tree}
            isLocked={lockedSet.has(tree.deidadeId)}
            isSelected={selectedDeidadeId === tree.deidadeId}
            detailed={detailedModels.has(tree.deidadeId)}
            animate={world.animate}
            showGlow={world.showDecorations}
            onClick={() => onSelectDeidade(tree.deidadeId)}
            onOpenInfo={() => onOpenInfo(tree.deidadeId)}
            onModelLoaded={onModelLoaded}
            orbitOffset={Math.max(0, index - 1) * GOLDEN_ANGLE}
          />
        ))}

        {COSMIC_TREES.map((tree) => tree.radius > 0 && (
          <mesh key={`orbit-${tree.id}`} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[tree.radius - 0.04, tree.radius + 0.04, performanceMode ? 32 : 48]} />
            <meshBasicMaterial color={tree.color} transparent opacity={0.045} side={THREE.DoubleSide} />
          </mesh>
        ))}

        <mesh position={[0, BANCO_LUNAR_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[BANCO_LUNAR_RADIUS - 0.04, BANCO_LUNAR_RADIUS + 0.04, performanceMode ? 32 : 48]} />
          <meshBasicMaterial color={BANCO_LUNAR_INFO.cor} transparent opacity={0.055} side={THREE.DoubleSide} />
        </mesh>

        <MoonBankNode
          onClick={onOpenBancoLunar}
          onModelLoaded={onModelLoaded}
          detailed={detailedModels.has(BANK_MODEL_KEY)}
          animate={world.animate}
          showGlow={world.showDecorations}
        />

        <OrbitControls
          ref={controlsRef}
          enableZoom
          enablePan
          enableDamping={!performanceMode}
          autoRotate={world.animate && !selectedDeidadeId}
          autoRotateSpeed={0.2}
          maxPolarAngle={Math.PI / 1.5}
          maxDistance={800}
        />
        <CameraRig
          selectedDeidadeId={selectedDeidadeId}
          controlsRef={controlsRef}
          animate={world.animate}
          staticScene={performanceMode || prefersReducedMotion}
        />
        {world.showDecorations && <EasterEggUniverses animate={world.animate} />}
      </Canvas>
    </div>
  );
};

export default CosmicTreeViewer;
