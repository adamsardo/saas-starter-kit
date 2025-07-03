import type { SessionStrategy } from 'next-auth';

const env = {
  databaseUrl: `${process.env.DATABASE_URL}`,
  appUrl: `${process.env.APP_URL}`,
  redirectIfAuthenticated: '/dashboard',
  securityHeadersEnabled: process.env.SECURITY_HEADERS_ENABLED ?? false,

  // SMTP configuration for NextAuth
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },

  // NextAuth configuration (to be removed after migration)
  nextAuth: {
    secret: process.env.NEXTAUTH_SECRET,
    sessionStrategy: (process.env.NEXTAUTH_SESSION_STRATEGY ||
      'jwt') as SessionStrategy,
  },

  // Clerk configuration
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    secretKey: process.env.CLERK_SECRET_KEY || '',
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/login',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/auth/join',
    afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
    afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard',
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
  },

  // Svix
  svix: {
    url: `${process.env.SVIX_URL}`,
    apiKey: `${process.env.SVIX_API_KEY}`,
  },

  //Social login: Github
  github: {
    clientId: `${process.env.GITHUB_CLIENT_ID}`,
    clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
  },

  //Social login: Google
  google: {
    clientId: `${process.env.GOOGLE_CLIENT_ID}`,
    clientSecret: `${process.env.GOOGLE_CLIENT_SECRET}`,
  },

  // Retraced configuration
  retraced: {
    url: process.env.RETRACED_URL
      ? `${process.env.RETRACED_URL}/auditlog`
      : undefined,
    apiKey: process.env.RETRACED_API_KEY,
    projectId: process.env.RETRACED_PROJECT_ID,
  },

  groupPrefix: process.env.GROUP_PREFIX,

  // SAML Jackson configuration
  jackson: {
    url: process.env.JACKSON_URL,
    externalUrl: process.env.JACKSON_EXTERNAL_URL || process.env.JACKSON_URL,
    apiKey: process.env.JACKSON_API_KEY,
    productId: process.env.JACKSON_PRODUCT_ID || 'boxyhq',
    selfHosted: process.env.JACKSON_URL !== undefined,
    sso: {
      callback: `${process.env.APP_URL}`,
      issuer: 'https://saml.boxyhq.com',
      path: '/api/oauth/saml',
      oidcPath: '/api/oauth/oidc',
      idpLoginPath: '/auth/idp-login',
    },
    dsync: {
      webhook_url: `${process.env.APP_URL}/api/webhooks/dsync`,
      webhook_secret: process.env.JACKSON_WEBHOOK_SECRET,
    },
  },

  // Users will need to confirm their email before accessing the app feature
  confirmEmail: process.env.CONFIRM_EMAIL === 'true',

  // Mixpanel configuration
  mixpanel: {
    token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
  },

  disableNonBusinessEmailSignup:
    process.env.DISABLE_NON_BUSINESS_EMAIL_SIGNUP === 'true',

  authProviders: process.env.AUTH_PROVIDERS || 'github,credentials',

  otel: {
    prefix: process.env.OTEL_PREFIX || 'boxyhq.saas',
  },

  hideLandingPage: process.env.HIDE_LANDING_PAGE === 'true',

  darkModeEnabled: process.env.NEXT_PUBLIC_DARK_MODE !== 'false',

  teamFeatures: {
    sso: process.env.FEATURE_TEAM_SSO !== 'false',
    dsync: process.env.FEATURE_TEAM_DSYNC !== 'false',
    webhook: process.env.FEATURE_TEAM_WEBHOOK !== 'false',
    apiKey: process.env.FEATURE_TEAM_API_KEY !== 'false',
    auditLog: process.env.FEATURE_TEAM_AUDIT_LOG !== 'false',
    payments:
      process.env.FEATURE_TEAM_PAYMENTS === 'false'
        ? false
        : Boolean(
            process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
          ),
    deleteTeam: process.env.FEATURE_TEAM_DELETION !== 'false',
  },

  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || null,
    secretKey: process.env.RECAPTCHA_SECRET_KEY || null,
  },

  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,

  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  // AI SDK configuration
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    // Optional: Add more providers as needed
    google: {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY,
    },
    // Feature flags for AI features
    enabled: process.env.FEATURE_AI_ENABLED !== 'false',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 2048,
    temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
    // Rate limiting for AI features
    rateLimitPerUser: Number(process.env.AI_RATE_LIMIT_PER_USER) || 100,
    rateLimitWindow: Number(process.env.AI_RATE_LIMIT_WINDOW) || 3600, // 1 hour in seconds
  },

  // Deepgram configuration for medical transcription
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY,
    model: process.env.DEEPGRAM_MODEL || 'nova-3-medical',
    language: process.env.DEEPGRAM_LANGUAGE || 'en',
    webhookSecret: process.env.DEEPGRAM_WEBHOOK_SECRET,
    // Feature flags
    enabled: process.env.FEATURE_DEEPGRAM_ENABLED !== 'false',
    // Real-time transcription settings
    realtime: {
      enabled: process.env.FEATURE_DEEPGRAM_REALTIME !== 'false',
      sampleRate: Number(process.env.DEEPGRAM_SAMPLE_RATE) || 16000,
      channels: Number(process.env.DEEPGRAM_CHANNELS) || 1,
    },
    // Advanced features
    features: {
      diarization: process.env.DEEPGRAM_DIARIZATION !== 'false',
      punctuation: process.env.DEEPGRAM_PUNCTUATION !== 'false',
      smartFormatting: process.env.DEEPGRAM_SMART_FORMATTING !== 'false',
      keywords: process.env.DEEPGRAM_KEYWORDS?.split(',') || [],
    },
  },

  // Mental Health Platform configuration
  mentalHealth: {
    // HIPAA compliance settings
    hipaaCompliant: process.env.MENTAL_HEALTH_HIPAA_COMPLIANT !== 'false',
    auditLogging: process.env.MENTAL_HEALTH_AUDIT_LOGGING !== 'false',
    
    // Session recording settings
    recording: {
      enabled: process.env.FEATURE_SESSION_RECORDING !== 'false',
      maxDuration: Number(process.env.SESSION_MAX_DURATION) || 120, // minutes
      autoTranscribe: process.env.FEATURE_AUTO_TRANSCRIBE !== 'false',
      autoGenerateNotes: process.env.FEATURE_AUTO_GENERATE_NOTES !== 'false',
    },
    
    // Risk assessment settings
    riskAssessment: {
      enabled: process.env.FEATURE_RISK_ASSESSMENT !== 'false',
      autoTriggers: process.env.FEATURE_AUTO_RISK_TRIGGERS !== 'false',
      emergencyNotifications: process.env.FEATURE_EMERGENCY_NOTIFICATIONS !== 'false',
    },
    
    // Document generation settings
    documentGeneration: {
      enabled: process.env.FEATURE_DOCUMENT_GENERATION !== 'false',
      defaultModel: process.env.DOCUMENT_AI_MODEL || 'gpt-4o',
      templates: {
        soap: process.env.FEATURE_SOAP_TEMPLATES !== 'false',
        treatmentPlan: process.env.FEATURE_TREATMENT_PLAN_TEMPLATES !== 'false',
        progressReport: process.env.FEATURE_PROGRESS_REPORT_TEMPLATES !== 'false',
      },
    },
  },
};

export default env;
