import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  sender: 'user' | 'caretaker'
  text: string
  timestamp: Date
}

interface CaretakerChatProps {
  caretakerName: string
  propertyTitle: string
  onClose: () => void
}

const CaretakerChat = ({ caretakerName, propertyTitle, onClose }: CaretakerChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'caretaker',
      text: `Hi! I'm ${caretakerName}. How can I help you with ${propertyTitle}?`,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    }

    setMessages([...messages, newMessage])
    setInputMessage('')

    // Simulate caretaker typing
    setIsTyping(true)
    setTimeout(() => {
      const responses = [
        "I'd be happy to schedule a viewing for you. When would be a good time?",
        "This property is available for immediate move-in. Would you like to know more about the lease terms?",
        "Great question! The property includes all utilities except internet. Parking is also included.",
        "Yes, pets are allowed with a small additional deposit. Is that something you need?",
        "The area is very safe with 24/7 security. Many families live here. Would you like to see the security features?"
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const caretakerReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'caretaker',
        text: randomResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, caretakerReply])
      setIsTyping(false)
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const quickReplies = [
    "Schedule a viewing",
    "What's included?",
    "Are pets allowed?",
    "Tell me about the area"
  ]

  return (
    <div className="caretaker-chat">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="caretaker-avatar-chat">👤</div>
          <div className="caretaker-info-chat">
            <h4>{caretakerName}</h4>
            <span className="online-status">🟢 Online</span>
          </div>
        </div>
        <button className="btn-close-chat" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'caretaker-message'}`}
          >
            <div className="message-bubble">
              <p className="message-text">{message.text}</p>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message caretaker-message">
            <div className="message-bubble typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-replies">
        {quickReplies.map((reply, index) => (
          <button
            key={index}
            className="quick-reply-btn"
            onClick={() => {
              setInputMessage(reply)
              setTimeout(() => handleSendMessage(), 100)
            }}
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          rows={1}
        />
        <button 
          className="btn-send"
          onClick={handleSendMessage}
          disabled={inputMessage.trim() === ''}
        >
          <span>➤</span>
        </button>
      </div>
    </div>
  )
}

export default CaretakerChat