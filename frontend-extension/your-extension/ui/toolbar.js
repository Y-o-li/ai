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
            }
        ];
        
        this.init();
    }

    /**
     * 初始化工具栏
     */
    async init() {
        // 先监听配置消息（因为 toolbar.js 是动态注入的，无法直接访问 chrome.storage）
        this.listenForConfig();
        
        // 尝试加载配置（如果 chrome API 可用）
        await this.loadConfig();
        
        this.createToolbar();
        this.bindEvents();

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
            // 配置消息（来自 content-script）
            if (event.data && event.data.type === 'YANZHI_YOULI_CONFIG' && event.data.config) {
                console.log('[Toolbar] 收到配置消息:', event.data.config);

                if (event.data.config.alwaysShowToolbar !== undefined) {
                    this.alwaysShow = event.data.config.alwaysShowToolbar;
                    this.configLoaded = true;
                    console.log('[Toolbar] 配置已更新，alwaysShowToolbar:', this.alwaysShow);

                    // 如果工具栏已创建，根据新配置更新显示状态
                    if (this.toolbar) {
                        if (this.alwaysShow && !this.isVisible) {
                            console.log('[Toolbar] 启用常驻模式');
                            this.showAtDefaultPosition();
                        } else if (!this.alwaysShow && this.isVisible) {
                            // 如果关闭常驻模式，隐藏工具栏
                            this.hide();
                        }
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
            // 注意：toolbar.js 是动态注入到页面的脚本，运行在页面上下文中
            // 无法直接访问 chrome.storage API，这是正常行为
            if (typeof chrome === 'undefined' || !chrome.storage) {
                // 使用全局配置作为后备方案（由 content-script 设置）
                if (window.yanzhiYouliConfig && window.yanzhiYouliConfig.alwaysShowToolbar !== undefined) {
                    this.alwaysShow = window.yanzhiYouliConfig.alwaysShowToolbar;
                    console.log('[Toolbar] 从全局配置读取 alwaysShowToolbar:', this.alwaysShow);
                } else {
                    // 如果全局配置也未设置，等待 content-script 通过 postMessage 发送配置
                    this.alwaysShow = false;
                    console.log('[Toolbar] 等待 content-script 发送配置...');
                }
                this.configLoaded = true;
                return;
            }

            // 如果 chrome.storage 可用（理论上不应该发生，但保留作为备用）
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
            this.configLoaded = true;
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

        // 如果有保存的位置，优先使用保存的位置
        if (this.savedPosition) {
            this.applySavedPosition();
        } else {
            this.toolbar.style.position = 'fixed';
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

            this.toolbar.style.position = 'fixed';
            this.toolbar.style.left = `${validLeft}px`;
            this.toolbar.style.top = `${validTop}px`;
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

        // 滚动时更新位置（保持屏幕相对位置不变）
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        window.addEventListener('resize', () => this.handleResize(), { passive: true });
    }

    /**
     * 处理滚动事件 - 确保工具栏始终在屏幕可见范围内
     */
    handleScroll() {
        if (!this.isVisible || !this.toolbar) return;

        // 如果工具栏使用 absolute 定位，需要检查是否滑出屏幕
        if (this.toolbar.style.position === 'absolute') {
            this.keepToolbarInView();
        }

        // 如果有选中的文本，更新位置跟随选中文本
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !this.alwaysShow) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // 检查选中文本是否还在视窗内
            if (rect.width > 0 && rect.height > 0) {
                this.updatePositionFromSelection(rect);
            } else {
                // 选中文本已不在视窗内，隐藏工具栏（非常驻模式）
                if (!this.alwaysShow) {
                    this.hide();
                }
            }
        } else if (!this.alwaysShow && !selection.toString().trim()) {
            // 没有选中文本且非常驻模式，隐藏工具栏
            this.hide();
        }
    }

    /**
     * 保持工具栏在屏幕可见范围内
     */
    keepToolbarInView() {
        if (!this.toolbar) return;

        const rect = this.toolbar.getBoundingClientRect();
        const toolbarWidth = this.toolbar.offsetWidth;
        const toolbarHeight = this.toolbar.offsetHeight;
        
        let needsUpdate = false;
        let newLeft = parseFloat(this.toolbar.style.left) || 0;
        let newTop = parseFloat(this.toolbar.style.top) || 0;

        // 检查是否滑出顶部
        if (rect.top < 10) {
            newTop = window.scrollY + 10;
            needsUpdate = true;
        }
        
        // 检查是否滑出底部
        if (rect.bottom > window.innerHeight - 10) {
            newTop = window.scrollY + window.innerHeight - toolbarHeight - 10;
            needsUpdate = true;
        }

        // 检查是否滑出左侧
        if (rect.left < 10) {
            newLeft = 10;
            needsUpdate = true;
        }

        // 检查是否滑出右侧
        if (rect.right > window.innerWidth - 10) {
            newLeft = window.innerWidth - toolbarWidth - 10;
            needsUpdate = true;
        }

        // 如果需要调整位置，平滑移动
        if (needsUpdate) {
            this.toolbar.style.left = `${newLeft}px`;
            this.toolbar.style.top = `${newTop}px`;
        }
    }

    /**
     * 处理窗口大小变化事件
     */
    handleResize() {
        if (!this.isVisible || !this.toolbar) return;

        // 确保工具栏在视窗内
        this.keepToolbarInView();

        // 如果有选中的文本，更新位置
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !this.alwaysShow) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.updatePositionFromSelection(rect);
            }
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
        // 不需要加上 window.scrollY
        this.updatePositionFromSelection(rect);
        
        this.toolbar.style.display = 'flex';
        
        // 应用保存的位置（如果有，且不是常驻模式）
        if (this.savedPosition && !this.alwaysShow) {
            this.applySavedPosition();
        }
        
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

        // 计算位置（使用 fixed 定位，相对于视窗）
        const toolbarWidth = 180;
        const toolbarHeight = 60;
        
        let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
        let top = rect.top - toolbarHeight - 10; // 不需要 window.scrollY
        
        // 边界检查
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = window.innerWidth - toolbarWidth - 10;
        }
        // 如果上方空间不足，显示在下方
        if (top < 10) {
            top = rect.bottom + 10;
        }
        // 确保不超出视窗底部
        if (top + toolbarHeight > window.innerHeight - 10) {
            top = window.innerHeight - toolbarHeight - 10;
        }

        this.toolbar.style.position = 'fixed';
        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.top = `${top}px`;
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
