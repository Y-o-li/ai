// =============================================================================
// 设置页面脚本
// =============================================================================

// 默认配置
const DEFAULT_CONFIG = {
  provider: 'qwen',
  model: 'qwen-turbo',
  apiKey: '',
  secretKey: '',
  enabledFeatures: {
    highlight: true,
    factCheck: true,
    summarize: true,
    neutralize: true,
    alwaysShowToolbar: true
  }
};

// 模型选项
const MODEL_OPTIONS = {
  qwen: [
    { value: 'qwen-turbo', label: 'qwen-turbo (推荐，速度快)' },
    { value: 'qwen-plus', label: 'qwen-plus (平衡)' },
    { value: 'qwen-max', label: 'qwen-max (能力强)' }
  ],
  glm: [
    { value: 'glm-4-flash', label: 'glm-4-flash (免费，速度快)' },
    { value: 'glm-4', label: 'glm-4 (能力强)' },
    { value: 'glm-4-plus', label: 'glm-4-plus (最强)' }
  ],
  wenxin: [
    { value: 'ernie-bot-turbo', label: 'ernie-bot-turbo (推荐)' },
    { value: 'ernie-bot', label: 'ernie-bot' },
    { value: 'ernie-bot-4', label: 'ernie-bot-4 (能力强)' }
  ]
};

// 当前配置
let currentConfig = { ...DEFAULT_CONFIG };

/**
 * 初始化页面
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  bindEvents();
  updateUI();
});

/**
 * 加载配置
 */
async function loadConfig() {
  try {
    const result = await chrome.storage.local.get('config');
    if (result.config) {
      currentConfig = { ...DEFAULT_CONFIG, ...result.config };
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    showToast('加载配置失败', 'error');
  }
}

/**
 * 保存配置
 */
async function saveConfig() {
  try {
    await chrome.storage.local.set({ config: currentConfig });
    
    // 通知background更新配置
    await chrome.runtime.sendMessage({
      action: 'saveConfig',
      config: currentConfig
    });
    
    showToast('设置已保存', 'success');
  } catch (error) {
    console.error('保存配置失败:', error);
    showToast('保存失败: ' + error.message, 'error');
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  // API提供商选择
  document.getElementById('provider').addEventListener('change', (e) => {
    currentConfig.provider = e.target.value;
    updateModelOptions();
    toggleSecretKeyField();
  });

  // 模型选择
  document.getElementById('model').addEventListener('change', (e) => {
    currentConfig.model = e.target.value;
  });

  // API Key输入
  document.getElementById('apiKey').addEventListener('input', (e) => {
    currentConfig.apiKey = e.target.value;
  });

  // Secret Key输入（文心一言）
  document.getElementById('secretKey').addEventListener('input', (e) => {
    currentConfig.secretKey = e.target.value;
  });

  // 显示/隐藏API Key
  document.getElementById('toggleKey').addEventListener('click', toggleKeyVisibility);

  // 功能开关
  document.getElementById('enableHighlight').addEventListener('change', (e) => {
    currentConfig.enabledFeatures.highlight = e.target.checked;
  });
  document.getElementById('enableFactCheck').addEventListener('change', (e) => {
    currentConfig.enabledFeatures.factCheck = e.target.checked;
  });
  document.getElementById('enableSummarize').addEventListener('change', (e) => {
    currentConfig.enabledFeatures.summarize = e.target.checked;
  });
  document.getElementById('enableNeutralize').addEventListener('change', (e) => {
    currentConfig.enabledFeatures.neutralize = e.target.checked;
  });
  document.getElementById('alwaysShowToolbar').addEventListener('change', (e) => {
    currentConfig.enabledFeatures.alwaysShowToolbar = e.target.checked;
  });

  // 测试连接
  document.getElementById('testBtn').addEventListener('click', testConnection);

  // 保存设置
  document.getElementById('saveBtn').addEventListener('click', saveConfig);

  // 恢复默认
  document.getElementById('resetBtn').addEventListener('click', resetConfig);
}

/**
 * 更新UI
 */
function updateUI() {
  // 设置提供商
  document.getElementById('provider').value = currentConfig.provider;
  
  // 更新模型选项
  updateModelOptions();
  document.getElementById('model').value = currentConfig.model;
  
  // 设置API Key
  document.getElementById('apiKey').value = currentConfig.apiKey;
  document.getElementById('secretKey').value = currentConfig.secretKey || '';
  
  // 设置功能开关
  document.getElementById('enableHighlight').checked = currentConfig.enabledFeatures.highlight;
  document.getElementById('enableFactCheck').checked = currentConfig.enabledFeatures.factCheck;
  document.getElementById('enableSummarize').checked = currentConfig.enabledFeatures.summarize;
  document.getElementById('enableNeutralize').checked = currentConfig.enabledFeatures.neutralize;
  document.getElementById('alwaysShowToolbar').checked = currentConfig.enabledFeatures.alwaysShowToolbar || false;

  // 切换Secret Key字段显示
  toggleSecretKeyField();
}

/**
 * 更新模型选项
 */
function updateModelOptions() {
  const modelSelect = document.getElementById('model');
  const options = MODEL_OPTIONS[currentConfig.provider] || MODEL_OPTIONS.qwen;
  
  modelSelect.innerHTML = options.map(opt => 
    `<option value="${opt.value}">${opt.label}</option>`
  ).join('');
  
  // 选择第一个作为默认
  currentConfig.model = options[0].value;
  modelSelect.value = currentConfig.model;
}

/**
 * 切换Secret Key字段显示
 */
function toggleSecretKeyField() {
  const secretKeyGroup = document.getElementById('secretKeyGroup');
  if (currentConfig.provider === 'wenxin') {
    secretKeyGroup.style.display = 'block';
  } else {
    secretKeyGroup.style.display = 'none';
  }
}

/**
 * 切换API Key显示/隐藏
 */
function toggleKeyVisibility() {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleBtn = document.getElementById('toggleKey');
  
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleBtn.textContent = '🙈';
  } else {
    apiKeyInput.type = 'password';
    toggleBtn.textContent = '👁';
  }
}

/**
 * 测试API连接
 */
async function testConnection() {
  const testBtn = document.getElementById('testBtn');
  const testResult = document.getElementById('testResult');
  
  if (!currentConfig.apiKey) {
    testResult.textContent = '请先输入API Key';
    testResult.className = 'test-result error';
    return;
  }
  
  testBtn.disabled = true;
  testBtn.innerHTML = '<span class="btn-icon">⏳</span>测试中...';
  testResult.textContent = '';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      provider: currentConfig.provider,
      apiKey: currentConfig.apiKey,
      model: currentConfig.model,
      secretKey: currentConfig.secretKey
    });
    
    if (response.success) {
      testResult.textContent = '✓ ' + response.message;
      testResult.className = 'test-result success';
    } else {
      testResult.textContent = '✗ ' + response.error;
      testResult.className = 'test-result error';
    }
  } catch (error) {
    testResult.textContent = '✗ 测试失败: ' + error.message;
    testResult.className = 'test-result error';
  }
  
  testBtn.disabled = false;
  testBtn.innerHTML = '<span class="btn-icon">🧪</span>测试连接';
}

/**
 * 恢复默认配置
 */
async function resetConfig() {
  if (!confirm('确定要恢复默认设置吗？这将清除您的API Key。')) {
    return;
  }
  
  currentConfig = { ...DEFAULT_CONFIG };
  updateUI();
  await saveConfig();
  showToast('已恢复默认设置', 'success');
}

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success/error)
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
