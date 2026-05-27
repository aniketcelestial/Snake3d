# Serpent 3D — Next.js Scaffold

This workspace was converted to a minimal Next.js app that serves the existing static game.

How to run:

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

Open http://localhost:3000 — the index page redirects to `/snake3d.html` which serves the original game.

Notes:
- Static assets are in `public/` (`snake3d.html`, `snake3d.css`, `snake3d.js`).
- Environment samples: `.env.example` (keep real secrets out of the repo).
- `.gitignore` ignores `node_modules/`, `.env`, and other common artifacts.

If you want the game integrated into a React page (no redirect), I can convert `snake3d.html` into a React component.
