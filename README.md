# Serpent 3D — Next.js Game

This workspace is now a TypeScript-only Next.js app containing the restored Serpent 3D game and is ready for Vercel deployment.

How to run:

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

Open http://localhost:3000 to play the game.

Notes:
- The game logic and Three.js engine are in [app/snakeGame.ts](app/snakeGame.ts).
- The UI shell lives in [app/page.tsx](app/page.tsx).
- The project uses the Next.js App Router with TypeScript only.

If you want, I can also extract the game loop into smaller engine modules or add score persistence back later.
