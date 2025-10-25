// Animation stress test component
import { useEffect, useState } from "react";
import type { FC } from "react";

interface AnimationStressTestProps {
  particleCount: number;
  animationDuration?: number;
  useRequestAnimationFrame?: boolean;
}

export const AnimationStressTest: FC<AnimationStressTestProps> = ({
  particleCount,
  animationDuration = 2000,
  useRequestAnimationFrame = true,
}) => {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string }[]
  >([]);

  useEffect(() => {
    // Initialize particles
    const initialParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 400,
      y: Math.random() * 400,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    }));

    setParticles(initialParticles);

    if (useRequestAnimationFrame) {
      let animationId: number;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed < animationDuration) {
          setParticles((prev) =>
            prev.map((p) => ({
              ...p,
              x: (p.x + Math.sin(elapsed / 100 + p.id) * 2) % 400,
              y: (p.y + Math.cos(elapsed / 100 + p.id) * 2) % 400,
            })),
          );
          animationId = requestAnimationFrame(animate);
        }
      };

      animationId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationId);
      };
    } else {
      // Use setInterval for comparison
      const interval = setInterval(() => {
        setParticles((prev) =>
          prev.map((p) => ({
            ...p,
            x: (p.x + Math.random() * 4 - 2) % 400,
            y: (p.y + Math.random() * 4 - 2) % 400,
          })),
        );
      }, 16); // ~60fps

      setTimeout(() => {
        clearInterval(interval);
      }, animationDuration);

      return () => {
        clearInterval(interval);
      };
    }
  }, [particleCount, animationDuration, useRequestAnimationFrame]);

  return (
    <div>
      <h3>Animation Stress Test</h3>
      <div
        style={{
          width: "400px",
          height: "400px",
          border: "1px solid #ccc",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {particles.map((particle) => (
          <div
            key={particle.id}
            style={{
              position: "absolute",
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: particle.color,
              transition: useRequestAnimationFrame
                ? "none"
                : "all 0.016s linear",
            }}
          />
        ))}
      </div>
      <p>
        Rendering {particleCount} particles
        {useRequestAnimationFrame ? " with RAF" : " with setInterval"}
      </p>
    </div>
  );
};
