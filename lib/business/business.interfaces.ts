import { ObjectId } from 'mongodb';
import { BaseDocument } from '../database/interfaces';
import { RedditConversation } from '../reddit/reddit.interfaces';
import { ConversationAnalysis } from '../ai/ai.interfaces';

/**
 * Documento per salvare le analisi delle conversazioni nel database
 */
export interface ConversationAnalysisDocument extends BaseDocument {
  conversationId: string; // ID univoco della conversazione per evitare duplicati
  subreddit: string;
  postId: string;
  postTitle: string;
  postAuthor: string;
  postScore: number;
  postUrl: string;
  commentsCount: number;
  analysis: {
    idealevel: number;
    possiblereturn: string | null;
    problem: string;
    solution: string;
    confidence: number;
  };
  rawResponse: string; // Risposta grezza dell'AI per debug e backup
  rawRequest: string; // Richiesta inviata all'AI per debug e backup
  processedAt: Date;
  keywords: string[]; // Keywords che hanno portato a trovare questo subreddit
}

/**
 * Parametri per la ricerca di subreddit
 */
export interface SubredditSearchParams {
  keywords: string[];
  limit?: number;
  minSubscribers?: number;
}

/**
 * Risultato della ricerca subreddit
 */
export interface SubredditSearchResult {
  subredditName: string;
  subscribers: number;
  description: string;
  matchedKeywords: string[];
}

/**
 * Parametri per l'estrazione delle conversazioni
 */
export interface ConversationExtractionParams {
  subreddit: string;
  limit?: number;
  sort?: 'hot' | 'new' | 'top' | 'rising';
  minComments?: number;
  maxAge?: number; // giorni
}

/**
 * Risultato dell'estrazione conversazioni
 */
export interface ConversationExtractionResult {
  conversations: RedditConversation[];
  subreddit: string;
  extractedAt: Date;
}

/**
 * Parametri per il processo di analisi business
 */
export interface BusinessAnalysisParams {
  keywords?: string[]; // Se non specificato, usa IMPORTANT_KEYWORDS
  subredditLimit?: number;
  conversationsPerSubreddit?: number;
  minSubscribers?: number;
  minComments?: number;
  skipExisting?: boolean; // Salta conversazioni già analizzate
}

/**
 * Risultato del processo di analisi business
 */
export interface BusinessAnalysisResult {
  totalSubredditsProcessed: number;
  totalConversationsAnalyzed: number;
  totalConversationsSkipped: number; // Già esistenti nel database
  analyses: ConversationAnalysisDocument[];
  errors: BusinessAnalysisError[];
  processedAt: Date;
  duration: number; // millisecondi
}

/**
 * Errore durante il processo di analisi
 */
export interface BusinessAnalysisError {
  type: 'subreddit_search' | 'conversation_extraction' | 'ai_analysis' | 'database_save';
  subreddit?: string;
  conversationId?: string;
  error: string;
  timestamp: Date;
}

/**
 * Statistiche del processo di analisi
 */
export interface BusinessAnalysisStats {
  totalAnalyses: number;
  averageIdeaLevel: number;
  topSubreddits: Array<{
    subreddit: string;
    count: number;
    averageIdeaLevel: number;
  }>;
  recentAnalyses: ConversationAnalysisDocument[];
  errorRate: number;
}

/**
 * Configurazione del business service
 */
export interface BusinessServiceConfig {
  defaultConversationsPerSubreddit: number;
  defaultSubredditLimit: number;
  defaultMinSubscribers: number;
  defaultMinComments: number;
  maxRetries: number;
  retryDelay: number; // millisecondi
  batchSize: number; // Numero di conversazioni da processare in parallelo
}

/**
 * Stato del processo di analisi
 */
export interface BusinessAnalysisStatus {
  isRunning: boolean;
  currentSubreddit?: string;
  progress: {
    subredditsCompleted: number;
    totalSubreddits: number;
    conversationsCompleted: number;
    totalConversations: number;
  };
  startedAt?: Date;
  estimatedCompletion?: Date;
}

/**
 * Filtri per la ricerca delle analisi salvate
 */
export interface AnalysisSearchFilters {
  subreddit?: string;
  minIdeaLevel?: number;
  maxIdeaLevel?: number;
  keywords?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  hasReturn?: boolean; // Se possiblereturn non è null
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'idealevel' | 'subreddit';
  sortOrder?: 'asc' | 'desc';
}