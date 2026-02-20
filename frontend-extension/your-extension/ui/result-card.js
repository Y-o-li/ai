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
        
        Object.assign(this.card.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0.9)',
            width: '480px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            zIndex: '2147483646',
            display: 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            opacity: '0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        });

        // 创建头部
        const header = this.createHeader();
        this.card.appendChild(header);

        // 创建内容区域
        const content = this.createContent();
        this.card.appendChild(content);

        // 创建底部操作栏
        const footer = this.createFooter();
        this.card.appendChild(footer);

        // 添加遮罩层
        this.overlay = document.createElement('div');
        this.overlay.id = 'yz-result-overlay';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: '2147483645',
            display: 'none',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        this.overlay.addEventListener('click', () => this.hide());

        document.body.appendChild(this.overlay);
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
            borderRadius: '16px 16px 0 0'
        });

        // 左侧标题
        const titleArea = document.createElement('div');
        titleArea.style.display = 'flex';
        titleArea.style.alignItems = 'center';
        titleArea.style.gap = '10px';

        const icon = document.createElement('span');
        icon.id = 'yz-result-icon';
        icon.style.fontSize = '20px';
        titleArea.appendChild(icon);

        const title = document.createElement('h3');
        title.id = 'yz-result-title';
        title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600;';
        titleArea.appendChild(title);

        header.appendChild(titleArea);

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
            transition: 'all 0.2s ease'
        });

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        closeBtn.addEventListener('click', () => this.hide());

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
            maxHeight: 'calc(80vh - 140px)',
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
        
        // 添加旋转动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes yz-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
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

        // 显示遮罩和卡片
        if (this.overlay) {
            this.overlay.style.display = 'block';
        }
        if (this.card) {
            this.card.style.display = 'flex';
        }

        // 触发动画
        requestAnimationFrame(() => {
            if (this.overlay) this.overlay.style.opacity = '1';
            if (this.card) {
                this.card.style.opacity = '1';
                this.card.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        });


        // 添加 Esc 监听
        document.addEventListener('keydown', this.escHandler);

        this.isVisible = true;
        console.log('卡片显示成功', type);

        
    }
    /**
     * 处理 Esc 键关闭卡片
     * @param {KeyboardEvent} e 
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
        header.style.background = config.gradient;
        document.getElementById('yz-result-icon').textContent = config.icon;
        document.getElementById('yz-result-title').textContent = config.title;

        // 显示加载
        this.loadingEl.style.display = 'block';
        this.resultEl.style.display = 'none';

        // 显示遮罩和卡片
        this.overlay.style.display = 'block';
        this.card.style.display = 'flex';

        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
            this.card.style.opacity = '1';
            this.card.style.transform = 'translate(-50%, -50%) scale(1)';
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
        this.card.style.transform = 'translate(-50%, -50%) scale(0.9)';
        this.overlay.style.opacity = '0';

        setTimeout(() => {
            this.card.style.display = 'none';
            this.overlay.style.display = 'none';
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
