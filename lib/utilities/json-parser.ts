/**
 * Utility per il parsing e la validazione di risposte JSON da AI
 */

export interface JsonParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class JsonParser {
  /**
   * Estrae e parsa JSON da una stringa che potrebbe contenere testo aggiuntivo
   * @param rawContent - Il contenuto grezzo da parsare
   * @param requiredFields - Array di campi obbligatori da validare
   * @returns Risultato del parsing con successo/errore
   */
  static parseAIResponse<T = any>(
    rawContent: string,
    requiredFields: string[] = []
  ): JsonParseResult<T> {
    try {
      if (!rawContent || rawContent.trim() === '') {
        return {
          success: false,
          error: 'Empty or null content provided'
        };
      }

      // Rimuove blocchi markdown se presenti (es. ```json...```)
      let cleanContent = rawContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Cerca il JSON più accuratamente
      let jsonString = cleanContent.trim();
      
      // Se non inizia con {, cerca il primo JSON valido
      if (!jsonString.startsWith('{')) {
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }
      
      // Se il JSON è troncato, prova a trovare l'ultimo } valido
      if (jsonString.startsWith('{') && !jsonString.endsWith('}')) {
        const lastBraceIndex = jsonString.lastIndexOf('}');
        if (lastBraceIndex > 0) {
          jsonString = jsonString.substring(0, lastBraceIndex + 1);
        }
      }
      
      // Sanitizza il JSON per gestire stringhe malformate
      jsonString = this.sanitizeJsonString(jsonString);

      // Parsing JSON
      let parsedData: T;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (parseError) {
        // Tentativo di riparazione automatica per stringhe non terminate
        try {
          const repairedJson = this.repairJsonString(jsonString);
          parsedData = JSON.parse(repairedJson);
        } catch (repairError) {
          return {
            success: false,
            error: `Invalid JSON format: ${parseError.message}`
          };
        }
      }

      // Validazione campi obbligatori
      if (requiredFields.length > 0) {
        const missingFields = requiredFields.filter(
          field => !Object.prototype.hasOwnProperty.call(parsedData, field)
        );

        if (missingFields.length > 0) {
          return {
            success: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
          };
        }
      }

      return {
        success: true,
        data: parsedData
      };

    } catch (error) {
      return {
        success: false,
        error: `Unexpected error during parsing: ${error.message}`
      };
    }
  }

  /**
   * Valida che un oggetto contenga tutti i campi richiesti
   * @param obj - Oggetto da validare
   * @param requiredFields - Array di campi obbligatori
   * @returns true se tutti i campi sono presenti
   */
  static validateRequiredFields(obj: any, requiredFields: string[]): boolean {
    return requiredFields.every(field => Object.prototype.hasOwnProperty.call(obj, field));
  }

  /**
   * Pulisce una stringa JSON rimuovendo caratteri non validi
   * @param jsonString - Stringa JSON da pulire
   * @returns Stringa JSON pulita
   */
  static sanitizeJsonString(jsonString: string): string {
    let cleaned = jsonString.trim();
    
    // Se il JSON è già ben formato, non modificarlo
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      return cleaned;
    }
    
    // Trova la prima { e l'ultima } per estrarre il JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned;
  }

  /**
   * Tenta di riparare una stringa JSON malformata
   * @param jsonString - Stringa JSON da riparare
   * @returns Stringa JSON riparata
   */
  static repairJsonString(jsonString: string): string {
    let repaired = jsonString.trim();
    
    // Controlla se il JSON è completamente vuoto o troncato
    if (!repaired || repaired.length === 0) {
      return '{"idealevel": 1, "possiblereturn": null, "problem": "Empty response", "solution": "Please try again"}';
    }
    
    // Se non inizia con { o [, probabilmente è testo semplice
    if (!repaired.startsWith('{') && !repaired.startsWith('[')) {
      return '{"idealevel": 1, "possiblereturn": null, "problem": "Invalid JSON format", "solution": "Please try again"}';
    }
    
    // Gestisce JSON troncato improvvisamente (Unexpected end of JSON input)
    if (repaired.endsWith(',') || repaired.endsWith(':')) {
      // Rimuovi caratteri trailing problematici
      repaired = repaired.replace(/[,:]+$/, '');
    }
    
    // Gestisce stringhe non terminate
    const openQuotes = (repaired.match(/"/g) || []).length;
    if (openQuotes % 2 !== 0) {
      // Numero dispari di virgolette, aggiungi una virgoletta di chiusura
      const lastQuoteIndex = repaired.lastIndexOf('"');
      const afterLastQuote = repaired.substring(lastQuoteIndex + 1);
      
      // Se dopo l'ultima virgoletta c'è solo spazio bianco o caratteri di controllo
      if (/^[\s,}\]]*$/.test(afterLastQuote)) {
        repaired = repaired.substring(0, lastQuoteIndex + 1) + '"' + afterLastQuote;
      } else {
        // Trova la posizione migliore per chiudere la stringa
        const commaIndex = afterLastQuote.indexOf(',');
        const braceIndex = afterLastQuote.indexOf('}');
        const insertIndex = Math.min(
          commaIndex === -1 ? Infinity : commaIndex,
          braceIndex === -1 ? Infinity : braceIndex
        );
        
        if (insertIndex !== Infinity) {
          repaired = repaired.substring(0, lastQuoteIndex + 1) + 
                    afterLastQuote.substring(0, insertIndex) + '"' + 
                    afterLastQuote.substring(insertIndex);
        } else {
          repaired += '"';
        }
      }
    }
    
    // Gestisce parentesi graffe non bilanciate
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    } else if (closeBraces > openBraces) {
      // Rimuovi parentesi graffe in eccesso
      let braceCount = 0;
      let result = '';
      for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        if (char === '{') {
          braceCount++;
          result += char;
        } else if (char === '}') {
          if (braceCount > 0) {
            braceCount--;
            result += char;
          }
          // Ignora le parentesi graffe in eccesso
        } else {
          result += char;
        }
      }
      repaired = result;
    }
    
    // Rimuove virgole trailing
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    
    return repaired;
  }
}

/**
 * Interfaccia specifica per l'analisi delle conversazioni
 */
export interface ConversationAnalysisData {
  idealevel: number;
  possiblereturn: string | null;
  problem: string;
  solution: string;
}

/**
 * Parser specializzato per le analisi delle conversazioni
 */
export class ConversationAnalysisParser extends JsonParser {
  private static readonly REQUIRED_FIELDS = ['idealevel', 'possiblereturn', 'problem', 'solution'];

  /**
   * Parsa una risposta AI per l'analisi delle conversazioni
   * @param rawContent - Contenuto grezzo dalla AI
   * @returns Risultato del parsing con dati tipizzati
   */
  static parseConversationAnalysis(
    rawContent: string
  ): JsonParseResult<ConversationAnalysisData> {
    const result = this.parseAIResponse<ConversationAnalysisData>(
      rawContent,
      this.REQUIRED_FIELDS
    );

    // Validazioni aggiuntive specifiche per l'analisi delle conversazioni
    if (result.success && result.data) {
      const data = result.data;
      
      // Valida idealevel (deve essere tra 1 e 10)
      if (typeof data.idealevel !== 'number' || data.idealevel < 1 || data.idealevel > 10) {
        return {
          success: false,
          error: 'idealevel must be a number between 1 and 10'
        };
      }

      // Valida possiblereturn (deve essere string o null)
      if (data.possiblereturn !== null && typeof data.possiblereturn !== 'string') {
        return {
          success: false,
          error: 'possiblereturn must be a string or null'
        };
      }

      // Valida che problem e solution siano stringhe non vuote
      if (typeof data.problem !== 'string' || data.problem.trim() === '') {
        return {
          success: false,
          error: 'problem must be a non-empty string'
        };
      }

      if (typeof data.solution !== 'string' || data.solution.trim() === '') {
        return {
          success: false,
          error: 'solution must be a non-empty string'
        };
      }
    }

    return result;
  }

  /**
   * Crea un'analisi di fallback in caso di errore
   * @param errorMessage - Messaggio di errore
   * @returns Analisi di fallback
   */
  static createFallbackAnalysis(errorMessage: string): ConversationAnalysisData {
    return {
      idealevel: 1,
      possiblereturn: null,
      problem: 'Unable to analyze conversation due to technical error',
      solution: `Please try again or contact support if the issue persists. Error: ${errorMessage}`,
    };
  }
}