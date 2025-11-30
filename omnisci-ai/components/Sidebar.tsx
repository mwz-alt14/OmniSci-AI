import React from 'react';
import { AgentId, AgentConfig } from '../types';
import { AGENTS } from '../services/geminiService';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeAgentId: AgentId;
  onSelectAgent: (agentId: AgentId) => void;
  isCompact: boolean;
  onToggleCompact: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  activeAgentId, 
  onSelectAgent,
  isCompact,
  onToggleCompact
}) => {
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden animate-fade-in"
          onClick={onToggle}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 right-0 md:relative md:inset-auto z-30 flex flex-col h-full bg-slate-950 border-l md:border-l-0 md:border-r border-slate-800 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          isOpen ? 'w-[85%] max-w-[320px] translate-x-0 shadow-2xl' : 'w-0 translate-x-full md:w-auto md:translate-x-0' 
        } ${isCompact ? 'md:w-20' : 'md:w-72'}`}
      >
        <div className="flex flex-col h-full pt-safe">
            {/* Header / Logo */}
            <div className={`flex items-center gap-3 mb-6 mt-3 px-4 h-12 ${isCompact ? 'md:justify-center md:px-0' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <i className="fa-solid fa-infinity text-white text-sm"></i>
                </div>
                <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${isCompact ? 'md:w-0 md:opacity-0' : 'md:w-auto md:opacity-100'}`}>
                    OmniSci
                </h1>
            </div>

            {/* Agent Selection List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 space-y-2">
                <div className={`px-2 mb-2 transition-opacity duration-300 ${isCompact ? 'md:opacity-0 md:h-0' : 'opacity-100'}`}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Specialists
                    </h3>
                </div>
                
                {Object.values(AGENTS).map((agent: AgentConfig) => {
                    const isActive = activeAgentId === agent.id;
                    return (
                        <button 
                            key={agent.id}
                            onClick={() => {
                                onSelectAgent(agent.id);
                                // On mobile, close sidebar after selection
                                if (window.innerWidth < 768) onToggle();
                            }}
                            title={isCompact ? agent.name : undefined}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all border text-left group relative overflow-hidden active:scale-[0.98] ${
                                isActive 
                                ? 'bg-slate-900 border-indigo-500/30 shadow-lg shadow-indigo-900/10' 
                                : 'bg-transparent border-transparent hover:bg-slate-900/50'
                            } ${isCompact ? 'justify-center md:px-0' : ''}`}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"></div>
                            )}

                            <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center shadow-inner transition-colors duration-300 ${
                                isActive ? `bg-gradient-to-br ${agent.gradient} text-white` : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                            }`}>
                                <i className={`fa-solid ${agent.icon} text-base`}></i>
                            </div>
                            
                            <div className={`flex-1 min-w-0 flex flex-col justify-center transition-all duration-300 ${isCompact ? 'md:w-0 md:opacity-0 md:hidden' : 'md:opacity-100'}`}>
                                <div className={`text-sm font-semibold mb-0.5 truncate transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                    {agent.name}
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate">
                                    {agent.roleName}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer / Toggle */}
            <div className="mt-auto border-t border-slate-800 bg-slate-950 pb-safe">
                 {/* Desktop Toggle Button */}
                <div className="hidden md:flex justify-end p-2">
                    <button 
                        onClick={onToggleCompact}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                        <i className={`fa-solid ${isCompact ? 'fa-angles-right' : 'fa-angles-left'}`}></i>
                    </button>
                </div>

                <div className={`flex items-center gap-3 p-3 transition-all duration-300 ${isCompact ? 'md:justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 cursor-default">
                         <i className="fa-solid fa-user-astronaut text-slate-400 text-xs"></i>
                    </div>
                    <div className={`flex-1 min-w-0 transition-all duration-300 ${isCompact ? 'md:w-0 md:opacity-0 md:hidden' : 'md:opacity-100'}`}>
                        <p className="text-xs font-medium text-slate-300 truncate">Guest Researcher</p>
                        <p className="text-[10px] text-slate-500 truncate">Access Level: Preview</p>
                    </div>
                </div>
            </div>
        </div>
      </aside>
    </>
  );
};