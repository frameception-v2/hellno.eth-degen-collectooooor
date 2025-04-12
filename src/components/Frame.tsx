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
  MAZE_LAYOUT,
  GHOST_SPEED,
  INITIAL_GHOST_POSITIONS
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

  const [isResetting, setIsResetting] = useState(false);

  const resetGame = () => {
    setIsResetting(true);
    setScore(0);
    setLives(INITIAL_LIVES);
    setGameOver(false);
    setGhosts(INITIAL_GHOST_POSITIONS);
    // Reset player position
    setPlayerPos(() => {
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
    // Reset dots by creating a fresh array
    const newDots: Dot[] = [];
    MAZE_LAYOUT.forEach((row, y) => {
      row.split('').forEach((cell, x) => {
        if (cell === ' ') {
          newDots.push({ x, y, eaten: false });
        }
      });
    });
    setDots(newDots);
    
    // Clear the resetting flag after a short delay
    setTimeout(() => {
      setIsResetting(false);
    }, 100);
  };
  const [ghosts, setGhosts] = useState(INITIAL_GHOST_POSITIONS);
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
    // Check bounds and wall collision
    if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT || MAZE_LAYOUT[y][x] === '#') {
      return false;
    }
    // Check if there's an uneaten dot at this position
    return dots.some(dot => dot.x === x && dot.y === y && !dot.eaten) || MAZE_LAYOUT[y][x] === 'P';
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
    if (gameOver || isResetting) return;

    // Check for ghost collision
    const ghostCollision = ghosts.some(ghost => 
      ghost.x === playerPos.x && ghost.y === playerPos.y
    );

    if (ghostCollision) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameOver(true);
        }
        return newLives;
      });
      // Reset player position on collision
      setPlayerPos(() => {
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
    }

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
  }, [gameOver, playerPos, ghosts]);

  // Ghost movement
  useEffect(() => {
    if (gameOver) return;

    const moveGhost = () => {
      setGhosts(prevGhosts => 
        prevGhosts.map(ghost => {
          const possibleMoves = [
            { x: ghost.x + 1, y: ghost.y },
            { x: ghost.x - 1, y: ghost.y },
            { x: ghost.x, y: ghost.y + 1 },
            { x: ghost.x, y: ghost.y - 1 }
          ].filter(move => isValidMove(move.x, move.y));

          if (possibleMoves.length === 0) return ghost;
          
          const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          return randomMove;
        })
      );
    };

    const interval = setInterval(moveGhost, GHOST_SPEED);
    return () => clearInterval(interval);
  }, [gameOver, isValidMove]);

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
            <button
              onClick={resetGame}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Play Again
            </button>
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
                cell === '#' ? 'bg-blue-800 border border-blue-500' : 'bg-background'
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
      
      {/* Render ghosts */}
      {ghosts.map((ghost, i) => (
        <div
          key={`ghost-${i}`}
          className="absolute text-xl z-10"
          style={{
            left: ghost.x * CELL_SIZE + CELL_SIZE/2 - 10,
            top: ghost.y * CELL_SIZE + CELL_SIZE/2 - 10
          }}
        >
          👻
        </div>
      ))}

      {/* Render player */}
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
