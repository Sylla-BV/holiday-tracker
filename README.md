# Sylla Vacations

A Next.js holiday management system with AI-powered conflict detection and alternative date suggestions.

## Features

- Dashboard with team calendar view and holiday tracking
- AI-powered conflict detection using Google Genkit
- Holiday request management with multiple leave types
- Responsive design with professional styling
- Google OAuth authentication (NextAuth.js)

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI**: shadcn/ui components with Radix UI primitives and Tailwind CSS
- **AI Integration**: Google Genkit AI with Gemini 2.0 Flash model
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Planned NeonDB (PostgreSQL) with Drizzle ORM
- **Deployment**: Firebase App Hosting

## Development Commands

```bash
npm run dev         # Start development server on port 9002
npm run build       # Build for production
npm run lint        # Run ESLint checks
npm run typecheck   # Run TypeScript type checking
npm run genkit:dev  # Start Genkit AI development server
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:9002](http://localhost:9002) in your browser

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components organized by feature
- `src/ai/` - Genkit AI configuration and flows
- `src/lib/` - Utility functions and mock data
- `src/hooks/` - Custom React hooks
