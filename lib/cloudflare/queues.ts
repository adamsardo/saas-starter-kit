import env from '@/lib/env';

interface QueueMessage {
  id: string;
  sessionId: string;
  teamId: string;
  audioKey: string;
  timestamp: number;
}

/**
 * Send a job to Cloudflare Queue
 * Note: In production, this would be called from within a Worker or via the REST API
 */
export async function sendToQueue(message: QueueMessage) {
  const { accountId, queueId, apiToken } = env.cloudflare.queues;
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            body: message,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message to queue: ${error}`);
  }

  const result = await response.json();
  console.log(`Message sent to queue: ${message.id}`);
  
  return {
    success: true,
    messageId: message.id,
    result,
  };
}

/**
 * Queue a session for batch processing
 */
export async function queueSessionForProcessing(
  sessionId: string,
  teamId: string,
  audioUrl: string
) {
  // Extract the R2 key from the URL
  const urlParts = audioUrl.split('/');
  const audioKey = urlParts.slice(-5).join('/'); // Get the last parts that form the key
  
  const message: QueueMessage = {
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    teamId,
    audioKey,
    timestamp: Date.now(),
  };

  return await sendToQueue(message);
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const { accountId, queueId, apiToken } = env.cloudflare.queues;
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get queue stats');
  }

  return await response.json();
}

/**
 * List messages in the queue (for debugging)
 */
export async function listQueueMessages(limit: number = 10) {
  const { accountId, queueId, apiToken } = env.cloudflare.queues;
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list queue messages');
  }

  return await response.json();
} 