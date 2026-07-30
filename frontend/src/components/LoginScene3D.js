import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function CoreShape({ mouse }) {
  const mesh = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.x = Math.sin(t * 0.15) * 0.2 + mouse.current.y * 0.3;
      mesh.current.rotation.y = Math.sin(t * 0.1) * 0.3 + mouse.current.x * 0.5;
      mesh.current.position.y = Math.sin(t * 0.2) * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh} scale={1.8}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color="#10B981"
          emissive="#10B981"
          emissiveIntensity={0.08}
          roughness={0.2}
          metalness={0.8}
          distort={0.15}
          speed={2}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function InnerShape({ mouse }) {
  const mesh = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.x = Math.sin(t * 0.2 + 1) * 0.3 - mouse.current.y * 0.2;
      mesh.current.rotation.y = Math.sin(t * 0.15 + 1) * 0.4 + mouse.current.x * 0.3;
      mesh.current.position.y = Math.sin(t * 0.25 + 1) * 0.1;
    }
  });

  return (
    <mesh ref={mesh} scale={0.7}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color="#34D399"
        emissive="#10B981"
        emissiveIntensity={0.05}
        transparent
        opacity={0.15}
        roughness={0.1}
        metalness={0.9}
      />
    </mesh>
  );
}

function Particles({ count = 200 }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, [count]);

  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#10B981" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function Rings() {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.1;
      ref.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={ref}>
      {[0, 1, 2].map(i => (
        <mesh key={i} rotation={[Math.PI / 2, 0, i * Math.PI * 0.33]} position={[0, (i - 1) * 0.5, 0]}>
          <torusGeometry args={[1.6 + i * 0.2, 0.008, 16, 100]} />
          <meshBasicMaterial color="#10B981" transparent opacity={0.08 * (1 - i * 0.2)} />
        </mesh>
      ))}
    </group>
  );
}

function Scene3D() {
  const mouse = useRef({ x: 0, y: 0 });

  const handleMouse = useCallback((e) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [handleMouse]);

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#05070A']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />
      <directionalLight position={[-2, -1, 3]} intensity={0.3} color="#10B981" />
      <pointLight position={[0, 0, 3]} intensity={0.2} color="#10B981" />
      <Particles />
      <Rings />
      <CoreShape mouse={mouse} />
      <InnerShape mouse={mouse} />
    </Canvas>
  );
}

export default Scene3D;
