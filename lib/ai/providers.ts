import { customProvider } from 'ai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'openai/gpt-4o': chatModel,
        'openai/o1-mini': reasoningModel,
        'openai/gpt-4o-mini': artifactModel,
      },
    })
  : null;
