import React from 'react';
import { Message, Role, AgentId } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AGENTS } from '../services/geminiService';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  
  const agent = message.agentId ? AGENTS[message.agentId] : AGENTS[AgentId.GENERAL];
  
  const avatarGradient = isUser 
    ? 'bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700'
    : `bg-gradient-to-br ${agent.gradient}`;
  
  const iconClass = isUser ? 'fa-user' : agent.icon;
  
  const bubbleStyles = isUser
    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-blue-900/20'
    : 'bg-slate-800/80 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700/50 shadow-black/20 backdrop-blur-sm';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-fade-in-up`}>
      <div className={`flex max-w-[92%] md:max-w-[85%] lg:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300 ${avatarGradient}`}>
          <i className={`fa-solid ${iconClass} text-white text-xs`}></i>
        </div>

        {/* Message Content Container */}
        <div className="flex flex-col min-w-0">
            {!isUser && (
                <span className={`text-[10px] font-bold mb-1 ml-1 opacity-80 ${agent.color}`}>
                    {agent.name} <span className="text-slate-600 font-normal">• {agent.roleName}</span>
                </span>
            )}

            <div className={`relative px-5 py-3.5 shadow-md ${bubbleStyles}`}>
                
                {/* User Uploaded Image */}
                {message.image && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                        <img 
                            src={message.image} 
                            alt="Uploaded content" 
                            className="w-full h-auto max-h-[300px] object-cover block" 
                        />
                    </div>
                )}

                {/* Model Generated Image */}
                {message.generatedImage && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                         <img 
                            src={message.generatedImage} 
                            alt="AI Generated" 
                            className="w-full h-auto rounded-lg block" 
                        />
                    </div>
                )}

                {message.isStreaming && !message.content && !message.generatedImage ? (
                    <div className="flex space-x-1 h-6 items-center">
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-0 opacity-60"></div>
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-150 opacity-60"></div>
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-300 opacity-60"></div>
                    </div>
                ) : (
                    <MarkdownRenderer content={message.content} />
                )}
            </div>
            
            <div className={`text-[10px] mt-1 opacity-40 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
      </div>
    </div>
  );
};