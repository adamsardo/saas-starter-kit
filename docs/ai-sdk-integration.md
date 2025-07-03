# Vercel AI SDK Integration Guide

This guide explains how the Vercel AI SDK v5 has been integrated into the BoxyHQ SaaS Starter Kit.

## Overview

The Vercel AI SDK v5 has been integrated to provide powerful AI capabilities including:

- **Text Generation**: Stream or generate text completions
- **Structured Data Generation**: Extract structured data using Zod schemas
- **Tool Calling**: Extend AI capabilities with custom tools
- **Multi-Agent Workflows**: Build complex AI workflows
- **Multiple Provider Support**: OpenAI, Anthropic, and more

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# AI Provider API Keys
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORGANIZATION=your_openai_org_id # Optional
ANTHROPIC_API_KEY=your_anthropic_api_key # Optional
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key # Optional
MISTRAL_API_KEY=your_mistral_api_key # Optional

# AI Feature Configuration
FEATURE_AI_ENABLED=true # Enable/disable AI features globally
AI_DEFAULT_MODEL=gpt-4o-mini # Default model to use
AI_MAX_TOKENS=2048 # Maximum tokens per request
AI_TEMPERATURE=0.7 # Default temperature (0-2)

# Rate Limiting
AI_RATE_LIMIT_PER_USER=100 # Requests per user per window
AI_RATE_LIMIT_WINDOW=3600 # Rate limit window in seconds (1 hour)
```

### Available Models

The following models are pre-configured:

**OpenAI Models:**
- `gpt-4o` - Most capable GPT-4 model with vision
- `gpt-4o-mini` - Affordable small model for simple tasks
- `gpt-4-turbo` - High-performance GPT-4 with 128k context
- `gpt-3.5-turbo` - Fast and affordable for most tasks

**Anthropic Models:**
- `claude-3-5-sonnet-20241022` - Most intelligent Claude model
- `claude-3-5-haiku-20241022` - Fast and affordable Claude model
- `claude-3-opus-20240229` - Previous most capable Claude model
- `claude-3-sonnet-20240229` - Balanced performance and cost
- `claude-3-haiku-20240307` - Fastest Claude model

## API Endpoints

### Chat Endpoint
`POST /api/teams/{slug}/ai/chat`

Stream a conversation with the AI assistant.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-4o-mini", // Optional
  "tools": false // Enable tool calling
}
```

### Completion Endpoint
`POST /api/teams/{slug}/ai/completion`

Generate a single text completion (non-streaming).

**Request Body:**
```json
{
  "prompt": "Write a blog post about...",
  "model": "gpt-4o-mini", // Optional
  "temperature": 0.7, // Optional
  "maxTokens": 1000, // Optional
  "systemPrompt": "You are a helpful assistant" // Optional
}
```

### Structured Data Generation
`POST /api/teams/{slug}/ai/generate-object`

Extract structured data from text using predefined schemas.

**Request Body:**
```json
{
  "prompt": "John Doe is a 30-year-old software engineer...",
  "schemaType": "person", // Available: person, company, task, meeting, product
  "model": "gpt-4o-mini" // Optional
}
```

### Get Available Models
`GET /api/teams/{slug}/ai/models`

Get list of available AI models and their metadata.

## React Hooks

### useTeamChat

```tsx
import { useTeamChat } from '@/hooks/useAI';

function ChatComponent() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error
  } = useTeamChat();

  return (
    <form onSubmit={handleSubmit}>
      {/* Render messages */}
      <input value={input} onChange={handleInputChange} />
      <button type="submit">Send</button>
    </form>
  );
}
```

### useTeamCompletion

```tsx
import { useTeamCompletion } from '@/hooks/useAI';

function CompletionComponent() {
  const { completeWithOptions } = useTeamCompletion();

  const generateText = async () => {
    const result = await completeWithOptions(
      "Write a product description for...",
      {
        model: "gpt-4o-mini",
        temperature: 0.8,
        maxTokens: 500
      }
    );
    console.log(result.text);
  };
}
```

### useGenerateObject

```tsx
import { useGenerateObject } from '@/hooks/useAI';

function DataExtractor() {
  const { generateObject } = useGenerateObject('person');

  const extractPerson = async (text: string) => {
    const result = await generateObject(text);
    console.log(result.object); // Typed person object
  };
}
```

### useAIModels

```tsx
import { useAIModels } from '@/hooks/useAI';

function ModelSelector() {
  const { models, defaultModel, isLoading } = useAIModels();

  return (
    <select defaultValue={defaultModel}>
      {models.filter(m => m.available).map(model => (
        <option key={model.id} value={model.id}>
          {model.name} - ${model.pricePerMillionTokens.input}/M tokens
        </option>
      ))}
    </select>
  );
}
```

## Custom Tools

You can extend AI capabilities by creating custom tools:

```typescript
// lib/ai/tools.ts
export const myCustomTool = tool({
  description: 'Description of what the tool does',
  parameters: z.object({
    param1: z.string().describe('Parameter description'),
  }),
  execute: async ({ param1 }) => {
    // Tool implementation
    return { result: 'data' };
  },
});
```

## Security Features

1. **Authentication**: All AI endpoints require authentication
2. **Team Access**: Users can only access AI features for teams they belong to
3. **Rate Limiting**: Configurable per-user rate limits
4. **Input Sanitization**: Automatic removal of prompt injection attempts
5. **Token Limits**: Automatic validation of prompt length
6. **Usage Tracking**: All AI usage is logged for billing and analytics

## Best Practices

1. **Model Selection**: 
   - Use smaller models (gpt-4o-mini, claude-3-haiku) for simple tasks
   - Reserve larger models for complex reasoning tasks
   
2. **Prompt Engineering**:
   - Be specific and clear in your prompts
   - Use system prompts to set context
   - Include examples for better results

3. **Error Handling**:
   - Always handle rate limit errors gracefully
   - Provide fallback behavior when AI is unavailable
   - Show loading states during generation

4. **Cost Management**:
   - Monitor usage through the analytics endpoints
   - Set appropriate rate limits
   - Use caching where possible

## Example Components

See `components/ai/AIChat.tsx` for a complete example of a chat interface.

## Troubleshooting

### Common Issues

1. **"AI features are not enabled"**
   - Ensure `FEATURE_AI_ENABLED=true` in your environment

2. **"Model not available"**
   - Check that you've added the appropriate API keys
   - Verify the model ID is correct

3. **Rate limit errors**
   - Adjust `AI_RATE_LIMIT_PER_USER` and `AI_RATE_LIMIT_WINDOW`
   - Implement retry logic with exponential backoff

4. **Streaming issues**
   - Ensure your infrastructure supports Server-Sent Events
   - Check for proxy timeouts (set appropriate `maxDuration`)

## Future Enhancements

- Database persistence for conversations
- Team-level AI usage quotas
- Custom model fine-tuning support
- Advanced prompt templates
- Multi-modal support (images, audio)
- Agent orchestration framework