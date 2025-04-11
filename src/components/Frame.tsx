"use client";

import { useEffect, useCallback, useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { useFrameSDK } from "~/hooks/useFrameSDK";
import { 
  SCORE_THRESHOLD, 
  INITIAL_LIVES, 
  CELL_SIZE, 
  MAZE_WIDTH, 
  MAZE_HEIGHT,
  MAZE_LAYOUT 
} from "~/lib/constants";

interface Position {
  x: number;
  y: number;
}

interface Dot {
  x: number;
  y: number;
  eaten: boolean;
}

export default function Frame() {
  const { isSDKLoaded } = useFrameSDK();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [playerPos, setPlayerPos] = useState<Position>(() => {
    const startPos = { x: 0, y: 0 };
    MAZE_LAYOUT.forEach((row, y) => {
      const x = row.indexOf('P');
      if (x !== -1) {
        startPos.x = x;
        startPos.y = y;
      }
    });
    return startPos;
  });
  const [dots, setDots] = useState<Dot[]>(() => {
    const dotsArray: Dot[] = [];
    MAZE_LAYOUT.forEach((row, y) => {
      row.split('').forEach((cell, x) => {
        if (cell === ' ') {
          dotsArray.push({ x, y, eaten: false });
        }
      });
    });
    return dotsArray;
  });

  const isValidMove = useCallback((x: number, y: number) => {
    return x >= 0 && x < MAZE_WIDTH && y >= 0 && y < MAZE_HEIGHT && MAZE_LAYOUT[y][x] !== '#';
  }, []);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setPlayerPos(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      if (isValidMove(newX, newY)) {
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [isValidMove]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
      case "ArrowLeft": movePlayer(-1, 0); break;
      case "ArrowRight": movePlayer(1, 0); break;
      case "ArrowUp": movePlayer(0, -1); break;
      case "ArrowDown": movePlayer(0, 1); break;
    }
  }, [movePlayer]);

  const handleTouch = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const cellX = Math.floor(touchX / CELL_SIZE);
    const cellY = Math.floor(touchY / CELL_SIZE);
    
    if (isValidMove(cellX, cellY)) {
      setPlayerPos({ x: cellX, y: cellY });
    }
  }, [isValidMove]);

  useEffect(() => {
    if (gameOver) return;

    // Check for dot collection
    setDots(prev => {
      let updated = false;
      const newDots = prev.map(dot => {
        if (!dot.eaten && dot.x === playerPos.x && dot.y === playerPos.y) {
          setScore(s => s + 10);
          updated = true;
          return { ...dot, eaten: true };
        }
        return dot;
      });

      // Check if all dots are eaten
      if (updated && newDots.every(dot => dot.eaten)) {
        setGameOver(true);
      }

      return updated ? newDots : prev;
    });
  }, [gameOver, playerPos]);

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
      className="w-[300px] h-[300px] mx-auto relative touch-none"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute top-2 left-2 z-10 font-bold text-foreground">
        Score: {score}
      </div>
      <div className="absolute top-2 right-2 z-10 text-red-500">
        {"❤️".repeat(lives)}
      </div>
      
      <div className="grid gap-0" style={{
        gridTemplateColumns: `repeat(${MAZE_WIDTH}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${MAZE_HEIGHT}, ${CELL_SIZE}px)`
      }}>
        {MAZE_LAYOUT.map((row, y) => 
          row.split('').map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`w-[${CELL_SIZE}px] h-[${CELL_SIZE}px] ${
                cell === '#' ? 'bg-primary' : 'bg-background'
              }`}
            />
          ))
        )}
      </div>

      {dots.map((dot, i) => !dot.eaten && (
        <div
          key={i}
          className="absolute w-2 h-2 bg-yellow-500 rounded-full"
          style={{
            left: dot.x * CELL_SIZE + CELL_SIZE/2 - 4,
            top: dot.y * CELL_SIZE + CELL_SIZE/2 - 4
          }}
        />
      ))}
      
      <div
        className="absolute text-xl z-10"
        style={{
          left: playerPos.x * CELL_SIZE + CELL_SIZE/2 - 10,
          top: playerPos.y * CELL_SIZE + CELL_SIZE/2 - 10
        }}
      >
        😮
      </div>
    </div>
  );
}
