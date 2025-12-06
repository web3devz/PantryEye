/**
 * Chatbot Panel Component
 * AI-powered assistant for pantry management advice
 */

import { useState, useEffect, useRef } from 'react';
import { chatbotService, ChatMessage } from '../services/ai/chatbot';
import { inventoryService } from '../services/inventory/inventory';

interface ChatbotPanelProps {
  onClose: () => void;
}

export function ChatbotPanel({ onClose }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if API is configured
    setIsConfigured(chatbotService.isConfigured());
    
    // Load conversation history
    setMessages(chatbotService.getHistory());
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);
    setIsLoading(true);

    try {
      // Get inventory context
      const inventory = await inventoryService.getInventory();
      const inventoryContext = inventory.length > 0
        ? `User has ${inventory.length} items: ${inventory.map(i => i.sku.name).join(', ')}`
        : 'User has no items in inventory yet';

      // Send message to AI
      await chatbotService.sendMessage(userMessage, inventoryContext);
      
      // Update messages
      setMessages(chatbotService.getHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    chatbotService.clearHistory();
    setMessages([]);
  };

  if (!isConfigured) {
    return (
      <div className="chatbot-panel">
        <div className="chatbot-header">
          <h3>🤖 AI Assistant</h3>
          <button onClick={onClose} className="close-button">✕</button>
        </div>
        <div className="chatbot-body">
          <div className="chatbot-setup-message">
            <h4>⚙️ Setup Required</h4>
            <p>To use the AI assistant, you need to configure your OpenAI API key:</p>
            <ol>
              <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI</a></li>
              <li>Create a <code>.env</code> file in the project root</li>
              <li>Add: <code>VITE_OPENAI_API_KEY=your_key_here</code></li>
              <li>Restart the development server</li>
            </ol>
            <p className="warning">⚠️ Never commit your API key to version control!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chatbot-panel">
      <div className="chatbot-header">
        <h3>🤖 AI Assistant</h3>
        <div className="chatbot-header-actions">
          <button onClick={handleClearHistory} className="clear-button" title="Clear conversation">
            🗑️
          </button>
          <button onClick={onClose} className="close-button">✕</button>
        </div>
      </div>

      <div className="chatbot-body">
        <div className="chatbot-messages">
          {messages.length === 0 && (
            <div className="chatbot-welcome">
              <p>👋 Hi! I'm your pantry management assistant.</p>
              <p>Ask me about:</p>
              <ul>
                <li>🍳 Recipe suggestions</li>
                <li>🛒 Shopping advice</li>
                <li>📦 Food storage tips</li>
                <li>♻️ Reducing waste</li>
                <li>🥗 Meal planning</li>
              </ul>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error">
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-area">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your pantry..."
            className="chatbot-input"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
}
