# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Enterprise SaaS Starter Kit built with Next.js, TypeScript, and PostgreSQL. It provides a production-ready foundation for building multi-tenant SaaS applications with enterprise features like SAML SSO, audit logs, webhooks, and team management.

**Recent Major Updates:**
- **AI Integration**: Vercel AI SDK v5 with multi-provider support (OpenAI, Anthropic, Google AI, Mistral)
- **Mental Health Platform**: HIPAA-compliant therapy session transcription with Deepgram Nova 3 Medical
- **Authentication Migration**: Ongoing migration from NextAuth.js to Clerk (both systems currently operational)

## Essential Commands

### Development```bash
# Start development server (runs on port 4002)
npm run dev

# Start database with Docker
docker-compose up -d

# Open Prisma Studio to view/edit database
npx prisma studio

# Start PostgreSQL directly (alternative to Docker)
npm run postgres:start
```

### Database Management
```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Reset database (CAUTION: deletes all data)
npm run db:clean

# Seed database with sample data
npm run db:seed

# Clean and restart Docker database
npm run db:clean:dev
```

### Testing
```bash
# Run unit tests in watch mode (default)
npm test

# Run unit tests in CI mode (no watch)
npm run test:ci

# Run unit tests with coverage
npm run test:cov

# Run a single unit test file
npm test -- path/to/test.spec.ts

# Run E2E tests (requires app to be built)
npm run build
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- path/to/test.spec.ts

# Run E2E tests with UI mode
npm run test:e2e-ui

# Update Playwright browsers
npm run playwright:update
```

### Code Quality
```bash
# Run type checking
npm run check-types

# Run linting
npm run check-lint

# Fix linting issues automatically
npm run lint

# Format code with Prettier
npm run format

# Run all checks (format, lint, types, build)
npm run test-all

# Check for unused dependencies and exports
npm run check-unused
```

### Build & Production
```bash
# Build for production
npm run build

# Start production server
npm run start

# Build and start in one command
npm run build:start
```

### Additional Commands
```bash
# Sync Stripe products and prices
npm run sync-stripe

# Check translation completeness
npm run check-locale

# Add new locale
npm run add-locale

# Delete a team (requires team slug)
npm run delete:team

# Migrate users from NextAuth to Clerk
npm run migrate:users

# Run batch processing worker
npm run worker:batch
```

## Architecture & Code Organization

### Core Architecture

This is a **Next.js 15 application** using Pages Router with the following architectural patterns:

1. **Authentication**: Dual authentication system during migration:
   - **NextAuth.js** (Legacy): Email, OAuth (GitHub/Google), SAML SSO
   - **Clerk** (New): Modern auth with MFA, social logins, enterprise SSO
   - Session management with database persistence
   - Webhook-based synchronization between systems

2. **Database**: PostgreSQL with Prisma ORM
   - Schema defined in `prisma/schema.prisma`
   - Models include User, Team, Membership, Subscription, ApiKey
   - Mental health models: Patient, TherapySession, ClinicalDocument
   - Multi-tenant architecture with team-based data isolation
   - HIPAA-compliant encryption for sensitive data

3. **API Design**: Next.js API routes in `pages/api/`
   - RESTful endpoints for teams, users, invitations
   - AI endpoints: `/api/teams/[slug]/ai/*` for chat, completion, generation
   - Mental health: `/api/sessions/*` for therapy session management
   - Webhook handlers for Stripe, Clerk, and other services
   - Protected routes use authentication guards

4. **State Management**: SWR for data fetching and caching
   - Custom hooks in `/hooks` for common data operations
   - AI-specific hooks: `useTeamChat`, `useTeamCompletion`, `useGenerateObject`
   - Optimistic updates for better UX

5. **UI Components**: React with TypeScript
   - Components organized by feature in `/components`
   - AI components: `AIChat`, `ModelSelector`, `CompletionForm`
   - Mental health: `SessionRecording`, `PatientDashboard`, `DocumentReview`
   - Shared UI components in `/components/shared`
   - Tailwind CSS with DaisyUI for styling
   - Dark mode support

### Key Directories

- **`/lib`**: Core business logic and utilities
  - `ai/`: AI provider configuration and tools
  - `clerk.ts`, `clerk-session.ts`: Clerk authentication helpers
  - `deepgram/`: Medical transcription integration
  - `email/`: Email sending with React Email templates
  - `guards/`: Authorization middleware
  - `jackson/`: SAML SSO integration
  - `mentalHealth/`: Clinical document templates and generation
  - `retraced/`: Audit logging
  - `svix/`: Webhook management

- **`/models`**: Data access layer
  - Database queries abstracted from API routes
  - Team, user, and subscription management
  - Patient and clinical data models

- **`/pages/api`**: Backend API endpoints
  - `auth/`: NextAuth.js configuration
  - `teams/`: Team CRUD operations
  - `ai/`: AI chat, completion, and generation endpoints
  - `sessions/`: Therapy session management
  - `webhooks/`: External webhook handlers (Stripe, Clerk)

### Security & Enterprise Features

1. **SAML SSO**: Configured through environment variables
   - Handled by SAML Jackson integration
   - Team-level SSO configuration

2. **Audit Logs**: Via Retraced
   - Tracks all CRUD operations
   - Team-scoped audit trails

3. **Webhooks**: Via Svix
   - Emits events for user/team operations
   - Configurable per team

4. **Access Control**: Role-based (OWNER, ADMIN, MEMBER)
   - Guards in `/lib/guards` enforce permissions
   - Team-scoped resources
   - Mental health roles: THERAPIST, SUPERVISOR

5. **API Keys**: Team-level API key management
   - Secure generation and storage
   - Usage tracking

6. **HIPAA Compliance** (Mental Health Features):
   - AES-256 encryption for sensitive data
   - Complete audit trails
   - Access control and authorization
   - Data retention policies

### Environment Configuration

Key environment variables (see `.env.example`):
- **Database**: `DATABASE_URL`
- **Auth (NextAuth)**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **Auth (Clerk)**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Email**: `SMTP_*` settings
- **Integrations**: `STRIPE_*`, `SVIX_*`, `RETRACED_*`
- **OAuth**: `GITHUB_*`, `GOOGLE_*` credentials
- **AI Providers**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.
- **Deepgram**: `DEEPGRAM_API_KEY`
- **Mental Health**: `ENCRYPTION_KEY`, `HASH_SALT`

### Testing Strategy

- **Unit Tests**: Jest with React Testing Library
  - Test files alongside components as `*.spec.ts`
  - Mocking with Jest

- **E2E Tests**: Playwright
  - Tests in `/tests/e2e`
  - Page object pattern with fixtures
  - Setup/teardown for test data

### Development Workflow

1. **Feature Development**:
   - Create/modify components in appropriate feature directory
   - Add API routes if needed
   - Update models for data access
   - Add guards for authorization

2. **Database Changes**:
   - Update `prisma/schema.prisma`
   - Run `npx prisma db push` for development
   - Generate migrations for production

3. **Adding Translations**:
   - Translations in `/locales/{lang}/common.json`
   - Use `useTranslation` hook from react-i18next
   - Run `npm run check-locale` to verify completeness

4. **Stripe Integration**:
   - Products/prices synced via `npm run sync-stripe`
   - Webhook handling in `pages/api/webhooks/stripe.ts`
   - Subscription management in team settings

### Type Safety

- TypeScript throughout with strict mode
- Path aliases configured: `@/lib/*`, `@/components/*`
- Zod for runtime validation
- Yup for form validation with Formik

### Performance Considerations

- Images optimized with Next.js Image component
- API responses use SWR for caching
- Database queries optimized with Prisma
- Static pages where possible

### Deployment

- Supports Vercel, Heroku, DigitalOcean
- Environment variables required for production
- Database migrations handled in build step
- Security headers configured in `next.config.js`

### Infrastructure Preferences

**Cloudflare Edge Services**: The user prefers to use Cloudflare R2 buckets, queues, and workers instead of AWS (or others) to leverage Cloudflare's edge technology. When possible if adding to the tech stack, prioritize leveraging Cloudflare's services for continuity and edge advantages (e.g., workers).

Key Cloudflare services to consider:
- **R2**: Object storage (S3-compatible, no egress fees)
- **Workers**: Edge compute for low-latency processing
- **Queues**: Message queuing at the edge
- **KV**: Key-value storage for fast reads
- **D1**: SQLite at the edge (for appropriate use cases)

## AI Integration

### Available AI Models
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Google**: Gemini models (with API key)
- **Mistral**: Various models (with API key)

### AI Features
1. **Chat Interface**: Streaming conversations with context
2. **Text Completion**: Single-shot text generation
3. **Structured Data**: Extract typed data using Zod schemas
4. **Tool Calling**: Extend AI with custom functions
5. **Rate Limiting**: Per-user and per-team limits

### AI API Endpoints
- `POST /api/teams/[slug]/ai/chat` - Streaming chat
- `POST /api/teams/[slug]/ai/completion` - Text completion
- `POST /api/teams/[slug]/ai/generate-object` - Structured data
- `GET /api/teams/[slug]/ai/models` - Available models

## Mental Health Platform

### Key Features
1. **Real-time Transcription**: Deepgram Nova 3 Medical model
2. **HIPAA Compliance**: Encryption, audit logs, access control
3. **Clinical Documents**: AI-generated SOAP notes, treatment plans
4. **Patient Management**: Secure patient records with encryption
5. **Session Recording**: WebSocket-based live transcription

### Mental Health Models
- `Patient`: Encrypted patient demographics and history
- `TherapySession`: Session tracking with transcripts
- `ClinicalDocument`: Structured clinical documentation
- `TreatmentPlan`: Goals and interventions
- `RiskAssessment`: Safety monitoring

### Security Considerations
- All sensitive data encrypted with AES-256
- Role-based access (THERAPIST, SUPERVISOR, ADMIN)
- Complete audit trails for compliance
- Configurable data retention policies

## Authentication Migration (NextAuth → Clerk)

### Current State
Both authentication systems are operational:
- Existing users continue with NextAuth
- New features use Clerk
- Migration script available: `npm run migrate:users`

### Clerk Integration Points
- **Middleware**: `middleware.ts` handles route protection
- **API Routes**: Use `getClerkSession()` helper
- **React Hooks**: `useClerkAuth()` for client-side
- **Webhooks**: `/api/webhooks/clerk` syncs user data

### Migration Steps
1. Set up Clerk environment variables
2. Run migration script for existing users
3. Update UI components to use Clerk
4. Gradually phase out NextAuth code

## Important Patterns

### API Route Structure
```typescript
// Standard API handler pattern
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check feature flags
    if (!env.teamFeatures.ai) {
      throw new ApiError(404, 'Feature not enabled');
    }

    // Authenticate
    const session = await getSession(req, res);
    if (!session) throw new ApiError(401, 'Unauthorized');

    // Check team access
    const teamMember = await throwIfNoTeamAccess(req, res);
    
    // Check permissions
    throwIfNotAllowed(teamMember, 'resource', 'action');

    // Handle request...
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ error: { message: error.message } });
  }
}
```

### Input Validation
Always use Zod schemas for validation:
```typescript
import { validateWithSchema } from '@/lib/zod';
const validated = validateWithSchema(schema, req.body);
```

### Error Handling
Use `ApiError` for consistent error responses:
```typescript
import { ApiError } from '@/lib/errors';
throw new ApiError(404, 'Resource not found');
```

### Feature Flags
Check environment-based feature flags:
```typescript
if (!env.teamFeatures.mentalHealth) {
  return res.status(404).json({ error: { message: 'Feature not available' } });
}
```
