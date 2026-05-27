# Serpent 3D — Next.js Scaffold

This workspace is now a minimal TypeScript-only Next.js app that is ready for Vercel deployment.

How to run:

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

Open http://localhost:3000 to see the app home page.

Notes:
- The app uses the Next.js App Router with TypeScript only.
- Environment variables live in `.env.local`.
- Middleware at `middleware.ts` refreshes Supabase sessions.

If you want the game integrated into a React page (no redirect), I can convert `snake3d.html` into a React component.
