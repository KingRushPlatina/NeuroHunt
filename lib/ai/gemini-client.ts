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
      
      // Estrazione più robusta del testo
      let text = '';
      try {
        text = response.text();
      } catch (error) {
        console.warn('Error extracting text with response.text():', error.message);
        // Fallback: prova ad estrarre il testo dai candidates
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            text = candidate.content.parts.map(part => part.text || '').join('');
          }
        }
      }
      
      console.log('Gemini raw response structure:', {
        hasResponse: !!response,
        hasCandidates: !!(response.candidates && response.candidates.length > 0),
        candidatesCount: response.candidates ? response.candidates.length : 0,
        textLength: text.length,
        textPreview: text.substring(0, 200)
      });

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
      // Prova prima con l'approccio JSON strutturato
      const jsonResult = await this.tryJsonAnalysis(mainPost, comments, options);
      if (jsonResult) {
        return jsonResult;
      }
      
      // Fallback: approccio semplificato senza JSON
      console.log('JSON approach failed, trying simplified approach...');
      return await this.trySimplifiedAnalysis(mainPost, comments, options);
      
    } catch (error) {
      console.error('Error analyzing Reddit conversation:', error);
      
      const fullRequest = `System: ${this.getSystemPrompt()}\n\nUser: Analyze this Reddit conversation for business opportunities and insights:\n\nMain Post: ${mainPost}\n\nComments:\n${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}`;
      
      const fallbackData = ConversationAnalysisParser.createFallbackAnalysis(error.message);
      return {
        idealevel: fallbackData.idealevel,
        possiblereturn: fallbackData.possiblereturn,
        problem: fallbackData.problem,
        solution: fallbackData.solution,
        confidence: 0.1,
        rawResponse: `Error: ${error.message}`,
        rawRequest: fullRequest
      };
    }
  }

  private async tryJsonAnalysis(
    mainPost: string,
    comments: string[],
    options: AIGenerationOptions
  ): Promise<ConversationAnalysis | null> {
    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = `Analyze this Reddit conversation for business opportunities and insights:\n\nMain Post: ${mainPost}\n\nComments:\n${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}`;
      const fullRequest = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;

      const response = await this.generateResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], options);

      console.log('Raw AI response:', response.content);
      console.log('Raw AI response length:', response.content.length);
      console.log('Raw AI response starts with:', response.content.substring(0, 100));

      if (!response.content || response.content.trim().length === 0) {
        console.warn('Empty response from AI, trying fallback approach');
        return null;
      }

      const parseResult = ConversationAnalysisParser.parseConversationAnalysis(response.content);
      console.log('Parse result:', parseResult);
      
      if (parseResult.success && parseResult.data) {
        return {
          idealevel: parseResult.data.idealevel,
          possiblereturn: parseResult.data.possiblereturn,
          problem: parseResult.data.problem,
          solution: parseResult.data.solution,
          confidence: 0.9,
          rawResponse: response.content,
          rawRequest: fullRequest
        };
      }
      
      return null;
    } catch (error) {
      console.warn('JSON analysis failed:', error.message);
      return null;
    }
  }

  private async trySimplifiedAnalysis(
    mainPost: string,
    comments: string[],
    options: AIGenerationOptions
  ): Promise<ConversationAnalysis> {
    const simplifiedPrompt = `Analyze this Reddit conversation and provide a simple assessment:\n\nMain Post: ${mainPost}\n\nComments:\n${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}\n\nPlease provide:\n1. Business opportunity level (1-5)\n2. Main problem discussed\n3. Potential solution\n4. Your confidence in this analysis (0.1-1.0)`;
    
    const fullRequest = `User: ${simplifiedPrompt}`;

    try {
      const response = await this.generateResponse([
        { role: 'user', content: simplifiedPrompt }
      ], options);

      console.log('Simplified analysis response:', response.content);
      
      // Parsing semplificato basato su pattern
      const content = response.content || '';
      const idealevel = this.extractNumberFromText(content, /(?:level|livello)[:\s]*(\d+)/i) || 2;
      const confidence = this.extractNumberFromText(content, /confidence[:\s]*([0-9.]+)/i) || 0.5;
      
      // Estrai problema e soluzione con regex semplici
      const problemMatch = content.match(/(?:problem|problema)[:\s]*([^\n]+)/i);
      const solutionMatch = content.match(/(?:solution|soluzione)[:\s]*([^\n]+)/i);
      
      return {
        idealevel: Math.min(5, Math.max(1, idealevel)),
        possiblereturn: null,
        problem: problemMatch ? problemMatch[1].trim() : 'Business opportunity identified in conversation',
        solution: solutionMatch ? solutionMatch[1].trim() : 'Further analysis recommended',
        confidence: Math.min(1.0, Math.max(0.1, confidence)),
        rawResponse: response.content,
        rawRequest: fullRequest
      };
    } catch (error) {
      console.error('Simplified analysis also failed:', error);
      
      const fallbackData = ConversationAnalysisParser.createFallbackAnalysis('All analysis methods failed');
      return {
        idealevel: fallbackData.idealevel,
        possiblereturn: fallbackData.possiblereturn,
        problem: fallbackData.problem,
        solution: fallbackData.solution,
        confidence: 0.1,
        rawResponse: `Fallback analysis due to error: ${error.message}`,
        rawRequest: fullRequest
      };
    }
  }

  private extractNumberFromText(text: string, regex: RegExp): number | null {
    const match = text.match(regex);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? null : num;
    }
    return null;
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