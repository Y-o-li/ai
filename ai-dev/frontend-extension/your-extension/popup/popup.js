// =============================================================================
// Popup弹窗脚本
// =============================================================================

// 当前配置
let currentConfig = null;

// 统计数据
let statsData = null;

// 主题相关
let themeSelector = null;

// 用户最近选择的主题（用于保持状态）
let userSelectedTheme = null;

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] DOM加载完成，开始初始化');
  await loadConfig();
  console.log('[Popup] 配置加载完成');
  bindEvents();
  console.log('[Popup] 事件绑定完成');
  updateUI();
  console.log('[Popup] UI更新完成');
  checkAPIStatus();
  
  // 多次延时确保主题设置正确
  const ensureThemeSet = () => {
    if (currentConfig && themeSelector) {
      const expectedTheme = currentConfig.theme?.mode || 'auto';
      console.log('[Popup] 检查主题设置 - 期望:', expectedTheme, '当前:', themeSelector.value);
      
      if (themeSelector.value !== expectedTheme) {
        themeSelector.value = expectedTheme;
        console.log('[Popup] 修正主题选择器值为:', expectedTheme);
        
        // 验证设置是否生效
        setTimeout(() => {
          console.log('[Popup] 验证设置结果:', themeSelector.value);
          if (themeSelector.value !== expectedTheme) {
            console.warn('[Popup] 主题设置仍未生效，可能需要进一步处理');
          }
        }, 50);
      }
    }
  };
  
  // 多个时间点检查
  setTimeout(ensureThemeSet, 100);
  setTimeout(ensureThemeSet, 300);
  setTimeout(ensureThemeSet, 500);
  
  console.log('[Popup] 初始化完成');
});

/**
 * 加载配置
 */
async function loadConfig() {
  try {
    console.log('[Popup] 开始加载配置');
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (response.success) {
      currentConfig = response.config;
      console.log('[Popup] 加载到的完整配置:', JSON.stringify(currentConfig, null, 2));
      console.log('[Popup] 主题配置详情:', JSON.stringify(currentConfig.theme));
      
      // 应用主题配置到UI
      applyThemeToUI();
    } else {
      console.error('[Popup] 获取配置失败:', response.error);
    }
  } catch (error) {
    console.error('[Popup] 加载配置异常:', error);
  }
}

/**
 * 应用主题配置到UI
 */
function applyThemeToUI() {
  if (!currentConfig || !themeSelector) return;
  
  const themeMode = currentConfig.theme.mode || 'auto';
  console.log('[Popup] 准备应用主题模式:', themeMode);
  console.log('[Popup] 主题选择器当前值:', themeSelector.value);
  console.log('[Popup] 主题选择器选项:', Array.from(themeSelector.options).map(opt => ({
    value: opt.value,
    text: opt.text,
    selected: opt.selected
  })));
  
  // 设置主题值
  themeSelector.value = themeMode;
  userSelectedTheme = themeMode; // 初始化时记录当前选择
  
  // 立即验证设置是否生效
  console.log('[Popup] 设置后主题选择器值:', themeSelector.value);
  if (themeSelector.value !== themeMode) {
    console.warn('[Popup] 主题设置未生效，当前值:', themeSelector.value, '期望值:', themeMode);
    // 强制重新设置
    themeSelector.value = themeMode;
    console.log('[Popup] 强制重新设置后:', themeSelector.value);
  }
  
  console.log('[Popup] 应用主题到UI完成:', themeMode);
  console.log('[Popup] 当前用户选择记录:', userSelectedTheme);
}

/**
 * 同步主题显示到UI
 */
async function syncThemeDisplay() {
  if (!currentConfig || !themeSelector) return;
  
  try {
    console.log('[Popup] 开始同步主题显示');
    console.log('[Popup] 当前用户选择:', userSelectedTheme);
    console.log('[Popup] 当前配置:', JSON.stringify(currentConfig.theme));
    console.log('[Popup] 主题选择器当前值:', themeSelector.value);
    
    // 优先使用用户最近的选择
    if (userSelectedTheme) {
      console.log('[Popup] 主题选择器选项(同步前):', Array.from(themeSelector.options).map(opt => ({
        value: opt.value,
        text: opt.text,
        selected: opt.selected
      })));
      
      themeSelector.value = userSelectedTheme;
      console.log('[Popup] 设置后主题选择器值:', themeSelector.value);
      console.log('[Popup] 使用用户最近选择:', userSelectedTheme);
      return;
    }
    
    // 获取当前实际应用的主题
    const themeResponse = await chrome.runtime.sendMessage({ action: 'getCurrentTheme' });
    const actualTheme = themeResponse.theme;
    
    console.log('[Popup] 实际主题:', actualTheme);
    console.log('[Popup] 配置中的主题模式:', currentConfig.theme?.mode);
    
    // 直接使用配置中的主题模式
    // 如果配置中没有设置，则根据实际主题推断
    let displayTheme = currentConfig.theme?.mode || 'auto';
    
    // 如果配置是自动模式，但实际主题是深色/浅色
    // 说明用户刚刚手动切换了主题，应该保持显示用户的选择
    if (displayTheme === 'auto') {
      // 保持当前显示不变
      console.log('[Popup] 当前为自动模式，保持UI显示不变');
    } else {
      // 如果配置指定了具体模式，直接使用
      themeSelector.value = displayTheme;
      console.log('[Popup] UI同步完成，显示主题:', displayTheme);
    }
    
  } catch (error) {
    console.error('[Popup] 同步主题显示失败:', error);
    // 出错时使用配置中的值
    const themeMode = currentConfig.theme?.mode || 'auto';
    themeSelector.value = themeMode;
  }
}

/**
 * 更新主题配置并立即生效
 */
async function updateThemeConfig(themeConfig) {
    try {
        console.log('[Popup] 更新主题配置:', themeConfig);
        
        // 1. 更新配置到Background
        const response = await chrome.runtime.sendMessage({
            action: 'updateThemeConfig',
            config: themeConfig
        });
        
        if (!response.success) {
            showStatus('✗ 主题更新失败', 'error');
            return false;
        }
        
        // 2. 更新本地配置
        if (currentConfig) {
            currentConfig.theme = { ...currentConfig.theme, ...themeConfig };
        }
        
        // 3. 立即更新UI显示（使用用户刚选择的值）
        if (themeSelector) {
            const displayValue = themeConfig.mode || 'auto';
            themeSelector.value = displayValue;
            userSelectedTheme = displayValue; // 同步记录用户选择
            console.log('[Popup] 立即更新UI显示为:', displayValue);
        }
        
        // 4. 立即通知当前标签页（仅影响插件 UI 组件）
        await notifyCurrentTabImmediate(themeConfig.mode || 'light');
        
        // 5. 后台同步UI显示（作为保险）
        setTimeout(async () => {
            await syncThemeDisplay();
        }, 100);
        
        showStatus('✓ 主题已更新', 'success');
        return true;
        
    } catch (error) {
        console.error('[Popup] 更新主题配置失败:', error);
        showStatus('✗ 更新失败: ' + error.message, 'error');
        return false;
    }
}

/**
 * 立即通知当前标签页主题变更（仅影响插件 UI 组件）
 */
async function notifyCurrentTabImmediate(theme) {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url.startsWith('http')) {
            console.log('[Popup] 当前页面不是普通网页，跳过通知');
            return;
        }
        
        console.log('[Popup] 立即通知标签页:', tab.id, theme);
        
        // 向 Content Script 发送消息，由它来通知插件 UI 组件
        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'themeChanged',
                theme: theme
            });
            console.log('[Popup] ✅ 已通知 Content Script');
        } catch (error) {
            console.error('[Popup] Content Script 通信失败:', error.message);
            // 如果 Content Script 不存在，直接注入脚本到插件 UI 组件
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (targetTheme) => {
                    // 仅通知工具栏和结果卡片
                    if (window.floatingToolbar) {
                        window.floatingToolbar.setTheme(targetTheme);
                    }
                    if (window.resultCard) {
                        window.resultCard.setTheme(targetTheme);
                    }
                    console.log('🎨 插件 UI 主题已切换:', targetTheme);
                },
                args: [theme]
            });
            console.log('[Popup] ✅ 已直接注入脚本到插件 UI');
        }
        
    } catch (error) {
        console.error('[Popup] 立即通知失败:', error);
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
  
  // 主题选择器
  themeSelector = document.getElementById('themeSelector');
  if (themeSelector) {
    themeSelector.addEventListener('change', async (e) => {
      console.log('[Popup] 🎨 主题选择器触发change事件');
      console.log('[Popup] 选择的值:', e.target.value);
      
      const themeMode = e.target.value;
      // 记录用户的选择
      userSelectedTheme = themeMode;
      
      const success = await updateThemeConfig({
        mode: themeMode,
        followSystem: themeMode === 'auto'
      });
      
      console.log('[Popup] 主题更新结果:', success);
      showStatus(success ? '✓ 主题已更新' : '✗ 主题更新失败', 
               success ? 'success' : 'error');
    });
  }
  
  // 刷新统计按钮
  document.getElementById('refreshStatsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshStatsBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span>刷新中...';
    
    await loadDetailedStats();
    
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    showStatus('✓ 统计已刷新', 'success');
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
    // 获取基础统计
    const basicResult = await chrome.storage.local.get(['highlightCount', 'processCount']);
    console.log('[Popup] 从 storage 读取的统计:', basicResult);
    document.getElementById('highlightCount').textContent = basicResult.highlightCount || 0;
    document.getElementById('processCount').textContent = basicResult.processCount || 0;
    
    // 获取详细统计
    await loadDetailedStats();
  } catch (error) {
    console.error('更新统计失败:', error);
  }
}

/**
 * 加载详细统计
 */
async function loadDetailedStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    
    if (response.success && response.stats) {
      statsData = response.stats;
      
      // 更新详细统计显示
      document.getElementById('factCheckCount').textContent = statsData.factCheckCount || 0;
      document.getElementById('summarizeCount').textContent = statsData.summarizeCount || 0;
      document.getElementById('neutralizeCount').textContent = statsData.neutralizeCount || 0;
      document.getElementById('apiCallCount').textContent = statsData.apiCallCount || 0;
      document.getElementById('totalTokens').textContent = statsData.totalTokens || 0;
      
      // 显示详细统计区域
      document.getElementById('detailedStats').style.display = 'block';
    }
  } catch (error) {
    console.error('加载详细统计失败:', error);
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
