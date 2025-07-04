<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/boxyhq/jackson/assets/66887028/871d9c0f-d351-49bb-9458-2542830d7910">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/boxyhq/jackson/assets/66887028/4073c181-0653-4d5b-b74f-e7e84fe79da8">
  <img alt="BoxyHQ Banner" src="https://github.com/boxyhq/jackson/assets/66887028/b40520b7-dbce-400b-88d3-400d1c215ea1">
</picture>

# ⭐ Enterprise SaaS Starter Kit

<p>
    <a href="https://github.com/boxyhq/saas-starter-kit/stargazers"><img src="https://img.shields.io/github/stars/boxyhq/saas-starter-kit" alt="Github stargazers"></a>
    <a href="https://github.com/boxyhq/saas-starter-kit/issues"><img src="https://img.shields.io/github/issues/boxyhq/saas-starter-kit" alt="Github issues"></a>
    <a href="https://github.com/boxyhq/saas-starter-kit/blob/main/LICENSE"><img src="https://img.shields.io/github/license/boxyhq/saas-starter-kit" alt="license"></a>
    <a href="https://twitter.com/BoxyHQ"><img src="https://img.shields.io/twitter/follow/BoxyHQ?style=social" alt="Twitter"></a>
    <a href="https://www.linkedin.com/company/boxyhq"><img src="https://img.shields.io/badge/LinkedIn-blue" alt="LinkedIn"></a>
    <a href="https://discord.gg/uyb7pYt4Pa"><img src="https://img.shields.io/discord/877585485235630130" alt="Discord"></a>
</p>

The Open Source Next.js SaaS boilerplate for Enterprise SaaS app development.

Please star ⭐ the repo if you want us to continue developing and improving the SaaS Starter Kit! 😀

## 📖 Additional Resources

Video - [BoxyHQ's SaaS Starter Kit: Your Ultimate Enterprise-Compliant Boilerplate](https://www.youtube.com/watch?v=oF8QIwQIhyo) <br>
Blog - [Enterprise-ready Saas Starter Kit](https://boxyhq.com/blog/enterprise-ready-saas-starter-kit)

Next.js-based SaaS starter kit saves you months of development by starting you off with all the features that are the same in every product, so you can focus on what makes your app unique.

## 🛠️ Built With

- [Next.js](https://nextjs.org)
  This is a React framework that provides features such as server-side rendering and static site generation. It's used for building the user interface of your application. The main configuration for Next.js can be found in `next.config.js`.
- [Tailwind CSS](https://tailwindcss.com)
  This is a utility-first CSS framework for rapidly building custom user interfaces. It's used for styling the application. The configuration for Tailwind CSS can be found in `postcss.config.js`.
- [Postgres](https://www.postgresql.org)
  This is a powerful, open source object-relational database system. It's used for storing application data. The connection to Postgres is likely managed through Prisma.
- [React](https://reactjs.org)
  This is a JavaScript library for building user interfaces. It's used for creating the interactive elements of your application. The React components are located in the components directory.
- [Prisma](https://www.prisma.io)
  This is an open-source database toolkit. It's used for object-relational mapping, which simplifies the process of writing database queries. Prisma configuration and schema can be found in the prisma directory.
- [TypeScript](https://www.typescriptlang.org)
  This is a typed superset of JavaScript that compiles to plain JavaScript. It's used to make the code more robust and maintainable. TypeScript definitions and configurations can be found in files like `next-env.d.ts` and `i18next.d.ts`.
- [SAML Jackson](https://github.com/boxyhq/jackson) (Provides SAML SSO, Directory Sync)
  This is a service for handling SAML SSO (Single Sign-On). It's used to allow users to sign in with a single ID and password to any of several related systems i.e (using a single set of credentials). The implementation of SAML Jackson is primarily located within the files associated with authentication.
- [Svix](https://www.svix.com/) (Provides Webhook Orchestration)
  This is a service for handling webhooks. It's used to emit events on user/team CRUD operations, which can then be caught and handled by other parts of the application or external services. The integration of Svix is distributed throughout the codebase, primarily in areas where Create, Read, Update, and Delete (CRUD) operations are executed.
- [Retraced](https://github.com/retracedhq/retraced) (Provides Audit Logs Service)
  This is a service for audit logging and data visibility. It helps track user activities within the application i.e (who did what and when in the application). The usage of Retraced would be dispersed throughout the codebase, likely in the files where important actions are performed.
- [Stripe](https://stripe.com) (Provides Payments)
  This is a service for handling payments. It's used to process payments for the application. The integration of Stripe is likely found in the files associated with billing and subscriptions.
- [Playwright](https://playwright.dev) (Provides E2E tests)
  This is a Node.js library for automating browsers. It's used to run end-to-end tests on the application. The Playwright configuration and tests can be found in the tests directory.
- [Docker](https://www.docker.com) (Provides Docker Compose)
  This is a platform for developing, shipping, and running applications. It's used to containerize the application and its dependencies. The Docker configuration can be found in the Dockerfile and docker-compose.yml.
- [Clerk](https://clerk.com) (Provides Authentication)
  This is a complete authentication solution for modern applications. It's used to handle user authentication, authorization, and user management. The Clerk configuration can be found in the environment variables and middleware.ts file.

## 🚀 Deployment

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fboxyhq%2Fsaas-starter-kit&env=NEXTAUTH_SECRET,SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASSWORD,SMTP_FROM,DATABASE_URL,APP_URL">
<img width="90" alt="Deploy with Vercel" src="https://vercel.com/button" />
</a>

<a href="https://heroku.com/deploy" alt="Deploy to Heroku">
<img alt="Deploy to Heroku" src="https://www.herokucdn.com/deploy/button.svg" />
</a>

<a href="https://cloud.digitalocean.com/apps/new?repo=https://github.com/boxyhq/saas-starter-kit/tree/main" alt="Deploy to DO">
<img width="200" alt="Deploy to DO" src="https://www.deploytodo.com/do-btn-blue-ghost.svg" />
</a>

## ✨ Getting Started

Please follow these simple steps to get a local copy up and running.

### Prerequisites

- Node.js (Version: >=18.x)
- PostgreSQL
- NPM
- Docker compose

### Development

#### 1. Setup

- [Fork](https://github.com/boxyhq/saas-starter-kit/fork) the repository
- Clone the repository by using this command:

```bash
git clone https://github.com/<your_github_username>/saas-starter-kit.git
```

#### 2. Go to the project folder

```bash
cd saas-starter-kit
```

#### 3. Install dependencies

```bash
npm install
```

#### 4. Set up your .env file

Duplicate `.env.example` to `.env`.

```bash
cp .env.example .env
```

#### 5. Create a database (Optional)

To make the process of installing dependencies easier, we offer a `docker-compose.yml` with a Postgres container.

```bash
docker-compose up -d
```

#### 6. Set up database schema

```bash
npx prisma db push
```

#### 7. Start the server

In a development environment:

```bash
npm run dev
```

#### 8. Start the Prisma Studio

Prisma Studio is a visual editor for the data in your database.

```bash
npx prisma studio
```

#### 9. Testing

We are using [Playwright](https://playwright.dev/) to execute E2E tests. Add all tests inside the `/tests` folder.

Update `playwright.config.ts` to change the playwright configuration.

##### Install Playwright dependencies

```bash
npm run playwright:update
```

##### Run E2E tests

```bash
npm run test:e2e
```

_Note: HTML test report is generated inside the `report` folder. Currently supported browsers for test execution `chromium` and `firefox`_

## ⚙️ Feature configuration

To get started you only need to configure the database by following the steps above. For more advanced features, you can configure the following:

### Clerk Authentication

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Configure authentication methods:
   - Email/Password
   - OAuth providers (GitHub, Google)
   - Magic Links
4. Enable Organizations for multi-tenancy
5. Configure webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
6. Set the following environment variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/join
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Svix Webhooks

1. Create an account on [Svix](https://www.svix.com/)
2. The authenticaton token and add `SVIX_API_KEY` to the `.env` file.

### Stripe Payments

1. Create an account on [Stripe](https://stripe.com/)
2. Add the [Stripe API secret key](https://dashboard.stripe.com/apikeys) to the `.env` file as `STRIPE_SECRET_KEY`.
3. Create a webhook in the [Stripe dashboard](https://dashboard.stripe.com/webhooks). The URL is your app hostname plus `/api/webhooks/stripe`. If you want to set this up locally you will need to use the [Stripe CLI forwarder](https://docs.stripe.com/webhooks#test-webhook).
4. Once created, add the signing secret to the `.env` file as `STRIPE_WEBHOOK_SECRET`.

### Recaptcha

1. Create an account on [Google reCAPTCHA](https://www.google.com/recaptcha/admin/enterprise). This will create a Google Cloud account if you don't have one.
2. From the Key Details in the [Google Cloud Console](https://console.cloud.google.com/security/recaptcha), add the reCAPTCHA ID to the `.env` file as `RECAPTCHA_SITE_KEY`.
3. Click Key Details > Integration then click Use legacy key to get the secret key and add it to the `.env` file as `RECAPTCHA_SECRET_KEY`.

### Sentry

1. Create an account on [Sentry](https://sentry.io/), skip the onboarding and create a new Next.js project.
2. At the bottom of the page, get the DSN and add it to the `.env` file as `SENTRY_DSN`. The other variables are optional.

#### Fully customizable boilerplate out of the box, see images below 👇👇👇

![saas-starter-kit-poster](/public/saas-starter-kit-poster.png)

## 🥇 Features

- 🗂️ Multi-tenancy: Each user can be part of multiple teams
- 🔐 Authentication: Secure authentication with Clerk (Email/Password, OAuth, Magic Links, SAML SSO)
- 👥 Team Management: Create teams, invite members, manage roles
- 🏢 Enterprise Features: SAML SSO, Directory Sync (SCIM), Audit Logs, Webhooks
- 💳 Billing: Stripe integration for subscriptions and payments
- 🚀 API Support: REST API with API key authentication
- 🌍 Internationalization: Multi-language support
- 🎨 UI Components: Beautiful UI with Tailwind CSS and DaisyUI
- 📱 Responsive: Mobile-friendly design
- 🔒 Security: CSRF protection, rate limiting, security headers
- 📧 Email Notifications: Transactional emails with SMTP support
- 🔑 Two-Factor Authentication: Built-in 2FA support via Clerk
- 🎯 Feature Flags: Control feature access per team
- 📊 Analytics: Mixpanel integration for product analytics
- 🔍 Logging: Structured logging with correlation IDs
- 🧪 Testing: Unit tests with Jest, E2E tests with Playwright
- 🐳 Docker Support: Ready for containerized deployments
- 🚦 Health Checks: Built-in health monitoring endpoints

## ➡️ Coming Soon

- Billing & subscriptions
- Unit and integration tests

## ✨ Contributing

Thanks for taking the time to contribute! Contributions make the open-source community a fantastic place to learn, inspire, and create. Any contributions you make are greatly appreciated.

Please try to create bug reports that are:

- _Reproducible._ Include steps to reproduce the problem.
- _Specific._ Include as much detail as possible: which version, what environment, etc.
- _Unique._ Do not duplicate existing opened issues.
- _Scoped to a Single Bug._ One bug per report.

[Contributing Guide](https://github.com/boxyhq/saas-starter-kit/blob/main/CONTRIBUTING.md)

## 🤩 Community

- [Discord](https://discord.gg/uyb7pYt4Pa) (For live discussion with the Open-Source Community and BoxyHQ team)
- [Twitter](https://twitter.com/BoxyHQ) / [LinkedIn](https://www.linkedin.com/company/boxyhq) (Follow us)
- [Youtube](https://www.youtube.com/@boxyhq) (Watch community events and tutorials)
- [GitHub Issues](https://github.com/boxyhq/saas-starter-kit/issues) (Contributions, report issues, and product ideas)

## 🌍 Contributors

<a href="https://github.com/boxyhq/saas-starter-kit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=boxyhq/saas-starter-kit" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## 🛡️ License

[Apache 2.0 License](https://github.com/boxyhq/saas-starter-kit/blob/main/LICENSE)

## Tech Stack

- [Next.js](https://nextjs.org) - React framework for production
- [Clerk](https://clerk.com) - Authentication and user management
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Prisma](https://www.prisma.io) - Next-generation ORM
- [TypeScript](https://www.typescriptlang.org) - JavaScript with types
- [PostgreSQL](https://www.postgresql.org) - Open source relational database
- [Stripe](https://stripe.com) - Payment processing
- [React Email](https://react.email) - Email templates with React
- [Playwright](https://playwright.dev) - End-to-end testing
