// =============================================================================
// 工具函数库
// =============================================================================
// 描述: 提供文本处理、DOM操作等通用工具函数
// =============================================================================

/**
 * 文本处理工具类
 */
class TextUtils {
    /**
     * 获取指定元素下的所有文本节点
     * @param {Element} element - 要搜索的根元素
     * @returns {Array<Node>} 文本节点数组
     */
    static getTextNodes(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const nodes = [];
        let node;
        
        while (node = walker.nextNode()) {
            if (node.textContent.trim().length > 0) {
                nodes.push(node);
            }
        }
        
        return nodes;
    }

    /**
     * 检查节点是否在可编辑区域
     * @param {Node} node - 要检查的节点
     * @returns {boolean} 是否在可编辑区域
     */
    static isInEditableArea(node) {
        const editableElements = ['INPUT', 'TEXTAREA', 'SELECT'];
        let parent = node.parentElement;
        
        while (parent) {
            if (editableElements.includes(parent.tagName) || 
                parent.isContentEditable ||
                parent.getAttribute('role') === 'textbox') {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }

    /**
     * 检查节点是否已被高亮
     * @param {Node} node - 要检查的节点
     * @returns {boolean} 是否已高亮
     */
    static isHighlighted(node) {
        const parent = node.parentElement;
        return parent && (
            parent.classList.contains('inciting-text') ||
            parent.classList.contains('yz-highlighted')
        );
    }

    /**
     * 转义正则表达式特殊字符
     * @param {string} string - 要转义的字符串
     * @returns {string} 转义后的字符串
     */
    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * 缓存管理类（支持 TTL 和 LRU）
 */
class CacheManager {
    constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL; // 默认 5 分钟
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * 获取缓存值
     * @param {string} key - 缓存键
     * @returns {*} 缓存值，如果不存在或已过期则返回 undefined
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return undefined;
        }
        
        // 检查是否过期
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }
        
        // 更新访问顺序（LRU）
        this.cache.delete(key);
        this.cache.set(key, item);
        this.hits++;
        return item.value;
    }

    /**
     * 设置缓存值
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @param {number} [ttl] - 可选的 TTL（毫秒），不传则使用默认值
     */
    set(key, value, ttl) {
        // 如果缓存已满，删除最旧的项
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            expiry: Date.now() + (ttl || this.defaultTTL)
        });
    }

    /**
     * 检查键是否存在且未过期
     * @param {string} key - 缓存键
     * @returns {boolean}
     */
    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * 清理所有过期的缓存项
     * @returns {number} 清理的项目数量
     */
    cleanup() {
        const now = Date.now();
        let count = 0;
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) : 0,
            avgTTL: this.defaultTTL
        };
    }
}

/**
 * DOM操作工具类
 */
class DOMUtils {
    /**
     * 创建带样式的元素
     * @param {string} tag - 标签名
     * @param {Object} styles - 样式对象
     * @param {Object} attrs - 属性对象
     * @returns {Element} 创建的元素
     */
    static createElement(tag, styles = {}, attrs = {}) {
        const el = document.createElement(tag);
        Object.assign(el.style, styles);
        Object.entries(attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
        return el;
    }

    /**
     * 获取选中文本的坐标位置
     * @returns {Object|null} 位置对象 {x, y, width, height}
     */
    static getSelectionCoords() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            right: rect.right + window.scrollX
        };
    }

    /**
     * 获取选中的文本
     * @returns {string} 选中的文本
     */
    static getSelectedText() {
        const selection = window.getSelection();
        return selection.toString().trim();
    }

    /**
     * 清除文本选择
     */
    static clearSelection() {
        const selection = window.getSelection();
        selection.removeAllRanges();
    }
}

// 导出工具类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TextUtils, CacheManager, DOMUtils };
}
