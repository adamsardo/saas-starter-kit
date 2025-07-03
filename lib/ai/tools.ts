import { tool } from 'ai';
import { z } from 'zod';
import { getTeam } from '../../models/team';
import { getUser } from '../../models/user';

// Tool for getting team information
export const getTeamInfoTool = tool({
  description: 'Get information about a team by ID or slug',
  parameters: z.object({
    teamIdOrSlug: z.string().describe('The ID or slug of the team'),
    useSlug: z.boolean().optional().default(false).describe('Whether the input is a slug instead of ID'),
  }),
  execute: async ({ teamIdOrSlug, useSlug }) => {
    try {
      const team = await getTeam(useSlug ? { slug: teamIdOrSlug } : { id: teamIdOrSlug });
      if (!team) {
        return { error: 'Team not found' };
      }
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        domain: team.domain,
        createdAt: team.createdAt,
      };
    } catch (error) {
      return { error: 'Failed to fetch team information' };
    }
  },
});

// Tool for searching users
export const searchUsersTool = tool({
  description: 'Search for users by email or name',
  parameters: z.object({
    query: z.string().describe('Search query for email or name'),
    limit: z.number().optional().default(10).describe('Maximum number of results'),
  }),
  execute: async ({ query, limit }) => {
    try {
      // Simple search implementation
      const users = await getUser({ email: query });
      if (users) {
        return {
          users: [{
            id: users.id,
            email: users.email,
            name: users.name,
          }],
        };
      }
      return { users: [] };
    } catch (error) {
      return { error: 'Failed to search users' };
    }
  },
});

// Tool for text analysis
export const analyzeTextTool = tool({
  description: 'Analyze text for sentiment, key topics, and summary',
  parameters: z.object({
    text: z.string().describe('Text to analyze'),
    analysisType: z.enum(['sentiment', 'summary', 'keywords', 'all']).describe('Type of analysis'),
  }),
  execute: async ({ text, analysisType }) => {
    // This is a mock implementation - in production, you'd use an NLP service
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
    
    const analysis: any = {
      wordCount,
      sentenceCount,
      readingTime: Math.ceil(wordCount / 200), // Assuming 200 words per minute
    };

    if (analysisType === 'sentiment' || analysisType === 'all') {
      // Mock sentiment analysis
      analysis.sentiment = {
        score: 0.7,
        label: 'positive',
      };
    }

    if (analysisType === 'keywords' || analysisType === 'all') {
      // Extract simple keywords (in production, use proper NLP)
      const words = text.toLowerCase().split(/\W+/);
      const wordFreq = words.reduce((acc: Record<string, number>, word) => {
        if (word.length > 4) {
          acc[word] = (acc[word] || 0) + 1;
        }
        return acc;
      }, {});
      
      analysis.keywords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
    }

    if (analysisType === 'summary' || analysisType === 'all') {
      // Mock summary (take first sentence)
      analysis.summary = text.split(/[.!?]/)[0].trim() + '.';
    }

    return analysis;
  },
});

// Tool for data formatting
export const formatDataTool = tool({
  description: 'Format data into different structures (JSON, CSV, Markdown table)',
  parameters: z.object({
    data: z.array(z.record(z.any())).describe('Array of objects to format'),
    format: z.enum(['json', 'csv', 'markdown']).describe('Output format'),
    columns: z.array(z.string()).optional().describe('Specific columns to include'),
  }),
  execute: async ({ data, format, columns }) => {
    if (!data || data.length === 0) {
      return { error: 'No data provided' };
    }

    const keys = columns || Object.keys(data[0]);

    switch (format) {
      case 'json':
        const jsonData = columns 
          ? data.map(row => keys.reduce((acc, key) => ({ ...acc, [key]: row[key] }), {}))
          : data;
        return { formatted: JSON.stringify(jsonData, null, 2) };

      case 'csv':
        const csvHeader = keys.join(',');
        const csvRows = data.map(row => 
          keys.map(key => {
            const value = row[key];
            // Escape CSV values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        );
        return { formatted: [csvHeader, ...csvRows].join('\n') };

      case 'markdown':
        const mdHeader = `| ${keys.join(' | ')} |`;
        const mdDivider = `| ${keys.map(() => '---').join(' | ')} |`;
        const mdRows = data.map(row => 
          `| ${keys.map(key => row[key] || '').join(' | ')} |`
        );
        return { formatted: [mdHeader, mdDivider, ...mdRows].join('\n') };

      default:
        return { error: 'Invalid format' };
    }
  },
});

// Tool for date/time operations
export const dateTimeTool = tool({
  description: 'Perform date and time operations',
  parameters: z.object({
    operation: z.enum(['now', 'add', 'subtract', 'format', 'diff']).describe('Operation to perform'),
    date: z.string().optional().describe('ISO date string'),
    amount: z.number().optional().describe('Amount for add/subtract operations'),
    unit: z.enum(['days', 'hours', 'minutes', 'seconds', 'months', 'years']).optional(),
    format: z.string().optional().describe('Format string for formatting'),
    date2: z.string().optional().describe('Second date for diff operation'),
  }),
  execute: async ({ operation, date, amount, unit, format: fmt, date2 }) => {
    const baseDate = date ? new Date(date) : new Date();

    switch (operation) {
      case 'now':
        return { result: new Date().toISOString() };

      case 'add':
        if (!amount || !unit) {
          return { error: 'Amount and unit required for add operation' };
        }
        const addResult = new Date(baseDate);
        switch (unit) {
          case 'days':
            addResult.setDate(addResult.getDate() + amount);
            break;
          case 'hours':
            addResult.setHours(addResult.getHours() + amount);
            break;
          case 'minutes':
            addResult.setMinutes(addResult.getMinutes() + amount);
            break;
          case 'seconds':
            addResult.setSeconds(addResult.getSeconds() + amount);
            break;
          case 'months':
            addResult.setMonth(addResult.getMonth() + amount);
            break;
          case 'years':
            addResult.setFullYear(addResult.getFullYear() + amount);
            break;
        }
        return { result: addResult.toISOString() };

      case 'subtract':
        if (!amount || !unit) {
          return { error: 'Amount and unit required for subtract operation' };
        }
        return dateTimeTool.execute({ 
          operation: 'add', 
          date, 
          amount: -amount, 
          unit,
          format: fmt,
          date2,
        });

      case 'format':
        // Simple format implementation
        const formatted = baseDate.toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'medium',
        });
        return { result: formatted };

      case 'diff':
        if (!date2) {
          return { error: 'Second date required for diff operation' };
        }
        const d1 = new Date(baseDate);
        const d2 = new Date(date2);
        const diffMs = d2.getTime() - d1.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return {
          milliseconds: diffMs,
          seconds: Math.floor(diffMs / 1000),
          minutes: diffMinutes,
          hours: diffHours,
          days: diffDays,
        };

      default:
        return { error: 'Invalid operation' };
    }
  },
});

// Export all tools as a collection
export const aiTools = {
  getTeamInfo: getTeamInfoTool,
  searchUsers: searchUsersTool,
  analyzeText: analyzeTextTool,
  formatData: formatDataTool,
  dateTime: dateTimeTool,
};

// Tool metadata for UI display
export const toolMetadata = {
  getTeamInfo: {
    name: 'Get Team Info',
    category: 'Database',
    icon: 'database',
  },
  searchUsers: {
    name: 'Search Users',
    category: 'Database',
    icon: 'search',
  },
  analyzeText: {
    name: 'Analyze Text',
    category: 'Analysis',
    icon: 'chart',
  },
  formatData: {
    name: 'Format Data',
    category: 'Utility',
    icon: 'code',
  },
  dateTime: {
    name: 'Date & Time',
    category: 'Utility',
    icon: 'calendar',
  },
};