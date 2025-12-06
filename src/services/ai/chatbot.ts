/**
 * AI Chatbot Service
 * Provides pantry management advice using OpenAI
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatbotResponse {
  message: string;
  suggestions?: string[];
}

/**
 * ChatbotService class
 * Handles AI-powered conversations about pantry management
 */
export class ChatbotService {
  private apiKey: string | null;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    // Get API key from environment variable
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
    
    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: `You are a helpful pantry management assistant for PantryEye app. 
You help users with:
- Meal planning and recipe suggestions based on their inventory
- Food storage tips and shelf life advice
- Shopping recommendations and budget management
- Reducing food waste
- Nutritional advice and healthy eating
- Organizing pantry and fridge efficiently

Be concise, friendly, and practical. Focus on actionable advice.`,
      timestamp: new Date(),
    });
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey !== 'your_api_key_here';
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(userMessage: string, inventoryContext?: string): Promise<ChatbotResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: inventoryContext 
          ? `${userMessage}\n\nCurrent inventory context: ${inventoryContext}`
          : userMessage,
        timestamp: new Date(),
      });

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: this.conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get AI response');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date(),
      });

      // Keep only last 10 messages (plus system prompt) to manage token usage
      if (this.conversationHistory.length > 11) {
        this.conversationHistory = [
          this.conversationHistory[0], // Keep system prompt
          ...this.conversationHistory.slice(-10),
        ];
      }

      return {
        message: assistantMessage,
      };
    } catch (error) {
      console.error('[Chatbot] Error:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }

  /**
   * Clear conversation history (keeps system prompt)
   */
  clearHistory(): void {
    const systemPrompt = this.conversationHistory[0];
    this.conversationHistory = [systemPrompt];
  }

  /**
   * Get quick suggestions based on inventory
   */
  getQuickSuggestions(inventoryItems: string[]): string[] {
    const suggestions = [
      'What meals can I make with these ingredients?',
      'How should I store these items?',
      'What should I buy next?',
      'Help me reduce food waste',
      'Suggest a weekly meal plan',
    ];

    if (inventoryItems.length > 0) {
      suggestions.unshift(`What can I cook with ${inventoryItems.slice(0, 3).join(', ')}?`);
    }

    return suggestions;
  }
}

// Singleton instance
export const chatbotService = new ChatbotService();
