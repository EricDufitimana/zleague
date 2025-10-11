'use client';

import { useEffect, useRef, useState } from 'react';

interface Team {
  id: number;
  name: string;
  grade: string;
  gender: string;
  created_at: string;
}

interface ImprovedWheelProps {
  teams: Team[];
  onSelectWinner?: (winner: Team) => void;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  size?: number;
}

export const ImprovedWheel: React.FC<ImprovedWheelProps> = ({
  teams,
  onSelectWinner,
  isSpinning,
  onSpinComplete,
  size = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [angle, setAngle] = useState(0);
  const animationRef = useRef<number | null>(null);

  const drawWheel = (ctx: CanvasRenderingContext2D, size: number) => {
    const numSlices = teams.length;
    if (numSlices === 0) return;
    
    const arc = (2 * Math.PI) / numSlices;
    const wheelRadius = size / 2 - 5;
    const wheelBorder = 3;
    const centerRadius = 30;

    // Clear the canvas
    ctx.clearRect(0, 0, size, size);

    // Draw wheel background
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, wheelRadius + wheelBorder, 0, 2 * Math.PI);
    ctx.fillStyle = "#ddd";
    ctx.fill();

    // Move to center for rotating
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angle);

    // Color palette for wheel segments
    const colors = [
      '#22c55e', '#16a34a', '#15803d', '#f97316', '#ea580c', '#dc2626',
      '#a16207', '#92400e', '#78350f', '#d97706', '#3b82f6', '#1d4ed8',
      '#7c3aed', '#6d28d9', '#ec4899', '#be185d'
    ];

    // Draw each slice - starting from the right (0 radians) and going clockwise
    teams.forEach((team, i) => {
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, startAngle, endAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Draw slice border
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, startAngle, endAngle);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.translate(wheelRadius / 2 + 10, 0);
      ctx.rotate(Math.PI / 2);
      ctx.rotate(Math.PI / 2);

      const fontSize = Math.min(18, 200 / Math.max(5, numSlices));
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";

      // Truncate long names
      let displayName = team.name;
      const maxChars = 17;
      if (team.name.length > maxChars) {
        displayName = team.name.slice(0, maxChars) + "...";
      }

      ctx.fillText(displayName, 0, 0);
      ctx.restore();
    });

    // Restore context for absolute positioning
    ctx.restore();

    // Draw center circle with gradient
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, centerRadius, 0, 2 * Math.PI);

    const centerGradient = ctx.createRadialGradient(
      size / 2 - 5,
      size / 2 - 5,
      0,
      size / 2,
      size / 2,
      centerRadius
    );
    centerGradient.addColorStop(0, "#fff");
    centerGradient.addColorStop(1, "#f0f0f0");

    ctx.fillStyle = centerGradient;
    ctx.fill();

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pointer at the top
    ctx.beginPath();
    ctx.fillStyle = "#e74c3c";
    ctx.moveTo(size / 2 - 10, 10);
    ctx.lineTo(size / 2 + 10, 10);
    ctx.lineTo(size / 2, 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.offsetWidth;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = size * devicePixelRatio;
    canvas.height = size * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    drawWheel(ctx, size);
  }, [teams, angle]);

  const spinWheel = () => {
    if (isSpinning || teams.length < 2) return;

    const duration = 5500;
    const segmentSize = (2 * Math.PI) / teams.length;

    // Randomize the starting angle for true randomness
    const startingAngle = Math.random() * 2 * Math.PI;
    const randomOffset = Math.random() * segmentSize;
    const finalAngle = startingAngle + 12 * Math.PI + randomOffset;

    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Use cubic easing for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const newAngle = startingAngle + (finalAngle - startingAngle) * easedProgress;

      setAngle(newAngle);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Calculate the winner
        const normalizedAngle = ((newAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const offsetAngle = (normalizedAngle + Math.PI / 2) % (2 * Math.PI);
        const winnerIndex = teams.length - 1 - (Math.floor(offsetAngle / segmentSize) % teams.length);

        const winner = teams[winnerIndex];
        console.log(`Winner: ${winner.name} (index: ${winnerIndex})`);

        if (onSelectWinner) {
          onSelectWinner(winner);
        }

        if (onSpinComplete) {
          onSpinComplete();
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          className="block rounded-full shadow-lg"
          style={{ 
            width: `${size}px`, 
            height: `${size}px`,
            cursor: teams.length < 2 ? 'not-allowed' : 'pointer',
            opacity: teams.length < 2 ? 0.5 : 1
          }}
          onClick={spinWheel}
        />
      </div>
    </div>
  );
};
