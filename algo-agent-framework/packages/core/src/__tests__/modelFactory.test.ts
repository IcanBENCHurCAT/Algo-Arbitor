import { ModelFactory } from '../agent/ModelFactory';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

describe('ModelFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates ChatOpenAI for gpt- models', () => {
    process.env.OPENAI_API_KEY = 'test';
    const model = ModelFactory.create('gpt-4');
    expect(model).toBeInstanceOf(ChatOpenAI);
  });

  it('creates ChatGoogleGenerativeAI for gemini- models', () => {
    process.env.GOOGLE_API_KEY = 'test';
    const model = ModelFactory.create('gemini-pro');
    expect(model).toBeInstanceOf(ChatGoogleGenerativeAI);
  });

  it('creates ChatOllama for ollama: prefix', () => {
    const model = ModelFactory.create('ollama:llama3');
    expect(model).toBeInstanceOf(ChatOllama);
  });

  it('creates ChatOllama for known local models', () => {
    const model = ModelFactory.create('llama3');
    expect(model).toBeInstanceOf(ChatOllama);
  });

  it('defaults to ChatOpenAI', () => {
    process.env.OPENAI_API_KEY = 'test';
    const model = ModelFactory.create('unknown-model');
    expect(model).toBeInstanceOf(ChatOpenAI);
  });

  it('throws if no model specified and no env var', () => {
    delete process.env.AGENT_MODEL;
    expect(() => ModelFactory.create()).toThrow('Model not specified');
  });

  it('uses env var if argument not provided', () => {
    process.env.AGENT_MODEL = 'gemini-pro';
    process.env.GOOGLE_API_KEY = 'test';
    const model = ModelFactory.create();
    expect(model).toBeInstanceOf(ChatGoogleGenerativeAI);
  });
});
