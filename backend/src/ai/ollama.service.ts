import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
export interface OllamaGenerateOptions {
  prompt: string;
  system?: string;
  model?: string;
  format?: 'json' | object;
  temperature?: number;
  timeoutMs?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  messages: OllamaChatMessage[];
  model?: string;
  format?: 'json' | object;
  temperature?: number;
  timeoutMs?: number;
}

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);
  private available = false;

  // === Health check caching (avoid /api/tags on every request) ===
  private lastHealthCheck = 0;
  private readonly healthCheckTTL = 30000; // Cache health status for 30 seconds

  // Default model — Gemma 2 2B for excellent quality and fast performance
  private readonly defaultModel = 'gemma2:2b';
  private readonly host = 'localhost';
  private readonly port = 11434;

  async onModuleInit() {
    await this.checkAvailability();
    if (this.available) {
      this.logger.log(
        `✅ Ollama đang hoạt động tại http://${this.host}:${this.port}`,
      );
      await this.ensureModelExists();
    } else {
      this.logger.warn(
        `⚠️ Ollama không khả dụng. Hệ thống sẽ dùng Heuristic Engine.`,
      );
    }
  }

  /**
   * Check if Ollama server is running
   */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckTTL) {
      return this.available;
    }
    await this.checkAvailability();
    this.lastHealthCheck = now;
    return this.available;
  }

  private async checkAvailability(): Promise<void> {
    try {
      const data = await this.httpGet('/api/tags', 3000);
      this.available = !!data;
    } catch {
      this.available = false;
    }
  }

  private async ensureModelExists(): Promise<void> {
    try {
      const data = await this.httpGet('/api/tags', 5000);
      const parsed = JSON.parse(data);
      const models = parsed?.models || [];
      const modelExists = models.some(
        (m: any) =>
          m.name === this.defaultModel ||
          m.name.startsWith(this.defaultModel.split(':')[0]),
      );
      if (modelExists) {
        this.logger.log(`✅ Model "${this.defaultModel}" đã sẵn sàng.`);
      } else {
        this.logger.warn(
          `⚠️ Model "${this.defaultModel}" chưa pull. Chạy: ollama pull ${this.defaultModel}`,
        );
      }
    } catch {
      this.logger.warn('Không thể kiểm tra danh sách model Ollama.');
    }
  }

  /**
   * Generate a single response (non-chat mode)
   */
  async generate(options: OllamaGenerateOptions): Promise<string | null> {
    if (!this.available) {
      await this.checkAvailability();
      if (!this.available) return null;
    }

    try {
      const payload: any = {
        model: options.model || this.defaultModel,
        prompt: options.prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: 1024,
        },
      };
      if (options.system) payload.system = options.system;
      if (options.format) payload.format = options.format;

      const responseStr = await this.httpPost(
        '/api/generate',
        payload,
        options.timeoutMs || 30000,
      );
      const parsed = JSON.parse(responseStr);
      return parsed?.response || null;
    } catch (e: any) {
      this.logger.warn(`[Ollama Generate] Error: ${e.message}`);
      return null;
    }
  }

  /**
   * Generate a structured JSON response with automatic parsing
   */
  async generateJSON<T = any>(
    options: OllamaGenerateOptions,
  ): Promise<T | null> {
    const rawResponse = await this.generate({
      ...options,
      format: options.format || 'json',
    });

    if (!rawResponse) return null;

    try {
      const cleaned = rawResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/\/no_think/g, '')
        .replace(/<\/?think>/g, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.warn(
        `[Ollama] Failed to parse JSON: ${rawResponse.substring(0, 200)}`,
      );
      return null;
    }
  }

  /**
   * Multi-turn chat conversation
   */
  async chat(options: OllamaChatOptions): Promise<string | null> {
    if (!this.available) {
      await this.checkAvailability();
      if (!this.available) return null;
    }

    try {
      const payload: any = {
        model: options.model || this.defaultModel,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.5,
          num_predict: 1500,
        },
      };
      if (options.format) payload.format = options.format;

      const responseStr = await this.httpPost(
        '/api/chat',
        payload,
        options.timeoutMs || 30000,
      );
      const parsed = JSON.parse(responseStr);
      let content = parsed?.message?.content || null;

      // Strip thinking tags if present
      if (content) {
        content = content
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/\/no_think/g, '')
          .trim();
      }
      return content;
    } catch (e: any) {
      this.logger.warn(`[Ollama Chat] Error: ${e.message}`);
      return null;
    }
  }

  /**
   * Classify user intent using a ultra-short LLM prompt (for ambiguous queries)
   * Returns one of the defined intent categories or 'GENERAL'
   */
  async classifyIntent(
    message: string,
    intents: string[],
  ): Promise<string | null> {
    if (!this.available) {
      await this.checkAvailability();
      if (!this.available) return null;
    }

    try {
      const intentList = intents.join(', ');
      const payload: any = {
        model: this.defaultModel,
        prompt: `Phân loại câu hỏi sau vào MỘT trong các loại: ${intentList}. Chỉ trả lời đúng 1 từ khóa loại. /no_think\n\nCâu hỏi: "${message}"\n\nLoại:`,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 32, // Ultra-short response for classification
        },
      };

      const responseStr = await this.httpPost('/api/generate', payload, 8000);
      const parsed = JSON.parse(responseStr);
      const response = (parsed?.response || '')
        .trim()
        .replace(/<\/?think>/g, '')
        .replace(/\/no_think/g, '')
        .trim()
        .split('\n')[0] // Take only first line
        .trim();

      // Match response against known intents
      const matchedIntent = intents.find((intent) =>
        response.toUpperCase().includes(intent.toUpperCase()),
      );
      return matchedIntent || null;
    } catch (e: any) {
      this.logger.warn(`[Ollama ClassifyIntent] Error: ${e.message}`);
      return null;
    }
  }

  // --- Low-level HTTP helpers using Node.js native http module ---

  private async httpGet(path: string, timeoutMs: number): Promise<string> {
    try {
      const response = await axios.get(
        `http://${this.host}:${this.port}${path}`,
        { timeout: timeoutMs },
      );
      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') throw new Error('Timeout');
      throw error;
    }
  }

  private async httpPost(
    path: string,
    body: any,
    timeoutMs: number,
  ): Promise<string> {
    try {
      const response = await axios.post(
        `http://${this.host}:${this.port}${path}`,
        body,
        { timeout: timeoutMs },
      );
      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') throw new Error('Timeout');
      throw error;
    }
  }
}
