import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, Sparkles, ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useInView } from "@/hooks/useInView";

/**
 * HeroWorld — Apple-grade 3D stage.
 * Obsidian data-globe with gold DE pins, floating architectural home,
 * mouse parallax, cinematic intro, prefers-reduced-motion aware.
 */

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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cb = () => setReduced(m.matches);
    cb();
    m.addEventListener?.("change", cb);
    return () => m.removeEventListener?.("change", cb);
  }, []);
  return reduced;
}

type ScrollRef = React.MutableRefObject<{ v: number }>;

function Globe({ reduced, scrollRef, isMobile }: { reduced: boolean; scrollRef: ScrollRef; isMobile: boolean }) {
  const globeRef = useRef<THREE.Group>(null);
  const dotsRef = useRef<THREE.Points>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const pinsRef = useRef<Array<THREE.Mesh | null>>([]);
  const auraRef = useRef<THREE.Mesh>(null);
  const autoRotRef = useRef(0);

  const dots = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    const N = isMobile ? 550 : 1100;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = phi * i;
      arr.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(1.505));
    }
    return arr;
  }, []);

  const pins = useMemo(
    () => CITIES.map((c) => ({ name: c[0], pos: latLonToVec3(c[1], c[2], 1.52), size: c[3] })),
    [],
  );

  const introRef = useRef(0); // 0..1, one-shot reveal for reduced motion

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const s = scrollRef.current.v; // 0..1

    if (reduced) {
      // One-shot cinematic intro: ~1.4s ease-out, then hold.
      if (introRef.current < 1) {
        introRef.current = Math.min(1, introRef.current + dt / 1.4);
      }
      const p = introRef.current;
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic

      if (globeRef.current) {
        globeRef.current.rotation.y = -0.6 + eased * 0.6;
        globeRef.current.rotation.x = 0.35;
        globeRef.current.rotation.z = 0.05;
        globeRef.current.scale.setScalar(0.94 + eased * 0.06);
      }
      if (dotsRef.current) {
        const mat = dotsRef.current.material as THREE.PointsMaterial;
        mat.opacity = eased * 0.7;
      }
      if (wireRef.current) {
        const mat = wireRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = eased * 0.28;
      }
      pinsRef.current.forEach((m) => {
        if (!m) return;
        m.scale.setScalar(1);
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = eased * 0.28;
      });
      if (auraRef.current) {
        const mat = auraRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = eased * 0.06;
        auraRef.current.scale.setScalar(1);
      }
      return;
    }

    // Ambient auto-rotation + scroll acceleration
    if (globeRef.current) {
      autoRotRef.current += dt * 0.09;
      globeRef.current.rotation.y = autoRotRef.current + s * 2.4;
      globeRef.current.rotation.x = 0.35 - s * 0.55;
      globeRef.current.rotation.z = 0.05 + s * 0.2;
      const sc = 1 + s * 0.08;
      globeRef.current.scale.setScalar(sc);
    }
    if (dotsRef.current) {
      const scatter = 1 + s * 0.18;
      dotsRef.current.scale.setScalar(scatter);
      const mat = dotsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.7 + s * 0.25;
      mat.size = 0.018 + s * 0.012;
    }
    if (wireRef.current) {
      const mat = wireRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28 + s * 0.4;
    }
    pinsRef.current.forEach((m, i) => {
      if (!m) return;
      const sPulse = 1 + Math.sin(t * 2 + i * 0.7) * 0.25 + s * 0.35;
      m.scale.setScalar(sPulse);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + Math.max(0, Math.sin(t * 2 + i * 0.7)) * 0.25 + s * 0.2;
    });
    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 + Math.sin(t * 0.8) * 0.02 + s * 0.15;
      auraRef.current.scale.setScalar(1 + s * 0.12);
    }
  });

  return (
    <group ref={globeRef} rotation={[0.35, 0, 0.05]}>
      <mesh>
        <sphereGeometry args={[1.5, 96, 96]} />
        <meshPhysicalMaterial
          color="#08080a"
          metalness={0.9}
          roughness={0.28}
          clearcoat={0.6}
          clearcoatRoughness={0.35}
        />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[1.508, 48, 48]} />
        <meshBasicMaterial color="#3a2f18" wireframe transparent opacity={0.28} />
      </mesh>
      <points ref={dotsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(dots.flatMap((d) => [d.x, d.y, d.z])), 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.018} color="#c9a84c" transparent opacity={0.7} sizeAttenuation />
      </points>
      {pins.map((p, i) => (
        <group key={i} position={p.pos}>
          <mesh>
            <sphereGeometry args={[0.028 * p.size, 16, 16]} />
            <meshStandardMaterial
              color="#f0d78c"
              emissive="#f0d78c"
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={(el) => (pinsRef.current[i] = el)}>
            <sphereGeometry args={[0.08 * p.size, 16, 16]} />
            <meshBasicMaterial color="#c9a84c" transparent opacity={0.28} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.28, 6]} />
            <meshBasicMaterial color="#f0d78c" transparent opacity={0.55} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh ref={auraRef}>
        <sphereGeometry args={[1.66, 48, 48]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function FloatingHouse({ reduced }: { reduced: boolean }) {
  const houseRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (houseRef.current && !reduced) {
      houseRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  return (
    <Float speed={reduced ? 0 : 1.4} rotationIntensity={reduced ? 0 : 0.2} floatIntensity={reduced ? 0 : 0.6}>
      <group ref={houseRef} position={[1.95, 1.0, 0.3]} scale={0.5}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.9, 0.9]} />
          <meshPhysicalMaterial color="#151517" metalness={0.7} roughness={0.22} clearcoat={0.4} />
        </mesh>
        <mesh position={[0, 0.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.88, 0.55, 4]} />
          <meshStandardMaterial
            color="#c9a84c"
            metalness={0.95}
            roughness={0.12}
            emissive="#3a2a10"
            emissiveIntensity={0.4}
          />
        </mesh>
        <mesh position={[0.35, 0.05, 0.451]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial color="#f5deA0" toneMapped={false} />
        </mesh>
        <mesh position={[-0.35, 0.05, 0.451]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial color="#f5deA0" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.22, 0.451]}>
          <planeGeometry args={[0.22, 0.42]} />
          <meshBasicMaterial color="#2a2010" />
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 1.15, 48]} />
          <meshBasicMaterial color="#c9a84c" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </Float>
  );
}

function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera, size } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const mounted = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = ((e.clientX / window.innerWidth) - 0.5) * 2;
      target.current.y = ((e.clientY / window.innerHeight) - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, dt) => {
    mounted.current = Math.min(1, mounted.current + dt * 0.5);
    const ease = 1 - Math.pow(1 - mounted.current, 3);
    // Cinematic intro: start pulled-back, settle in
    const baseZ = size.width < 640 ? 5.8 : 4.8;
    const targetZ = baseZ + (1 - ease) * 2.5;
    const parX = reduced ? 0 : target.current.x * 0.35;
    const parY = reduced ? 0.4 : 0.4 - target.current.y * 0.2;
    camera.position.x += (parX - camera.position.x) * Math.min(1, dt * 3);
    camera.position.y += (parY - camera.position.y) * Math.min(1, dt * 3);
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 2);
    camera.lookAt(0, 0.2, 0);
  });
  return null;
}

function Scene({ reduced, scrollRef, isMobile }: { reduced: boolean; scrollRef: ScrollRef; isMobile: boolean }) {
  return (
    <>
      <CameraRig reduced={reduced} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.3} color="#f0d78c" castShadow={!isMobile} />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#3a2f18" />
      <pointLight position={[3, 2.4, 2]} intensity={2.2} color="#c9a84c" distance={9} />
      <Globe reduced={reduced} scrollRef={scrollRef} isMobile={isMobile} />
      <FloatingHouse reduced={reduced} />
      <Sparkles count={isMobile ? 22 : 50} scale={7} size={2.2} speed={reduced ? 0 : 0.35} color="#f0d78c" opacity={0.65} />
      {!isMobile && (
        <ContactShadows position={[0, -1.7, 0]} opacity={0.5} scale={8} blur={2.6} far={4} color="#000" />
      )}
      <Environment preset="night" />
    </>
  );
}

export default function HeroWorld() {
  const reduced = usePrefersReducedMotion();
  const [inViewRef, inView] = useInView<HTMLDivElement>("200px");
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef({ v: 0 });
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!reduced) return;
    const id = window.setTimeout(() => setIntroDone(true), 1600);
    return () => window.clearTimeout(id);
  }, [reduced]);

  // Merge external inViewRef with containerRef
  const setRefs = (el: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    (inViewRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height + vh;
      const traveled = vh - rect.top;
      const p = Math.min(1, Math.max(0, traveled / total));
      scrollRef.current.v = p;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  return (
    <div
      ref={setRefs}
      className="group relative aspect-square w-full max-w-[560px] sm:max-w-[600px] md:max-w-[640px] mx-auto touch-none select-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      role="img"
      aria-labelledby="hero-globe-title"
      aria-describedby="hero-globe-desc"
      tabIndex={0}
    >
      {/* Screenreader-only Alternative */}
      <h2 id="hero-globe-title" className="sr-only">
        Interaktiver 3D-Globus des deutschen Immobilienmarktes
      </h2>
      <p id="hero-globe-desc" className="sr-only">
        Dreidimensionale Visualisierung: Ein goldenes Haus schwebt vor einem
        dunklen, langsam rotierenden Globus mit leuchtenden Markierungen für
        Berlin, Hamburg, München, Köln, Frankfurt, Stuttgart und weitere deutsche
        Städte. Umliegende Datenpunkte symbolisieren die Live-Abdeckung von
        8.187 Postleitzahlen. Die Grafik ist rein dekorativ; alle Funktionen
        der Seite sind auch ohne sie erreichbar.
      </p>

      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle at 60% 40%, hsl(38 55% 55% / 0.55), transparent 65%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3 blur-2xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, hsl(38 55% 55% / 0.35), transparent 70%)" }}
      />
      <Suspense fallback={<div aria-hidden="true" className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-transparent" />}>
        <div aria-hidden="true" className="absolute inset-0">
          <Canvas
            camera={{ position: [0, 0.4, 7.5], fov: 50 }}
            dpr={isMobile ? [1, 1.5] : [1, 2]}
            frameloop={reduced && introDone ? "never" : inView ? "always" : "never"}
            gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
            style={{ background: "transparent" }}
          >
            <Scene reduced={reduced} scrollRef={scrollRef} isMobile={isMobile} />
          </Canvas>
        </div>
      </Suspense>
      <div
        className="absolute bottom-4 left-4 md:bottom-6 md:left-6 backdrop-blur-xl bg-background/40 border border-border/40 rounded-full px-3 py-1.5 text-[10px] tracking-[0.24em] uppercase text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-primary mr-2 animate-pulse" />
        <span className="sr-only">Status: </span>Live · 8.187 PLZ
      </div>
    </div>
  );
}
