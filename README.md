# n8n-nodes-sekuire

n8n community nodes for [Sekuire](https://sekuire.ai) AI governance. Add policy enforcement, model guardrails, and audit logging to your n8n AI workflows.

## Installation

### Community Node (recommended)

1. Open your n8n instance
2. Go to **Settings** > **Community Nodes**
3. Select **Install a community node**
4. Enter `n8n-nodes-sekuire`
5. Confirm the install

### Manual Install

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-sekuire
```

Restart n8n after installing.

## Nodes

### Sekuire Governance

A policy enforcement gate node. Place it before any AI node in your workflow to enforce governance policies.

**Check types:**

- **Model** - Validates that the requested model is allowed by policy (allowed/blocked model lists)
- **Tool** - Validates that a tool call is permitted by policy (allowed/blocked tool lists, category patterns)
- **Rate Limit** - Enforces request rate limits defined in policy (per-minute, per-hour)

**Violation handling:**

- **Stop Execution** - Throws an error and halts the workflow on policy violation
- **Continue with Warning** - Adds a `_sekuireWarning` field to the output and continues

**Policy input:** Provide a Sekuire policy as inline JSON. The policy follows the [OAGS specification](https://github.com/fickson/oags) schema. When no `content` field is present in the policy, the node passes data through without enforcement.

### Sekuire LLM

A governed LLM call node that combines policy enforcement with an LLM provider call.

**Features:**

- Enforces model allowlist/blocklist before making the call
- Enforces rate limits before making the call
- Supports OpenAI, Anthropic, Google Gemini, and Ollama providers
- Returns response content along with governance metadata

**Parameters:**

- **Prompt** - The user message to send
- **Model** - Model identifier (e.g., `gpt-4o-mini`, `claude-sonnet-4-20250514`)
- **System Prompt** - Optional system message
- **Temperature** - Sampling temperature (0-2)
- **Policy (JSON)** - Inline policy for enforcement

**Output:** Each item includes `content`, `model`, `usage` stats, and a `_sekuire` metadata object with `governed`, `provider`, `model`, and `policy_id` fields.

## Credentials

Set up Sekuire API credentials in n8n:

1. Go to **Credentials** > **New Credential**
2. Search for **Sekuire API**
3. Configure:
   - **Install Token** - Your Sekuire platform install token (optional for standalone mode)
   - **Agent ID** - Agent identifier for audit trails (optional)
   - **LLM Provider** - Select your provider (OpenAI, Anthropic, Google Gemini, Ollama)
   - **LLM API Key** - API key for the selected provider

## Example Workflows

### Policy gate before an existing AI node

```
[Trigger] -> [Sekuire Governance (model check)] -> [OpenAI Node] -> [Output]
```

Place the Governance node before any AI node. If the model is not allowed by policy, execution stops (or continues with a warning, depending on configuration).

### Governed LLM call

```
[Trigger] -> [Sekuire LLM] -> [Output]
```

Use the Sekuire LLM node for a single node that handles both policy enforcement and the LLM call. The response includes governance metadata for audit trails.

### Multi-check pipeline

```
[Trigger] -> [Sekuire Governance (model)] -> [Sekuire Governance (tool)] -> [Sekuire Governance (rate limit)] -> [AI Node] -> [Output]
```

Chain multiple Governance nodes to enforce different policy aspects independently.

## Policy JSON Example

```json
{
  "policy_id": "my-policy",
  "workspace_id": "ws-1",
  "version": "1.0",
  "status": "active",
  "hash": "",
  "content": {
    "agent": {
      "models": {
        "allowed_models": ["gpt-4o-mini", "gpt-4o", "claude-sonnet-4-20250514"],
        "blocked_models": ["gpt-3.5-turbo"]
      }
    },
    "tools": {
      "allowed_tools": [{ "name": "web_search" }, { "name": "files:*" }],
      "blocked_tools": ["shell_exec"]
    },
    "rate_limits": {
      "per_agent": {
        "requests_per_minute": 30,
        "requests_per_hour": 500
      }
    }
  }
}
```

## Links

- [Sekuire Documentation](https://sekuire.ai/docs)
- [OAGS Specification](https://github.com/fickson/oags)
- [TypeScript SDK](https://github.com/fickson/typescript-sdk)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
