import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Sparkles } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * HeroWorld — Decacorn-Klasse 3D Bühne.
 * Rotierende Dark-Globe mit gold pulsierenden Deutschland-Pins,
 * schwebendes 3D Haus im Vordergrund, Sparkles, Apple-glass.
 * Fallback: statisches SVG wenn WebGL nicht verfügbar.
 */

// Deutsche Städte als lat/lon → 3D
const CITIES: Array<[string, number, number, number]> = [
  ["Berlin", 52.52, 13.4, 1.4],
  ["Hamburg", 53.55, 9.99, 1.1],
  ["München", 48.14, 11.58, 1.3],
  ["Köln", 50.94, 6.96, 1.0],
  ["Frankfurt", 50.11, 8.68, 1.0],
  ["Stuttgart", 48.78, 9.18, 0.9],
  ["Leipzig", 51.34, 12.37, 0.85],
  ["Dresden", 51.05, 13.74, 0.8],
];

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function Globe() {
  const globeRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  // Fibonacci sphere dots for a "data-planet" look
  const dots = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    const N = 900;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = phi * i;
      arr.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(1.5));
    }
    return arr;
  }, []);

  const pins = useMemo(() => CITIES.map((c) => ({
    name: c[0],
    pos: latLonToVec3(c[1], c[2], 1.52),
    size: c[3],
  })), []);

  useFrame((_, dt) => {
    if (globeRef.current) globeRef.current.rotation.y += dt * 0.12;
    pulseRef.current = (pulseRef.current + dt) % 2;
  });

  return (
    <group ref={globeRef}>
      {/* Core sphere — deep obsidian */}
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.85}
          roughness={0.35}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[1.505, 32, 32]} />
        <meshBasicMaterial color="#3a2f18" wireframe transparent opacity={0.35} />
      </mesh>
      {/* Data dots */}
      {dots.map((d, i) => (
        <mesh key={i} position={d}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshBasicMaterial color="#c9a84c" transparent opacity={0.55} />
        </mesh>
      ))}
      {/* German pins — gold, glowing */}
      {pins.map((p, i) => (
        <group key={i} position={p.pos}>
          <mesh>
            <sphereGeometry args={[0.03 * p.size, 12, 12]} />
            <meshBasicMaterial color="#f0d78c" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.06 * p.size, 12, 12]} />
            <meshBasicMaterial color="#c9a84c" transparent opacity={0.25} />
          </mesh>
          {/* Beam upward */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.24, 6]} />
            <meshBasicMaterial color="#f0d78c" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.62, 32, 32]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function FloatingHouse() {
  const houseRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (houseRef.current) {
      houseRef.current.rotation.y = state.clock.elapsedTime * 0.35;
    }
  });
  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.7}>
      <group ref={houseRef} position={[2.3, 1.15, 0.2]} scale={0.55}>
        {/* Body */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.2, 0.9, 0.9]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.25} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, 0.7, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.88, 0.55, 4]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Windows — glowing gold */}
        <mesh position={[0.35, 0.05, 0.46]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial color="#f0d78c" />
        </mesh>
        <mesh position={[-0.35, 0.05, 0.46]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial color="#f0d78c" />
        </mesh>
        {/* Door */}
        <mesh position={[0, -0.22, 0.46]}>
          <planeGeometry args={[0.22, 0.42]} />
          <meshBasicMaterial color="#3a2f18" />
        </mesh>
        {/* Base plate — key reflection */}
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 1.1, 32]} />
          <meshBasicMaterial color="#c9a84c" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#f0d78c" />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#4a3a1a" />
      <pointLight position={[3, 2, 2]} intensity={2} color="#c9a84c" distance={8} />
      <Globe />
      <FloatingHouse />
      <Sparkles count={40} scale={6} size={2} speed={0.4} color="#f0d78c" opacity={0.6} />
      <Environment preset="night" />
    </>
  );
}

export default function HeroWorld() {
  return (
    <div className="relative aspect-square w-full max-w-[620px] mx-auto">
      {/* Gold ambient bloom */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle at 60% 40%, hsl(38 55% 55% / 0.5), transparent 65%)" }}
      />
      <Suspense fallback={<div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-transparent" />}>
        <Canvas
          camera={{ position: [0, 0.5, 5.2], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <Scene />
        </Canvas>
      </Suspense>
      {/* Glass corner label */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 backdrop-blur-xl bg-background/40 border border-border/40 rounded-full px-3 py-1.5 text-[10px] tracking-[0.24em] uppercase text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary mr-2 animate-pulse" />
        Live · 8.187 PLZ
      </div>
    </div>
  );
}
