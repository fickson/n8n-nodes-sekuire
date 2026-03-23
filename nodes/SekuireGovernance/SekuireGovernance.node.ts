import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  NodeOperationError,
} from 'n8n-workflow';
import { PolicyEnforcer } from '@sekuire/sdk';

export class SekuireGovernance implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sekuire Governance',
    name: 'sekuireGovernance',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["checkType"]}}',
    description: 'Enforce AI governance policies before LLM calls',
    defaults: { name: 'Sekuire Governance' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'sekuireApi', required: false }],
    properties: [
      {
        displayName: 'Check Type',
        name: 'checkType',
        type: 'options',
        options: [
          { name: 'Model', value: 'model' },
          { name: 'Tool', value: 'tool' },
          { name: 'Rate Limit', value: 'rateLimit' },
        ],
        default: 'model',
      },
      {
        displayName: 'Model Name',
        name: 'modelName',
        type: 'string',
        default: 'gpt-4o-mini',
        displayOptions: { show: { checkType: ['model'] } },
      },
      {
        displayName: 'Tool Name',
        name: 'toolName',
        type: 'string',
        default: '',
        displayOptions: { show: { checkType: ['tool'] } },
      },
      {
        displayName: 'Policy (JSON)',
        name: 'policyJson',
        type: 'json',
        default: '{}',
        description: 'Inline policy JSON for standalone enforcement. See sekuire.ai/docs for schema.',
      },
      {
        displayName: 'On Violation',
        name: 'onViolation',
        type: 'options',
        options: [
          { name: 'Stop Execution', value: 'stop' },
          { name: 'Continue with Warning', value: 'warn' },
        ],
        default: 'stop',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const checkType = this.getNodeParameter('checkType', 0) as string;
    const policyJson = this.getNodeParameter('policyJson', 0) as string;
    const onViolation = this.getNodeParameter('onViolation', 0) as string;

    let policy;
    try {
      policy = typeof policyJson === 'string' ? JSON.parse(policyJson) : policyJson;
    } catch {
      throw new NodeOperationError(this.getNode(), 'Invalid policy JSON');
    }

    if (!policy.content) {
      return [items];
    }

    const enforcer = new PolicyEnforcer(policy);

    try {
      switch (checkType) {
        case 'model': {
          const modelName = this.getNodeParameter('modelName', 0) as string;
          enforcer.enforceModel(modelName);
          break;
        }
        case 'tool': {
          const toolName = this.getNodeParameter('toolName', 0) as string;
          enforcer.enforceTool(toolName);
          break;
        }
        case 'rateLimit': {
          enforcer.enforceRateLimit('request');
          break;
        }
      }
    } catch (error: any) {
      if (onViolation === 'stop') {
        throw new NodeOperationError(this.getNode(), `Policy violation: ${error.message}`);
      }
      for (const item of items) {
        item.json._sekuireWarning = error.message;
      }
    }

    return [items];
  }
}
