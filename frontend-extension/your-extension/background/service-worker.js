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
  },
  theme: {
    mode: 'auto', // auto, light, dark
    followSystem: true
  }
};

// 默认统计数据
const DEFAULT_STATS = {
  factCheckCount: 0,
  summarizeCount: 0,
  neutralizeCount: 0,
  apiCallCount: 0,
  totalTokens: 0,
  today: new Date().toISOString().split('T')[0]
};

/**
 * 获取当前主题模式
 * @returns {Promise<string>} 主题模式 (light/dark)
 */
async function getCurrentTheme() {
  try {
    const config = await getConfig();
    
    // 防御：确保 theme 对象存在
    const themeConfig = config.theme || {};
    
    // 如果设置为手动模式
    if (themeConfig.mode === 'light' || themeConfig.mode === 'dark') {
      return themeConfig.mode;
    }
    
    // 兼容旧数据：theme 直接存字符串 'dark' 或 'light'
    if (typeof themeConfig === 'string' && (themeConfig === 'light' || themeConfig === 'dark')) {
      return themeConfig;
    }
    
    // 自动模式或跟随系统
    if (themeConfig.followSystem) {
      // 向所有popup发送查询系统主题的请求
      const response = await chrome.runtime.sendMessage({ action: 'getCurrentSystemTheme' });
      return response.theme || 'light';
    }
    
    return 'light';
  } catch (error) {
    console.error('获取主题失败:', error);
    return 'light';
  }
}


/**
 * 更新主题配置
 * @param {Object} themeConfig - 主题配置
 */
async function updateThemeConfig(themeConfig) {
  try {
    console.log('[Background] 开始更新主题配置:', themeConfig);
    const config = await getConfig();
    console.log('[Background] 更新前的配置:', JSON.stringify(config.theme));
    
    // 确保theme对象存在
    if (!config.theme) {
      config.theme = {};
    }
    
    // 合并主题配置
    config.theme = { ...config.theme, ...themeConfig };
    console.log('[Background] 合并后的主题配置:', JSON.stringify(config.theme));
    
    // 保存配置
    await saveConfig(config);
    console.log('[Background] 配置已保存');
    
    // 验证保存结果
    const savedConfig = await getConfig();
    console.log('[Background] 保存后验证:', JSON.stringify(savedConfig.theme));
    
    // 广播主题变更
    broadcastThemeChange();
    
    return { success: true };
  } catch (error) {
    console.error('更新主题配置失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 广播主题变更（增强版）
 */
async function broadcastThemeChange() {
  try {
    const theme = await getCurrentTheme();
    console.log('[Background] 开始广播主题变更:', theme);
    
    // 首先通知Popup更新显示
    chrome.runtime.sendMessage({
      action: 'themeChanged',
      theme: theme
    }).catch(() => {});
    
    // 通知所有标签页
    const tabs = await chrome.tabs.query({});
    console.log('[Background] 发现标签页数量:', tabs.length);
    
    let successCount = 0;
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'themeChanged',
          theme: theme
        });
        successCount++;
        console.log(`[Background] 通知标签页 ${tab.id} 成功`);
      } catch (error) {
        console.log(`[Background] 通知标签页 ${tab.id} 失败:`, error.message);
        
        // 兜底方案：直接执行脚本
        if (tab.url?.startsWith('http')) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (targetTheme) => {
                console.log('[Injected] 执行注入脚本，主题:', targetTheme);
                
                // 应用主题
                if (targetTheme === 'dark') {
                  document.documentElement.classList.add('yz-dark-theme');
                  document.body.style.backgroundColor = '#1e1e1e';
                  document.body.style.color = '#e0e0e0';
                } else {
                  document.documentElement.classList.remove('yz-dark-theme');
                  document.body.style.backgroundColor = '#ffffff';
                  document.body.style.color = '#000000';
                }
                
                document.body.style.transition = 'all 0.3s ease';
                
                // 通知组件
                if (window.floatingToolbar) {
                  window.floatingToolbar.setTheme(targetTheme);
                }
                if (window.resultCard) {
                  window.resultCard.setTheme(targetTheme);
                }
              },
              args: [theme]
            });
            console.log(`[Background] 注入脚本成功: ${tab.id}`);
          } catch (injectError) {
            console.error(`[Background] 注入脚本失败 ${tab.id}:`, injectError.message);
          }
        }
      }
    }
    
    console.log(`[Background] 广播完成: ${successCount}/${tabs.length} 成功`);
  } catch (error) {
    console.error('[Background] 广播主题变更失败:', error);
  }
}

/**
 * 获取统计数据
 * @returns {Promise<Object>} 统计对象
 */
async function handleGetStats() {
  try {
    const result = await chrome.storage.local.get('stats');
    let stats = result.stats || DEFAULT_STATS;
    
    // 检查是否是新的一天，如果是则重置
    const today = new Date().toISOString().split('T')[0];
    if (stats.today !== today) {
      stats = { ...DEFAULT_STATS, today };
      await chrome.storage.local.set({ stats });
    }
    
    return { success: true, stats };
  } catch (error) {
    console.error('获取统计失败:', error);
    return { success: false, error: error.message };
  }
}

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
  console.log('[Background] 开始获取配置');
  const result = await chrome.storage.local.get('config');
  console.log('[Background] 从storage读取到的配置:', JSON.stringify(result.config));
  
  if (!result.config) {
    console.log('[Background] 配置不存在，返回默认配置');
    return DEFAULT_CONFIG;
  }
  
  // 确保配置结构完整
  const mergedConfig = { ...DEFAULT_CONFIG, ...result.config };
  console.log('[Background] 合并后的完整配置:', JSON.stringify(mergedConfig, null, 2));
  
  return mergedConfig;
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

    // 更新统计
    await updateStats(request.type, request.text, result || '');

    // 自动保存到历史记录
    await handleHistoryAdd({
      type: request.type,
      originalText: request.text,
      result: result
    });

    return { success: true, result };
  } catch (error) {
    console.error('LLM处理失败:', error);
    return { 
      success: false, 
      error: error.message || '处理失败，请检查网络连接和API配置' 
    };
  }
}

/**
 * 更新统计数据
 * @param {string} type - 功能类型
 * @param {string} text - 输入文本
 * @param {string} output - 输出结果（可选）
 */
async function updateStats(type, text, output = '') {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取现有统计
    const storageResult = await chrome.storage.local.get('stats');
    let stats = storageResult.stats || DEFAULT_STATS;
    
    // 如果是新的一天，重置每日统计
    if (stats.today !== today) {
      stats = { ...DEFAULT_STATS, today };
    }
    
    // 更新对应功能的计数
    switch (type) {
      case 'factCheck':
        stats.factCheckCount++;
        break;
      case 'summarize':
        stats.summarizeCount++;
        break;
      case 'neutralize':
        stats.neutralizeCount++;
        break;
    }
    
    // API调用次数+1（每次LLM请求都算一次API调用）
    stats.apiCallCount++;
    
    // 估算tokens使用量（粗略估算：输入+输出各约按字符数/2估算）
    const estimatedInputTokens = Math.ceil(text.length / 2);
    const estimatedOutputTokens = Math.ceil(output.length / 2);
    stats.totalTokens += (estimatedInputTokens + estimatedOutputTokens);
    
    // 保存统计
    await chrome.storage.local.set({ stats });
    
    console.log('📊 统计已更新:', stats);
  } catch (error) {
    console.error('更新统计失败:', error);
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

  // 获取历史记录
  if (request.action === 'historyGetAll') {
    handleHistoryGetAll().then(sendResponse);
    return true;
  }

  // 添加历史记录
  if (request.action === 'historyAdd') {
    handleHistoryAdd(request).then(sendResponse);
    return true;
  }

  // 删除历史记录
  if (request.action === 'historyDelete') {
    handleHistoryDelete(request).then(sendResponse);
    return true;
  }

  // 清空历史记录
  if (request.action === 'historyClear') {
    handleHistoryClear().then(sendResponse);
    return true;
  }

  // 切换收藏
  if (request.action === 'historyToggleFavorite') {
    handleHistoryToggleFavorite(request).then(sendResponse);
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

  // 获取统计数据
  if (request.action === 'getStats') {
    handleGetStats().then(sendResponse);
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

  // 获取当前系统主题
  if (request.action === 'getCurrentSystemTheme') {
    // 由于service worker无法直接检测系统主题，返回默认值
    // 实际检测在content script中进行
    sendResponse({ theme: 'light' });
    return true;
  }

  // 获取当前主题
  if (request.action === 'getCurrentTheme') {
    getCurrentTheme().then(theme => {
      sendResponse({ theme: theme });
    });
    return true;
  }

  // 更新主题配置
  if (request.action === 'updateThemeConfig') {
    updateThemeConfig(request.config).then(result => {
      sendResponse(result);
    });
    return true;
  }

  // 主题变更广播
  if (request.action === 'themeChanged') {
    // 仅用于内部广播，不需要响应
    return false;
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

/**
 * 处理获取历史记录
 */
async function handleHistoryGetAll() {
  try {
    const result = await chrome.storage.local.get('yz_history');
    return { success: true, records: result.yz_history || [] };
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 处理添加历史记录
 * @param {Object} request - 请求对象
 */
async function handleHistoryAdd(request) {
  try {
    const result = await chrome.storage.local.get('yz_history');
    const records = result.yz_history || [];
    
    const newRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: request.type,
      typeName: getTypeName(request.type),
      originalText: request.originalText.substring(0, 200),
      originalTextFull: request.originalText,
      result: request.result,
      length: request.originalText.length,
      isFavorite: false
    };

    records.unshift(newRecord);
    
    // 限制500条
    if (records.length > 500) {
      records.pop();
    }

    await chrome.storage.local.set({ yz_history: records });
    return { success: true, record: newRecord };
  } catch (error) {
    console.error('添加历史记录失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 处理删除历史记录
 * @param {Object} request - 请求对象
 */
async function handleHistoryDelete(request) {
  try {
    const result = await chrome.storage.local.get('yz_history');
    const records = result.yz_history || [];
    const newRecords = records.filter(r => r.id !== request.id);
    await chrome.storage.local.set({ yz_history: newRecords });
    return { success: true };
  } catch (error) {
    console.error('删除历史记录失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 处理清空历史记录
 */
async function handleHistoryClear() {
  try {
    await chrome.storage.local.remove('yz_history');
    return { success: true };
  } catch (error) {
    console.error('清空历史记录失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 处理切换收藏
 * @param {Object} request - 请求对象
 */
async function handleHistoryToggleFavorite(request) {
  try {
    const result = await chrome.storage.local.get('yz_history');
    const records = result.yz_history || [];
    const record = records.find(r => r.id === request.id);
    if (record) {
      record.isFavorite = !record.isFavorite;
      await chrome.storage.local.set({ yz_history: records });
      return { success: true };
    }
    return { success: false, error: '记录不存在' };
  } catch (error) {
    console.error('切换收藏失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取类型中文名
 */
function getTypeName(type) {
  const map = {
    factCheck: '事实核查',
    summarize: '语义总结',
    neutralize: '中性化改写'
  };
  return map[type] || type;
}

// 启动初始化
initialize();
