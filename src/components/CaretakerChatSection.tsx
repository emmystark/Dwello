import React, { useState, useRef, useEffect } from 'react';
import { apiRequest, API_CONFIG } from '../lib/api-config';
import '../styles/CaretakerChat.css';

interface Message {
  id: string;
  sender: 'user' | 'caretaker';
  text: string;
  timestamp: Date;
}

interface CaretakerChatSectionProps {
  caretakerName?: string;
  propertyTitle: string;
  propertyId?: string;
  isPaymentVerified: boolean; // Only show if payment verified
  onClose?: () => void;
}

/**
 * CaretakerChatSection - Chat available only after payment
 * This component is embedded in PropertyDetails and gated by payment verification
 */
export const CaretakerChatSection: React.FC<CaretakerChatSectionProps> = ({
  caretakerName = 'Caretaker',
  propertyTitle,
  propertyId,
  isPaymentVerified,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'caretaker',
      text: `Hi! I'm ${caretakerName}. How can I help you with ${propertyTitle}?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history from API when component mounts
  useEffect(() => {
    if (!propertyId || !isPaymentVerified) return;

    const loadMessages = async () => {
      try {
        const endpoint = API_CONFIG.endpoints.messages.get(propertyId);
        const data = await apiRequest<any>(endpoint);
        if (data?.data && Array.isArray(data.data)) {
          const loadedMessages = data.data.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Failed to load message history:', error);
        // Keep existing messages on error
      }
    };

    loadMessages();
  }, [propertyId, isPaymentVerified]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    const messageText = inputMessage;
    setInputMessage('');

    // Send message to backend API
    if (propertyId) {
      try {
        setIsSending(true);
        await apiRequest(API_CONFIG.endpoints.messages.send, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            sender: 'user',
            text: messageText,
          }),
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSending(false);
      }
    }

    // Simulate caretaker typing
    setIsTyping(true);
    setTimeout(() => {
      const responses = [
        "I'd be happy to schedule a viewing for you. When would be a good time?",
        'This property is available for immediate move-in. Would you like to know more about the lease terms?',
        'Great question! The property includes all utilities except internet. Parking is also included.',
        'Yes, pets are allowed with a small additional deposit. Is that something you need?',
        'The area is very safe with 24/7 security. Many families live here. Would you like more details?',
        'I can arrange a virtual tour or in-person viewing. What works best for you?',
        'Feel free to ask any other questions you might have about the property!',
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const caretakerReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'caretaker',
        text: randomResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, caretakerReply]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't show chat if payment not verified
  if (!isPaymentVerified) {
    return (
      <div className="chat-section-locked">
        <div className="chat-locked-icon">🔒</div>
        <h3>Chat Locked</h3>
        <p>Complete the payment to unlock caretaker messaging</p>
      </div>
    );
  }

  return (
    <div className="caretaker-chat-section">
      <div className="chat-header">
        <h3>💬 Message {caretakerName}</h3>
        {onClose && (
          <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.sender === 'user' ? 'user-message' : 'caretaker-message'}`}
          >
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="chat-message caretaker-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question... (Shift+Enter for new line)"
          className="chat-input"
          rows={3}
        />
        <button
          onClick={handleSendMessage}
          className="chat-send-btn"
          disabled={inputMessage.trim() === '' || isTyping}
        >
          Send →
        </button>
      </div>
    </div>
  );
};

export default CaretakerChatSection;
