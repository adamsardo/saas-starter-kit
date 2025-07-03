import React, { useState } from 'react';
import { useTeamChat, useAIModels, useAIRateLimit } from '@/hooks/useAI';
import { Card } from '@/components/shared';
import { Button } from 'react-daisyui';
import type { ModelId } from '@/lib/ai/config';

export function AIChat() {
  const [selectedModel, setSelectedModel] = useState<ModelId | undefined>();
  const { models, defaultModel, isLoading: modelsLoading } = useAIModels();
  const { remaining, limit } = useAIRateLimit();
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
  } = useTeamChat();

  const availableModels = models.filter((m: any) => m.available);

  return (
    <Card>
      <Card.Body>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">AI Assistant</h2>
          {limit > 0 && (
            <span className="text-sm text-gray-500">
              {remaining}/{limit} requests remaining
            </span>
          )}
        </div>

        {/* Model selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            className="select select-bordered w-full"
            value={selectedModel || defaultModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelId)}
            disabled={modelsLoading}
          >
            {availableModels.map((model: any) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.provider}
              </option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-base-200">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">
              Start a conversation with the AI assistant
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-300'
                  }`}
                >
                  <p className="text-sm font-semibold mb-1">
                    {message.role === 'user' ? 'You' : 'AI'}
                  </p>
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {/* Show tool invocations if any */}
                  {message.toolInvocations?.map((tool: any, i: number) => (
                    <div key={i} className="mt-2 text-xs opacity-70">
                      <span className="font-semibold">Tool:</span> {tool.toolName}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="text-center">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          )}
          
          {error && (
            <div className="alert alert-error mt-2">
              <span>{error.message}</span>
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="input input-bordered flex-1"
            disabled={isLoading || remaining === 0}
          />
          {isLoading ? (
            <Button onClick={stop} color="error">
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              color="primary"
              disabled={!input.trim() || remaining === 0}
            >
              Send
            </Button>
          )}
        </form>
        
        {remaining === 0 && (
          <p className="text-sm text-error mt-2">
            You've reached your rate limit. Please try again later.
          </p>
        )}
      </Card.Body>
    </Card>
  );
}