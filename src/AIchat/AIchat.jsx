// import React, { useState, useRef, useEffect } from 'react';
// import { MessageCircle, X, Send, Bot, User, Minimize2, Sparkles } from 'lucide-react';
// import { aiAPI } from '../Services/api';
// import './AIChat.css';

// const QUICK_QUESTIONS = [
//   'How do I book an appointment?',
//   'What documents should I bring?',
//   'I have chest pain, which department?',
//   'Cancel my appointment',
// ];

// const AIChat = () => {
//   const [open, setOpen] = useState(false);
//   const [minimized, setMinimized] = useState(false);
//   const [messages, setMessages] = useState([
//     {
//       role: 'assistant',
//       content: "Hi! I'm **MediAssist**, your healthcare guide. I can help you find the right department, answer questions about appointments, or provide general health guidance.\n\nHow can I help you today?",
//     },
//   ]);
//   const [input, setInput] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [pdfUrl, setPdfUrl] = useState(null);
//   const messagesEndRef = useRef(null);
//   const messagesContainerRef = useRef(null);
//   const isAtBottomRef = useRef(true);

//   useEffect(() => {
//     const container = messagesContainerRef.current;
//     if (!container) return;

//     // determine if user was near the bottom before the update
//     const wasAtBottom = isAtBottomRef.current;

//     if (wasAtBottom) {
//       const id = requestAnimationFrame(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//       });
//       return () => cancelAnimationFrame(id);
//     }
//     // if user scrolled up, don't force-scroll
//     return undefined;
//   }, [messages]);

//   useEffect(() => {
//     const container = messagesContainerRef.current;
//     if (!container) return;

//     const checkAtBottom = () => {
//       const threshold = 150; // px
//       const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
//       isAtBottomRef.current = atBottom;
//     };

//     // initial check
//     checkAtBottom();
//     container.addEventListener('scroll', checkAtBottom, { passive: true });
//     return () => container.removeEventListener('scroll', checkAtBottom);
//   }, []);

//   const sendMessage = async (text) => {
//     const msg = text || input.trim();
//     if (!msg || loading) return;

//     setInput('');
//     setMessages(prev => [...prev, { role: 'user', content: msg }]);
//     setLoading(true);

//     try {
//       const history = [...messages, { role: 'user', content: msg }].map(m => ({ role: m.role, content: m.content }));
//       const res = await aiAPI.chat(msg, history);
//       setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
//       if (res.data.pdfUrl) {
//         setPdfUrl(res.data.pdfUrl);
//       }
//     } catch {
//       setMessages(prev => [...prev, {
//         role: 'assistant',
//         content: "I'm having trouble connecting right now. Please try again or contact support.",
//       }]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatMessage = (text) => {
//     return text
//       .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
//       .replace(/\*(.*?)\*/g, '<em>$1</em>')
//       .replace(/•/g, '•')
//       .split('\n')
//       .map((line, i) => `<p key=${i}>${line || '&nbsp;'}</p>`)
//       .join('');
//   };

//   return (
//     <>
//       {/* Chat Toggle Button */}
//       {!open && (
//         <button className="chat-toggle animate-bounce-in" onClick={() => setOpen(true)}>
//           <MessageCircle size={24}/>
//           <span className="chat-toggle__badge">AI</span>
//         </button>
//       )}

//       {/* Chat Window */}
//       {open && (
//         <div className={`chat-window ${minimized ? 'chat-window--minimized' : ''} animate-fade-in`}>
//           {/* Header */}
//           <div className="chat-header">
//             <div className="chat-header__info">
//               <div className="chat-avatar">
//                 <Sparkles size={16}/>
//               </div>
//               <div>
//                 <h4>MediAssist</h4>
//                 <span className="chat-status">
//                   <span className="status-dot"/>
//                   AI-powered · Always online
//                 </span>
//               </div>
//             </div>
//             <div className="chat-header__actions">
//               <button onClick={() => setMinimized(!minimized)} title="Minimize">
//                 <Minimize2 size={16}/>
//               </button>
//               <button onClick={() => setOpen(false)} title="Close">
//                 <X size={16}/>
//               </button>
//             </div>
//           </div>

//           {!minimized && (
//             <>
//               {/* Messages */}
//               <div className="chat-messages" ref={messagesContainerRef}>
//                 {messages.map((msg, i) => (
//                   <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
//                     {msg.role === 'assistant' && (
//                       <div className="msg-avatar"><Bot size={14}/></div>
//                     )}
//                     <div
//                       className="msg-bubble"
//                       dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
//                     />
//                     {msg.role === 'user' && (
//                       <div className="msg-avatar msg-avatar--user"><User size={14}/></div>
//                     )}
//                   </div>
//                 ))}
//                 {loading && (
//                   <div className="chat-msg chat-msg--assistant">
//                     <div className="msg-avatar"><Bot size={14}/></div>
//                     <div className="msg-bubble msg-bubble--typing">
//                       <span/><span/><span/>
//                     </div>
//                   </div>
//                 )}
//                 <div ref={messagesEndRef}/>
//               </div>

//               {/* Quick Questions */}
//               {pdfUrl && (
//                 <div className="chat-pdf-card">
//                   <a
//                     className="chat-pdf-link"
//                     href={`http://localhost:5000${pdfUrl}`}
//                     target="_blank"
//                     rel="noreferrer"
//                     download
//                   >
//                     📥 Download appointment PDF
//                   </a>
//                 </div>
//               )}
//               {messages.length === 1 && (
//                 <div className="quick-questions">
//                   {QUICK_QUESTIONS.map(q => (
//                     <button key={q} onClick={() => sendMessage(q)}>{q}</button>
//                   ))}
//                 </div>
//               )}

//               {/* Input */}
//               <div className="chat-input-area">
//                 <input
//                   value={input}
//                   onChange={e => setInput(e.target.value)}
//                   onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
//                   placeholder="Ask about appointments, symptoms..."
//                   disabled={loading}
//                 />
//                 <button onClick={() => sendMessage()} disabled={!input.trim() || loading}>
//                   <Send size={16}/>
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       )}
//     </>
//   );
// };

// export default AIChat;




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
      const { message: aiMessage, appointmentBooked, appointment, pdfUrl } = res.data;

      const assistantMsg = {
        role: 'assistant',
        content: aiMessage,
        ...(appointmentBooked && { isBookingCard: true, appointment, pdfUrl }),
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

 const downloadPdf = (pdfUrl) => {
  if (!pdfUrl) {
    alert('PDF not available. Please try again.');
    return;
  }
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const fullUrl = `${base}${pdfUrl}`;
  console.log('PDF URL:', fullUrl); // for debugging
  window.open(fullUrl, '_blank');
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
                      {msg.isBookingCard && msg.pdfUrl && (
                        <button
                          className="pdf-download-btn"
                          onClick={() => downloadPdf(msg.pdfUrl)}
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