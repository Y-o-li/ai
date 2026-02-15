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

    // 配置
    const CONFIG = {
        highlightEnabled: true,
        selectionEnabled: true,
        minTextLength: 5
    };

    // 加载外部脚本
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(src);
            script.onload = resolve;
            script.onerror = reject;
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

    // 监听来自toolbar的消息（转发给background）
    window.addEventListener('message', (event) => {
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

    // 主初始化函数
    async function initialize() {
        try {
            // 加载样式
            await loadCSS('styles/extension.css');

            // 加载工具库
            await loadScript('lib/utils.js');

            // 先加载配置并设置全局变量（在 toolbar 初始化之前）
            await loadConfig();

            // 加载高亮模块
            await loadScript('content/highlight.js');

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
