import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Sparkles, Download, CheckCircle } from 'lucide-react';
import { aiAPI } from '../Services/api';
import './AIChat.css';

const QUICK_QUESTIONS = [
  '📅 Book an appointment',
  '🔍 Check my appointment',
  '🏥 I have chest pain, which dept?',
  '📋 What documents to bring?',
];

const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm **MediAssist** 👋\n\nI can **book appointments** for you directly through chat, check your appointment status, or answer any healthcare questions.\n\nWhat would you like to do today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send conversation history (exclude system-level booking cards)
      const history = [...messages, userMsg]
  .filter(m => !m.isBookingCard)
  .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

      const res = await aiAPI.chat(msg, history);
     // ✅ New version
const { message: aiMessage, appointmentBooked, appointment } = res.data;

const assistantMsg = {
  role: 'assistant',
  content: aiMessage,
  ...(appointmentBooked && { isBookingCard: true, appointment }),
};

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .split('\n')
      .map((line) => `<p>${line || '&nbsp;'}</p>`)
      .join('');
  };

// ✅ New version
const downloadPdf = (referenceId) => {
  if (!referenceId) {
    alert('PDF not available. Please try again.');
    return;
  }
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  window.open(`${base}/api/appointments/${referenceId}/pdf`, '_blank');
};

  return (
    <>
      {/* Toggle Button */}
      {!open && (
        <button className="chat-toggle animate-bounce-in" onClick={() => setOpen(true)}>
          <MessageCircle size={24} />
          <span className="chat-toggle__badge">AI</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className={`chat-window ${minimized ? 'chat-window--minimized' : ''} animate-fade-in`}>
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header__info">
              <div className="chat-avatar">
                <Sparkles size={16} />
              </div>
              <div>
                <h4>MediAssist</h4>
                <span className="chat-status">
                  <span className="status-dot" />
                  Can book appointments · Always online
                </span>
              </div>
            </div>
            <div className="chat-header__actions">
              <button onClick={() => setMinimized(!minimized)}><Minimize2 size={16} /></button>
              <button onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="msg-avatar"><Bot size={14} /></div>
                    )}
                    <div className="msg-bubble-wrap">
                      <div
                        className="msg-bubble"
                        dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                      />
                      {/* Booking confirmation card */}
                      // ✅ New version
                          {msg.isBookingCard && msg.appointment?.referenceId && (
                            <button
                              className="pdf-download-btn"
                              onClick={() => downloadPdf(msg.appointment.referenceId)}
                            >
                              <Download size={14} />
                              Download Appointment PDF
                            </button>
                          )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="msg-avatar msg-avatar--user"><User size={14} /></div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="chat-msg chat-msg--assistant">
                    <div className="msg-avatar"><Bot size={14} /></div>
                    <div className="msg-bubble msg-bubble--typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick questions — show only at start */}
              {messages.length === 1 && (
                <div className="quick-questions">
                  {QUICK_QUESTIONS.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}>{q}</button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="chat-input-area">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type here or say 'book appointment'..."
                  disabled={loading}
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChat;