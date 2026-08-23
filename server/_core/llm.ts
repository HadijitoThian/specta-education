import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /** Override model: "deepseek-v4-pro" for heavy tasks, "deepseek-v4-flash" for fast/cheap */
  model?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// DeepSeek API endpoint
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// Default model: deepseek-v4-flash (fast + very cost-effective)
// Use deepseek-v4-pro for heavy tasks by passing model param
const DEFAULT_MODEL = "deepseek-v4-flash";

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // DeepSeek only supports text content in messages (no image/file in standard chat)
  // Collapse all parts to text string for compatibility
  if (contentParts.every(p => p.type === "text")) {
    const text = (contentParts as TextContent[]).map(p => p.text).join("\n");
    return { role, name, content: text };
  }

  // For mixed content (images), keep as array — DeepSeek V4 supports vision
  return { role, name, content: contentParts };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    // DeepSeek supports json_object but not json_schema with strict mode
    // Convert json_schema to json_object for compatibility
    if (explicitFormat.type === "json_schema") {
      return { type: "json_object" };
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  // DeepSeek uses json_object mode (no strict json_schema support)
  return { type: "json_object" };
};

/**
 * Fallback LLM invoke via DeepInfra (GLM 5.2 by default). Used ONLY when
 * DeepSeek's own retry loop exhausts (see aptitudeAiReliability.ts).
 *
 * Why DeepInfra + GLM instead of OpenAI:
 *   - Reuses DEEPINFRA_API_KEY that's already set for the image pipeline —
 *     no new key on Railway, no new billing account, one less thing to break.
 *   - DeepInfra exposes an OpenAI-compatible /v1/openai/chat/completions
 *     endpoint, so the wire protocol is identical to what invokeLLM expects.
 *   - GLM 5.2 (zai-org/GLM-5.2) is a strong general-purpose model on
 *     DeepInfra — sufficient for the aptitude-analysis workload, priced
 *     closer to DeepSeek than to OpenAI flagship models.
 *   - DeepInfra + DeepSeek run on different infra, so simultaneous outages
 *     are rare enough to give near-zero effective failure rate.
 *
 * Returns in the same InvokeResult shape as invokeLLM so callers can swap
 * transparently. Throws if DEEPINFRA_API_KEY is not set — the caller
 * decides whether to treat that as a hard failure or a graceful skip.
 *
 * Override the model with LLM_FALLBACK_MODEL if you want to try something
 * else on DeepInfra (e.g. "meta-llama/Meta-Llama-3.1-70B-Instruct").
 */
export async function invokeLLMFallback(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.deepinfraApiKey;
  if (!apiKey) {
    throw new Error("DEEPINFRA_API_KEY is not configured — fallback provider unavailable");
  }

  const { messages, responseFormat, response_format, outputSchema, output_schema } = params;

  const payload: Record<string, unknown> = {
    model: params.model || process.env.LLM_FALLBACK_MODEL || "zai-org/GLM-5.2",
    messages: messages.map(normalizeMessage),
    // 16k — the Pro Aptitude schema (bigFive + 5 majors + strengths + action
    // plan + long analysis paragraphs) can genuinely require 10k+ tokens.
    // 8k was truncating GLM's output mid-JSON, causing JSON.parse to throw
    // and get treated as a "GLM also failed" outcome (2026-08-24 incident).
    max_tokens: 16000,
  };

  // DeepInfra's OpenAI-compatible endpoint supports json_object mode. If the
  // caller asked for json_schema we downshift to json_object (same as DeepSeek
  // does) to keep the response shape parseable.
  const explicit = responseFormat || response_format;
  const schema = outputSchema || output_schema;
  if (explicit?.type === "json_schema" || explicit?.type === "json_object" || schema) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepInfra fallback invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.deepseekApiKey;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
  } = params;

  const selectedModel = model || DEFAULT_MODEL;

  const payload: Record<string, unknown> = {
    model: selectedModel,
    messages: messages.map(normalizeMessage),
    max_tokens: 8192,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepSeek LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
