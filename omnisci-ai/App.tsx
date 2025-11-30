import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatBubble } from './components/ChatBubble';
import { CameraCapture } from './components/CameraCapture';
import { Message, Role, AgentId } from './types';
import { sendMessageStream, initializeChat, AGENTS } from './services/geminiService';

const STORAGE_KEY = 'omnisci_history_v2';

const dateReviver = (key: string, value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
    }
    return value;
};

const getInitialHistory = (): Record<string, Message[]> => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved, dateReviver);
        }
    } catch (e) {
        console.error("Failed to parse history", e);
    }
    return {};
};

const App: React.FC = () => {
  const [history, setHistory] = useState<Record<string, Message[]>>(getInitialHistory);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>(AgentId.GENERAL);
  
  const [messages, setMessages] = useState<Message[]>(() => {
    const h = getInitialHistory();
    if (h[AgentId.GENERAL] && h[AgentId.GENERAL].length > 0) {
        return h[AgentId.GENERAL];
    }
    return [{
        id: Date.now().toString(),
        role: Role.MODEL,
        content: "Greetings. I am **OmniSci**. I specialize in STEM fields, image analysis, and research. Select a specialized agent from the sidebar for specific tasks.",
        timestamp: new Date(),
        agentId: AgentId.GENERAL
    }];
  });

  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Auto-collapse sidebar on smaller screens (Tablet Portrait)
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth >= 768 && window.innerWidth < 1024) {
              setIsSidebarCompact(true);
          }
      };
      
      // Initial check
      handleResize();
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
        initializeChat(activeAgentId, messages);
        initializedRef.current = true;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingImage, isLoading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRequest();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setPendingImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCameraCapture = (imageData: string) => {
      setPendingImage(imageData);
      setIsCameraOpen(false);
  };

  const saveHistory = (agentId: AgentId, msgs: Message[]) => {
      const updatedHistory = { ...history, [agentId]: msgs };
      setHistory(updatedHistory);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (e) {
          console.error("LocalStorage quota exceeded", e);
      }
  };

  const handleSwitchAgent = (agentId: AgentId) => {
    if (agentId === activeAgentId) {
        setIsSidebarOpen(false);
        return;
    }
    saveHistory(activeAgentId, messages);
    setInput('');
    setPendingImage(null);
    setAspectRatio("1:1"); // Reset aspect ratio
    setIsReviewOpen(false);

    const nextMessages = history[agentId] || [];
    
    if (nextMessages.length > 0) {
        setMessages(nextMessages);
        initializeChat(agentId, nextMessages);
    } else {
        const agent = AGENTS[agentId];
        const greeting: Message = {
            id: Date.now().toString(),
            role: Role.MODEL,
            content: `**${agent.name}** active. ${agent.description}`,
            timestamp: new Date(),
            agentId: agentId
        };
        const newSession = [greeting];
        setMessages(newSession);
        initializeChat(agentId, []); 
        saveHistory(agentId, newSession); 
    }

    setActiveAgentId(agentId);
    // Sidebar closes automatically on selection in mobile view via Sidebar component logic, 
    // but explicit close here is safe too.
    setIsSidebarOpen(false);
  };

  const handleSendRequest = () => {
      if ((!input.trim() && !pendingImage) || isLoading) return;

      if (pendingImage) {
          setIsReviewOpen(true);
      } else {
          executeSend();
      }
  };

  const executeSend = async () => {
    if ((!input.trim() && !pendingImage) || isLoading) return;

    const userText = input.trim();
    const userImage = pendingImage;
    const currentAspectRatio = aspectRatio;
    
    // Reset inputs
    setInput('');
    setPendingImage(null);
    setIsReviewOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const newMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: userText,
      timestamp: new Date(),
      agentId: activeAgentId,
      image: userImage || undefined
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveHistory(activeAgentId, updatedMessages); 

    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholder: Message = {
      id: aiMessageId,
      role: Role.MODEL,
      content: '', 
      timestamp: new Date(),
      isStreaming: true,
      agentId: activeAgentId
    };

    setMessages(prev => [...prev, aiPlaceholder]);

    try {
      let accumulatedText = '';
      
      const result = await sendMessageStream(
        userText || "Analyze this image.", 
        userImage, 
        currentAspectRatio,
        (chunk) => {
            accumulatedText = chunk; 
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === aiMessageId 
                    ? { ...msg, content: accumulatedText } 
                    : msg
                )
            );
        }
      );

      setMessages(prev => {
        const finalized = prev.map(msg => 
          msg.id === aiMessageId 
            ? { 
                ...msg, 
                content: result.content, 
                generatedImage: result.generatedImage, 
                isStreaming: false 
              } 
            : msg
        );
        saveHistory(activeAgentId, finalized);
        return finalized;
      });

    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: "**Error**: Unable to complete request.", isStreaming: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const activeAgent = AGENTS[activeAgentId];

  return (
    <div className="flex h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {isCameraOpen && (
          <CameraCapture 
            onCapture={handleCameraCapture} 
            onClose={() => setIsCameraOpen(false)} 
          />
      )}

      {/* Review Modal */}
      {isReviewOpen && pendingImage && (
          <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center bg-black md:bg-black/80 md:backdrop-blur-sm animate-fade-in">
            <div className="flex-1 w-full bg-slate-950 md:bg-slate-900 md:border md:border-slate-700 md:rounded-2xl md:shadow-2xl md:max-w-md md:max-h-[90vh] md:h-auto overflow-hidden flex flex-col h-full">
              
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 pt-safe">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <i className="fa-solid fa-eye text-indigo-400"></i>
                    Review Request
                </h3>
                <button 
                    onClick={() => setIsReviewOpen(false)} 
                    className="w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
                >
                  <i className="fa-solid fa-xmark text-lg md:text-base"></i>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                 <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                    <img src={pendingImage} alt="Preview" className="w-full h-auto object-contain max-h-[50vh] mx-auto block" />
                 </div>
                 
                 <div className="mt-4">
                    <label className="text-xs text-slate-500 uppercase font-bold mb-2 block px-1">Prompt</label>
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 min-h-[60px]">
                        {input.trim() ? (
                            <p className="text-slate-200 text-base md:text-sm whitespace-pre-wrap leading-relaxed">{input}</p>
                        ) : (
                            <p className="text-slate-500 text-sm italic">Analyze this image...</p>
                        )}
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex gap-3 pb-safe md:pb-4">
                <button 
                  onClick={() => setIsReviewOpen(false)}
                  className="flex-1 py-3.5 md:py-3 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 hover:text-white transition-colors text-base md:text-sm"
                >
                  Edit
                </button>
                <button 
                  onClick={executeSend}
                  className={`flex-1 py-3.5 md:py-3 rounded-xl font-medium text-white shadow-lg bg-gradient-to-r ${activeAgent.gradient} hover:opacity-90 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-base md:text-sm`}
                >
                  <span>Send Request</span>
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </div>
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeAgentId={activeAgentId}
        onSelectAgent={(id) => handleSwitchAgent(id)}
        isCompact={isSidebarCompact}
        onToggleCompact={() => setIsSidebarCompact(!isSidebarCompact)}
      />

      <main className="flex-1 flex flex-col h-full relative w-full transition-transform duration-300">
        
        <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
             {/* Mobile: Toggle moved to right. Desktop: Sidebar is permanent */}
            
            <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${activeAgent.gradient} shadow-lg shadow-indigo-500/10`}>
                    <i className={`fa-solid ${activeAgent.icon} text-white text-xs`}></i>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-100 leading-tight">{activeAgent.name}</h2>
                    <p className={`text-[10px] font-medium ${activeAgent.color} uppercase tracking-wide hidden sm:block`}>{activeAgent.roleName}</p>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={() => {
                     if(window.confirm("Clear all conversation history?")) {
                         localStorage.removeItem(STORAGE_KEY);
                         window.location.reload();
                     }
                }}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-slate-800"
                title="Clear History"
             >
                <i className="fa-solid fa-trash-can"></i>
             </button>

             {/* Mobile Sidebar Toggle - Moved to Right */}
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors active:scale-95"
            >
                <i className="fa-solid fa-bars text-lg"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-900/30">
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '32px 32px'}}>
           </div>

           <div className="max-w-4xl mx-auto h-full flex flex-col pb-4 relative z-0">
              <div className="flex-1 px-3 md:px-8 py-4 md:py-6">
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
              </div>
           </div>
        </div>

        <div className="p-3 md:p-6 bg-slate-950 border-t border-slate-800 shrink-0 pb-safe">
          <div className="max-w-4xl mx-auto">
             
             {/* Aspect Ratio Selector (Only for Artist) */}
             {activeAgentId === AgentId.ARTIST && (
                 <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                     {["1:1", "3:4", "4:3", "9:16", "16:9"].map(ratio => (
                         <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`px-3 py-1.5 md:py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                                aspectRatio === ratio 
                                ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                         >
                             {ratio}
                         </button>
                     ))}
                 </div>
             )}

             {pendingImage && (
                 <div className="relative inline-block mb-3 animate-fade-in-up">
                     <img 
                        src={pendingImage} 
                        alt="Preview" 
                        className="h-20 w-20 rounded-xl object-cover border border-slate-700 shadow-lg" 
                     />
                     <button 
                        onClick={() => setPendingImage(null)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                     >
                         <i className="fa-solid fa-xmark text-xs"></i>
                     </button>
                 </div>
             )}

             <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 md:p-2 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                />

                <div className="flex gap-0.5 md:gap-1">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 w-10 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all flex-shrink-0 active:scale-95"
                        title="Upload Image"
                    >
                        <i className="fa-regular fa-image text-lg md:text-base"></i>
                    </button>

                    <button 
                        onClick={() => setIsCameraOpen(true)}
                        className="h-10 w-10 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all flex-shrink-0 active:scale-95"
                        title="Open Camera"
                    >
                        <i className="fa-solid fa-camera text-lg md:text-base"></i>
                    </button>
                </div>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${activeAgent.name}...`}
                    rows={1}
                    className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-600 focus:ring-0 resize-none py-2.5 max-h-[150px] text-base scrollbar-hide leading-relaxed"
                    disabled={isLoading}
                />

                <button 
                    onClick={handleSendRequest}
                    disabled={(!input.trim() && !pendingImage) || isLoading}
                    className={`h-11 w-11 md:h-10 md:w-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 active:scale-95 ${
                        (input.trim() || pendingImage) && !isLoading
                         ? `bg-gradient-to-tr ${activeAgent.gradient} text-white shadow-lg` 
                         : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                >
                    {isLoading ? (
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                        <i className="fa-solid fa-arrow-up"></i>
                    )}
                </button>
             </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;