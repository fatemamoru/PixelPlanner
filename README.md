# Pixel Planner

A social-media content planning app for small-business owners, built from the
Kiro spec in `.kiro/specs/pixel-planner/`. It helps you pick a business type and
audience, generate tailored content ideas and captions, save ideas, organize
them on a weekly/monthly calendar, set posting reminders, and track completed
posts.

## Tech stack

- React 18 + TypeScript, bundled with Vite
- React Router for client-side navigation
- IndexedDB for local persistence (automatic in-memory fallback)
- Design tokens (CSS custom properties) for branding, spacing, and accessibility
- Vitest + fast-check for unit and property-based tests

## Getting started

Prerequisites: Node.js 18+ and npm.

```bash
npm install     # install dependencies
npm run dev     # start the dev server at http://localhost:5173
```

Open the printed URL in your browser.

## Other commands

```bash
npm run build       # type-check and produce a production build in dist/
npm run preview     # preview the production build locally
npm test            # run the full test suite once
npm run test:watch  # run tests in watch mode
npm run typecheck   # type-check only
```

## Project structure

```
src/
  core/       # pure logic: validation, clock, recommendation engine, ids
  domain/     # types and static catalogs (business types, audiences, goals, services)
  infra/      # Repository (IndexedDB + in-memory), notification adapter
  services/   # SessionService, PostService, CalendarService, ReminderService
  app/        # App root, routing, context providers, bootstrap wiring
  components/ # AppShell, Button, Logo, NotificationRegion, error boundary
  views/      # Create, Saved, Calendar, Tracking, Services
  styles/     # design tokens and global styles
```

## Notes

- Data is stored locally in your browser. If IndexedDB is unavailable (e.g.
  private browsing), the app runs with in-memory storage for the session and
  shows a notice that data will not persist.
- The recommendation engine is a deterministic template/combination generator
  behind a pluggable interface, so it can be swapped for an AI-backed engine
  later without changing the UI.
