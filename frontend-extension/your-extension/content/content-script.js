// =============================================================================
// 主内容脚本 - 整合入口
// =============================================================================
// 描述: 加载highlight.js和selection-handler.js，初始化所有功能
// =============================================================================

(function() {
    'use strict';

    // 防止重复加载
    if (window.yanzhiYouliLoaded) {
        console.log('⚠️ 言之有理插件已加载，跳过重复初始化');
        return;
    }
    window.yanzhiYouliLoaded = true;

    console.log('🎯 言之有理插件内容脚本已加载');
    
    // 初始化主题（仅用于插件 UI 组件）
    initPluginTheme().then(() => {
        // 主题初始化完成后，加载并发送配置
        return getConfig();
    }).then(config => {
        // 通知工具栏配置
        notifyConfigChange(config);
    });
    
    // 监听来自扩展的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'themeChanged') {
            applyPluginTheme(request.theme);
            sendResponse({ success: true });
            return true;
        }
        
        if (request.action === 'getCurrentSystemTheme') {
            sendResponse({ theme: detectSystemTheme() });
            return true;
        }
    });
    
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'YANZHI_YOULI_THEME_CHANGED') {
            applyPluginTheme(event.data.theme);
        }
        // 处理配置获取请求
        else if (event.data.type === 'YANZHI_YOULI_GET_CONFIG') {
            console.log('[Content Script] 收到配置获取请求');
            getConfig().then(config => {
                // 发送配置给请求者
                window.postMessage({
                    type: 'YANZHI_YOULI_CONFIG',
                    config: config
                }, '*');
                console.log('[Content Script] 已发送配置响应:', config);
            });
        }
    });
    
    /**
     * 初始化插件主题（仅作用于插件 UI 组件）
     */
    async function initPluginTheme() {
        try {
            // 获取当前主题
            const theme = await getCurrentTheme();
            applyPluginTheme(theme);
            
            // 开始监听系统主题变化
            watchSystemTheme();
            
            console.log('🎨 插件主题初始化完成:', theme);
            return theme;
        } catch (error) {
            console.error('插件主题初始化失败:', error);
            const fallbackTheme = detectSystemTheme();
            applyPluginTheme(fallbackTheme);
            return fallbackTheme;
        }
    }

// 配置
const CONFIG = {
    highlightEnabled: true,
    selectionEnabled: true,
    minTextLength: 5
};

// 主题管理
let currentTheme = 'light';
let systemThemeMediaQuery = null;

// 配置管理
let cachedConfig = {
    alwaysShowToolbar: false,
    theme: 'light'
};

/**
 * 检测系统主题
 * @returns {string} 主题模式 (light/dark)
 */
function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * 监听系统主题变化
 */
function watchSystemTheme() {
    if (window.matchMedia) {
        systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        systemThemeMediaQuery.addEventListener('change', (e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            if (newTheme !== currentTheme) {
                currentTheme = newTheme;
                notifyThemeChange(currentTheme);
            }
        });
    }
}

/**
 * 通知主题变更
 * @param {string} theme - 主题模式
 */
function notifyThemeChange(theme) {
    // 向所有扩展组件发送主题变更消息
    chrome.runtime.sendMessage({
        action: 'themeChanged',
        theme: theme
    }).catch(() => {});
    
    // 向页面内的扩展UI组件发送消息
    window.postMessage({
        type: 'YANZHI_YOULI_THEME_CHANGED',
        theme: theme
    }, '*');
}

/**
 * 获取当前主题
 * @returns {Promise<string>} 主题模式
 */
async function getCurrentTheme() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getCurrentTheme' });
        return response.theme || detectSystemTheme();
    } catch (error) {
        console.error('获取主题失败:', error);
        return detectSystemTheme();
    }
}

/**
 * 获取配置
 * @returns {Promise<Object>} 配置对象
 */
async function getConfig() {
    try {
        const result = await chrome.storage.sync.get({
            alwaysShowToolbar: false,
            theme: 'light'
        });
        cachedConfig = { ...cachedConfig, ...result };
        console.log('[Content Script] 从storage加载配置:', cachedConfig);
        return cachedConfig;
    } catch (error) {
        console.error('[Content Script] 获取配置失败:', error);
        return cachedConfig;
    }
}

/**
 * 保存配置
 * @param {Object} config - 配置对象
 * @returns {Promise<void>}
 */
async function saveConfig(config) {
    try {
        await chrome.storage.sync.set(config);
        cachedConfig = { ...cachedConfig, ...config };
        console.log('[Content Script] 配置已保存:', cachedConfig);
        
        // 通知所有组件配置已更新
        notifyConfigChange(cachedConfig);
    } catch (error) {
        console.error('[Content Script] 保存配置失败:', error);
    }
}

/**
 * 通知配置变更
 * @param {Object} config - 配置对象
 */
function notifyConfigChange(config) {
    // 发送消息给页面中的组件
    window.postMessage({
        type: 'YANZHI_YOULI_CONFIG',
        config: config
    }, '*');
    
    console.log('[Content Script] 已通知配置变更:', config);
}

/**
 * 应用主题到插件 UI 组件（不影响页面背景）
 * @param {string} theme - 主题模式
 */
function applyPluginTheme(theme) {
    currentTheme = theme;
    
    // 仅通知工具栏和结果卡片，不修改页面背景
    if (window.floatingToolbar) {
        window.floatingToolbar.setTheme(theme);
    }
    
    if (window.resultCard) {
        window.resultCard.setTheme(theme);
    }
    
    console.log('🎨 插件 UI 主题已切换:', theme);
}

/**
 * 应用主题到页面（保留用于向后兼容，但不再使用）
 * @deprecated 请使用 applyPluginTheme 代替
 */
function applyThemeToPage(theme) {
    // 保留此函数以兼容旧代码，但不再实际修改页面背景
    applyPluginTheme(theme);
}

    // 加载外部脚本
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(src);
            script.onload = resolve;
            script.onerror = (e) => {
                console.error('[ContentScript] 加载脚本失败:', src, e);
                reject(e);
            };
            document.head.appendChild(script);
        });
    }

    // 加载CSS
    function loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL(href);
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // 初始化高亮功能
    async function initHighlight() {
        if (!CONFIG.highlightEnabled) return;

        try {
            // 等待detector加载完成
            if (typeof detector === 'undefined') {
                console.log('⏳ 等待词库加载...');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 加载词库
            if (typeof detector !== 'undefined' && !detector.isLoaded) {
                await detector.loadWordList();
            }

            // 执行扫描
            if (typeof scanAndHighlight === 'function') {
                await scanAndHighlight();
            }

            console.log('✅ 煽动性检测初始化完成');
        } catch (error) {
            console.error('❌ 煽动性检测初始化失败:', error);
        }
    }

    // 初始化选择功能
    function initSelection() {
        if (!CONFIG.selectionEnabled) return;

        // toolbar.js和result-card.js会自动初始化
        // selection-handler.js也会自动初始化
        console.log('✅ 文本选择功能初始化完成');
    }

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📥 Content script收到消息:', request.action);

        if (request.action === 'rescan') {
            // 清除已有的高亮
            clearHighlights();
            // 重新扫描
            initHighlight().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true;
        }

        if (request.action === 'toggleHighlight') {
            CONFIG.highlightEnabled = request.enabled;
            if (CONFIG.highlightEnabled) {
                initHighlight();
            } else {
                clearHighlights();
            }
            sendResponse({ success: true });
            return false;
        }

        sendResponse({ success: false, error: '未知操作' });
        return false;
    });

    // 监听来自toolbar和历史记录的消息（转发给background）
    window.addEventListener('message', (event) => {
        // 只处理来自同一窗口的消息
        if (event.source !== window) return;
        
        console.log('[Content Script] 收到 postMessage:', event.data?.type);
        
        // 处理LLM请求
        if (event.data && event.data.type === 'YANZHI_YOULI_LLM_REQUEST') {
            console.log('[Content Script] 收到LLM请求，转发给background');

            chrome.runtime.sendMessage({
                action: 'llmProcess',
                type: event.data.action,
                text: event.data.text
            }, (response) => {
                console.log('[Content Script] 收到background响应:', response);

                // 将响应转发回toolbar
                window.postMessage({
                    type: 'YANZHI_YOULI_LLM_RESPONSE',
                    success: response?.success,
                    result: response?.result,
                    error: response?.error,
                    action: event.data.action
                }, '*');
            });
        }
        
        // 处理打开历史记录请求
        if (event.data && event.data.type === 'YANZHI_YOULI_OPEN_HISTORY') {
            console.log('[Content Script] 收到打开历史记录请求');
            try {
                const historyUrl = chrome.runtime.getURL('history/history.html');
                console.log('[Content Script] 历史记录URL:', historyUrl);
                window.open(historyUrl, '_blank');
                console.log('[Content Script] 已调用 window.open');
            } catch (error) {
                console.error('[Content Script] 打开历史记录失败:', error);
            }
        }
        
        // 处理历史记录请求
        if (event.data && event.data.type === 'YANZHI_YOULI_HISTORY_REQUEST') {
            console.log('[Content Script] 收到历史记录请求:', event.data.action);
            
            chrome.runtime.sendMessage({ 
                action: event.data.action, 
                ...event.data.data 
            }, (response) => {
                window.postMessage({
                    type: 'YANZHI_YOULI_HISTORY_RESPONSE',
                    id: event.data.id,
                    response: response
                }, '*');
            });
        }
    });
    
    // 清除高亮
    function clearHighlights() {
        const highlighted = document.querySelectorAll('.yz-highlighted, .inciting-text');
        highlighted.forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(el.textContent), el);
                parent.normalize();
            }
        });
    }



    /**
     * 加载词库（现在不需要了，因为highlight.js使用内联数据）
     */
    async function loadWordListForHighlight() {
        console.log('📦 词库已内联在highlight.js中，无需加载');
        return true;
    }

    // 主初始化函数
    async function initialize() {
        try {
            // 先加载词库并推送
            await loadWordListForHighlight();  // ← 添加这一行

            // 加载样式
            await loadCSS('styles/extension.css');

            // 加载工具库
            await loadScript('lib/utils.js');

            // 先加载配置并设置全局变量（在 toolbar 初始化之前）
            await loadConfig();

            // 加载高亮模块
            await loadScript('content/highlight.js');

            // 加载历史记录管理器
            await loadScript('lib/history-manager.js');

            // 加载UI组件（此时全局配置已设置）
            await loadScript('ui/toolbar.js');
            await loadScript('ui/result-card.js');

            // 加载选择处理器（关键！）
            await loadScript('content/selection-handler.js');

            // 等待DOM就绪
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', onReady);
            } else {
                onReady();
            }
        } catch (error) {
            console.error('❌ 插件初始化失败:', error);
        }
    }

    // DOM就绪后初始化
    async function onReady() {
        // 配置已在 initialize() 中加载，这里确保全局配置已设置
        if (!window.yanzhiYouliConfig) {
        await loadConfig();
        }

        // 初始化高亮功能
        setTimeout(initHighlight, 500);

        // 初始化选择功能
        initSelection();

        // 监听动态内容变化
        observeDynamicContent();

        // 通过 postMessage 通知 toolbar 配置（确保 toolbar 已初始化）
        setTimeout(() => {
            if (window.yanzhiYouliConfig) {
            window.postMessage({
                type: 'YANZHI_YOULI_CONFIG',
                config: window.yanzhiYouliConfig
            }, '*');
            }
        }, 300);
    }

    // 加载配置
    async function loadConfig() {
        try {
            const result = await chrome.storage.local.get('config');
            if (result.config && result.config.enabledFeatures) {
                const alwaysShow = result.config.enabledFeatures.alwaysShowToolbar || false;
                console.log('[Content Script] 加载的配置 - alwaysShowToolbar:', alwaysShow);

                // 设置全局配置供 toolbar 读取
                window.yanzhiYouliConfig = {
                    alwaysShowToolbar: alwaysShow
                };
            }
        } catch (error) {
            console.error('[Content Script] 加载配置失败:', error);
        }
    }

    // 监听动态加载的内容
    function observeDynamicContent() {
        let debounceTimer;
        const observer = new MutationObserver((mutations) => {
            // 检查是否有新增文本节点
            const hasNewContent = mutations.some(mutation => {
                return Array.from(mutation.addedNodes).some(node => {
                    return node.nodeType === Node.ELEMENT_NODE ||
                           (node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                });
            });

            if (hasNewContent && CONFIG.highlightEnabled) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    // 只检测新增的内容
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => {
                            // 对所有类型的节点使用 scanElement
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                scanElement(node);
                            }
                        });
                    });
                }, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 扫描单个元素
    function scanElement(element) {
        if (typeof detector === 'undefined' || !detector.isLoaded) return;

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    const parent = node.parentElement;
                    if (parent && (parent.classList.contains('yz-highlighted') ||
                        parent.classList.contains('inciting-text'))) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim().length >= detector.config.minTextLength) {
                nodes.push(node);
            }
        }

        nodes.forEach(textNode => {
            const result = detector.detect(textNode.textContent);
            if (result.isInciting) {
                detector.highlight(textNode, result);
            }
        });
    }





    // 启动初始化
    initialize();

})();
