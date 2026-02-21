// =============================================================================
// 结果展示卡片组件
// =============================================================================
// 描述: 显示大模型处理结果（事实核查、语义总结、中性化改写）的卡片UI
// =============================================================================

class ResultCard {
    constructor() {
        this.card = null;
        this.isVisible = false;
        this.currentResult = null;
        this.currentType = null;
        
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
        this.card.id = 'yz-result-card';
        this.card.className = 'yz-result-card';
        
        const defaultWidth = 480;
        const defaultHeight = 600;
        
        Object.assign(this.card.style, {
            position: 'fixed',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            zIndex: '2147483646',
            display: 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            userSelect: 'none'
        });

        // 使用 setProperty 设置宽高，以覆盖 CSS 中的 !important
        this.card.style.setProperty('width', `${defaultWidth}px`, 'important');
        this.card.style.setProperty('height', `${defaultHeight}px`, 'important');

        // 创建头部
        const header = this.createHeader();
        this.card.appendChild(header);

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
        header.id = 'yz-result-header';
        
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

        const icon = document.createElement('span');
        icon.id = 'yz-result-icon';
        icon.style.fontSize = '20px';
        leftArea.appendChild(icon);

        const title = document.createElement('h3');
        title.id = 'yz-result-title';
        title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600;';
        leftArea.appendChild(title);

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
        content.id = 'yz-result-content';
        
        Object.assign(content.style, {
            padding: '20px',
            overflowY: 'auto',
            flex: '1',
            lineHeight: '1.7',
            fontSize: '14px',
            color: '#333'
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
        this.resultEl.id = 'yz-result-text';
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
        const copyBtn = document.createElement('button');
        copyBtn.id = 'yz-copy-btn';
        copyBtn.innerHTML = '📋 复制结果';
        Object.assign(copyBtn.style, {
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

        copyBtn.addEventListener('mouseenter', () => {
            copyBtn.style.background = '#f5f5f5';
        });
        copyBtn.addEventListener('mouseleave', () => {
            copyBtn.style.background = '#fff';
        });
        copyBtn.addEventListener('click', () => this.copyResult());

        footer.appendChild(copyBtn);

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
        const header = document.getElementById('yz-result-header');
        if (header) {
            header.style.background = config.gradient;
        }

        // 更新标题和图标
        const iconEl = document.getElementById('yz-result-icon');
        const titleEl = document.getElementById('yz-result-title');
        if (iconEl) iconEl.textContent = config.icon;
        if (titleEl) titleEl.textContent = config.title;

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

        // 触发动画
        requestAnimationFrame(() => {
            this.card.style.opacity = '1';
        });

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
        const header = document.getElementById('yz-result-header');
        if (header) {
            header.style.background = config.gradient;
        }
        const iconEl = document.getElementById('yz-result-icon');
        const titleEl = document.getElementById('yz-result-title');
        if (iconEl) iconEl.textContent = config.icon;
        if (titleEl) titleEl.textContent = config.title;

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

        requestAnimationFrame(() => {
            this.card.style.opacity = '1';
        });

        this.isVisible = true;
    }

    /**
     * 隐藏卡片
     */
    hide() {
        if (!this.isVisible) return;

        // 移除 Esc 监听
        document.removeEventListener('keydown', this.escHandler);
        
        this.card.style.opacity = '0';

        setTimeout(() => {
            this.card.style.display = 'none';
        }, 300);

        this.isVisible = false;
    }

    /**
     * 格式化结果显示
     * @param {string} result - 原始结果
     * @param {string} type - 处理类型
     * @returns {string} 格式化后的HTML
     */
    formatResult(result, type) {
        // 简单的Markdown格式转换
        let formatted = result
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1976D2;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
            .replace(/\n/g, '<br>');

        // 根据类型添加特殊样式
        if (type === 'factCheck') {
            // 可信度高亮
            formatted = formatted.replace(
                /(可信度[：:]\s*)(\d+%?)/g,
                '$1<span style="color: #4CAF50; font-weight: bold;">$2</span>'
            );
        }

        return formatted;
    }

    /**
     * 复制结果到剪贴板
     */
    async copyResult() {
        if (!this.currentResult) return;

        try {
            await navigator.clipboard.writeText(this.currentResult);
            
            const copyBtn = document.getElementById('yz-copy-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✓ 已复制';
            copyBtn.style.background = '#4CAF50';
            copyBtn.style.color = '#fff';
            copyBtn.style.borderColor = '#4CAF50';

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '#fff';
                copyBtn.style.color = '#333';
                copyBtn.style.borderColor = '#ddd';
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.resultCard = new ResultCard();
}
