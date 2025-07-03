# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Enterprise SaaS Starter Kit built with Next.js, TypeScript, and PostgreSQL. It provides a production-ready foundation for building multi-tenant SaaS applications with enterprise features like SAML SSO, audit logs, webhooks, and team management.

## Essential Commands

### Development
```bash
# Start development server (runs on port 4002)
npm run dev

# Start database with Docker
docker-compose up -d

# Open Prisma Studio to view/edit database
npx prisma studio
```

### Database Management
```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

### Testing
```bash
# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:cov

# Run a single unit test file
npm test -- path/to/test.spec.ts

# Run E2E tests (requires app to be built)
npm run build
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- path/to/test.spec.ts

# Update Playwright browsers
npm run playwright:update
```

### Code Quality
```bash
# Run type checking
npm run check-types

# Run linting
npm run check-lint

# Format code with Prettier
npm run format

# Run all checks (format, lint, types, build)
npm run test-all
```

### Build & Production
```bash
# Build for production (includes Prisma generation and DB push)
npm run build

# Start production server
npm run start
```

## Architecture & Code Organization

### Core Architecture

This is a **Next.js application** with the following architectural patterns:

1. **Authentication**: NextAuth.js handles authentication with support for:
   - Email magic links
   - OAuth providers (GitHub, Google)
   - SAML SSO (via SAML Jackson)
   - Session management with Prisma adapter

2. **Database**: PostgreSQL with Prisma ORM
   - Schema defined in `prisma/schema.prisma`
   - Models include User, Team, Membership, Subscription, ApiKey, etc.
   - Multi-tenant architecture with team-based data isolation

3. **API Design**: Next.js API routes in `pages/api/`
   - RESTful endpoints for teams, users, invitations
   - Webhook handlers for Stripe and other services
   - Protected routes use authentication guards

4. **State Management**: SWR for data fetching and caching
   - Custom hooks in `/hooks` for common data operations
   - Optimistic updates for better UX

5. **UI Components**: React with TypeScript
   - Components organized by feature in `/components`
   - Shared UI components in `/components/shared`
   - Tailwind CSS with DaisyUI for styling
   - Dark mode support

### Key Directories

- **`/lib`**: Core business logic and utilities
  - `guards/`: Authorization middleware
  - `email/`: Email sending with React Email templates
  - `jackson/`: SAML SSO integration
  - `svix/`: Webhook management
  - `retraced/`: Audit logging

- **`/models`**: Data access layer
  - Database queries abstracted from API routes
  - Team, user, and subscription management

- **`/pages/api`**: Backend API endpoints
  - `auth/`: NextAuth.js configuration
  - `teams/`: Team CRUD operations
  - `webhooks/`: External webhook handlers

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

4. **Access Control**: Role-based (OWNER, MEMBER)
   - Guards in `/lib/guards` enforce permissions
   - Team-scoped resources

5. **API Keys**: Team-level API key management
   - Secure generation and storage
   - Usage tracking

### Environment Configuration

Key environment variables (see `.env.example`):
- **Database**: `DATABASE_URL`
- **Auth**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **Email**: `SMTP_*` settings
- **Integrations**: `STRIPE_*`, `SVIX_*`, `RETRACED_*`
- **OAuth**: `GITHUB_*`, `GOOGLE_*` credentials

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