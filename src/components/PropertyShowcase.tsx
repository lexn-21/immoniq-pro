import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import { useRef as useR } from "react";

/**
 * PropertyShowcase — Apple-style pinned scroll section.
 * 3D Wohnkomplex, der sich beim Scrollen dreht und Datenkarten enthüllt.
 */

function Building() {
  const ref = useR<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.2;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={ref} scale={0.9}>
        {/* Tower 1 */}
        <mesh position={[-0.9, 0.4, 0]}>
          <boxGeometry args={[0.7, 2.2, 0.7]} />
          <meshStandardMaterial color="#111" metalness={0.75} roughness={0.28} />
        </mesh>
        {/* Tower 2 — taller, gold roof */}
        <mesh position={[0, 0.9, -0.4]}>
          <boxGeometry args={[0.85, 3.0, 0.85]} />
          <meshStandardMaterial color="#0d0d0d" metalness={0.8} roughness={0.22} />
        </mesh>
        <mesh position={[0, 2.55, -0.4]}>
          <boxGeometry args={[0.9, 0.12, 0.9]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.95} roughness={0.12} />
        </mesh>
        {/* Tower 3 */}
        <mesh position={[0.95, 0.2, 0.1]}>
          <boxGeometry args={[0.6, 1.8, 0.6]} />
          <meshStandardMaterial color="#141414" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Windows grid — glowing */}
        {Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 3 }).map((_, c) => (
            <mesh key={`w-${r}-${c}`} position={[-0.9 + (c - 1) * 0.2, -0.4 + r * 0.35, 0.36]}>
              <planeGeometry args={[0.08, 0.14]} />
              <meshBasicMaterial color={(r + c) % 3 === 0 ? "#f0d78c" : "#2a2416"} />
            </mesh>
          )),
        )}
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 3 }).map((_, c) => (
            <mesh key={`w2-${r}-${c}`} position={[0 + (c - 1) * 0.22, -0.4 + r * 0.35, -0.04]}>
              <planeGeometry args={[0.09, 0.14]} />
              <meshBasicMaterial color={(r * c + r) % 4 === 0 ? "#f0d78c" : "#221c0f"} />
            </mesh>
          )),
        )}
        {/* Ground plate */}
        <mesh position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 2.4, 48]} />
          <meshBasicMaterial color="#c9a84c" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </Float>
  );
}

export default function PropertyShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const cards = [
    { k: "€ 487.200", l: "Marktwert", pos: "top-[12%] left-[4%]" },
    { k: "+4,2 %",    l: "12 Monate",   pos: "top-[22%] right-[4%]" },
    { k: "3,8 %",     l: "Bruttorendite", pos: "bottom-[26%] left-[2%]" },
    { k: "AES-256",   l: "verschlüsselt", pos: "bottom-[14%] right-[6%]" },
  ];

  return (
    <section ref={ref} className="relative border-t border-border/40 overflow-hidden">
      <div className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
            Deine Immobilie — dreidimensional
          </p>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,7vw,4.5rem)]">
            Nicht nur eine App.
            <br />
            <span className="text-gradient-gold">Ein digitaler Zwilling.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Marktwert, Cashflow, Verträge, Steuer — verankert an einem 3D-Objekt,
            das deine Immobilie repräsentiert. Nicht Excel. Nicht Ordner. Ein Ort.
          </p>
        </div>

        <motion.div style={{ y, opacity }} className="relative aspect-[16/10] md:aspect-[16/9] max-w-5xl mx-auto">
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl blur-3xl opacity-30" style={{ background: "radial-gradient(ellipse at center, hsl(38 55% 55% / 0.5), transparent 60%)" }} />

          <Suspense fallback={<div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary/5 to-transparent" />}>
            <Canvas camera={{ position: [3.5, 2, 5], fov: 40 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 8, 5]} intensity={1.4} color="#f0d78c" />
              <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#4a3a1a" />
              <pointLight position={[0, 3, 2]} intensity={1.5} color="#c9a84c" distance={10} />
              <Building />
              <Environment preset="night" />
            </Canvas>
          </Suspense>

          {/* Floating data cards */}
          {cards.map((c, i) => (
            <motion.div
              key={c.l}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute ${c.pos} backdrop-blur-xl bg-background/60 border border-border/40 rounded-2xl px-4 py-3 shadow-[0_20px_60px_-20px_rgba(201,168,76,0.25)]`}
            >
              <div className="font-display text-lg md:text-xl tabular-nums text-gradient-gold">{c.k}</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">{c.l}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
