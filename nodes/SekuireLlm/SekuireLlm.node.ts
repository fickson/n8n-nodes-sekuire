import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  NodeOperationError,
} from 'n8n-workflow';
import { createLLMProvider, PolicyEnforcer } from '@sekuire/sdk';
import type { LLMProvider } from '@sekuire/sdk';

export class SekuireLlm implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sekuire LLM',
    name: 'sekuireLlm',
    group: ['transform'],
    version: 1,
    subtitle: 'Governed LLM Call',
    description: 'Make LLM calls with Sekuire policy enforcement built into the provider',
    defaults: { name: 'Sekuire LLM' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'sekuireApi', required: true }],
    properties: [
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        default: 'gpt-4o-mini',
      },
      {
        displayName: 'System Prompt',
        name: 'systemPrompt',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
        default: 0.7,
      },
      {
        displayName: 'Policy (JSON)',
        name: 'policyJson',
        type: 'json',
        default: '{}',
        description: 'Inline policy JSON for enforcement. See sekuire.ai/docs for schema.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('sekuireApi');
    const providerName = credentials.llmProvider as string;
    const apiKey = credentials.llmApiKey as string;

    if (!apiKey) {
      throw new NodeOperationError(this.getNode(), 'LLM API key is required in Sekuire credentials');
    }

    const model = this.getNodeParameter('model', 0) as string;
    const policyJson = this.getNodeParameter('policyJson', 0) as string;

    let policy: any;
    try {
      policy = typeof policyJson === 'string' ? JSON.parse(policyJson) : policyJson;
    } catch {
      throw new NodeOperationError(this.getNode(), 'Invalid policy JSON');
    }

    const llm = await createLLMProvider(providerName, { apiKey, model });

    let enforcer: PolicyEnforcer | undefined;
    if (policy.content) {
      enforcer = new PolicyEnforcer(policy);
      if ('setPolicyEnforcer' in llm) {
        (llm as any).setPolicyEnforcer(enforcer);
      }
    }

    for (let i = 0; i < items.length; i++) {
      const prompt = this.getNodeParameter('prompt', i) as string;
      const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;
      const temperature = this.getNodeParameter('temperature', i) as number;

      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      try {
        const response = await llm.chat(messages, { temperature });

        results.push({
          json: {
            content: response.content,
            model: response.model,
            finish_reason: response.finish_reason,
            usage: response.usage,
            _sekuire: {
              governed: !!enforcer,
              provider: providerName,
              model,
              policy_id: policy.policy_id || null,
            },
          },
        });
      } catch (error: any) {
        if (error.rule) {
          throw new NodeOperationError(
            this.getNode(),
            `Policy violation: ${error.message}`,
            { itemIndex: i },
          );
        }
        throw new NodeOperationError(
          this.getNode(),
          `LLM error: ${error.message}`,
          { itemIndex: i },
        );
      }
    }

    return [results];
  }
}
