import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Stars } from "@react-three/drei";
import { useRef, useMemo, useState, Suspense, useEffect } from "react";
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

const GOLD = new THREE.Color("#e6c274");
const GOLD_HOT = new THREE.Color("#ffe08a");

function latLngToVec3(lat: number, lng: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// easeOutBack for the pop-in "wow" feel
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = Math.min(1, Math.max(0, x));
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function Dots({ radius = 1.5, intro }: { radius?: number; intro: React.MutableRefObject<number> }) {
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

  const matRef = useRef<THREE.PointsMaterial>(null);
  useFrame(() => {
    if (!matRef.current) return;
    const p = easeOutCubic(intro.current);
    matRef.current.opacity = 0.55 * p;
    matRef.current.size = 0.012 * (0.4 + 0.6 * p);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} size={0.012} color="#d4b96a" transparent opacity={0} sizeAttenuation />
    </points>
  );
}

// Rotating wireframe ring — HUD-Feel
function EquatorRing({ radius }: { radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.15;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 1.28, radius * 1.3, 128]} />
      <meshBasicMaterial color={GOLD} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface PinProps {
  position: THREE.Vector3;
  name: string;
  n: number;
  index: number;
  hoveredName: string | null;
  onHover: (v: { name: string; n: number } | null) => void;
  intro: React.MutableRefObject<number>;
}

function Pin({ position, name, n, index, hoveredName, onHover, intro }: PinProps) {
  const groupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const dotMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const isHover = hoveredName === name;

  // Stagger the pop per pin.
  const delay = (index / CITIES.length) * 0.6;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const local = Math.min(1, Math.max(0, (intro.current - delay) / 0.4));
    const popped = easeOutBack(local);

    if (groupRef.current) {
      const base = 0.9 + Math.sin(t * 2 + position.x * 3) * 0.1;
      const target = isHover ? 2.2 : base;
      groupRef.current.scale.setScalar(popped * target);
    }
    if (beamRef.current) {
      const pulse = 0.5 + Math.sin(t * 3 + index) * 0.5;
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (isHover ? 0.9 : 0.15 + 0.25 * pulse) * local;
      beamRef.current.scale.y = isHover ? 1.4 : 1;
    }
    if (haloRef.current) {
      const halo = 1 + Math.sin(t * 2.2 + index) * 0.15;
      haloRef.current.scale.setScalar(isHover ? halo * 2.6 : halo);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (isHover ? 0.35 : 0.15) * local;
    }
    if (dotMatRef.current) {
      dotMatRef.current.color.lerpColors(GOLD, GOLD_HOT, isHover ? 1 : 0);
    }
  });

  // Vertical beam along surface normal.
  const beamHeight = 0.18;
  const beamPos = position.clone().normalize().multiplyScalar(position.length() + beamHeight / 2);
  const beamQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    position.clone().normalize(),
  );

  return (
    <>
      <group ref={groupRef} position={position}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover({ name, n });
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "";
          }}
        >
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshBasicMaterial ref={dotMatRef} color={GOLD} />
        </mesh>
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.15} />
        </mesh>
      </group>
      {/* Light beam rising from the pin */}
      <mesh ref={beamRef} position={beamPos} quaternion={beamQuat}>
        <cylinderGeometry args={[0.004, 0.001, beamHeight, 8, 1, true]} />
        <meshBasicMaterial color={GOLD_HOT} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function Scene({
  hoveredName,
  onHover,
}: {
  hoveredName: string | null;
  onHover: (v: { name: string; n: number } | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const intro = useRef(0);
  const R = 1.5;

  useFrame((_, delta) => {
    // Slow, smooth intro over ~1.4s
    if (intro.current < 1) {
      intro.current = Math.min(1, intro.current + delta / 1.4);
    }
    if (group.current) {
      const p = easeOutCubic(intro.current);
      group.current.scale.setScalar(0.3 + 0.7 * p);
      group.current.rotation.y += delta * 0.08;
    }
    if (sphereRef.current) {
      const p = easeOutCubic(intro.current);
      const mat = sphereRef.current.material as THREE.MeshPhysicalMaterial;
      mat.opacity = p;
    }
  });

  return (
    <group ref={group}>
      <Sphere ref={sphereRef} args={[R * 0.98, 64, 64]}>
        <meshPhysicalMaterial
          color="#0a0a0a"
          metalness={0.9}
          roughness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.2}
          transparent
          opacity={0}
        />
      </Sphere>
      <Dots radius={R} intro={intro} />
      <EquatorRing radius={R} />
      {CITIES.map((c, i) => (
        <Pin
          key={c.name}
          index={i}
          position={latLngToVec3(c.lat, c.lng, R * 1.01)}
          name={c.name}
          n={c.n}
          hoveredName={hoveredName}
          onHover={onHover}
          intro={intro}
        />
      ))}
    </group>
  );
}

export default function PropertyGlobe() {
  const [hover, setHover] = useState<{ name: string; n: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger CSS pop of the container after first paint.
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={`relative w-full aspect-square max-w-[560px] mx-auto transition-all duration-700 ease-out ${
        mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
      }`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.35),transparent_60%)] blur-3xl" />
      {/* Rotating conic accent */}
      <div
        className="absolute inset-6 rounded-full opacity-40 blur-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, hsl(var(--primary)/0.5), transparent, hsl(var(--primary)/0.3), transparent)",
          animation: "spin 12s linear infinite",
        }}
      />

      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 3, 5]} intensity={1.4} color="#fff5d6" />
        <directionalLight position={[-4, -2, -3]} intensity={0.5} color="#8ab4ff" />
        <Suspense fallback={null}>
          <Stars radius={30} depth={40} count={800} factor={2} saturation={0} fade speed={0.4} />
          <Scene hoveredName={hover?.name ?? null} onHover={setHover} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={!hover}
          autoRotateSpeed={0.6}
          rotateSpeed={0.7}
        />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div
          key={hover?.name ?? "idle"}
          className="animate-fade-in px-4 py-2 rounded-full bg-background/60 backdrop-blur-md border border-primary/20 text-[11px] tracking-[0.2em] uppercase text-muted-foreground"
        >
          {hover ? (
            <span className="text-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 align-middle animate-pulse" />
              {hover.name} · {hover.n.toLocaleString("de-DE")} Objekte
            </span>
          ) : (
            <span>Ziehen · Erkunden · Deutschland live</span>
          )}
        </div>
      </div>

      {/* Corner ticks */}
      <div className="pointer-events-none absolute inset-0">
        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-4 h-4 border-primary/40`}
            style={{
              borderTopWidth: pos.includes("top") ? 1 : 0,
              borderBottomWidth: pos.includes("bottom") ? 1 : 0,
              borderLeftWidth: pos.includes("left") ? 1 : 0,
              borderRightWidth: pos.includes("right") ? 1 : 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
