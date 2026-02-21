// =============================================================================
// Popup弹窗脚本
// =============================================================================

// 当前配置
let currentConfig = null;

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  bindEvents();
  updateUI();
  checkAPIStatus();
});

/**
 * 加载配置
 */
async function loadConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (response.success) {
      currentConfig = response.config;
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 重新扫描按钮
  document.getElementById('rescanBtn').addEventListener('click', rescanPage);
  
  // 设置按钮
  document.getElementById('settingsBtn').addEventListener('click', openSettings);

  // 历史记录按钮
  document.getElementById('historyBtn').addEventListener('click', openHistory);

  // 帮助链接
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/your-repo/yanzhi-youli#使用说明'
    });
  });
  
  // 功能开关
  document.getElementById('toggleHighlight').addEventListener('change', (e) => {
    updateFeatureState('highlight', e.target.checked);
  });
  
  document.getElementById('toggleFactCheck').addEventListener('change', (e) => {
    updateFeatureState('factCheck', e.target.checked);
  });
  
  document.getElementById('toggleSummarize').addEventListener('change', (e) => {
    updateFeatureState('summarize', e.target.checked);
  });
  
  document.getElementById('toggleNeutralize').addEventListener('change', (e) => {
    updateFeatureState('neutralize', e.target.checked);
  });

  document.getElementById('toggleToolbar').addEventListener('change', (e) => {
    updateFeatureState('alwaysShowToolbar', e.target.checked);
  });
}

/**
 * 更新UI
 */
function updateUI() {
  if (!currentConfig) return;
  
  // 更新开关状态
  document.getElementById('toggleHighlight').checked = currentConfig.enabledFeatures.highlight;
  document.getElementById('toggleFactCheck').checked = currentConfig.enabledFeatures.factCheck;
  document.getElementById('toggleSummarize').checked = currentConfig.enabledFeatures.summarize;
  document.getElementById('toggleNeutralize').checked = currentConfig.enabledFeatures.neutralize;
  document.getElementById('toggleToolbar').checked = currentConfig.enabledFeatures.alwaysShowToolbar;

  // 更新统计（从storage读取）
  updateStats();
}

/**
 * 打开历史记录页面
 */
function openHistory() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('history/history.html')
  });
  window.close();
}

/**
 * 更新统计
 */
async function updateStats() {
  try {
    const result = await chrome.storage.local.get(['highlightCount', 'processCount']);
    document.getElementById('highlightCount').textContent = result.highlightCount || 0;
    document.getElementById('processCount').textContent = result.processCount || 0;
  } catch (error) {
    console.error('更新统计失败:', error);
  }
}

/**
 * 检查API状态
 */
async function checkAPIStatus() {
  const indicator = document.getElementById('statusIndicator');
  
  if (!currentConfig || !currentConfig.apiKey) {
    indicator.classList.add('disconnected');
    indicator.title = 'API未配置';
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      provider: currentConfig.provider,
      apiKey: currentConfig.apiKey,
      model: currentConfig.model
    });
    
    if (response.success) {
      indicator.classList.remove('disconnected');
      indicator.title = 'API连接正常';
    } else {
      indicator.classList.add('disconnected');
      indicator.title = 'API连接失败: ' + response.error;
    }
  } catch (error) {
    indicator.classList.add('disconnected');
    indicator.title = 'API连接失败';
  }
}

/**
 * 更新功能状态
 * @param {string} feature - 功能名称
 * @param {boolean} enabled - 是否启用
 */
async function updateFeatureState(feature, enabled) {
  if (!currentConfig) return;
  
  currentConfig.enabledFeatures[feature] = enabled;
  
  try {
    await chrome.runtime.sendMessage({
      action: 'saveConfig',
      config: currentConfig
    });
  } catch (error) {
    console.error('保存配置失败:', error);
    showStatus('保存失败', 'error');
  }
}

/**
 * 重新扫描页面
 */
async function rescanPage() {
  const btn = document.getElementById('rescanBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span>扫描中...';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'rescan' });
    
    if (response.success) {
      showStatus('✓ 扫描完成', 'success');
      // 更新统计
      setTimeout(updateStats, 500);
    } else {
      showStatus('✗ ' + (response.error || '扫描失败'), 'error');
    }
  } catch (error) {
    showStatus('✗ 扫描失败', 'error');
  }
  
  btn.disabled = false;
  btn.innerHTML = '<span class="btn-icon">🔄</span>重新扫描页面';
}

/**
 * 打开设置页面
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

/**
 * 显示状态消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 */
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type} show`;
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 2000);
}
