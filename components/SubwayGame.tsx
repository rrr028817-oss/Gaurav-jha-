
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import AdUnit from './AdUnit';

interface SubwayGameProps {
  onClose: () => void;
}

const SubwayGame: React.FC<SubwayGameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const stateRef = useRef({
    lane: 0, // -1, 0, 1
    targetLane: 0,
    playerY: 0,
    isJumping: false,
    jumpVelocity: 0,
    obstacles: [] as { z: number; lane: number; type: 'train' | 'barrier' }[],
    speed: 0.1,
    distance: 0,
    lastObstacleZ: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem('subway_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const state = stateRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        state.targetLane = Math.max(-1, state.targetLane - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        state.targetLane = Math.min(1, state.targetLane + 1);
      } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !state.isJumping) {
        state.isJumping = true;
        state.jumpVelocity = 0.2;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const update = () => {
      // Move lanes smoothly
      state.lane += (state.targetLane - state.lane) * 0.2;

      // Handle Jump
      if (state.isJumping) {
        state.playerY += state.jumpVelocity;
        state.jumpVelocity -= 0.012;
        if (state.playerY <= 0) {
          state.playerY = 0;
          state.isJumping = false;
        }
      }

      // Progression
      state.distance += state.speed;
      state.speed += 0.00005;
      setScore(Math.floor(state.distance * 10));

      // Spawn obstacles
      if (state.distance - state.lastObstacleZ > 15) {
        const lane = Math.floor(Math.random() * 3) - 1;
        const type = Math.random() > 0.5 ? 'train' : 'barrier';
        state.obstacles.push({ z: state.distance + 100, lane, type });
        state.lastObstacleZ = state.distance;
      }

      // Update & Collision
      state.obstacles = state.obstacles.filter(obs => {
        const relativeZ = obs.z - state.distance;
        
        // Collision detection
        if (relativeZ < 2 && relativeZ > -2) {
            const laneDiff = Math.abs(obs.lane - state.lane);
            if (laneDiff < 0.5) {
                // Check height for barriers
                if (obs.type === 'barrier' && state.playerY > 0.5) {
                    // Jumped over it
                } else {
                   setGameState('gameover');
                   if (Math.floor(state.distance * 10) > highScore) {
                       setHighScore(Math.floor(state.distance * 10));
                       localStorage.setItem('subway_highscore', Math.floor(state.distance * 10).toString());
                   }
                }
            }
        }

        return relativeZ > -10;
      });
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const horizon = h * 0.4;
      
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // Draw perspective lanes
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      const laneWidth = 120;
      
      for (let i = -1.5; i <= 1.5; i++) {
        ctx.beginPath();
        const bottomX = w / 2 + i * laneWidth * 3;
        const topX = w / 2 + i * laneWidth * 0.5;
        ctx.moveTo(bottomX, h);
        ctx.lineTo(topX, horizon);
        ctx.stroke();
      }

      // Draw horizon
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff007a';
      ctx.strokeStyle = '#ff007a';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw ground stripes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      const stripeGap = 10;
      const offset = (state.distance * 10) % stripeGap;
      for (let z = 0; z < 100; z += stripeGap) {
        const drawZ = z - offset;
        if (drawZ < 0) continue;
        const screenY = horizon + (h - horizon) * (1 - 10 / (drawZ + 10));
        const currentW = laneWidth * 3 * (1 - 10 / (drawZ + 10));
        ctx.beginPath();
        ctx.moveTo(w / 2 - currentW, screenY);
        ctx.lineTo(w / 2 + currentW, screenY);
        ctx.stroke();
      }

      // Draw Obstacles
      state.obstacles.forEach(obs => {
        const relZ = obs.z - state.distance;
        if (relZ <= 0 || relZ > 100) return;

        const scale = 10 / (relZ + 10);
        const screenY = horizon + (h - horizon) * (1 - scale);
        const screenX = w / 2 + obs.lane * laneWidth * 3 * (1 - scale);
        const objW = 60 * scale;
        const objH = (obs.type === 'train' ? 120 : 40) * scale;

        ctx.fillStyle = obs.type === 'train' ? '#ff007a' : '#faff00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(screenX - objW / 2, screenY - objH, objW, objH);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(screenX - objW / 2, screenY - objH, objW, objH);
        ctx.shadowBlur = 0;
      });

      // Draw Player
      const pScreenY = h - 50 - (state.playerY * 100);
      const finalX = w / 2 + state.lane * (laneWidth * 1.5);

      ctx.fillStyle = '#39ff14';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#39ff14';
      const pSize = 40;
      ctx.fillRect(finalX - pSize / 2, pScreenY - pSize, pSize, pSize);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 20px Bangers';
      ctx.textAlign = 'center';
      ctx.fillText('S', finalX, pScreenY - 12);

      update();
      rafId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, highScore]);

  const startGame = () => {
    stateRef.current = {
        lane: 0,
        targetLane: 0,
        playerY: 0,
        isJumping: false,
        jumpVelocity: 0,
        obstacles: [],
        speed: 0.15,
        distance: 0,
        lastObstacleZ: 0,
    };
    setGameState('playing');
    setScore(0);
  };

  return (
    <div className="game-overlay">
      <div className="game-container">
        <div className="game-header">
            <span className="game-score">SCORE: {score}</span>
            <span className="game-highscore">BEST: {highScore}</span>
            <button className="game-close" onClick={onClose}>&times;</button>
        </div>
        
        <canvas ref={canvasRef} width={800} height={600} className="game-canvas" />

        {gameState === 'start' && (
            <div className="game-modal">
                <h2 className="game-title">SURF RUNNER</h2>
                <p>A/D or ARROWS to Move. SPACE to Jump.</p>
                <button className="game-btn" onClick={startGame}>INSERT COIN</button>
            </div>
        )}

        {gameState === 'gameover' && (
            <div className="game-modal game-over">
                <h2 className="game-title text-pink">BUSTED!</h2>
                <div className="final-score">SCORE: {score}</div>
                <div className="game-over-ad">
                  <AdUnit style={{ display: 'block', width: '250px', height: '100px', margin: '10px auto' }} />
                </div>
                <button className="game-btn" onClick={startGame}>RETRY</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SubwayGame;
