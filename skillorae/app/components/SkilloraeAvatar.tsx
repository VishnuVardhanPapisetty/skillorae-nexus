"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Environment } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function HumanModel() {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={group} position={[0, -1.7, 0]}>
      {/* Head */}
      <mesh position={[0, 2.9, 0]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#d8b08c" />
      </mesh>

      {/* Body */}
      <mesh position={[0, 1.65, 0]}>
        <capsuleGeometry args={[0.55, 1.35, 8, 24]} />
        <meshStandardMaterial
          color="#111827"
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.75, 1.7, 0]}>
        <capsuleGeometry args={[0.16, 1.25, 8, 16]} />
        <meshStandardMaterial
          color="#111827"
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>

      {/* Right arm */}
      <mesh position={[0.75, 1.7, 0]}>
        <capsuleGeometry args={[0.16, 1.25, 8, 16]} />
        <meshStandardMaterial
          color="#111827"
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.32, 0.25, 0]}>
        <capsuleGeometry args={[0.2, 1.6, 8, 16]} />
        <meshStandardMaterial
          color="#172033"
          metalness={0.3}
          roughness={0.45}
        />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.32, 0.25, 0]}>
        <capsuleGeometry args={[0.2, 1.6, 8, 16]} />
        <meshStandardMaterial
          color="#172033"
          metalness={0.3}
          roughness={0.45}
        />
      </mesh>

      {/* Core */}
      <mesh position={[0, 1.65, 0.58]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={3}
        />
      </mesh>
    </group>
  );
}

export default function SkilloraeAvatar() {
  return (
    <div className="h-[560px] w-full overflow-hidden rounded-3xl bg-[#050816]">
      <Canvas camera={{ position: [0, 1.2, 6], fov: 45 }}>
        <ambientLight intensity={0.8} />

        <directionalLight position={[4, 6, 4]} intensity={2} />

        <pointLight position={[-4, 2, 3]} intensity={25} distance={10} />

        <Environment preset="city" />

        <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.4}>
          <HumanModel />
        </Float>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}
