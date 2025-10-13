"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import { Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

function genCloud(data: any, count: number) {
  const { median } = data;
  return new Float32Array(count * 3).map((_, i) => {
    const idx = Math.floor(Math.random() * median.length);
    return [
      (Math.random() - 0.5) * 10, // x variance
      median[idx] + (Math.random() - 0.5) * 5, // y along median
      (Math.random() - 0.5) * 2, // z depth
    ][i % 3];
  });
}

function ParticleCloud({ positions }: { positions: Float32Array }) {
  const meshRef = useRef<THREE.Points>(null!);
  const count = positions.length / 3;

  useFrame((state) => {
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.1; // Subtle rotation for "alive" feel
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5; // Billowing
  });

  return (
    <Points ref={meshRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        color="#34D399"
        size={0.05}
        sizeAttenuation={true}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </Points>
  );
}

function genSeries(n = 80) {
  // Simplified for particle gen
  const xs = Array.from({ length: n }, (_, i) => i);
  let v = 0;
  const median: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (Math.sin(i / 9) * 0.7 + Math.cos(i / 17) * 0.4) * 0.8;
    v += (Math.random() - 0.5) * 0.35;
    median.push(v);
  }
  return { median };
}

export default function HeroParticleCloud() {
  const data = useMemo(() => genSeries(96), []);
  const positions = useMemo(() => genCloud(data, 2000), [data]);

  return (
    <div className="h-[360px] w-full rounded-2xl border border-[#1B2431] bg-[#0E1420]/70 backdrop-blur-md overflow-hidden" style={{ boxShadow: "0 0 40px rgba(52,211,153,0.15)" }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <ParticleCloud positions={positions} />
        <EffectComposer>
          <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
