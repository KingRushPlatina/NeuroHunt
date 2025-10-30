import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIMessage, AIResponse, AIGenerationOptions, ConversationAnalysis } from './ai.interfaces';
import { ConversationAnalysisParser, ConversationAnalysisData } from '../utilities/json-parser';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiClient implements AIProvider {
  public readonly name = 'gemini';
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: options.model || 'gemini-2.5-flash',
        generationConfig: {
          temperature:  0.7,
          maxOutputTokens: 2000,
          topP: options.topP || 0.9,
        },
      });

      const prompt = this.convertMessagesToPrompt(messages);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        model: options.model || 'gemini-2.5-flash',
        finishReason: 'stop',
        usage: {
          promptTokens: 0, 
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private convertMessagesToPrompt(messages: AIMessage[]): string {
    return messages
      .map((message) => {
        switch (message.role) {
          case 'system':
            return `System: ${message.content}`;
          case 'user':
            return `User: ${message.content}`;
          case 'assistant':
            return `Assistant: ${message.content}`;
          default:
            return message.content;
        }
      })
      .join('\n\n');
  }

  async analyzeConversation(postTitle: string, postContent: string, comments: string[]): Promise<any> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are an AI assistant that analyzes Reddit conversations. Provide insights about sentiment, key topics, and relevance.'
      },
      {
        role: 'user',
        content: `Analyze this Reddit conversation:\n\nPost Title: ${postTitle}\n\nPost Content: ${postContent}\n\nComments:\n${comments.join('\n---\n')}\n\nProvide a JSON response with: summary, sentiment (positive/negative/neutral), keyTopics (array), and relevanceScore (0-1).`
      }
    ];

    const response = await this.generateResponse(messages);
    
    try {
      return JSON.parse(response.content);
    } catch {
      return {
        summary: response.content.substring(0, 200),
        sentiment: 'neutral',
        keyTopics: [],
        relevanceScore: 0.5
      };
    }
  }

  private getSystemPrompt(): string {
    try {
      const promptPath = path.join(process.cwd(), 'lib', 'ai', 'promts', 'promt.txt');
      const promptContent = fs.readFileSync(promptPath, 'utf-8');
      return `You are an advanced AI analyst specialized in extracting business insights, problems, and opportunities from social media conversations. Your goal is to analyze a main conversation and its comments to identify valuable ideas, assess their potential, and provide actionable insights.\n\n${promptContent}`;
    } catch (error) {
      console.error('Error reading prompt file:', error);
      return 'You are an advanced AI analyst specialized in extracting business insights, problems, and opportunities from social media conversations. Your goal is to analyze a main conversation and its comments to identify valuable ideas, assess their potential, and provide actionable insights.';
    }
  }

  async analyzeRedditConversation(
    mainPost: string,
    comments: string[],
    options: AIGenerationOptions = {}
  ): Promise<ConversationAnalysis> {
    try {
      const systemPrompt = this.getSystemPrompt();

      const userPrompt = `Analyze this Reddit conversation for business opportunities and insights:

Main Post: ${mainPost}

Comments:
${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}`;

      const response = await this.generateResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], options);

      console.log('Raw AI response:', response.content);

      // Utilizza la nuova utility per il parsing JSON
      const parseResult = ConversationAnalysisParser.parseConversationAnalysis(response.content);
      
      if (parseResult.success && parseResult.data) {
        return {
          idealevel: parseResult.data.idealevel,
          possiblereturn: parseResult.data.possiblereturn,
          problem: parseResult.data.problem,
          solution: parseResult.data.solution,
          confidence: 0.9 // Higher confidence with detailed prompt
        };
      } else {
        console.error('JSON parsing failed:', parseResult.error);
        console.error('Raw response:', response.content);
        
        // Utilizza il fallback della utility
        const fallbackData = ConversationAnalysisParser.createFallbackAnalysis(parseResult.error || 'Unknown parsing error');
        return {
          idealevel: fallbackData.idealevel,
          possiblereturn: fallbackData.possiblereturn,
          problem: fallbackData.problem,
          solution: fallbackData.solution,
          confidence: 0.1
        };
      }
    } catch (error) {
      console.error('Error analyzing Reddit conversation:', error);
      
      const fallbackData = ConversationAnalysisParser.createFallbackAnalysis(error.message);
      return {
        idealevel: fallbackData.idealevel,
        possiblereturn: fallbackData.possiblereturn,
        problem: fallbackData.problem,
        solution: fallbackData.solution,
        confidence: 0.1
      };
    }
  }

  async summarizePost(title: string, content: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that creates concise summaries of Reddit posts.'
      },
      {
        role: 'user',
        content: `Summarize this Reddit post in 2-3 sentences:\n\nTitle: ${title}\n\nContent: ${content}`
      }
    ];

    const response = await this.generateResponse(messages);
    return response.content;
  }
}