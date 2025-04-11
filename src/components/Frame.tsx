"use client";

import { useEffect, useCallback, useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { useFrameSDK } from "~/hooks/useFrameSDK";
import { SCORE_THRESHOLD, INITIAL_LIVES } from "~/lib/constants";

interface Collectible {
  x: number;
  y: number;
  type: "💎" | "🪙";
  id: number;
}

interface Player {
  x: number;
  y: number;
}

export default function Frame() {
  const { isSDKLoaded } = useFrameSDK();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [player, setPlayer] = useState<Player>({ x: 150, y: 250 });
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [lastCollectibleId, setLastCollectibleId] = useState(0);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setPlayer(prev => ({
      x: Math.max(0, Math.min(280, prev.x + dx)),
      y: Math.max(0, Math.min(280, prev.y + dy))
    }));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
      case "ArrowLeft": movePlayer(-10, 0); break;
      case "ArrowRight": movePlayer(10, 0); break;
      case "ArrowUp": movePlayer(0, -10); break;
      case "ArrowDown": movePlayer(0, 10); break;
    }
  }, [movePlayer]);

  const handleTouch = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setPlayer({ x, y });
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setCollectibles(prev => {
        const newCollectible: Collectible = {
          x: Math.random() * 280,
          y: 0,
          type: Math.random() > 0.5 ? "💎" : "🪙",
          id: lastCollectibleId + 1
        };
        setLastCollectibleId(prev => prev + 1);
        
        return [...prev, newCollectible];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [gameOver, lastCollectibleId]);

  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setCollectibles(prev => {
        const newCollectibles = prev.map(c => ({...c, y: c.y + 2}));
        
        // Check collisions
        const collisions = newCollectibles.filter(c => 
          Math.abs(c.x - player.x) < 20 && Math.abs(c.y - player.y) < 20
        );
        
        collisions.forEach(c => {
          setScore(prev => prev + (c.type === "💎" ? 200 : 100));
        });

        // Remove collected and out-of-bounds collectibles
        const remaining = newCollectibles.filter(c => 
          c.y < 300 && !collisions.includes(c)
        );

        // Check for missed collectibles
        const missed = newCollectibles.filter(c => c.y >= 300).length;
        if (missed > 0) {
          setLives(prev => {
            const newLives = prev - missed;
            if (newLives <= 0) setGameOver(true);
            return newLives;
          });
        }

        return remaining;
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameOver, player]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchmove", handleTouch);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, [handleKeyDown, handleTouch]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  if (gameOver) {
    return (
      <div className="w-[300px] mx-auto py-2 px-2">
        <Card>
          <CardContent className="text-center p-4">
            <h2 className="text-xl font-bold">Game Over!</h2>
            <p className="mt-2">Final Score: {score}</p>
            {score >= SCORE_THRESHOLD && 
              <p className="mt-2 text-green-500">You won! 🎉</p>
            }
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="w-[300px] h-[300px] mx-auto relative bg-gray-100 touch-none"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute top-2 left-2">
        Score: {score}
      </div>
      <div className="absolute top-2 right-2">
        Lives: {"❤️".repeat(lives)}
      </div>
      
      {collectibles.map(collectible => (
        <div
          key={collectible.id}
          className="absolute text-2xl"
          style={{
            left: collectible.x,
            top: collectible.y,
          }}
        >
          {collectible.type}
        </div>
      ))}
      
      <div
        className="absolute text-2xl"
        style={{
          left: player.x,
          top: player.y,
          transform: 'translate(-50%, -50%)'
        }}
      >
        🎩
      </div>
    </div>
  );
}
