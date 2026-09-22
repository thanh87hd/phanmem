export interface ChatHistoryMessage {
  sender?: 'user' | 'assistant' | (string & {});
  text?: string;
  role?: 'system' | 'user' | 'assistant';
  content?: string;
}

export interface AssistantChatRequestDto {
  message: string;
  history?: ChatHistoryMessage[];
}

export interface CriteriaSuggestion {
  criterion: string;
  matchedLaw: string;
  description: string;
}

export interface AssistantContextPayload {
  data: Record<string, unknown>;
  contextString: string;
  isEmpty: boolean;
}

export interface AssistantQueryResponse {
  answer: string;
  confidenceScore?: number;
  sources?: string[];
  suggestedActions?: string[];
}
