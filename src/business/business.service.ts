import { Injectable, Logger } from '@nestjs/common';
import { RedditService } from '../reddit/reddit.service';
import { AIService } from '../../lib/ai/ai-service';
import { DatabaseClient } from '../../lib/database/client';
import { REDDIT_CONSTANTS } from '../../lib/reddit/reddit.constants';
import {
  BusinessAnalysisParams,
  BusinessAnalysisResult,
  BusinessAnalysisError,
  ConversationAnalysisDocument,
  SubredditSearchResult,
  BusinessServiceConfig,
  BusinessAnalysisStatus,
  AnalysisSearchFilters
} from '../../lib/business/business.interfaces';
import { RedditConversation } from '../../lib/reddit/reddit.interfaces';
import { createHash } from 'crypto';

/**
 * Service NestJS per orchestrare il processo di business intelligence
 */
@Injectable()
export class BusinessService {
  private config: BusinessServiceConfig;
  private currentStatus: BusinessAnalysisStatus;

  constructor(
    private readonly redditService: RedditService,
    private readonly aiService: AIService,
    private readonly databaseClient: DatabaseClient
  ) {
    // Configurazione di default
    this.config = {
      defaultConversationsPerSubreddit: 5,
      defaultSubredditLimit: 10,
      defaultMinSubscribers: 1000,
      defaultMinComments: 5,
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 3
    };

    this.currentStatus = {
      isRunning: false,
      progress: {
        subredditsCompleted: 0,
        totalSubreddits: 0,
        conversationsCompleted: 0,
        totalConversations: 0
      }
    };
  }

  /**
   * Processo principale di analisi business
   */
  async runBusinessAnalysis(params?: BusinessAnalysisParams): Promise<BusinessAnalysisResult> {
    if (this.currentStatus.isRunning) {
      throw new Error('Business analysis is already running');
    }

    const startTime = Date.now();
    this.currentStatus.isRunning = true;
    this.currentStatus.startedAt = new Date();

    try {
      // Parametri con valori di default
      const analysisParams: Required<BusinessAnalysisParams> = {
        keywords: params?.keywords || [...REDDIT_CONSTANTS.IMPORTANT_KEYWORDS],
        subredditLimit: params?.subredditLimit || this.config.defaultSubredditLimit,
        conversationsPerSubreddit: params?.conversationsPerSubreddit || this.config.defaultConversationsPerSubreddit,
        minSubscribers: params?.minSubscribers || this.config.defaultMinSubscribers,
        minComments: params?.minComments || this.config.defaultMinComments,
        skipExisting: params?.skipExisting ?? true
      };

      console.log('🚀 Starting business analysis with params:', analysisParams);

      // 1. Trova subreddit importanti
      const subreddits = await this.findImportantSubreddits(analysisParams);
      console.log(`📍 Found ${subreddits.length} relevant subreddits`);

      this.currentStatus.progress.totalSubreddits = subreddits.length;
      this.currentStatus.progress.totalConversations = subreddits.length * analysisParams.conversationsPerSubreddit;

      const result: BusinessAnalysisResult = {
        totalSubredditsProcessed: 0,
        totalConversationsAnalyzed: 0,
        totalConversationsSkipped: 0,
        analyses: [],
        errors: [],
        processedAt: new Date(),
        duration: 0
      };

      // 2. Processa ogni subreddit
      for (const subreddit of subreddits) {
        this.currentStatus.currentSubreddit = subreddit.subredditName;
        
        try {
          const subredditResult = await this.processSubreddit(
            subreddit.subredditName,
            analysisParams,
            subreddit.matchedKeywords
          );
          
          result.totalConversationsAnalyzed += subredditResult.analyzed;
          result.totalConversationsSkipped += subredditResult.skipped;
          result.analyses.push(...subredditResult.analyses);
          result.errors.push(...subredditResult.errors);
          
        } catch (error) {
          console.error(`❌ Error processing subreddit ${subreddit.subredditName}:`, error);
          result.errors.push({
            type: 'subreddit_search',
            subreddit: subreddit.subredditName,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
        }

        result.totalSubredditsProcessed++;
        this.currentStatus.progress.subredditsCompleted++;
      }

      result.duration = Date.now() - startTime;
      console.log(`✅ Business analysis completed in ${result.duration}ms`);
      console.log(`📊 Results: ${result.totalConversationsAnalyzed} analyzed, ${result.totalConversationsSkipped} skipped, ${result.errors.length} errors`);

      return result;

    } finally {
      this.currentStatus.isRunning = false;
      this.currentStatus.currentSubreddit = undefined;
    }
  }

  /**
   * Trova subreddit importanti basati sui keywords
   */
  private async findImportantSubreddits(params: Required<BusinessAnalysisParams>): Promise<SubredditSearchResult[]> {
    const subreddits: SubredditSearchResult[] = [];
    
    for (const keyword of params.keywords) {
      try {
        const searchResults = await this.redditService.searchSubreddits(
          keyword,
          Math.ceil(params.subredditLimit / params.keywords.length)
        );

        if (searchResults.data && searchResults.data.children) {
          for (const child of searchResults.data.children) {
            const subreddit = child.data;
            if (subreddit.subscribers >= params.minSubscribers) {
              const existing = subreddits.find(s => s.subredditName === subreddit.display_name);
              if (existing) {
                existing.matchedKeywords.push(keyword);
              } else {
                subreddits.push({
                  subredditName: subreddit.display_name,
                  subscribers: subreddit.subscribers,
                  description: subreddit.public_description,
                  matchedKeywords: [keyword]
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error searching for keyword "${keyword}":`, error);
      }
    }

    // Ordina per numero di subscribers e limita i risultati
    return subreddits
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, params.subredditLimit);
  }

  /**
   * Processa un singolo subreddit
   */
  private async processSubreddit(
    subredditName: string,
    params: Required<BusinessAnalysisParams>,
    matchedKeywords: string[]
  ): Promise<{
    analyzed: number;
    skipped: number;
    analyses: ConversationAnalysisDocument[];
    errors: BusinessAnalysisError[];
  }> {
    console.log(`🔍 Processing subreddit: r/${subredditName}`);

    const result = {
      analyzed: 0,
      skipped: 0,
      analyses: [] as ConversationAnalysisDocument[],
      errors: [] as BusinessAnalysisError[]
    };

    try {
      // 1. Estrai conversazioni dal subreddit
      const conversations = await this.extractConversations(subredditName, params);
      console.log(`💬 Found ${conversations.length} conversations in r/${subredditName}`);

      // 2. Processa ogni conversazione
      for (const conversation of conversations) {
        const conversationId = this.generateConversationId(conversation);
        
        try {
          // 3. Controlla se già esiste nel database
          if (params.skipExisting && await this.conversationExists(conversationId)) {
            console.log(`⏭️  Skipping existing conversation: ${conversationId}`);
            result.skipped++;
            this.currentStatus.progress.conversationsCompleted++;
            continue;
          }

          // 4. Analizza con AI
          console.log(`🤖 Analyzing conversation: ${conversation.post.title}`);
          const analysis = await this.aiService.analyzeConversation(
            `${conversation.post.title}\n\n${conversation.post.selftext || ''}`,
            conversation.comments.map(c => c.body)
          );
          // 5. Crea documento per il database
          const analysisDocument: ConversationAnalysisDocument = {
            conversationId,
            subreddit: subredditName,
            postId: conversation.post.id,
            postTitle: conversation.post.title,
            postAuthor: conversation.post.author,
            postScore: conversation.post.score,
            postUrl: conversation.post.url,
            commentsCount: conversation.comments.length,
            analysis: {
              idealevel: analysis.idealevel,
              possiblereturn: analysis.possiblereturn,
              problem: analysis.problem,
              solution: analysis.solution,
              confidence: analysis.confidence || 0.8
            },
            rawResponse: analysis.rawResponse || 'No raw response available', // Salva la risposta grezza
            rawRequest: analysis.rawRequest || 'No raw request available', // Salva la richiesta inviata all'AI
            processedAt: new Date(),
            keywords: matchedKeywords,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // 6. Salva nel database
          await this.saveAnalysis(analysisDocument);
          
          result.analyses.push(analysisDocument);
          result.analyzed++;
          this.currentStatus.progress.conversationsCompleted++;
          
          console.log(`✅ Successfully analyzed: ${conversation.post.title} (Idea Level: ${analysis.idealevel})`);

          // Piccola pausa per evitare rate limiting
          await this.delay(500);

        } catch (error) {
          console.error(`❌ Error processing conversation ${conversationId}:`, error);
          result.errors.push({
            type: 'ai_analysis',
            subreddit: subredditName,
            conversationId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
          this.currentStatus.progress.conversationsCompleted++;
        }
      }

    } catch (error) {
      console.error(`❌ Error extracting conversations from r/${subredditName}:`, error);
      result.errors.push({
        type: 'conversation_extraction',
        subreddit: subredditName,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Estrae conversazioni da un subreddit
   */
  private async extractConversations(
    subredditName: string,
    params: Required<BusinessAnalysisParams>
  ): Promise<RedditConversation[]> {
    const posts = await this.redditService.getSubredditPosts({
      subreddit: subredditName,
      sort: 'hot',
      limit: params.conversationsPerSubreddit * 2
    });

    const conversations: RedditConversation[] = [];
    
    if (posts.data && posts.data.children) {
      for (const child of posts.data.children) {
        if (conversations.length >= params.conversationsPerSubreddit) break;
        
        const post = child.data;
        if (post.num_comments >= params.minComments) {
          try {
            const comments = await this.redditService.getPostComments({
              subreddit: subredditName,
              postId: post.id,
              limit: 20,
              sort: 'top'
            });

            conversations.push({
              post,
              comments,
              total_comments: post.num_comments
            });
          } catch (error) {
            console.error(`Error fetching comments for post ${post.id}:`, error);
          }
        }
      }
    }

    return conversations;
  }

  /**
   * Genera un ID univoco per una conversazione
   */
  private generateConversationId(conversation: RedditConversation): string {
    const data = `${conversation.post.subreddit}_${conversation.post.id}_${conversation.post.created_utc}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Controlla se una conversazione esiste già nel database
   */
  private async conversationExists(conversationId: string): Promise<boolean> {
    try {
      const collection = this.databaseClient.getCollection('conversation_analyses');
      const existing = await collection.findOne({ conversationId });
      return !!existing;
    } catch (error) {
      console.error('Error checking conversation existence:', error);
      return false;
    }
  }

  /**
   * Salva l'analisi nel database
   */
  private async saveAnalysis(analysis: ConversationAnalysisDocument): Promise<void> {
    try {
      const collection = this.databaseClient.getCollection('conversation_analyses');
      await collection.insertOne(analysis);
    } catch (error) {
      console.error('Error saving analysis to database:', error);
      throw error;
    }
  }

  /**
   * Ottiene lo stato corrente del processo
   */
  getAnalysisStatus(): BusinessAnalysisStatus {
    return { ...this.currentStatus };
  }

  /**
   * Cerca analisi salvate nel database
   */
  async searchAnalyses(filters: AnalysisSearchFilters): Promise<ConversationAnalysisDocument[]> {
    const query: any = {};
    
    if (filters.subreddit) {
      query.subreddit = filters.subreddit;
    }
    
    if (filters.minIdeaLevel !== undefined) {
      query['analysis.idealevel'] = { $gte: filters.minIdeaLevel };
    }
    
    if (filters.maxIdeaLevel !== undefined) {
      query['analysis.idealevel'] = { ...query['analysis.idealevel'], $lte: filters.maxIdeaLevel };
    }
    
    if (filters.keywords && filters.keywords.length > 0) {
      query.keywords = { $in: filters.keywords };
    }
    
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }
    
    if (filters.hasReturn !== undefined) {
      query['analysis.possiblereturn'] = filters.hasReturn ? { $ne: null } : null;
    }

    const collection = this.databaseClient.getCollection('conversation_analyses');
    let cursor = collection.find(query);
    
    if (filters.limit) cursor = cursor.limit(filters.limit);
    if (filters.skip) cursor = cursor.skip(filters.skip);
    
    if (filters.sortBy) {
      cursor = cursor.sort({ [filters.sortBy]: filters.sortOrder === 'desc' ? -1 : 1 });
    }

    return await cursor.toArray() as ConversationAnalysisDocument[];
  }

  /**
   * Ottiene statistiche delle analisi
   */
  async getAnalysisStats(): Promise<any> {
    const collection = this.databaseClient.getCollection('conversation_analyses');
    const totalCount = await collection.countDocuments({});
    
    const pipeline = [
      {
        $group: {
          _id: null,
          avgIdeaLevel: { $avg: '$analysis.idealevel' },
          totalAnalyses: { $sum: 1 }
        }
      }
    ];

    const stats = await collection.aggregate(pipeline).toArray();
    
    return {
      totalAnalyses: totalCount,
      averageIdeaLevel: stats[0]?.avgIdeaLevel || 0
    };
  }

  /**
   * Utility per pause
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}