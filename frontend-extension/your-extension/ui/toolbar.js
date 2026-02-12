// =============================================================================
// 浮动工具栏组件
// =============================================================================
// 描述: 用户选中文本后显示的浮动工具栏，提供事实核查、语义总结、中性化改写功能
// =============================================================================

class FloatingToolbar {
    constructor() {
        this.toolbar = null;
        this.isVisible = false;
        this.currentSelection = '';
        this.hideTimeout = null;
        this.alwaysShow = false; // 是否常驻
        this.configLoaded = false; // 配置是否已加载
        
        // 功能按钮配置
        this.buttons = [
            {
                id: 'yz-fact-check',
                icon: '✓',
                label: '事实核查',
                action: 'factCheck',
                color: '#4CAF50'
            },
            {
                id: 'yz-summarize',
                icon: '☰',
                label: '语义总结',
                action: 'summarize',
                color: '#2196F3'
            },
            {
                id: 'yz-neutralize',
                icon: '◐',
                label: '中性化改写',
                action: 'neutralize',
                color: '#FF9800'
            }
        ];
        
        this.init();
    }

    /**
     * 初始化工具栏
     */
    async init() {
        await this.loadConfig();
        this.createToolbar();
        this.bindEvents();

        // 监听来自 content-script 的配置消息
        this.listenForConfig();

        // 如果启用常驻模式，初始化后立即显示
        if (this.alwaysShow) {
            this.showAtDefaultPosition();
        }
    }

    /**
     * 监听配置消息和响应
     */
    listenForConfig() {
        window.addEventListener('message', (event) => {
            // 配置消息
            if (event.data && event.data.type === 'YANZHI_YOULI_CONFIG' && event.data.config) {
                console.log('[Toolbar] 收到配置消息:', event.data.config);

                if (event.data.config.alwaysShowToolbar !== undefined) {
                    this.alwaysShow = event.data.config.alwaysShowToolbar;
                    console.log('[Toolbar] 更新 alwaysShow 为:', this.alwaysShow);

                    if (this.alwaysShow && !this.isVisible) {
                        console.log('[Toolbar] 启用常驻模式');
                        this.showAtDefaultPosition();
                    }
                }
            }

            // LLM响应消息
            if (event.data && event.data.type === 'YANZHI_YOULI_LLM_RESPONSE') {
                console.log('[Toolbar] 收到LLM响应:', event.data);

                if (event.data.success) {
                    // 显示结果卡片
                    if (window.resultCard) {
                        window.resultCard.show(event.data.result, event.data.action);
                    }
                } else {
                    console.error('[Toolbar] 处理失败:', event.data?.error);
                    this.showError(event.data?.error || '处理失败，请检查API配置');
                }
            }
        });
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            // 检查 chrome API 是否可用
            if (typeof chrome === 'undefined' || !chrome.storage) {
                console.warn('[Toolbar] chrome.storage API 不可用，使用全局配置');
                // 使用全局配置作为后备方案
                if (window.yanzhiYouliConfig && window.yanzhiYouliConfig.alwaysShowToolbar !== undefined) {
                    this.alwaysShow = window.yanzhiYouliConfig.alwaysShowToolbar;
                    console.log('[Toolbar] 从全局配置读取 alwaysShowToolbar:', this.alwaysShow);
                } else {
                    this.alwaysShow = false;
                }
                this.configLoaded = true;
                return;
            }

            const result = await chrome.storage.local.get('config');
            console.log('[Toolbar] Loaded config:', result.config);
            if (result.config && result.config.enabledFeatures) {
                this.alwaysShow = result.config.enabledFeatures.alwaysShowToolbar || false;
                console.log('[Toolbar] alwaysShowToolbar setting:', this.alwaysShow);
            } else {
                // 尝试从全局配置读取
                if (window.yanzhiYouliConfig && window.yanzhiYouliConfig.alwaysShowToolbar !== undefined) {
                    this.alwaysShow = window.yanzhiYouliConfig.alwaysShowToolbar;
                    console.log('[Toolbar] 从全局配置读取 alwaysShowToolbar:', this.alwaysShow);
                }
            }
            this.configLoaded = true;
        } catch (error) {
            console.error('[Toolbar] 加载配置失败:', error);
            this.alwaysShow = false;
        }
    }

    /**
     * 在默认位置显示工具栏（常驻模式）
     */
    showAtDefaultPosition() {
        console.log('[Toolbar] showAtDefaultPosition 被调用');

        // 等待 body 准备好
        if (!document.body) {
            console.warn('[Toolbar] Body not ready, retrying...');
            setTimeout(() => this.showAtDefaultPosition(), 100);
            return;
        }

        const defaultTop = 100;
        const defaultLeft = Math.max(20, window.innerWidth / 2 - 90); // 居中显示

        console.log('[Toolbar] Showing at default position:', { top: defaultTop, left: defaultLeft, windowWidth: window.innerWidth, alwaysShow: this.alwaysShow });

        this.toolbar.style.position = 'fixed';
        this.toolbar.style.left = `${defaultLeft}px`;
        this.toolbar.style.top = `${defaultTop}px`;
        this.toolbar.style.display = 'flex';
        this.toolbar.style.visibility = 'visible';

        console.log('[Toolbar] 工具栏样式:', {
            position: this.toolbar.style.position,
            display: this.toolbar.style.display,
            visibility: this.toolbar.style.visibility,
            left: this.toolbar.style.left,
            top: this.toolbar.style.top,
            opacity: this.toolbar.style.opacity
        });

        // 触发动画
        requestAnimationFrame(() => {
            this.toolbar.style.opacity = '1';
            this.toolbar.style.transform = 'translateY(0) scale(1)';
            console.log('[Toolbar] 动画已触发');
        });

        this.isVisible = true;
        console.log('[Toolbar] Toolbar is now visible, isVisible =', this.isVisible);
    }

    /**
     * 更新配置（用于设置变更后）
     */
    async updateConfig() {
        await this.loadConfig();
        console.log('[Toolbar] Config updated, alwaysShow:', this.alwaysShow);

        if (this.alwaysShow) {
            if (!this.isVisible) {
                console.log('[Toolbar] Enabling always show mode');
                this.showAtDefaultPosition();
            } else {
                // 如果已经显示，确保是固定位置
                console.log('[Toolbar] Already visible, fixing position');
                this.toolbar.style.position = 'fixed';
            }
        } else {
            // 关闭常驻模式
            console.log('[Toolbar] Disabling always show mode');
            this.hide();
        }
    }

    /**
     * 创建工具栏DOM
     */
    createToolbar() {
        // 创建工具栏容器
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'yz-floating-toolbar';
        this.toolbar.className = 'yz-toolbar';

        // 设置样式
        Object.assign(this.toolbar.style, {
            position: 'absolute',
            display: 'none',
            visibility: 'hidden',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '8px 12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: '2147483648', // 提高到最大
            gap: '8px',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(10px) scale(0.95)',
            opacity: '0'
        });

        // 创建按钮
        this.buttons.forEach((btn) => {
            const button = this.createButton(btn);
            this.toolbar.appendChild(button);
        });

        // 添加分隔线
        const divider = document.createElement('div');
        Object.assign(divider.style, {
            width: '1px',
            height: '20px',
            background: 'rgba(255, 255, 255, 0.3)',
            margin: '0 4px'
        });
        this.toolbar.appendChild(divider);

        // 添加关闭按钮
        const closeBtn = this.createCloseButton();
        this.toolbar.appendChild(closeBtn);

        // 添加到页面
        if (document.body) {
            document.body.appendChild(this.toolbar);
            console.log('[Toolbar] Toolbar appended to body');
        } else {
            console.warn('[Toolbar] Body not available, waiting...');
            setTimeout(() => {
                if (document.body) {
                    document.body.appendChild(this.toolbar);
                    console.log('[Toolbar] Toolbar appended to body (retry)');
                }
            }, 100);
        }
    }

    /**
     * 创建功能按钮
     * @param {Object} config - 按钮配置
     * @returns {HTMLElement} 按钮元素
     */
    createButton(config) {
        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'yz-toolbar-btn';
        button.title = config.label;

        Object.assign(button.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: 'none',
            background: config.color,
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        });

        button.innerHTML = config.icon;

        // 添加悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.background = this.lightenColor(config.color, 20);
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            this.showTooltip(button, config.label);
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = config.color;
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            this.hideTooltip();
        });

        // 点击事件
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleAction(config.action);
        });

        return button;
    }

    /**
     * 创建关闭按钮
     * @returns {HTMLElement} 关闭按钮
     */
    createCloseButton() {
        const button = document.createElement('button');
        button.className = 'yz-toolbar-btn yz-close-btn';
        button.title = '关闭';
        
        Object.assign(button.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        });

        button.innerHTML = '✕';

        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(244, 67, 54, 0.5)';
            button.style.color = '#fff';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.color = 'rgba(255, 255, 255, 0.8)';
        });

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
        });

        return button;
    }

    /**
     * 显示工具提示
     * @param {HTMLElement} target - 目标元素
     * @param {string} text - 提示文本
     */
    showTooltip(target, text) {
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.id = 'yz-toolbar-tooltip';
        tooltip.textContent = text;
        
        Object.assign(tooltip.style, {
            position: 'absolute',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: '2147483648',
            pointerEvents: 'none',
            transform: 'translateY(-100%)',
            marginTop: '-8px'
        });

        const rect = target.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top + window.scrollY}px`;
        tooltip.style.transform = 'translateX(-50%) translateY(-100%)';

        document.body.appendChild(tooltip);
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        const tooltip = document.getElementById('yz-toolbar-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 监听文本选择
        document.addEventListener('mouseup', this.handleSelection.bind(this));
        document.addEventListener('keyup', this.handleSelection.bind(this));

        // 监听配置变更（仅当 chrome API 可用时）
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.config) {
                    this.updateConfig();
                }
            });
        }

        // 点击其他地方隐藏（常驻模式下不隐藏）
        document.addEventListener('mousedown', (e) => {
            if (!this.alwaysShow && !this.toolbar.contains(e.target)) {
                this.hide();
            }
        });

        // 滚动时隐藏（常驻模式下不隐藏）
        if (!this.alwaysShow) {
            window.addEventListener('scroll', () => this.hide(), { passive: true });
            window.addEventListener('resize', () => this.hide(), { passive: true });
        }
    }

    /**
     * 处理文本选择
     */
    handleSelection() {
        clearTimeout(this.hideTimeout);

        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text && text.length >= 6) {
            this.currentSelection = text;
            // 常驻模式下，选中文本后移动工具栏到选中位置
            if (this.alwaysShow) {
                this.moveToSelection(selection);
            } else {
                this.show();
            }
        } else {
            // 常驻模式下，清空选择后不隐藏，但清空当前选择文本
            if (!this.alwaysShow) {
                this.hideTimeout = setTimeout(() => this.hide(), 200);
            }
        }
    }

    /**
     * 移动工具栏到选中位置（常驻模式）
     * @param {Selection} selection - 选区对象
     */
    moveToSelection(selection) {
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 计算位置
        const toolbarWidth = 180;
        const toolbarHeight = 60;

        let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
        let top = rect.top + window.scrollY - toolbarHeight - 10;

        // 边界检查
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < 10) {
            top = rect.bottom + window.scrollY + 10;
        }

        this.toolbar.style.position = 'absolute';
        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.top = `${top}px`;
    }

    /**
     * 显示工具栏
     */
    show() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 计算位置
        const toolbarWidth = 180;
        const toolbarHeight = 60;
        
        let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
        let top = rect.top + window.scrollY - toolbarHeight - 10;
        
        // 边界检查
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < window.scrollY + 10) {
            top = rect.bottom + window.scrollY + 10;
        }

        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.top = `${top}px`;
        this.toolbar.style.display = 'flex';
        
        // 触发动画
        requestAnimationFrame(() => {
            this.toolbar.style.opacity = '1';
            this.toolbar.style.transform = 'translateY(0) scale(1)';
        });

        this.isVisible = true;
    }

    /**
     * 隐藏工具栏
     */
    hide() {
        if (this.alwaysShow) {
            // 常驻模式下不隐藏，只清空选择文本
            this.currentSelection = '';
            return;
        }

        if (!this.isVisible) return;

        this.toolbar.style.opacity = '0';
        this.toolbar.style.transform = 'translateY(10px) scale(0.95)';

        setTimeout(() => {
            this.toolbar.style.display = 'none';
            this.hideTooltip();
        }, 300);

        this.isVisible = false;
        this.currentSelection = '';
    }

    /**
     * 处理功能按钮点击
     * @param {string} action - 动作类型
     */
    handleAction(action) {
        // 常驻模式下，如果没有选中文字，提示用户先选择文本
        if (!this.currentSelection) {
            this.showError('请先选择要处理的文本');
            return;
        }

        console.log('[Toolbar] 发送处理请求:', action, this.currentSelection.substring(0, 50) + '...');

        // 通过 postMessage 发送请求（因为 chrome.runtime 在动态加载的脚本中不可用）
        window.postMessage({
            type: 'YANZHI_YOULI_LLM_REQUEST',
            action: action,
            text: this.currentSelection
        }, '*');

        // 常驻模式下，执行后不隐藏
        if (!this.alwaysShow) {
            this.hide();
        } else {
            this.currentSelection = '';
        }
    }

    /**
     * 颜色变亮辅助方法
     * @param {string} color - 原始颜色
     * @param {number} percent - 变亮百分比
     * @returns {string} 变亮后的颜色
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    /**
     * 显示错误提示
     * @param {string} message - 错误信息
     */
    showError(message) {
        // 创建临时错误提示
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        Object.assign(errorDiv.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#f44336',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '2147483647',
            fontSize: '14px'
        });
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    console.log('[Toolbar] 检查初始化时机, document.readyState:', document.readyState);

    // 等待DOM就绪后再初始化，避免与selection-handler.js的执行时机冲突
    if (document.readyState === 'loading') {
        console.log('[Toolbar] DOM 未就绪，等待 DOMContentLoaded 事件');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Toolbar] DOMContentLoaded 触发，创建实例');
            window.floatingToolbar = new FloatingToolbar();
        });
    } else {
        console.log('[Toolbar] DOM 已就绪，立即创建实例');
        window.floatingToolbar = new FloatingToolbar();
    }

    console.log('[Toolbar] window.floatingToolbar 是否存在:', !!window.floatingToolbar);
}
