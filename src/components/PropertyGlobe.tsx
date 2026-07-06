import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import { useRef, useMemo, useState, Suspense } from "react";
import * as THREE from "three";

// German cities (approx lat/lng) with fake counts – dramaturgy only
const CITIES = [
  { name: "Berlin", lat: 52.52, lng: 13.4, n: 2140 },
  { name: "Hamburg", lat: 53.55, lng: 9.99, n: 1320 },
  { name: "München", lat: 48.14, lng: 11.58, n: 1810 },
  { name: "Köln", lat: 50.94, lng: 6.96, n: 940 },
  { name: "Frankfurt", lat: 50.11, lng: 8.68, n: 1120 },
  { name: "Stuttgart", lat: 48.78, lng: 9.18, n: 720 },
  { name: "Düsseldorf", lat: 51.23, lng: 6.78, n: 640 },
  { name: "Leipzig", lat: 51.34, lng: 12.37, n: 580 },
  { name: "Bremen", lat: 53.08, lng: 8.8, n: 310 },
  { name: "Hannover", lat: 52.37, lng: 9.73, n: 420 },
  { name: "Nürnberg", lat: 49.45, lng: 11.08, n: 380 },
  { name: "Dortmund", lat: 51.51, lng: 7.47, n: 360 },
  { name: "Dresden", lat: 51.05, lng: 13.74, n: 340 },
  { name: "Essen", lat: 51.45, lng: 7.01, n: 290 },
  { name: "Münster", lat: 51.96, lng: 7.63, n: 230 },
  { name: "Freiburg", lat: 48.0, lng: 7.85, n: 210 },
  { name: "Kiel", lat: 54.32, lng: 10.14, n: 180 },
  { name: "Rostock", lat: 54.09, lng: 12.14, n: 150 },
  { name: "Zürich", lat: 47.37, lng: 8.55, n: 260 },
  { name: "Wien", lat: 48.21, lng: 16.37, n: 340 },
];

function latLngToVec3(lat: number, lng: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function Dots({ radius = 1.5 }: { radius?: number }) {
  // Fibonacci sphere of dots — looks like a globe grid
  const positions = useMemo(() => {
    const n = 1800;
    const arr = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      arr[i * 3] = Math.cos(theta) * r * radius;
      arr[i * 3 + 1] = y * radius;
      arr[i * 3 + 2] = Math.sin(theta) * r * radius;
    }
    return arr;
  }, [radius]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.012} color="#d4b96a" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function Pin({ position, name, n, onHover }: any) {
  const ref = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 2 + position.x * 3) * 0.15;
    ref.current.scale.setScalar(hover ? 1.8 : s);
  });
  return (
    <group position={position}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          onHover?.({ name, n });
        }}
        onPointerOut={() => {
          setHover(false);
          onHover?.(null);
        }}
      >
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color={hover ? "#ffd66b" : "#e6c274"} />
      </mesh>
      {/* soft halo */}
      <mesh>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#e6c274" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function Scene({ onHover }: { onHover: (v: any) => void }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.getElapsedTime() * 0.08;
  });
  const R = 1.5;
  return (
    <group ref={group}>
      {/* Core sphere — pitch black glossy */}
      <Sphere args={[R * 0.98, 64, 64]}>
        <meshPhysicalMaterial
          color="#0a0a0a"
          metalness={0.9}
          roughness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.2}
        />
      </Sphere>
      <Dots radius={R} />
      {CITIES.map((c) => (
        <Pin key={c.name} position={latLngToVec3(c.lat, c.lng, R * 1.01)} name={c.name} n={c.n} onHover={onHover} />
      ))}
    </group>
  );
}

export default function PropertyGlobe() {
  const [hover, setHover] = useState<{ name: string; n: number } | null>(null);
  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.25),transparent_60%)] blur-2xl" />
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 3, 5]} intensity={1.2} color="#fff5d6" />
        <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#8ab4ff" />
        <Suspense fallback={null}>
          <Scene onHover={setHover} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          rotateSpeed={0.6}
        />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="px-4 py-2 rounded-full bg-background/60 backdrop-blur-md border border-primary/20 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
          {hover ? (
            <span className="text-foreground">
              {hover.name} · {hover.n.toLocaleString("de-DE")} Objekte
            </span>
          ) : (
            <span>Ziehen · Erkunden · Deutschland live</span>
          )}
        </div>
      </div>
    </div>
  );
}
