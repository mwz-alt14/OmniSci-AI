export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum AgentId {
  GENERAL = 'general',
  MATH = 'math',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
  BIOLOGY = 'biology',
  FAST = 'fast',
  THINK = 'think',
  SEARCH = 'search',
  ARTIST = 'artist'
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  roleName: string;
  icon: string;
  color: string; // Text color class
  gradient: string; // Background gradient classes
  description: string;
  systemInstruction: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  agentId?: AgentId;
  image?: string; // Base64 data URI (User uploaded)
  generatedImage?: string; // Base64 data URI (Model generated)
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
}

export interface StreamState {
  isStreaming: boolean;
  currentStreamContent: string;
}