// src/config.ts
// 在原有配置基础上追加 LangChain 配置

export const config = {
  // ── 原有配置（不动）─────────────────────────────────────
  // 如果原项目有 server、chroma 等配置，保留在这里

  // ── 新增：Ollama / LangChain 配置 ───────────────────────
  ollama: {
    // Ollama 服务地址，默认本机 11434 端口
    baseUrl: 'http://localhost:11434',

    // 对话模型：本地 Ollama 已安装 qwen2.5-coder:3b
    // 拉取命令：ollama pull qwen2.5-coder:3b
    chatModel: 'qwen2.5-coder:3b',

    // 向量化模型：mxbai-embed-large（RAG 检索用，约 669MB）
    // 拉取命令：ollama pull mxbai-embed-large
    embedModel: 'mxbai-embed-large',

    // 温度参数（0~1）
    // 0   = 最保守，每次输出几乎相同，适合问答/代码
    // 0.3 = 稍有变化，适合大多数场景
    // 0.7 = 较有创意，适合写作
    // 1.0 = 最随机，适合头脑风暴
    temperature: 0.3,
  },

  // ── 新增：DeepSeek 配置（通过 @langchain/openai 接入）─────
  deepseek: {
    // DeepSeek API 地址（OpenAI 兼容协议）
    baseUrl: 'https://api.deepseek.com',

    // 对话模型：deepseek-flash（快速通用模型）
    // 如需切换，可选 'deepseek-chat'（通用）或 'deepseek-reasoner'（R1 推理）
    chatModel: 'deepseek-flash',

    // API Key 从环境变量读取，在 .env 中配置：DEEPSEEK_API_KEY=sk-xxx
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',

    // 温度参数（0~1）
    // 注：deepseek-reasoner 官方建议不传 temperature（会被忽略），
    // 保留此字段供后续切换 deepseek-chat 时使用
    temperature: 0.3,
  },

  langGraph: {
    model:       process.env.LANGGRAPH_MODEL  || 'qwen2.5-coder:3b',
    baseURL:     process.env.OLLAMA_BASE_URL  || 'http://localhost:11434/v1',
    apiKey:      'ollama',    // Ollama 不校验 apiKey，随便填个占位符即可
    temperature: 0.7,
  },
};
