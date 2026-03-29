// =============================================================================
// 结果展示卡片组件
// =============================================================================
// 描述: 显示大模型处理结果（事实核查、语义总结、中性化改写）的卡片UI
// =============================================================================

class ResultCard {
    constructor() {
        this.card = null;
        this.id = `yz-result-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.isVisible = false;
        this.currentResult = null;
        this.currentType = null;
        this.currentTheme = 'light'; // 当前主题
        
        // 拖动相关状态
        this.isDragging = false;
        this.hasDragged = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // 缩放相关状态
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.minWidth = 400;
        this.minHeight = 300;
        
        // 元素引用
        this.header = null;
        this.iconEl = null;
        this.titleEl = null;
        this.resultEl = null;
        this.loadingEl = null;
        this.copyBtn = null;
        
        // 初始化主题
        this.initTheme();
        
        // 类型配置
        this.typeConfig = {
            factCheck: {
                title: '事实核查结果',
                icon: '✓',
                color: '#4CAF50',
                gradient: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
            },
            summarize: {
                title: '语义总结',
                icon: '☰',
                color: '#2196F3',
                gradient: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'
            },
            neutralize: {
                title: '中性化改写',
                icon: '◐',
                color: '#FF9800',
                gradient: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
            }
        };

        this.init();
        this.escHandler = this.handleEsc.bind(this);
        this.startDrag = this.startDrag.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.endDrag = this.endDrag.bind(this);
        this.startResize = this.startResize.bind(this);
        this.onResize = this.onResize.bind(this);
        this.endResize = this.endResize.bind(this);
    }
    
    /**
     * 初始化主题
     */
    initTheme() {
        this.currentTheme = 'light';
        
        // 检查页面是否有暗色主题类
        if (document.documentElement.classList.contains('yz-dark-theme')) {
            this.currentTheme = 'dark';
        }
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题模式 ('light' | 'dark')
     */
    setTheme(theme) {
        if (this.currentTheme === theme) return;
        
        this.currentTheme = theme;
        
        if (!this.card) return;
        
        if (theme === 'dark') {
            this.card.classList.add('yz-result-card-dark');
        } else {
            this.card.classList.remove('yz-result-card-dark');
        }
        
        console.log('🎨 结果卡片主题已切换:', theme);
    }

    /**
     * 初始化卡片
     */
    init() {
        this.createCard();
    }

    /**
     * 创建卡片DOM
     */
    createCard() {
        // 创建卡片容器
        this.card = document.createElement('div');
        this.card.id = this.id;
        this.card.className = 'yz-result-card';
        
        const defaultWidth = 480;
        const defaultHeight = 600;
        
        Object.assign(this.card.style, {
            position: 'fixed',
            background: '#fff',
            borderRadius: 'var(--yz-border-radius-md)',  // 使用 CSS 变量
            boxShadow: '0 25px 50px -12px var(--yz-shadow-heavy)',
            zIndex: '2147483646',
            display: 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: 'none'
            // 移除 opacity 和 transition，让 CSS 动画生效
        });

        // 使用 setProperty 设置宽高，以覆盖 CSS 中的 !important
        this.card.style.setProperty('width', `${defaultWidth}px`, 'important');
        this.card.style.setProperty('height', `${defaultHeight}px`, 'important');

        // 创建头部
        this.header = this.createHeader();
        this.card.appendChild(this.header);

        // 创建内容区域
        const content = this.createContent();
        this.card.appendChild(content);

        // 创建底部操作栏
        const footer = this.createFooter();
        this.card.appendChild(footer);

        // 创建缩放手柄
        const resizeHandle = this.createResizeHandle();
        this.card.appendChild(resizeHandle);

        document.body.appendChild(this.card);
    }

    /**
     * 创建头部
     * @returns {HTMLElement} 头部元素
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'yz-result-header';
        
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: '16px 16px 0 0',
            cursor: 'move',
            userSelect: 'none'
        });

        // 使用箭头函数保持 this 上下文
        header.addEventListener('mousedown', (e) => this.startDrag(e));

        // 左侧：拖动手柄 + 标题
        const leftArea = document.createElement('div');
        leftArea.style.display = 'flex';
        leftArea.style.alignItems = 'center';
        leftArea.style.gap = '10px';
        leftArea.style.pointerEvents = 'none';

        // 拖动手柄
        const dragHandle = document.createElement('div');
        dragHandle.innerHTML = '⋮⋮';
        Object.assign(dragHandle.style, {
            fontSize: '14px',
            lineHeight: '1',
            letterSpacing: '-2px',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'move'
        });
        leftArea.appendChild(dragHandle);

        this.iconEl = document.createElement('span');
        this.iconEl.className = 'yz-result-icon';
        this.iconEl.style.fontSize = '20px';
        leftArea.appendChild(this.iconEl);

        this.titleEl = document.createElement('h3');
        this.titleEl.className = 'yz-result-title';
        this.titleEl.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600;';
        leftArea.appendChild(this.titleEl);

        header.appendChild(leftArea);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#fff',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto'
        });

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });

        header.appendChild(closeBtn);

        return header;
    }

    /**
     * 创建内容区域
     * @returns {HTMLElement} 内容元素
     */
    createContent() {
        const content = document.createElement('div');
        content.className = 'yz-result-content';
        
        Object.assign(content.style, {
            padding: '20px',
            overflowY: 'auto',
            flex: '1',
            lineHeight: '1.7',
            fontSize: '14px',
            color: '#000',
            fontWeight: '500'
        });

        // 加载状态
        this.loadingEl = document.createElement('div');
        this.loadingEl.className = 'yz-loading';
        this.loadingEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px;">
                <div class="yz-spinner" style="
                    width: 24px;
                    height: 24px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    animation: yz-spin 1s linear infinite;
                "></div>
                <span style="color: #666;">正在处理中...</span>
            </div>
        `;
        
        this.loadingEl.style.display = 'none';
        content.appendChild(this.loadingEl);

        // 结果文本
        this.resultEl = document.createElement('div');
        this.resultEl.className = 'yz-result-text';
        content.appendChild(this.resultEl);

        return content;
    }

    /**
     * 创建底部操作栏
     * @returns {HTMLElement} 底部元素
     */
    createFooter() {
        const footer = document.createElement('div');
        
        Object.assign(footer.style, {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            background: '#f8f9fa'
        });

        // 复制按钮
        this.copyBtn = document.createElement('button');
        this.copyBtn.className = 'yz-copy-btn';
        this.copyBtn.innerHTML = '📋 复制结果';
        Object.assign(this.copyBtn.style, {
            padding: '10px 20px',
            border: '1px solid #ddd',
            background: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#333',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        });

        this.copyBtn.addEventListener('mouseenter', () => {
            this.copyBtn.style.background = '#f5f5f5';
        });
        this.copyBtn.addEventListener('mouseleave', () => {
            this.copyBtn.style.background = '#fff';
        });
        this.copyBtn.addEventListener('click', () => this.copyResult());

        footer.appendChild(this.copyBtn);

        return footer;
    }

    /**
     * 创建缩放手柄
     * @returns {HTMLElement} 缩放手柄元素
     */
    createResizeHandle() {
        const handle = document.createElement('div');
        handle.className = 'yz-resize-handle';
        
        Object.assign(handle.style, {
            position: 'absolute',
            right: '0',
            bottom: '0',
            width: '20px',
            height: '20px',
            cursor: 'nwse-resize',
            background: 'linear-gradient(135deg, transparent 50%, rgba(102, 126, 234, 0.5) 50%)',
            borderRadius: '0 0 16px 0',
            zIndex: '10'
        });

        // 使用箭头函数或者 bind 来保持 this 上下文
        handle.addEventListener('mousedown', (e) => this.startResize(e));

        return handle;
    }

    /**
     * 开始拖动
     */
    startDrag(e) {
        if (e.target.closest('button')) return;

        this.isDragging = true;
        this.hasDragged = false;

        const rect = this.card.getBoundingClientRect();
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        this.card.style.transition = 'none';
        document.body.style.cursor = 'move';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('mouseup', this.endDrag);

        e.preventDefault();
    }

    /**
     * 拖动中
     */
    onDrag(e) {
        if (!this.isDragging) return;

        const deltaX = Math.abs(e.clientX - this.dragStartX);
        const deltaY = Math.abs(e.clientY - this.dragStartY);
        if (deltaX > 3 || deltaY > 3) {
            this.hasDragged = true;
        }

        let left = e.clientX - this.dragOffsetX;
        let top = e.clientY - this.dragOffsetY;

        const cardWidth = this.card.offsetWidth;
        const cardHeight = this.card.offsetHeight;
        const maxLeft = window.innerWidth - cardWidth;
        const maxTop = window.innerHeight - cardHeight;

        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));

        this.card.style.setProperty('left', `${left}px`, 'important');
        this.card.style.setProperty('top', `${top}px`, 'important');

        e.preventDefault();
    }

    /**
     * 结束拖动
     */
    endDrag(e) {
        if (!this.isDragging) return;

        this.isDragging = false;

        this.card.style.transition = 'opacity 0.3s ease';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.endDrag);

        setTimeout(() => {
            this.hasDragged = false;
        }, 100);

        e.preventDefault();
    }

    /**
     * 开始缩放
     */
    startResize(e) {
        console.log('[ResultCard] 开始缩放');
        this.isResizing = true;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.startWidth = this.card.offsetWidth;
        this.startHeight = this.card.offsetHeight;

        this.card.style.transition = 'none';
        document.body.style.cursor = 'nwse-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', this.onResize);
        document.addEventListener('mouseup', this.endResize);

        e.stopPropagation();
        e.preventDefault();
    }

    /**
     * 缩放中
     */
    onResize(e) {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;

        let newWidth = this.startWidth + deltaX;
        let newHeight = this.startHeight + deltaY;

        newWidth = Math.max(this.minWidth, Math.min(newWidth, window.innerWidth - 40));
        newHeight = Math.max(this.minHeight, Math.min(newHeight, window.innerHeight - 40));

        console.log('[ResultCard] 缩放中:', newWidth, newHeight);
        this.card.style.setProperty('width', `${newWidth}px`, 'important');
        this.card.style.setProperty('height', `${newHeight}px`, 'important');

        e.preventDefault();
    }

    /**
     * 结束缩放
     */
    endResize(e) {
        if (!this.isResizing) return;

        console.log('[ResultCard] 结束缩放');
        this.isResizing = false;

        this.card.style.transition = 'opacity 0.3s ease';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        document.removeEventListener('mousemove', this.onResize);
        document.removeEventListener('mouseup', this.endResize);

        e.preventDefault();
    }

    /**
     * 显示结果卡片
     * @param {string} result - 处理结果
     * @param {string} type - 处理类型
     */
    show(result, type) {
        const config = this.typeConfig[type];
        if (!config) return;

        this.currentResult = result;
        this.currentType = type;

        // 更新头部样式
        if (this.header) {
            this.header.style.background = config.gradient;
        }

        // 更新标题和图标
        if (this.iconEl) this.iconEl.textContent = config.icon;
        if (this.titleEl) this.titleEl.textContent = config.title;

        // 更新内容
        if (this.resultEl) {
            this.resultEl.innerHTML = this.formatResult(result, type);
        }
        
        // 隐藏加载，显示结果
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.resultEl) this.resultEl.style.display = 'block';

        // 每次打开都重置为默认大小
        const defaultWidth = 480;
        const defaultHeight = 600;
        this.card.style.setProperty('width', `${defaultWidth}px`, 'important');
        this.card.style.setProperty('height', `${defaultHeight}px`, 'important');

        // 每次打开都重置为默认位置：完全居中
        const left = Math.max(20, (window.innerWidth - defaultWidth) / 2);
        const top = Math.max(20, (window.innerHeight - defaultHeight) / 2);
        this.card.style.setProperty('left', `${left}px`, 'important');
        this.card.style.setProperty('top', `${top}px`, 'important');

        // 显示卡片
        this.card.style.display = 'flex';

        // 触发动画 - 添加动画类
        this.card.classList.add('yz-result-card-animate');

        // 动画结束后移除类（便于下次重新播放）
        setTimeout(() => {
            this.card.classList.remove('yz-result-card-animate');
        }, 300); // 与动画时长一致

        // 添加 Esc 监听
        document.addEventListener('keydown', this.escHandler);

        this.isVisible = true;
    }

    /**
     * 处理 Esc 键关闭卡片
     */
    handleEsc(e) {
        if (e.key === 'Escape' && this.isVisible) {
            this.hide();
        }
    }

    /**
     * 显示加载状态
     * @param {string} type - 处理类型
     */
    showLoading(type) {
        const config = this.typeConfig[type];
        if (!config) return;

        this.currentType = type;

        // 更新头部
        if (this.header) {
            this.header.style.background = config.gradient;
        }
        if (this.iconEl) this.iconEl.textContent = config.icon;
        if (this.titleEl) this.titleEl.textContent = config.title;

        // 显示加载
        if (this.loadingEl) this.loadingEl.style.display = 'block';
        if (this.resultEl) this.resultEl.style.display = 'none';

        // 每次打开都重置为默认大小
        const defaultWidth = 480;
        const defaultHeight = 600;
        this.card.style.setProperty('width', `${defaultWidth}px`, 'important');
        this.card.style.setProperty('height', `${defaultHeight}px`, 'important');

        // 每次打开都重置为默认位置：完全居中
        const left = Math.max(20, (window.innerWidth - defaultWidth) / 2);
        const top = Math.max(20, (window.innerHeight - defaultHeight) / 2);
        this.card.style.setProperty('left', `${left}px`, 'important');
        this.card.style.setProperty('top', `${top}px`, 'important');

        // 显示卡片
        this.card.style.display = 'flex';

        // 触发动画 - 添加动画类
        this.card.classList.add('yz-result-card-animate');

        // 动画结束后移除类
        setTimeout(() => {
            this.card.classList.remove('yz-result-card-animate');
        }, 300);

        this.isVisible = true;
    }

    /**
     * 隐藏卡片
     */
    hide() {
        if (!this.isVisible) return;

        // 移除 Esc 监听
        document.removeEventListener('keydown', this.escHandler);
        
        // 添加淡出动画类
        this.card.style.transition = 'opacity 0.3s ease';
        this.card.style.opacity = '0';

        setTimeout(() => {
            this.card.style.display = 'none';
            this.card.style.opacity = '';  // 清空内联样式
            this.card.style.transition = '';  // 清空内联样式
        }, 300);

        this.isVisible = false;
    }

    /**
     * 显示错误信息
     * @param {string} error - 错误信息
     * @param {string} [suggestion] - 建议操作（可选）
     * @param {boolean} [retryable] - 是否可重试（可选）
     */
    showError(error, suggestion = '', retryable = false) {
        const config = this.typeConfig[this.currentType];
        
        // 隐藏加载
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        
        // 显示错误内容
        if (this.resultEl) {
            this.resultEl.style.display = 'block';
            this.resultEl.innerHTML = `
                <div style="color: #f44336; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                    <div style="font-weight: bold; margin-bottom: 10px; font-size: 18px;">调用失败</div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 15px;">${error}</div>
                    ${suggestion ? `<div style="font-size: 13px; color: #999; background: #fff3cd; padding: 10px; border-radius: 6px; border-left: 3px solid #ffc107;">💡 ${suggestion}</div>` : ''}
                    ${retryable ? `<button onclick="if (window.toolbar && window.toolbar.retryLLMCall) { window.toolbar.retryLLMCall('${this.id}') }" style="margin-top: 15px; padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">🔄 重试</button>` : ''}
                </div>
            `;
        }
        
        // 显示卡片
        this.card.style.display = 'flex';
        this.isVisible = true;
    }

    /**
     * 格式化结果显示
     * @param {string} result - 原始结果
     * @param {string} type - 处理类型
     * @returns {string} 格式化后的 HTML
     */
    formatResult(result, type) {
        // 检查是否是 JSON 格式
        let processedResult = result;
        try {
            const parsed = JSON.parse(result);
            // 如果是 JSON，转换为更友好的格式
            if (typeof parsed === 'object' && parsed !== null) {
                processedResult = this.formatJSONResult(parsed, type);
            }
        } catch (e) {
            // 不是 JSON，保持原样
        }

        // 简单的 Markdown 格式转换
        let formatted = processedResult
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1976D2;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
            .replace(/\n/g, '<br>');

        // 根据类型添加特殊样式
        if (type === 'factCheck') {
            // 可信度高亮
            formatted = formatted.replace(
                /(可信度 [：:]\s*)(\d+%?)/g,
                '$1<span style="color: #4CAF50; font-weight: bold;">$2</span>'
            );
        }

        return formatted;
    }

    /**
     * 格式化JSON结果
     * @param {Object} json - 解析后的JSON对象
     * @param {string} type - 处理类型
     * @returns {string} 格式化后的文本
     */
    formatJSONResult(json, type) {
        if (type === 'factCheck') {
            // 事实核查结果的特殊处理
            let result = '';
            if (json['事实准确性']) {
                result += `**事实准确性**：${json['事实准确性']}<br>`;
            }
            if (json['可信度评估']) {
                result += `**可信度评估**：${json['可信度评估']}<br>`;
            }
            if (json['潜在偏见']) {
                result += `**潜在偏见**：${json['潜在偏见']}<br>`;
            }
            if (json['建议']) {
                result += `**建议**：${json['建议']}<br>`;
            }
            // 处理其他可能的字段
            for (const [key, value] of Object.entries(json)) {
                if (!['事实准确性', '可信度评估', '潜在偏见', '建议'].includes(key)) {
                    result += `**${key}**：${value}<br>`;
                }
            }
            return result || JSON.stringify(json);
        } else {
            // 其他类型的JSON结果
            return JSON.stringify(json, null, 2);
        }
    }

    /**
     * 复制结果到剪贴板
     */
    async copyResult() {
        if (!this.currentResult) return;

        try {
            await navigator.clipboard.writeText(this.currentResult);
            
            if (this.copyBtn) {
                const originalText = this.copyBtn.innerHTML;
                this.copyBtn.innerHTML = '✓ 已复制';
                this.copyBtn.style.background = '#4CAF50';
                this.copyBtn.style.color = '#fff';
                this.copyBtn.style.borderColor = '#4CAF50';

                setTimeout(() => {
                    if (this.copyBtn) {
                        this.copyBtn.innerHTML = originalText;
                        this.copyBtn.style.background = '#fff';
                        this.copyBtn.style.color = '#333';
                        this.copyBtn.style.borderColor = '#ddd';
                    }
                }, 2000);
            }
        } catch (err) {
            console.error('复制失败:', err);
        }
    }
}

// 结果卡片管理器
class ResultCardManager {
    constructor() {
        this.cards = [];
    }

    /**
     * 创建并显示新的结果卡片
     * @param {string} result - 处理结果
     * @param {string} type - 处理类型
     * @returns {ResultCard} 新创建的卡片实例
     */
    createCard(result, type) {
        const card = new ResultCard();
        card.show(result, type);
        this.cards.push(card);
        return card;
    }

    /**
     * 显示加载状态的卡片
     * @param {string} type - 处理类型
     * @returns {ResultCard} 新创建的卡片实例
     */
    createLoadingCard(type) {
        const card = new ResultCard();
        card.showLoading(type);
        this.cards.push(card);
        return card;
    }

    /**
     * 移除卡片
     * @param {ResultCard} card - 要移除的卡片实例
     */
    removeCard(card) {
        const index = this.cards.indexOf(card);
        if (index !== -1) {
            this.cards.splice(index, 1);
        }
    }

    /**
     * 关闭所有卡片
     */
    closeAllCards() {
        this.cards.forEach(card => card.hide());
        this.cards = [];
    }

    /**
     * 根据ID获取卡片
     * @param {string} cardId - 卡片ID
     * @returns {ResultCard|null} 卡片实例或null
     */
    getCardById(cardId) {
        return this.cards.find(card => card.id === cardId) || null;
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.ResultCard = ResultCard;
    window.resultCardManager = new ResultCardManager();
    // 为了向后兼容，保留旧的resultCard实例
    window.resultCard = new ResultCard();
}
