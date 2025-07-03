# Cursor Rules for BoxyHQ SaaS Starter Kit

This directory contains Cursor rules that help the AI understand the codebase structure, patterns, and conventions of the BoxyHQ SaaS Starter Kit.

## Rules Overview

### 1. `project-overview.mdc` (Always Applied)
- **Purpose**: Provides a high-level overview of the entire project
- **When Applied**: Always - this rule is automatically applied to every AI interaction
- **Contains**: Tech stack, key features, project structure, environment configuration, and development workflow

### 2. `auth-security.mdc`
- **Purpose**: Details authentication and security patterns
- **When Applied**: When working on authentication, authorization, or security features
- **Contains**: NextAuth configuration, session management, security features, authorization patterns, and best practices

### 3. `api-patterns.mdc`
- **Purpose**: Defines API development patterns and conventions
- **When Applied**: Automatically when working on files in `pages/api/**/*.ts`
- **Contains**: API route structure, response formats, request handlers, validation patterns, error handling, and security practices

### 4. `frontend-patterns.mdc`
- **Purpose**: Establishes React and frontend development patterns
- **When Applied**: Automatically when working on React components (`components/**/*.tsx`, `pages/**/*.tsx`) and hooks
- **Contains**: Component patterns, styling conventions, form handling, data fetching, custom hooks, and UI best practices

### 5. `database-patterns.mdc`
- **Purpose**: Documents database and Prisma usage patterns
- **When Applied**: Automatically when working on Prisma schema or model files
- **Contains**: Schema overview, Prisma best practices, query optimization, security patterns, migrations, and performance tips

### 6. `testing-patterns.mdc`
- **Purpose**: Outlines testing conventions and patterns
- **When Applied**: Automatically when working on test files (`*.spec.ts`, `*.test.ts`)
- **Contains**: Unit testing with Jest, E2E testing with Playwright, page object patterns, test fixtures, and debugging tips

## How Rules Work

### Automatic Application
- **Always Applied**: Rules with `alwaysApply: true` are active for every AI interaction
- **Glob-based**: Rules with `globs` patterns are automatically applied when working on matching files
- **Manual**: Rules with only a `description` can be manually referenced when needed

### Using the Rules
1. The AI automatically loads relevant rules based on the files you're working with
2. You don't need to explicitly mention rules - they guide the AI's responses
3. The rules ensure consistent code patterns and best practices across the codebase

### Examples
- When creating a new API endpoint, the AI will follow patterns from `api-patterns.mdc`
- When building a React component, the AI will use conventions from `frontend-patterns.mdc`
- When adding authentication, the AI will reference `auth-security.mdc`

## Maintaining Rules
- Update rules when introducing new patterns or changing conventions
- Keep rules concise and focused on patterns, not implementation details
- Use file references with `[filename](mdc:path/to/file)` syntax to link to actual code
- Test that rules improve AI assistance quality 