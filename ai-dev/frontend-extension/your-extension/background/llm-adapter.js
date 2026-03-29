// =============================================================================
// 大模型API适配器
// =============================================================================
// 描述: 支持通义千问、文心一言、智谱GLM等国内大模型API的统一适配层
// =============================================================================

/**
 * 基础LLM提供商类
 */
class BaseLLMProvider {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = config;
  }

  /**
   * 构造请求体
   * @param {string} prompt - 提示词
   * @returns {Object} 请求体
   */
  buildRequestBody(prompt) {
    throw new Error('子类必须实现buildRequestBody方法');
  }

  /**
   * 解析响应
   * @param {Object} response - API响应
   * @returns {string} 解析后的文本
   */
  parseResponse(response) {
    throw new Error('子类必须实现parseResponse方法');
  }

  /**
   * 获取请求头
   * @returns {Object} 请求头
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * 发送请求
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} 处理结果
   */
  async sendRequest(prompt) {
    const body = this.buildRequestBody(prompt);
    const headers = this.getHeaders();

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }
}

/**
 * 通义千问提供商
 */
class QwenProvider extends BaseLLMProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.config.apiUrl = config.apiUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    this.config.model = config.model || 'qwen-turbo';
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  buildRequestBody(prompt) {
    return {
      model: this.config.model,
      input: {
        messages: [
          { role: 'system', content: '你是一个专业的内容分析助手，擅长事实核查、文本总结和中性化改写。' },
          { role: 'user', content: prompt }
        ]
      },
      parameters: {
        result_format: 'message',
        max_tokens: 1500,
        temperature: 0.7
      }
    };
  }

  parseResponse(response) {
    if (response.output && response.output.choices && response.output.choices[0]) {
      return response.output.choices[0].message.content;
    }
    throw new Error('无法解析通义千问响应');
  }
}

/**
 * 文心一言提供商
 */
class WenxinProvider extends BaseLLMProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.config.apiUrl = config.apiUrl || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
    this.config.model = config.model || 'ernie-bot-turbo';
    this.accessToken = null;
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.config.secretKey}`;
    
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    
    if (data.access_token) {
      this.accessToken = data.access_token;
      return this.accessToken;
    }
    throw new Error('获取文心一言access_token失败');
  }

  async sendRequest(prompt) {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiUrl}?access_token=${accessToken}`;
    
    const body = this.buildRequestBody(prompt);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  buildRequestBody(prompt) {
    return {
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_output_tokens: 1500
    };
  }

  parseResponse(response) {
    if (response.result) {
      return response.result;
    }
    throw new Error('无法解析文心一言响应');
  }
}

/**
 * 智谱GLM提供商
 */
class GLMProvider extends BaseLLMProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.config.apiUrl = config.apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.config.model = config.model || 'glm-4-flash';
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  buildRequestBody(prompt) {
    return {
      model: this.config.model,
      messages: [
        { role: 'system', content: '你是一个专业的内容分析助手，擅长事实核查、文本总结和中性化改写。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    };
  }

  parseResponse(response) {
    if (response.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.content;
    }
    throw new Error('无法解析GLM响应');
  }
}

/**
 * LLM工厂类
 */
class LLMFactory {
  static createProvider(type, apiKey, config = {}) {
    switch (type) {
      case 'qwen':
        return new QwenProvider(apiKey, config);
      case 'wenxin':
        return new WenxinProvider(apiKey, config);
      case 'glm':
        return new GLMProvider(apiKey, config);
      default:
        throw new Error(`不支持的LLM类型: ${type}`);
    }
  }
}

/**
 * Prompt模板
 */
const PromptTemplates = {
  /**
   * 事实核查Prompt
   * @param {string} text - 待核查文本
   * @returns {string} Prompt
   */
  factCheck: (text) => `请对以下文本进行事实核查分析：

"""${text}"""

请从以下几个方面进行分析：
1. **事实准确性**：文本中的关键事实是否准确？
2. **可信度评估**：给出一个可信度百分比（0%-100%）
3. **潜在偏见**：文本是否存在明显的立场偏见？
4. **建议**：如果存在不准确或偏见，请提供改进建议

请以结构化的方式输出结果。`,

  /**
   * 语义总结Prompt
   * @param {string} text - 待总结文本
   * @returns {string} Prompt
   */
  summarize: (text) => `请对以下文本进行语义总结：

"""${text}"""

请提供：
1. **核心观点**：文本的主要论点或核心信息（2-3句话）
2. **关键要点**：列出3-5个关键要点
3. **背景信息**：如有必要，提供相关背景说明

请确保总结简洁明了，保留原文的核心语义。`,

  /**
   * 中性化改写Prompt
   * @param {string} text - 待改写文本
   * @returns {string} Prompt
   */
  neutralize: (text) => `请将以下文本改写成中性、客观的表达方式：

"""${text}"""

改写要求：
1. **去除情绪化词汇**：用客观中性的词汇替代带有强烈感情色彩的词语
2. **平衡观点**：如果文本存在明显偏见，请呈现更平衡的观点
3. **保持原意**：在不改变核心事实的前提下进行改写
4. **专业表达**：使用更加专业、正式的表达方式

请输出改写后的文本，并简要说明主要修改之处。`
};

/**
 * LLM处理器
 */
class LLMProcessor {
  constructor() {
    this.provider = null;
    this.cache = new Map();
    this.maxCacheSize = 50;
  }

  /**
   * 初始化处理器
   * @param {string} type - 提供商类型
   * @param {string} apiKey - API密钥
   * @param {Object} config - 配置
   */
  init(type, apiKey, config = {}) {
    this.provider = LLMFactory.createProvider(type, apiKey, config);
  }

  /**
   * 生成缓存键
   * @param {string} type - 处理类型
   * @param {string} text - 文本
   * @returns {string} 缓存键
   */
  getCacheKey(type, text) {
    return `${type}:${text.substring(0, 100)}`;
  }

  /**
   * 添加到缓存
   * @param {string} key - 缓存键
   * @param {string} value - 缓存值
   */
  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * 处理文本
   * @param {string} type - 处理类型
   * @param {string} text - 待处理文本
   * @returns {Promise<string>} 处理结果
   */
  async process(type, text) {
    if (!this.provider) {
      throw new Error('LLM处理器未初始化，请先调用init方法');
    }

    // 检查缓存
    const cacheKey = this.getCacheKey(type, text);
    if (this.cache.has(cacheKey)) {
      console.log('使用缓存结果');
      return this.cache.get(cacheKey);
    }

    // 获取Prompt模板
    const promptTemplate = PromptTemplates[type];
    if (!promptTemplate) {
      throw new Error(`不支持的处理类型: ${type}`);
    }

    const prompt = promptTemplate(text);
    
    try {
      const result = await this.provider.sendRequest(prompt);
      
      // 存入缓存
      this.addToCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('LLM处理失败:', error);
      throw error;
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    BaseLLMProvider, 
    QwenProvider, 
    WenxinProvider, 
    GLMProvider,
    LLMFactory,
    LLMProcessor,
    PromptTemplates
  };
}
