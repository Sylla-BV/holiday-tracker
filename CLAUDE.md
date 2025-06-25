# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack on port 9002
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint checks
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development server
- `npm run genkit:watch` - Start Genkit AI development server with watch mode

## Architecture Overview

This is "Sylla vacations" - a Next.js holiday management system with AI-powered conflict detection and alternative date suggestions.

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI**: shadcn/ui components with Radix UI primitives and Tailwind CSS
- **AI Integration**: Google Genkit AI with Gemini 2.0 Flash model
- **Authentication**: Planned NextAuth.js with Google OAuth (G-Suite integration)
- **Database**: Planned NeonDB (PostgreSQL) with Drizzle ORM
- **Deployment**: Firebase App Hosting (current), Vercel (planned)

### Current Implementation Status
The app is currently in development with a mock data structure. Key features implemented:
- Dashboard with team calendar view, current status, and absences table
- Holiday request dialog with date selection and leave type
- AI-powered conflict detection using Genkit
- Responsive design with professional styling

### Directory Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components organized by feature
  - `dashboard/` - Main dashboard components (team-calendar, current-status, absences-table)
  - `ui/` - Reusable UI components from shadcn/ui
  - `layout/` - Layout components (header)
- `src/ai/` - Genkit AI configuration and flows
  - `flows/suggest-alternative-dates.ts` - AI flow for suggesting alternative dates
- `src/lib/` - Utility functions and mock data
- `src/hooks/` - Custom React hooks (toast notifications)

### AI Features
- **Conflict Detection**: Identifies overlapping holiday requests
- **Alternative Date Suggestions**: AI-powered recommendations for alternative dates when conflicts occur
- **Genkit Integration**: Uses Google AI Gemini 2.0 Flash model for intelligent suggestions

### Data Model (Currently Mock)
Team members with properties: id, name, role, avatar, holidays (with dates, type, status)
Holiday types: Annual Leave, Sick Leave, Personal Leave, Maternity/Paternity Leave

### Planned Features (Per Specification)
- Google SSO authentication with NextAuth.js
- NeonDB PostgreSQL database with Drizzle ORM
- Full CRUD operations for holiday requests
- Admin approval workflow
- Email notifications
- Enhanced conflict management

### Styling Guidelines
- Font: PT Sans for modern, warm appearance
- Icons: Lucide React with outline style
- Clean grid-based layout with generous whitespace