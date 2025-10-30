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

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawContent.trim();

      // Parsing JSON
      let parsedData: T;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (parseError) {
        return {
          success: false,
          error: `Invalid JSON format: ${parseError.message}`
        };
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
    return jsonString
      .trim()
      .replace(/^[^{]*/, '') // Rimuove tutto prima della prima parentesi graffa
      .replace(/[^}]*$/, '') // Rimuove tutto dopo l'ultima parentesi graffa
      .replace(/\n/g, ' ') // Sostituisce newline con spazi
      .replace(/\s+/g, ' '); // Normalizza spazi multipli
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