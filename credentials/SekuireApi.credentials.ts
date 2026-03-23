import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SekuireApi implements ICredentialType {
  name = 'sekuireApi';
  displayName = 'Sekuire API';
  documentationUrl = 'https://sekuire.ai/docs';
  properties: INodeProperties[] = [
    {
      displayName: 'Install Token',
      name: 'installToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Sekuire install token for platform governance. Leave empty for standalone policy enforcement.',
    },
    {
      displayName: 'Agent ID',
      name: 'agentId',
      type: 'string',
      default: '',
      description: 'Sekuire agent ID for identity verification (optional)',
    },
    {
      displayName: 'LLM Provider',
      name: 'llmProvider',
      type: 'options',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic', value: 'anthropic' },
        { name: 'Google Gemini', value: 'google' },
        { name: 'Ollama', value: 'ollama' },
      ],
      default: 'openai',
    },
    {
      displayName: 'LLM API Key',
      name: 'llmApiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'API key for the selected LLM provider',
    },
  ];
}
