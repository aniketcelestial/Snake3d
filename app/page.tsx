'use client'

import { useEffect } from 'react'
import { initializeSnakeGame } from './snakeGame'

declare global {
  interface Window {
    Game?: {
      start: () => void
      restart: () => void
      pause: () => void
      resume: () => void
      backToMenu: () => void
    }
  }
}

export default function Page() {
  useEffect(() => {
    let cancelled = false
    let cleanup = () => {}

    void initializeSnakeGame().then((dispose) => {
      if (cancelled) {
        dispose()
        return
      }
      cleanup = dispose
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  return (
    <main className="game-shell">
      <div id="hud">
        <div className="hud-box">
          <div className="hud-label">Score</div>
          <div className="hud-val" id="score-val">0</div>
        </div>
        <div id="level-badge">LEVEL 1</div>
        <div className="hud-box">
          <div className="hud-label">Best</div>
          <div className="hud-val" id="best-val">0</div>
        </div>
      </div>

      <div id="fruit-label">+10 🍎</div>
      <div id="game-container" />

      <div className="screen" id="welcome-screen">
        <div className="welcome-bg-grid" />
        <div className="welcome-glow" />
        <div className="logo-wrap">
          <div className="logo-eyebrow">· · · PLAY · · ·</div>
          <div className="logo-main">SERP<span>ENT</span></div>
          <div className="logo-sub">3 D  E D I T I O N</div>
        </div>
        <div className="welcome-card">
          <div className="level-title">◆ LEVEL 1 — GRASSLANDS ◆</div>
          <div className="level-desc">
            Guide your serpent through the ancient rocky meadows.<br />
            Eat the glowing fruits. Avoid the walls and yourself.
          </div>
          <div className="controls-grid" style={{ marginTop: 12 }}>
            <div className="ctrl-item"><span>↑↓←→</span> Move</div>
            <div className="ctrl-item"><span>WASD</span> Move</div>
            <div className="ctrl-item"><span>P / ESC</span> Pause</div>
            <div className="ctrl-item"><span>Swipe</span> Mobile</div>
          </div>
        </div>
        <button className="btn-primary" type="button" onClick={() => window.Game?.start()}>
          PLAY NOW
        </button>
      </div>

      <div className="screen hidden" id="pause-screen">
        <div className="overlay-card">
          <div className="overlay-title grn">PAUSED</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '8px 0' }}>Game is suspended</p>
          <div className="btn-row">
            <button className="btn-primary" type="button" onClick={() => window.Game?.resume()}>
              RESUME
            </button>
            <button className="btn-secondary" type="button" onClick={() => window.Game?.backToMenu()}>
              MENU
            </button>
          </div>
        </div>
      </div>

      <div className="screen hidden" id="gameover-screen">
        <div className="overlay-card">
          <div className="overlay-title red">GAME OVER</div>
          <div className="score-label">YOUR SCORE</div>
          <div className="score-big" id="go-score">0</div>
          <div className="btn-row">
            <button className="btn-primary" type="button" onClick={() => window.Game?.restart()}>
              RETRY
            </button>
            <button className="btn-secondary" type="button" onClick={() => window.Game?.backToMenu()}>
              MENU
            </button>
          </div>
        </div>
      </div>

      <div className="screen hidden" id="win-screen">
        <div className="overlay-card">
          <div className="overlay-title gold">YOU WIN!</div>
          <div className="score-label">FINAL SCORE</div>
          <div className="score-big" id="win-score">0</div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '8px 0' }}>
            More levels coming soon…
          </p>
          <div className="btn-row">
            <button className="btn-primary" type="button" onClick={() => window.Game?.restart()}>
              PLAY AGAIN
            </button>
            <button className="btn-secondary" type="button" onClick={() => window.Game?.backToMenu()}>
              MENU
            </button>
          </div>
        </div>
      </div>

      <div id="dpad">
        <div className="dpad-grid">
          <div />
          <div className="dpad-btn" id="d-up" data-dir="up">▲</div>
          <div />
          <div className="dpad-btn" id="d-left" data-dir="left">◀</div>
          <div className="dpad-btn dpad-center">✦</div>
          <div className="dpad-btn" id="d-right" data-dir="right">▶</div>
          <div />
          <div className="dpad-btn" id="d-down" data-dir="down">▼</div>
          <div />
        </div>
      </div>

      <div id="swipe-zone" />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap');

        :root {
          --grass: #2d6a2d;
          --dark: #0a0f0a;
          --accent: #7fff00;
          --gold: #ffd700;
          --red: #ff4444;
          --panel: rgba(5, 20, 5, 0.88);
          --border: rgba(127, 255, 0, 0.3);
        }

        html,
        body {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: var(--dark);
        }

        body {
          font-family: 'Rajdhani', sans-serif;
          touch-action: none;
          user-select: none;
        }

        * {
          box-sizing: border-box;
        }

        .game-shell {
          position: fixed;
          inset: 0;
          background: var(--dark);
        }

        canvas {
          display: block;
        }

        #hud {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
          pointer-events: none;
          z-index: 10;
        }

        .hud-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hud-label {
          font-family: 'Orbitron', monospace;
          font-size: 9px;
          letter-spacing: 3px;
          color: rgba(127, 255, 0, 0.6);
          text-transform: uppercase;
        }

        .hud-val {
          font-family: 'Orbitron', monospace;
          font-size: 22px;
          font-weight: 900;
          color: var(--accent);
          text-shadow: 0 0 12px var(--accent);
          line-height: 1;
        }

        #level-badge {
          background: var(--accent);
          color: #000;
          font-family: 'Orbitron', monospace;
          font-size: 11px;
          font-weight: 900;
          padding: 4px 12px;
          border-radius: 20px;
          letter-spacing: 2px;
        }

        .screen {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          transition: opacity 0.5s, transform 0.5s;
        }

        .screen.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.95);
        }

        #welcome-screen {
          background: radial-gradient(ellipse at 50% 40%, #0d2a0d 0%, #050f05 60%, #000 100%);
        }

        .welcome-bg-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(127, 255, 0, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(127, 255, 0, 0.06) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridScroll 8s linear infinite;
          pointer-events: none;
        }

        @keyframes gridScroll {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 40px 40px;
          }
        }

        .welcome-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(127, 255, 0, 0.12) 0%, transparent 70%);
          animation: pulse 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.8;
          }

          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .logo-wrap {
          position: relative;
          text-align: center;
          margin-bottom: 8px;
        }

        .logo-eyebrow {
          font-family: 'Orbitron', monospace;
          font-size: 11px;
          letter-spacing: 8px;
          color: var(--accent);
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .logo-main {
          font-family: 'Orbitron', monospace;
          font-size: clamp(40px, 12vw, 80px);
          font-weight: 900;
          color: #fff;
          line-height: 1;
          text-shadow: 0 0 40px var(--accent), 0 0 80px rgba(127, 255, 0, 0.3);
          letter-spacing: -2px;
        }

        .logo-main span {
          color: var(--accent);
        }

        .logo-sub {
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          letter-spacing: 4px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }

        .welcome-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 28px;
          max-width: 340px;
          width: 90%;
          text-align: center;
          backdrop-filter: blur(12px);
          margin: 16px 0;
          position: relative;
          z-index: 1;
        }

        .level-title {
          font-family: 'Orbitron', monospace;
          font-size: 13px;
          letter-spacing: 3px;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .level-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 8px 0;
          text-align: left;
        }

        .ctrl-item {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .ctrl-item span {
          color: var(--accent);
          font-family: 'Orbitron', monospace;
          font-size: 10px;
        }

        .btn-primary {
          font-family: 'Orbitron', monospace;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #000;
          background: var(--accent);
          border: none;
          border-radius: 50px;
          padding: 14px 40px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 0 20px rgba(127, 255, 0, 0.4);
          margin-top: 8px;
          position: relative;
          z-index: 1;
        }

        .btn-primary:hover,
        .btn-primary:active {
          transform: scale(1.06);
          box-shadow: 0 0 40px rgba(127, 255, 0, 0.7);
        }

        .btn-secondary {
          font-family: 'Orbitron', monospace;
          font-size: 12px;
          color: var(--accent);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 50px;
          padding: 10px 28px;
          cursor: pointer;
          letter-spacing: 2px;
          margin-top: 8px;
          transition: background 0.2s;
        }

        .btn-secondary:hover {
          background: rgba(127, 255, 0, 0.1);
        }

        #pause-screen,
        #gameover-screen,
        #win-screen {
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
        }

        .overlay-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px 36px;
          text-align: center;
          min-width: 260px;
        }

        .overlay-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(22px, 6vw, 36px);
          font-weight: 900;
          color: #fff;
          margin-bottom: 6px;
        }

        .overlay-title.red {
          color: var(--red);
          text-shadow: 0 0 20px var(--red);
        }

        .overlay-title.gold {
          color: var(--gold);
          text-shadow: 0 0 20px var(--gold);
        }

        .overlay-title.grn {
          color: var(--accent);
          text-shadow: 0 0 20px var(--accent);
        }

        .score-big {
          font-family: 'Orbitron', monospace;
          font-size: 48px;
          font-weight: 900;
          color: var(--accent);
          text-shadow: 0 0 16px var(--accent);
          margin: 8px 0;
        }

        .score-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 2px;
        }

        .btn-row {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        #dpad {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          z-index: 20;
          touch-action: none;
        }

        .dpad-grid {
          display: grid;
          grid-template-columns: 52px 52px 52px;
          grid-template-rows: 52px 52px 52px;
          gap: 4px;
        }

        .dpad-btn {
          background: rgba(127, 255, 0, 0.12);
          border: 1.5px solid rgba(127, 255, 0, 0.35);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.1s;
          font-size: 22px;
          -webkit-tap-highlight-color: transparent;
        }

        .dpad-btn:active,
        .dpad-btn.pressed {
          background: rgba(127, 255, 0, 0.35);
        }

        .dpad-center {
          grid-column: 2;
          grid-row: 2;
          opacity: 0.2;
        }

        #swipe-zone {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: none;
        }

        #fruit-label {
          position: absolute;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Orbitron', monospace;
          font-size: 11px;
          letter-spacing: 2px;
          color: var(--gold);
          background: rgba(0, 0, 0, 0.5);
          padding: 4px 12px;
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          z-index: 10;
        }

        #fruit-label.show {
          opacity: 1;
        }

        @media (pointer: coarse) {
          #dpad,
          #swipe-zone {
            display: block;
          }
        }

        @media (max-width: 480px) {
          #dpad,
          #swipe-zone {
            display: block;
          }
        }
      `}</style>
    </main>
  )
}
