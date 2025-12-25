import { AIServiceFactory } from './AIServiceFactory';
import { ChatMessage, AIModel } from './types';
import { generateSystemPrompt } from '../utils/systemPrompt';
import { AgentToolService } from './AgentToolService';
import { parseToolCalls, hasToolCalls } from './ToolParser';

const MAX_AGENT_ITERATIONS = 10; // Prevent infinite loops

export class ChatService {
  private abortController: AbortController | null = null;
  private toolService: AgentToolService | null = null;

  setWorkspace(workspace: string): void {
    this.toolService = new AgentToolService(workspace);
  }

  async sendMessage(
    model: AIModel,
    messages: ChatMessage[],
    mode: 'responder' | 'agent',
    onStreamChunk: (chunk: string) => void,
    onToolExecution?: (tool: string, isStart: boolean, result?: string) => void
  ): Promise<void> {
    // Create new abort controller for this request
    this.abortController = new AbortController();
    
    // Reset tool service for new message
    if (this.toolService) {
      this.toolService.reset();
    }
    
    // Add system prompt based on mode
    const systemPrompt = generateSystemPrompt({
      mode,
      user_os: 'linux',
      user_query: messages[messages.length - 1]?.content || ''
    });

    // Build conversation messages (will be mutated in agent loop)
    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // For responder mode - single request, no tool execution
    if (mode === 'responder') {
      const service = AIServiceFactory.createService(model.provider);
      await service.sendChatRequest(
        model.id, 
        conversationMessages, 
        onStreamChunk, 
        this.abortController.signal
      );
      return;
    }

    // Agent mode - agentic loop with tool execution
    let iteration = 0;
    
    while (iteration < MAX_AGENT_ITERATIONS) {
      iteration++;
      
      // Check if aborted
      if (this.abortController?.signal.aborted) {
        break;
      }

      // Collect full response for this iteration
      let responseBuffer = '';
      
      const collectChunk = (chunk: string) => {
        responseBuffer += chunk;
        onStreamChunk(chunk);
      };

      // Send request to model
      const service = AIServiceFactory.createService(model.provider);
      await service.sendChatRequest(
        model.id, 
        conversationMessages, 
        collectChunk, 
        this.abortController.signal
      );

      // Check if response contains tool calls
      if (!hasToolCalls(responseBuffer) || !this.toolService) {
        // No tool calls - agent is done
        break;
      }

      // Parse and execute tool calls
      const calls = parseToolCalls(responseBuffer);
      
      if (calls.length === 0) {
        break;
      }

      // Execute all tools and collect results
      const toolResults: string[] = [];
      
      for (const call of calls) {
        // Notify about tool execution start
        onToolExecution?.(call.tool, true);
        
        // Execute the tool
        const result = await this.toolService.executeTool(call.tool, call.args);
        
        // Notify about tool execution complete
        onToolExecution?.(call.tool, false, result.formatted);
        
        // Show result in UI using special markers that ChatView can parse
        if (result.formatted) {
          // Use special marker format that ChatView will parse and render nicely
          const resultText = `\n\n[[TOOL_RESULT:${call.tool}:${result.formatted}]]\n`;
          onStreamChunk(resultText);
          toolResults.push(`Tool: ${call.tool}\nResult:\n${result.formatted}`);
        } else if (result.error) {
          const resultText = `\n\n[[TOOL_ERROR:${call.tool}:${result.error}]]\n`;
          onStreamChunk(resultText);
          toolResults.push(`Tool: ${call.tool}\nError: ${result.error}`);
        }
      }

      // Add assistant response and tool results to conversation
      conversationMessages.push({
        role: 'assistant',
        content: responseBuffer
      });

      // Add tool results as a user message (simulating tool response)
      const toolResultsMessage = `Tool execution completed. Results:\n\n${toolResults.join('\n\n---\n\n')}\n\nNow analyze these results and provide your answer to the user's original question. Do not call more tools unless absolutely necessary.`;
      
      conversationMessages.push({
        role: 'user',
        content: toolResultsMessage
      });

      // Add visual separator for next iteration
      onStreamChunk('\n\n---\n\n');
    }

    if (iteration >= MAX_AGENT_ITERATIONS) {
      onStreamChunk('\n\n⚠️ Maximum iterations reached. Stopping agent loop.\n');
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async generateTitle(
    model: AIModel,
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    const service = AIServiceFactory.createService(model.provider);
    return await service.generateTitle(model.id, userMessage, assistantResponse);
  }

  /**
   * Execute a tool directly (for manual tool calls)
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!this.toolService) {
      return { success: false, error: 'Tool service not initialized. Set workspace first.' };
    }
    
    const result = await this.toolService.executeTool(toolName, args);
    
    return {
      success: result.success,
      result: result.formatted,
      error: result.error
    };
  }
}
