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
        this.currentTheme = 'light'; // 当前主题
        
        // 拖动相关状态
        this.isDragging = false;
        this.hasDragged = false; // 是否真的发生了拖动（移动了鼠标）
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.savedPosition = null; // 保存的位置 {left, top}
        
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
            },
            {
                id: 'yz-history',
                icon: 'Ⓗ',
                label: '历史记录',
                action: 'openHistory',
                color: '#9C27B0'
            }
        ];
        
        this.initTheme();
        
        // 加载配置
        this.loadConfig();
        
        // 监听主题变更消息
        this.setupThemeListener();
        
        // 如果配置已加载且设置为常驻显示，则显示工具栏
        if (this.configLoaded && this.alwaysShow && !this.isVisible) {
            console.log('[Toolbar] 构造函数中检测到常驻显示设置，显示工具栏');
            // 延迟一点确保DOM完全就绪
            setTimeout(() => {
                this.showAtDefaultPosition();
            }, 100);
        }
    }

    /**
     * 初始化主题
     */
    initTheme() {
        // 默认使用亮色主题
        this.currentTheme = 'light';
        
        // 尝试从页面获取主题
        if (document.documentElement.classList.contains('yz-dark-theme')) {
            this.currentTheme = 'dark';
        }
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            // 默认配置
            let config = {
                alwaysShowToolbar: false,
                theme: 'light'
            };
            
            // 由于 toolbar.js 在页面上下文中运行，无法直接访问 chrome.storage
            // 改为从 content script 请求配置
            if (window.parent && window.parent !== window) {
                // 如果在 iframe 中，尝试向父窗口请求配置
                console.log('[Toolbar] 尝试从父窗口请求配置');
                window.parent.postMessage({
                    type: 'YANZHI_YOULI_GET_CONFIG'
                }, '*');
                
                // 等待配置响应（简单实现，实际应用中可能需要更复杂的机制）
                // 这里我们先使用默认配置，配置会通过 YANZHI_YOULI_CONFIG 消息更新
            } else {
                // 直接向 content script 请求配置
                console.log('[Toolbar] 尝试从 content script 请求配置');
                window.postMessage({
                    type: 'YANZHI_YOULI_GET_CONFIG'
                }, '*');
            }
            
            // 立即应用默认配置，后续会通过消息更新
            this.alwaysShow = config.alwaysShowToolbar;
            this.setTheme(config.theme);
            this.configLoaded = true;
            
            console.log('[Toolbar] 使用初始默认配置:', config);
            
        } catch (error) {
            console.error('[Toolbar] 加载配置失败:', error);
            this.configLoaded = true;
        }
    }

    /**
     * 设置主题监听器
     */
    setupThemeListener() {
        // 监听来自content script的主题变更消息
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'YANZHI_YOULI_THEME_CHANGED') {
                this.setTheme(event.data.theme);
            }
            // 新增：监听配置变更消息
            else if (event.data.type === 'YANZHI_YOULI_CONFIG') {
                console.log('[Toolbar] 收到配置变更消息', event.data.config);
                this.updateConfigFromMessage(event.data.config);
            }
            // 新增：监听LLM响应消息
            else if (event.data.type === 'YANZHI_YOULI_LLM_RESPONSE') {
                console.log('[Toolbar] 收到LLM响应:', event.data);
                if (event.data.success && event.data.result) {
                    // 如果有cardId，更新现有的加载卡片
                    if (event.data.cardId && window.resultCardManager) {
                        // 找到对应的卡片并更新
                        const card = window.resultCardManager.getCardById(event.data.cardId);
                        if (card) {
                            // 更新卡片内容
                            card.currentResult = event.data.result;
                            card.currentType = event.data.action;
                            if (card.resultEl) {
                                card.resultEl.innerHTML = card.formatResult(event.data.result, event.data.action);
                            }
                            // 隐藏加载，显示结果
                            if (card.loadingEl) card.loadingEl.style.display = 'none';
                            if (card.resultEl) card.resultEl.style.display = 'block';
                        }
                    } else if (window.resultCardManager) {
                        // 如果没有cardId，创建新的结果卡片
                        window.resultCardManager.createCard(event.data.result, event.data.action);
                    } else if (window.resultCard) {
                        window.resultCard.show(event.data.result, event.data.action);
                    }
                }
            }
        });
        
        // 监听来自扩展API的消息（主题变更和配置变更）
        if (chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'themeChanged') {
                    this.setTheme(request.theme);
                    sendResponse({ success: true });
                    return true;
                }
                // 新增：监听配置变更
                else if (request.action === 'configUpdated') {
                    console.log('[Toolbar] 收到配置更新消息', request.config);
                    this.updateConfigFromMessage(request.config);
                    sendResponse({ success: true });
                    return true;
                }
            });
        }
    }

    /**
     * 从消息更新配置
     * @param {Object} config - 配置对象
     */
    async updateConfigFromMessage(config) {
        if (!config) return;
        
        // 更新 alwaysShow 设置
        if (typeof config.alwaysShowToolbar === 'boolean') {
            this.alwaysShow = config.alwaysShowToolbar;
        }
        
        // 更新主题设置
        if (config.theme) {
            this.setTheme(config.theme);
        }
        
        this.configLoaded = true;
        
        // 根据配置决定是否显示工具栏
        if (this.alwaysShow && !this.isVisible) {
            console.log('[Toolbar] 根据配置显示工具栏');
            this.showAtDefaultPosition();
        } else if (!this.alwaysShow && this.isVisible) {
            console.log('[Toolbar] 根据配置隐藏工具栏');
            this.hide();
        }
    }

    /**
     * 设置主题
     * @param {string} theme - 主题模式 ('light' | 'dark')
     */
    setTheme(theme) {
        if (this.currentTheme === theme) return;
        
        this.currentTheme = theme;
        
        if (!this.toolbar) return;
        
        if (theme === 'dark') {
            this.toolbar.classList.add('yz-toolbar-dark');
        } else {
            this.toolbar.classList.remove('yz-toolbar-dark');
        }
        
        console.log('🎨 工具栏主题已切换:', theme);
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

        // 确保工具栏DOM已创建
        if (!this.toolbar) {
            console.log('[Toolbar] 工具栏DOM不存在，正在创建...');
            this.createToolbar();
            this.attachEventListeners();
            console.log('[Toolbar] 工具栏DOM创建完成');
        }

        const defaultTop = 100;
        const defaultLeft = Math.max(20, window.innerWidth / 2 - 90); // 居中显示

        console.log('[Toolbar] Showing at default position:', { top: defaultTop, left: defaultLeft, windowWidth: window.innerWidth, alwaysShow: this.alwaysShow });

        // 如果有保存的位置，优先使用保存的位置
        if (this.savedPosition) {
            this.applySavedPosition();
        } else {
            // 使用 setProperty 和 !important 来覆盖任何 CSS 规则
            this.toolbar.style.setProperty('position', 'fixed', 'important');
            this.toolbar.style.left = `${defaultLeft}px`;
            this.toolbar.style.top = `${defaultTop}px`;
        }
        
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

        // 应用保存的位置（如果有）
        if (this.savedPosition) {
            this.applySavedPosition();
        }

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
            // 工具栏显示开关开启
            if (!this.isVisible) {
                console.log('[Toolbar] 启用工具栏显示');
                this.showAtDefaultPosition();
            } else {
                // 如果已经显示，确保是固定位置
                console.log('[Toolbar] 工具栏已显示，确保固定位置');
                this.toolbar.style.setProperty('position', 'fixed', 'important');
            }
        } else {
            // 工具栏显示开关关闭
            console.log('[Toolbar] 禁用工具栏显示');
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
            position: 'fixed', // 使用 fixed 定位，相对于视窗
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
            opacity: '0',
            cursor: 'default',
            userSelect: 'none' // 防止拖动时选中文本
        });
        
        // 添加拖动手柄（在按钮之前）
        const dragHandle = this.createDragHandle();
        this.toolbar.insertBefore(dragHandle, this.toolbar.firstChild);

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

        // 加载保存的位置
        this.loadSavedPosition();

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

        // 点击事件（拖动时不触发）
        button.addEventListener('click', (e) => {
            if (this.hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.handleAction(config.action);
        });

        return button;
    }

    /**
     * 创建拖动手柄
     * @returns {HTMLElement} 拖动手柄元素
     */
    createDragHandle() {
        const dragHandle = document.createElement('div');
        dragHandle.className = 'yz-drag-handle';
        dragHandle.title = '拖动工具栏';
        
        Object.assign(dragHandle.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            cursor: 'move',
            borderRadius: '6px',
            marginRight: '4px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            userSelect: 'none',
            transition: 'all 0.2s ease'
        });

        // 使用拖拽图标（三个横线）
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.style.lineHeight = '1';
        dragHandle.style.letterSpacing = '-2px';

        // 悬停效果
        dragHandle.addEventListener('mouseenter', () => {
            dragHandle.style.background = 'rgba(255, 255, 255, 0.15)';
            dragHandle.style.color = 'rgba(255, 255, 255, 0.9)';
        });

        dragHandle.addEventListener('mouseleave', () => {
            dragHandle.style.background = 'transparent';
            dragHandle.style.color = 'rgba(255, 255, 255, 0.7)';
        });

        // 拖动事件
        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startDrag(e);
        });

        return dragHandle;
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
            if (this.hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.hide();
        });

        return button;
    }

    /**
     * 附加事件监听器
     */
    attachEventListeners() {
        if (!this.toolbar) return;

        // 为每个按钮添加事件监听器
        this.buttons.forEach(btn => {
            const button = document.getElementById(btn.id);
            if (button) {
                // 鼠标悬停显示提示
                button.addEventListener('mouseenter', () => {
                    this.showTooltip(button, btn.label);
                });

                button.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });

                // 点击事件已在createButton方法中添加，这里不再重复添加
            }
        });

        // 关闭按钮事件
        const closeBtn = this.toolbar.querySelector('.yz-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                if (this.hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            });
        }

        // 拖动手柄事件
        const dragHandle = this.toolbar.querySelector('.yz-drag-handle');
        if (dragHandle) {
            dragHandle.addEventListener('mouseenter', () => {
                dragHandle.style.background = 'rgba(255, 255, 255, 0.15)';
                dragHandle.style.color = 'rgba(255, 255, 255, 0.9)';
            });

            dragHandle.addEventListener('mouseleave', () => {
                dragHandle.style.background = 'transparent';
                dragHandle.style.color = 'rgba(255, 255, 255, 0.7)';
            });

            dragHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startDrag(e);
            });
        }

        // 监听配置变更（仅当 chrome API 可用时）
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.config) {
                    this.updateConfig();
                }
            });
        }

        // 点击其他地方隐藏（工具栏显示开关关闭时不隐藏，因为工具栏不会显示）
        document.addEventListener('mousedown', (e) => {
            if (this.isVisible && !this.toolbar.contains(e.target)) {
                // 不隐藏，因为工具栏始终显示
            }
        });
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
            position: 'fixed', // 使用 fixed 定位，相对于视窗
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: '2147483648',
            pointerEvents: 'none',
            transform: 'translateX(-50%) translateY(-100%)',
            marginTop: '-8px'
        });

        const rect = target.getBoundingClientRect();
        // getBoundingClientRect() 返回相对于视窗的坐标，不需要 window.scrollY
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top}px`;

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
     * 开始拖动
     * @param {MouseEvent} e - 鼠标事件
     */
    startDrag(e) {
        if (!this.toolbar || !this.isVisible) return;

        this.isDragging = true;
        this.hasDragged = false; // 重置拖动标志
        
        // 获取工具栏当前位置
        const rect = this.toolbar.getBoundingClientRect();
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        // 禁用过渡动画，使拖动更流畅
        this.toolbar.style.transition = 'none';
        this.toolbar.style.cursor = 'move';

        // 添加全局事件监听器
        document.addEventListener('mousemove', this.onDrag = this.onDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag = this.endDrag.bind(this));

        // 防止文本选择
        document.body.style.userSelect = 'none';
    }

    /**
     * 拖动中
     * @param {MouseEvent} e - 鼠标事件
     */
    onDrag(e) {
        if (!this.isDragging || !this.toolbar) return;

        e.preventDefault();

        // 检查是否真的发生了移动（超过3像素才认为是拖动）
        const deltaX = Math.abs(e.clientX - this.dragStartX);
        const deltaY = Math.abs(e.clientY - this.dragStartY);
        if (deltaX > 3 || deltaY > 3) {
            this.hasDragged = true;
        }

        // 计算新位置（相对于文档，加上滚动偏移）
        let left = e.clientX - this.dragOffsetX;
        let top = e.clientY - this.dragOffsetY + window.scrollY;

        // 边界检查（只限制左右，允许拖动到页面任意垂直位置）
        const toolbarWidth = this.toolbar.offsetWidth;
        const maxLeft = window.innerWidth - toolbarWidth;

        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, top); // 只限制不能拖到文档顶部上方

        // 更新位置（使用 absolute 定位，相对于文档）
        this.toolbar.style.position = 'absolute';
        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.top = `${top}px`;
    }

    /**
     * 结束拖动
     * @param {MouseEvent} e - 鼠标事件
     */
    endDrag(e) {
        if (!this.isDragging) return;

        const wasDragging = this.hasDragged;
        this.isDragging = false;

        // 恢复过渡动画
        this.toolbar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        this.toolbar.style.cursor = 'default';

        // 移除全局事件监听器
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.endDrag);
        document.body.style.userSelect = '';

        // 保存位置（只有真正拖动过才保存）
        if (this.toolbar && wasDragging) {
            const rect = this.toolbar.getBoundingClientRect();
            this.savePosition({
                left: rect.left,
                top: rect.top
            });

            // 关键修复：拖动结束后恢复 fixed 定位
            // 使用 setProperty 和 !important 来覆盖任何 CSS 规则
            this.toolbar.style.setProperty('position', 'fixed', 'important');
            this.toolbar.style.left = `${rect.left}px`;
            this.toolbar.style.top = `${rect.top}px`;
        }

        // 延迟重置拖动标志，防止触发点击事件
        setTimeout(() => {
            this.hasDragged = false;
        }, 100);
    }

    /**
     * 保存工具栏位置
     * @param {Object} position - 位置对象 {left, top}
     */
    savePosition(position) {
        try {
            // 使用 localStorage 保存位置（因为 toolbar.js 在页面上下文中）
            localStorage.setItem('yz-toolbar-position', JSON.stringify(position));
            this.savedPosition = position;
        } catch (error) {
            console.warn('[Toolbar] 保存位置失败:', error);
        }
    }

    /**
     * 加载保存的位置
     */
    loadSavedPosition() {
        try {
            const saved = localStorage.getItem('yz-toolbar-position');
            if (saved) {
                this.savedPosition = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('[Toolbar] 加载位置失败:', error);
            this.savedPosition = null;
        }
    }

    /**
     * 应用保存的位置
     */
    applySavedPosition() {
        if (this.savedPosition && this.toolbar) {
            // 验证位置是否在视窗内（fixed 定位相对于视窗）
            const { left, top } = this.savedPosition;
            const toolbarWidth = this.toolbar.offsetWidth || 180;
            const toolbarHeight = this.toolbar.offsetHeight || 60;

            // 边界检查，确保工具栏完全在视窗内
            const validLeft = Math.max(10, Math.min(left, window.innerWidth - toolbarWidth - 10));
            const validTop = Math.max(10, Math.min(top, window.innerHeight - toolbarHeight - 10));

            // 使用 setProperty 和 !important 来覆盖任何 CSS 规则
            this.toolbar.style.setProperty('position', 'fixed', 'important');
            this.toolbar.style.left = `${validLeft}px`;
            this.toolbar.style.top = `${validTop}px`;
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 监听配置变更（仅当 chrome API 可用时）
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.config) {
                    this.updateConfig();
                }
            });
        }

        // 点击其他地方隐藏（工具栏显示开关关闭时不隐藏，因为工具栏不会显示）
        document.addEventListener('mousedown', (e) => {
            if (this.isVisible && !this.toolbar.contains(e.target)) {
                // 不隐藏，因为工具栏始终显示
            }
        });

        // 滚动时更新位置（保持屏幕相对位置不变）
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        window.addEventListener('resize', () => this.handleResize(), { passive: true });
    }

    /**
     * 处理滚动事件 - 工具栏保持在屏幕上的固定位置
     */
    handleScroll() {
        if (!this.isVisible || !this.toolbar) return;

        // 工具栏使用 fixed 定位，滚动时会自动保持在屏幕上的固定位置
        // 不需要做任何处理，让工具栏保持在当前位置即可
        // 只有在工具栏完全滚出视窗时才调整位置
        this.keepToolbarInView();
    }

    /**
     * 保持工具栏在屏幕可见范围内
     */
    keepToolbarInView() {
        if (!this.toolbar) return;

        const rect = this.toolbar.getBoundingClientRect();
        const toolbarWidth = this.toolbar.offsetWidth;
        const toolbarHeight = this.toolbar.offsetHeight;

        // 只有当工具栏完全滚出视窗时才调整位置
        // 检查是否滑出顶部（完全滚出）
        if (rect.bottom < 0) {
            this.toolbar.style.top = `10px`;
            return;
        }

        // 检查是否滑出底部（完全滚出）
        if (rect.top > window.innerHeight) {
            this.toolbar.style.top = `${window.innerHeight - toolbarHeight - 10}px`;
            return;
        }

        // 检查是否滑出左侧（完全滚出）
        if (rect.right < 0) {
            this.toolbar.style.left = `10px`;
            return;
        }

        // 检查是否滑出右侧（完全滚出）
        if (rect.left > window.innerWidth) {
            this.toolbar.style.left = `${window.innerWidth - toolbarWidth - 10}px`;
            return;
        }
    }

    /**
     * 处理窗口大小变化事件
     */
    handleResize() {
        if (!this.isVisible || !this.toolbar) return;

        // 确保工具栏在视窗内
        this.keepToolbarInView();
    }

    /**
     * 处理文本选择
     */
    handleSelection() {
        clearTimeout(this.hideTimeout);

        const selection = window.getSelection();
        const text = selection.toString().trim();

        // 如果工具栏显示开关关闭，不处理任何文本选择
        if (!this.alwaysShow) {
            return;
        }

        if (text && text.length >= 6) {
            this.currentSelection = text;
            // 工具栏显示开关开启时，移动工具栏到选中位置
            this.moveToSelection(selection);
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

        // 使用统一的位置更新方法
        this.updatePositionFromSelection(rect);
    }

    /**
     * 显示工具栏
     */
    show() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 使用 fixed 定位，getBoundingClientRect() 返回的是相对于视窗的坐标
        // 工具栏会保持在屏幕上的这个位置，滚动时不会改变
        this.updatePositionFromSelection(rect);

        this.toolbar.style.display = 'flex';

        // 触发动画
        requestAnimationFrame(() => {
            this.toolbar.style.opacity = '1';
            this.toolbar.style.transform = 'translateY(0) scale(1)';
        });

        this.isVisible = true;
    }

    /**
     * 根据选中文本的位置更新工具栏位置
     * @param {DOMRect} rect - 选中文本的边界矩形（相对于视窗）
     */
    updatePositionFromSelection(rect) {
        if (!this.toolbar) return;

        // 关键修复：强制使用 fixed 定位，确保相对于视窗
        // 使用 setProperty 和 !important 来覆盖任何 CSS 规则
        this.toolbar.style.setProperty('position', 'fixed', 'important');

        // 计算位置（使用 fixed 定位，相对于视窗）
        const toolbarWidth = 180;
        const toolbarHeight = 60;

        let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
        let top = rect.top - toolbarHeight - 10;

        // 边界检查
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = window.innerWidth - toolbarWidth - 10;
        }

        // 确保工具栏不会超出视窗顶部（至少距离顶部10px）
        if (top < 10) {
            // 如果上方空间不足，显示在下方
            top = rect.bottom + 10;

            // 如果下方也放不下，就强制放在视窗中间区域
            if (top + toolbarHeight > window.innerHeight - 10) {
                top = Math.max(10, (window.innerHeight - toolbarHeight) / 2);
            }
        }
        // 确保不超出视窗底部
        if (top + toolbarHeight > window.innerHeight - 10) {
            top = window.innerHeight - toolbarHeight - 10;
        }

        // 确保工具栏完全在视窗内
        if (top < 10) top = 10;
        if (top > window.innerHeight - toolbarHeight - 10) {
            top = window.innerHeight - toolbarHeight - 10;
        }

        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.top = `${top}px`;
    }

    /**
     * 隐藏工具栏
     */
    hide() {
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
        // 如果是打开历史记录，直接打开新标签页
        if (action === 'openHistory') {
            this.openHistoryPage();
            return;
        }

        // 常驻模式下，如果没有选中文字，提示用户先选择文本
        if (!this.currentSelection) {
            this.showError('请先选择要处理的文本');
            return;
        }

        console.log('[Toolbar] 发送处理请求:', action, this.currentSelection.substring(0, 50) + '...');
        
        // 【添加】显示加载状态，使用resultCardManager创建新的卡片
        let loadingCard = null;
        if (window.resultCardManager) {
            loadingCard = window.resultCardManager.createLoadingCard(action);
        } else if (window.resultCard) {
            window.resultCard.showLoading(action);
        }

        // 通过 postMessage 发送请求（因为 chrome.runtime 在动态加载的脚本中不可用）
        window.postMessage({
            type: 'YANZHI_YOULI_LLM_REQUEST',
            action: action,
            text: this.currentSelection,
            cardId: loadingCard ? loadingCard.id : null
        }, '*');
        
        // 保存加载卡片引用，以便在收到响应时更新
        this.currentLoadingCard = loadingCard;

        // 执行后清空当前选择文本，但不隐藏工具栏（因为工具栏显示开关开启时，工具栏始终显示）
        this.currentSelection = '';
    }

    /**
     * 打开历史记录页面
     */
    openHistoryPage() {
        console.log('[Toolbar] 准备打开历史记录页面');
        
        // 直接使用 postMessage 请求 content-script 打开历史记录页面
        // 这样可以避免重复打开窗口的问题
        console.log('[Toolbar] 使用 postMessage 方法');
        window.postMessage({
            type: 'YANZHI_YOULI_OPEN_HISTORY'
        }, '*');
        console.log('[Toolbar] 已发送 YANZHI_YOULI_OPEN_HISTORY 消息');
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

// 暴露 FloatingToolbar 类到全局
console.log('[Toolbar] 即将暴露 FloatingToolbar 类');
window.FloatingToolbar = FloatingToolbar;
console.log('[Toolbar] 已暴露 FloatingToolbar 类:', !!window.FloatingToolbar);

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
    
    // 暴露 FloatingToolbar 类到全局，供 content-script.js 初始化控制
    window.FloatingToolbar = FloatingToolbar;
}