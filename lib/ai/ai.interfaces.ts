// Common interfaces for AI providers

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface AIProvider {
  name: string;
  generateResponse(messages: AIMessage[], options?: AIGenerationOptions): Promise<AIResponse>;
  isAvailable(): boolean;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
  stream?: boolean;
}

export interface AIConfig {
  defaultProvider: string;
  providers: {
    [key: string]: {
      apiKey: string;
      baseUrl?: string;
      model?: string;
      enabled: boolean;
    };
  };
}

export enum AIProviderType {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OLLAMA = 'ollama'
}

export interface ConversationAnalysis {
  idealevel: number;
  possiblereturn: string | null;
  problem: string;
  solution: string;
  confidence?: number;
}

export interface RedditConversationAI {
  postTitle: string;
  postContent: string;
  comments: string[];
  analysis?: ConversationAnalysis;
}