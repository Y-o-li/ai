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
 * 缓存管理类
 */
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100;
    }

    get(key) {
        return this.cache.get(key);
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
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
