import { AIService, ChatMessage } from './types';
import { tauriApi } from '../../../lib/tauri-api';
import { listen } from '@tauri-apps/api/event';

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export class AgentRouterService implements AIService {
  async sendChatRequest(
    modelId: string,
    messages: ChatMessage[],
    onStreamChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let unlisten: (() => void) | undefined;
    let fullResponse = '';
    let toolCalls: ToolCall[] = [];
    
    try {
      // Check if already aborted
      if (signal?.aborted) {
        return;
      }

      // Setup listener for streaming events
      unlisten = await listen<string>('agentrouter-stream', (event) => {
        if (signal?.aborted) {
          if (unlisten) unlisten();
          return;
        }
        const chunk = event.payload;
        fullResponse += chunk;
        onStreamChunk(chunk);
      });

      // Setup abort handler
      const abortHandler = () => {
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }
      };
      signal?.addEventListener('abort', abortHandler);
      
      // Define tools for the agent
      const tools = [
        {
          type: "function",
          function: {
            name: "create_file",
            description: "Create a new file with optional content",
            parameters: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "The path where the file should be created"
                },
                content: {
                  type: "string",
                  description: "Optional content to write to the file"
                }
              },
              required: ["file_path"]
            }
          }
        }
      ];
      
      // Call AgentRouter API with tools
      await tauriApi.agentrouterChatStream(modelId, messages, undefined, undefined, undefined, tools, { type: "auto", function: { name: "create_file" } });
      
      signal?.removeEventListener('abort', abortHandler);
      
      // After streaming, check if there are tool calls to execute
      if (!signal?.aborted && toolCalls.length > 0) {
        onStreamChunk('\n\n[Executing tool calls...]\n');
        
        for (const toolCall of toolCalls) {
          try {
            const parameters = JSON.parse(toolCall.function.arguments);
            const result = await this.executeTool(toolCall.function.name, parameters);
            onStreamChunk(`\n[Tool ${toolCall.function.name} executed: ${result}]\n`);
          } catch (error) {
            onStreamChunk(`\n[Error executing ${toolCall.function.name}: ${error instanceof Error ? error.message : String(error)}]\n`);
          }
        }
      }
      
    } catch (error) {
      if (signal?.aborted) return;
      console.error('AgentRouter API error:', error);
      onStreamChunk(`[Error: ${error instanceof Error ? error.message : String(error)}]`);
    } finally {
      if (unlisten) unlisten();
    }
  }

  async generateTitle(
    modelId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    try {
      const titlePrompt = `Generate a concise, descriptive title (max 5 words) for this conversation:

User: ${userMessage}
Assistant: ${assistantResponse}

The title should:
- Be short and catchy
- Reflect the main topic
- Be in the same language as the user's message
- Not include quotes or special characters

Title:`;

      const messages = [
        { role: 'user', content: titlePrompt }
      ];

      const response = await tauriApi.agentrouterChatComplete(modelId, messages);
      return response.trim().replace(/^"'|"'$/g, '').slice(0, 50);
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback to a more meaningful title based on user message
      const words = userMessage.split(' ').slice(0, 4);
      const fallbackTitle = words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
      return fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1);
    }
  }

  async executeTool(toolName: string, parameters: any): Promise<string> {
    switch (toolName) {
      case 'create_file':
        return await this.createFile(parameters.file_path, parameters.content);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async createFile(filePath: string, content?: string): Promise<string> {
    try {
      const result = await tauriApi.agentrouterCreateFile(filePath, content);
      return result;
    } catch (error) {
      throw new Error(`Failed to create file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
