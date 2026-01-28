import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AlgoAgentError } from '../types';

export class ModelFactory {
  // Returning any to avoid version mismatch issues between @langchain/core and plugins
  static create(modelName?: string): any {
    // 1. Resolve model name: argument > env var > default
    const model = modelName || process.env.AGENT_MODEL;
    if (!model) {
      throw new AlgoAgentError('Model not specified', 'INVALID_CONFIG');
    }

    // 2. Select provider based on model name or implicit configuration

    // If it starts with "ollama:" (e.g. "ollama:llama3")
    if (model.startsWith('ollama:')) {
      return new ChatOllama({
        model: model.replace('ollama:', ''),
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      });
    }

    // If it starts with "gemini-" (e.g. "gemini-pro")
    if (model.startsWith('gemini-')) {
      return new ChatGoogleGenerativeAI({
        model: model,
        apiKey: process.env.GOOGLE_API_KEY,
        maxOutputTokens: 2048,
      });
    }

    // If it starts with "gpt-" (e.g. "gpt-4")
    if (model.startsWith('gpt-')) {
      return new ChatOpenAI({
        model: model,
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0,
      });
    }

    // Heuristic for Ollama models
    if (model.includes('llama') || model.includes('mistral')) {
         return new ChatOllama({
            model: model,
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          });
    }

    // Default to OpenAI
    return new ChatOpenAI({
      model: model,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
}
