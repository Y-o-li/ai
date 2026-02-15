// =============================================================================
// Background Service Worker
// =============================================================================
// 描述: 处理LLM API调用、配置管理和消息路由
// =============================================================================

// 导入LLM适配器（在Service Worker中通过importScripts导入）
// 注意：实际使用时需要将llm-adapter.js的内容内联或合并

// 全局处理器实例
let llmProcessor = null;

// 默认配置
const DEFAULT_CONFIG = {
  provider: 'qwen',
  model: 'qwen-turbo',
  apiKey: '',
  enabledFeatures: {
    highlight: true,
    factCheck: true,
    summarize: true,
    neutralize: true
  }
};

/**
 * 初始化Service Worker
 */
async function initialize() {
  console.log('🎯 言之有理插件 Service Worker 已启动');
  
  // 检查并设置默认配置
  const config = await getConfig();
  if (!config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
  }
}

/**
 * 获取配置
 * @returns {Promise<Object>} 配置对象
 */
async function getConfig() {
  const result = await chrome.storage.local.get('config');
  return result.config || DEFAULT_CONFIG;
}

/**
 * 保存配置
 * @param {Object} config - 配置对象
 */
async function saveConfig(config) {
  await chrome.storage.local.set({ config });
}

/**
 * 初始化LLM处理器
 * @returns {Promise<boolean>} 是否成功
 */
async function initLLMProcessor() {
  try {
    const config = await getConfig();
    
    if (!config.apiKey) {
      console.warn('⚠️ API Key未配置');
      return false;
    }

    // 动态导入LLM适配器
    if (typeof LLMProcessor === 'undefined') {
      // 如果在Service Worker中，需要内联实现
      llmProcessor = createLLMProcessor();
    }

    llmProcessor.init(config.provider, config.apiKey, {
      model: config.model
    });
    
    console.log('✅ LLM处理器初始化成功');
    return true;
  } catch (error) {
    console.error('❌ LLM处理器初始化失败:', error);
    return false;
  }
}

/**
 * 创建LLM处理器（内联实现，用于Service Worker）
 * @returns {Object} LLM处理器
 */
function createLLMProcessor() {
  // Prompt模板
  const PromptTemplates = {
    factCheck: (text) => `请对以下文本进行事实核查分析：

"""${text}"""

请从以下几个方面进行分析：
1. **事实准确性**：文本中的关键事实是否准确？
2. **可信度评估**：给出一个可信度百分比（0%-100%）
3. **潜在偏见**：文本是否存在明显的立场偏见？
4. **建议**：如果存在不准确或偏见，请提供改进建议

请以结构化的方式输出结果。`,

    summarize: (text) => `请对以下文本进行语义总结：

"""${text}"""

请提供：
1. **核心观点**：文本的主要论点或核心信息（2-3句话）
2. **关键要点**：列出3-5个关键要点
3. **背景信息**：如有必要，提供相关背景说明

请确保总结简洁明了，保留原文的核心语义。`,

    neutralize: (text) => `请将以下文本改写成中性、客观的表达方式：

"""${text}"""

改写要求：
1. **去除情绪化词汇**：用客观中性的词汇替代带有强烈感情色彩的词语
2. **平衡观点**：如果文本存在明显偏见，请呈现更平衡的观点
3. **保持原意**：在不改变核心事实的前提下进行改写
4. **专业表达**：使用更加专业、正式的表达方式

请输出改写后的文本，并简要说明主要修改之处。`
  };

  // 提供商实现
  const providers = {
    qwen: {
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      buildRequest: (apiKey, model, prompt) => ({
        url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: {
          model: model || 'qwen-turbo',
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
        },
        parseResponse: (data) => {
          if (data.output?.choices?.[0]?.message?.content) {
            return data.output.choices[0].message.content;
          }
          throw new Error('无法解析响应');
        }
      })
    },
    
    glm: {
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      buildRequest: (apiKey, model, prompt) => ({
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: {
          model: model || 'glm-4-flash',
          messages: [
            { role: 'system', content: '你是一个专业的内容分析助手，擅长事实核查、文本总结和中性化改写。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        },
        parseResponse: (data) => {
          if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
          }
          throw new Error('无法解析响应');
        }
      })
    }
  };

  return {
    config: null,
    cache: new Map(),
    maxCacheSize: 50,

    init(provider, apiKey, options = {}) {
      this.config = { provider, apiKey, ...options };
    },

    getCacheKey(type, text) {
      return `${type}:${text.substring(0, 100)}`;
    },

    addToCache(key, value) {
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    },

    async process(type, text) {
      if (!this.config) {
        throw new Error('处理器未初始化');
      }

      // 检查缓存
      const cacheKey = this.getCacheKey(type, text);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const provider = providers[this.config.provider];
      if (!provider) {
        throw new Error(`不支持的提供商: ${this.config.provider}`);
      }

      const prompt = PromptTemplates[type](text);
      const requestConfig = provider.buildRequest(
        this.config.apiKey,
        this.config.model,
        prompt
      );

      const response = await fetch(requestConfig.url, {
        method: 'POST',
        headers: requestConfig.headers,
        body: JSON.stringify(requestConfig.body)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const result = requestConfig.parseResponse(data);

      // 存入缓存
      this.addToCache(cacheKey, result);

      return result;
    }
  };
}

/**
 * 处理LLM请求
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
async function handleLLMRequest(request) {
  try {
    const config = await getConfig();
    
    // 检查功能是否启用
    if (!config.enabledFeatures[request.type]) {
      return { 
        success: false, 
        error: '该功能已被禁用，请在设置中开启' 
      };
    }

    // 检查API Key
    if (!config.apiKey) {
      return { 
        success: false, 
        error: 'API Key未配置，请先进入插件设置页面配置' 
      };
    }

    // 初始化处理器
    if (!llmProcessor) {
      llmProcessor = createLLMProcessor();
      llmProcessor.init(config.provider, config.apiKey, {
        model: config.model
      });
    }

    // 处理请求
    const result = await llmProcessor.process(request.type, request.text);
    
    return { success: true, result };
  } catch (error) {
    console.error('LLM处理失败:', error);
    return { 
      success: false, 
      error: error.message || '处理失败，请检查网络连接和API配置' 
    };
  }
}

// =============================================================================
// 消息监听器
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📥 Background收到消息:', request.action);

  // 处理LLM请求
  if (request.action === 'llmProcess') {
    handleLLMRequest(request).then(sendResponse);
    return true; // 异步响应
  }

  // 获取配置
  if (request.action === 'getConfig') {
    getConfig().then(config => {
      sendResponse({ success: true, config });
    });
    return true;
  }

  // 保存配置
  if (request.action === 'saveConfig') {
    saveConfig(request.config).then(() => {
      // 重新初始化LLM处理器
      llmProcessor = null;
      sendResponse({ success: true });
    });
    return true;
  }

  // 测试API连接
  if (request.action === 'testConnection') {
    const testProcessor = createLLMProcessor();
    testProcessor.init(request.provider, request.apiKey, {
      model: request.model
    });
    
    testProcessor.process('summarize', '这是一个测试文本。')
      .then(() => {
        sendResponse({ success: true, message: '连接成功' });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // 重新扫描页面（来自popup）
  if (request.action === 'rescan') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'rescan' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              success: false, 
              error: '内容脚本未加载，请刷新页面后重试' 
            });
          } else {
            sendResponse({ success: true });
          }
        });
      } else {
        sendResponse({ success: false, error: '未找到活动标签页' });
      }
    });
    return true;
  }

  sendResponse({ success: false, error: '未知操作' });
  return false;
});

// =============================================================================
// 安装和更新处理
// =============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 插件已安装/更新:', details.reason);
  
  if (details.reason === 'install') {
    // 首次安装，打开设置页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('options/options.html')
    });
  }
  
  initialize();
});

// 启动初始化
initialize();
