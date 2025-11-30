import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part, Tool } from "@google/genai";
import { Message, Role, AgentId, AgentConfig } from "../types";

// Model Definitions
const MODEL_PRO = 'gemini-3-pro-preview';
const MODEL_FLASH_LITE = 'gemini-2.5-flash-lite';
const MODEL_FLASH = 'gemini-2.5-flash';
const MODEL_IMAGE = 'gemini-3-pro-image-preview';

export const AGENTS: Record<AgentId, AgentConfig> = {
  [AgentId.GENERAL]: {
    id: AgentId.GENERAL,
    name: 'OmniSci',
    roleName: 'Research Lead',
    icon: 'fa-infinity',
    color: 'text-indigo-400',
    gradient: 'from-indigo-500 to-purple-600',
    description: 'General STEM assistance and image analysis.',
    systemInstruction: `You are OmniSci, a highly advanced AI research assistant specialized in STEM. 
    Analyze text and images with precision. Use Markdown.`
  },
  [AgentId.FAST]: {
    id: AgentId.FAST,
    name: 'Bolt',
    roleName: 'Rapid Response',
    icon: 'fa-bolt',
    color: 'text-yellow-400',
    gradient: 'from-yellow-400 to-orange-500',
    description: 'Lightning fast answers for quick queries.',
    systemInstruction: `You are Bolt. Provide extremely concise, accurate, and fast responses. Do not waffle.`
  },
  [AgentId.THINK]: {
    id: AgentId.THINK,
    name: 'Deep Thought',
    roleName: 'Logic Engine',
    icon: 'fa-brain',
    color: 'text-rose-400',
    gradient: 'from-rose-500 to-pink-600',
    description: 'Deep reasoning for complex problems.',
    systemInstruction: `You are Deep Thought. You possess extended thinking capabilities. 
    Use your thinking budget to deeply analyze complex problems before answering.`
  },
  [AgentId.SEARCH]: {
    id: AgentId.SEARCH,
    name: 'Scout',
    roleName: 'Web Researcher',
    icon: 'fa-globe',
    color: 'text-sky-400',
    gradient: 'from-sky-400 to-blue-500',
    description: 'Up-to-date information via Google Search.',
    systemInstruction: `You are Scout. You have access to Google Search. 
    Always use the search tool to find the most current information. Cite your sources clearly.`
  },
  [AgentId.ARTIST]: {
    id: AgentId.ARTIST,
    name: 'Da Vinci',
    roleName: 'Visual Artist',
    icon: 'fa-palette',
    color: 'text-fuchsia-400',
    gradient: 'from-fuchsia-500 to-purple-500',
    description: 'High-quality image generation.',
    systemInstruction: `You are Da Vinci. You generate high-quality images based on user prompts.`
  },
  [AgentId.MATH]: {
    id: AgentId.MATH,
    name: 'Euler',
    roleName: 'Mathematics Expert',
    icon: 'fa-square-root-variable',
    color: 'text-blue-400',
    gradient: 'from-blue-600 to-cyan-500',
    description: 'Calculus, Logic, Number Theory, and Proofs.',
    systemInstruction: `You are Euler. Solve math problems, including those in images. Prioritize formal proofs and logic.`
  },
  [AgentId.PHYSICS]: {
    id: AgentId.PHYSICS,
    name: 'Newton',
    roleName: 'Physics Specialist',
    icon: 'fa-atom',
    color: 'text-violet-400',
    gradient: 'from-violet-600 to-fuchsia-600',
    description: 'Mechanics, Quantum Theory, and Astrophysics.',
    systemInstruction: `You are Newton. Derive solutions from fundamental laws. Be precise with units and dimensions.`
  },
  [AgentId.CHEMISTRY]: {
    id: AgentId.CHEMISTRY,
    name: 'Curie',
    roleName: 'Chemistry Expert',
    icon: 'fa-flask',
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Organic, Inorganic, and Physical Chemistry.',
    systemInstruction: `You are Curie. Interpret chemical structures and reactions. Focus on molecular details and safety.`
  },
  [AgentId.BIOLOGY]: {
    id: AgentId.BIOLOGY,
    name: 'Darwin',
    roleName: 'Biology Specialist',
    icon: 'fa-dna',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Genetics, Ecology, and Cellular Biology.',
    systemInstruction: `You are Darwin. Explain biological systems, taxonomy, and evolutionary functions.`
  }
};

let chatInstance: Chat | null = null;
let aiClient: GoogleGenAI | null = null;
let currentAgentId: AgentId = AgentId.GENERAL;

// Helper to get model name based on agent
const getModelForAgent = (agentId: AgentId): string => {
    switch (agentId) {
        case AgentId.FAST: return MODEL_FLASH_LITE;
        case AgentId.SEARCH: return MODEL_FLASH;
        case AgentId.ARTIST: return MODEL_IMAGE;
        case AgentId.THINK: return MODEL_PRO;
        default: return MODEL_PRO;
    }
};

export const initializeChat = (agentId: AgentId = AgentId.GENERAL, history: Message[] = []): AgentConfig => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return AGENTS[AgentId.GENERAL];
  }
  
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    currentAgentId = agentId;
    const agent = AGENTS[agentId];
    const modelName = getModelForAgent(agentId);

    // Prepare history (skip for Artist as it's usually one-shot or handled differently, but we'll keep for context if needed)
    const validHistory: Content[] = history
        .filter((msg, index) => {
            if (index === 0 && msg.role === Role.MODEL) return false;
            // Filter out messages that might have been "generating image" placeholders if needed
            return true;
        })
        .map(msg => {
            const parts: Part[] = [];
            if (msg.image) {
                const base64Data = msg.image.split(',')[1];
                const mimeType = msg.image.substring(msg.image.indexOf(':') + 1, msg.image.indexOf(';'));
                parts.push({ inlineData: { mimeType, data: base64Data } });
            }
            parts.push({ text: msg.content });
            return { role: msg.role, parts: parts };
        });

    // Config setup
    const config: any = {
        systemInstruction: agent.systemInstruction,
    };

    if (agentId === AgentId.THINK) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (agentId === AgentId.SEARCH) {
        config.tools = [{ googleSearch: {} }];
    }

    // Artist agent uses generateContent, but we can init a chat object for history tracking 
    // though we might bypass it for the actual generation call.
    if (agentId !== AgentId.ARTIST) {
        chatInstance = aiClient.chats.create({
            model: modelName,
            config: config,
            history: validHistory
        });
    } else {
        chatInstance = null; // Artist uses direct generation
    }

    return agent;
  } catch (error) {
    console.error("Failed to initialize Gemini Client", error);
    return AGENTS[AgentId.GENERAL];
  }
};

export const sendMessageStream = async (
  messageText: string,
  image: string | null, 
  aspectRatio: string = "1:1",
  onChunk: (chunkText: string) => void
): Promise<{ content: string; generatedImage?: string }> => {
  
  if (!aiClient) initializeChat(currentAgentId);

  // Special handling for Artist (Image Generation)
  if (currentAgentId === AgentId.ARTIST) {
      if (!aiClient) throw new Error("AI Client not initialized");
      
      try {
        const response = await aiClient.models.generateContent({
            model: MODEL_IMAGE,
            contents: {
                parts: [{ text: messageText }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K" // Default for Pro Image
                }
            }
        });
        
        // Process response for image
        let generatedImage = undefined;
        let textResponse = "Here is your generated image.";
        
        // Check for inline data (image)
        const candidates = response.candidates;
        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                     generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                } else if (part.text) {
                    textResponse = part.text;
                }
            }
        }
        
        onChunk(textResponse);
        return { content: textResponse, generatedImage };
      } catch (e) {
          console.error("Image generation failed", e);
          const errText = "Sorry, I couldn't generate that image.";
          onChunk(errText);
          return { content: errText };
      }
  }

  // Standard Chat Flow
  if (!chatInstance) {
      // Re-init if missing (shouldn't happen if initialized properly)
      initializeChat(currentAgentId); 
      if (!chatInstance) throw new Error("Chat session invalid");
  }

  let fullResponse = "";
  let groundings: string[] = [];

  try {
    const parts: Part[] = [];
    if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';'));
        parts.push({ inlineData: { mimeType, data: base64Data } });
    }
    parts.push({ text: messageText });

    const result = await chatInstance.sendMessageStream({ message: parts });

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      
      // Collect text
      if (c.text) {
        fullResponse += c.text;
        onChunk(c.text);
      }

      // Collect Grounding Metadata (for Search agent)
      if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          c.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
              if (chunk.web?.uri && chunk.web?.title) {
                  groundings.push(`[${chunk.web.title}](${chunk.web.uri})`);
              }
          });
      }
    }

    // Append unique sources if any
    if (groundings.length > 0) {
        const uniqueSources = Array.from(new Set(groundings));
        const sourcesText = "\n\n**Sources:**\n" + uniqueSources.map(s => `- ${s}`).join("\n");
        fullResponse += sourcesText;
        onChunk(fullResponse); // Send final update with sources
    }

  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }

  return { content: fullResponse };
};