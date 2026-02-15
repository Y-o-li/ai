// =============================================================================
// 文本选择与浮动工具栏处理模块
// =============================================================================
// 描述: 监听用户选中文本，触发浮动工具栏显示
// =============================================================================

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        minSelectionLength: 6,
        maxSelectionLength: 5000,
        toolbarDelay: 200
    };

    // 状态
    let isProcessing = false;
    let hideTimeout = null;

    /**
     * 获取选中的文本
     * @returns {string} 选中的文本
     */
    function getSelectedText() {
        const selection = window.getSelection();
        return selection.toString().trim();
    }

    /**
     * 获取选区的坐标位置
     * @returns {Object|null} 位置对象
     */
    function getSelectionCoords() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 检查选区是否可见
        if (rect.width === 0 || rect.height === 0) return null;

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
     * 检查是否应该显示工具栏
     * @returns {boolean}
     */
    function shouldShowToolbar() {
        const text = getSelectedText();
        return text.length >= CONFIG.minSelectionLength &&
               text.length <= CONFIG.maxSelectionLength;
    }

    /**
     * 显示工具栏
     */
    function showToolbar() {
        if (typeof window.floatingToolbar === 'undefined') {
            console.warn('⚠️ 浮动工具栏未加载');
            return;
        }

        const coords = getSelectionCoords();
        if (!coords) return;

        window.floatingToolbar.currentSelection = getSelectedText();
        window.floatingToolbar.show();
    }

    /**
     * 隐藏工具栏
     */
    function hideToolbar() {
        if (typeof window.floatingToolbar === 'undefined') return;

        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            window.floatingToolbar.hide();
        }, CONFIG.toolbarDelay);
    }

    /**
     * 处理文本选择事件
     */
    function handleSelection() {
        if (isProcessing) return;

        clearTimeout(hideTimeout);

        const text = getSelectedText();
        if (text.length >= CONFIG.minSelectionLength) {
            // 延迟显示，避免快速拖动时的闪烁
            setTimeout(() => {
                if (getSelectedText() === text) {
                    showToolbar();
                }
            }, 100);
        } else {
            hideToolbar();
        }
    }

    /**
     * 处理鼠标按下事件
     */
    function handleMouseDown(e) {
        // 如果点击在工具栏内，不处理
        if (e.target.closest('#yz-floating-toolbar')) {
            return;
        }

        // 清除选择
        hideToolbar();
    }

    /**
     * 处理键盘事件
     */
    function handleKeyDown(e) {
        // ESC键隐藏工具栏
        if (e.key === 'Escape') {
            hideToolbar();
            window.getSelection().removeAllRanges();
        }
    }

    /**
     * 绑定事件监听器
     */
    function bindEvents() {
        // 鼠标松开时检查选择
        document.addEventListener('mouseup', handleSelection);

        // 鼠标按下时隐藏工具栏
        document.addEventListener('mousedown', handleMouseDown);

        // 键盘事件
        document.addEventListener('keydown', handleKeyDown);

        // 选择变化事件（用于键盘选择）
        document.addEventListener('selectionchange', () => {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(handleSelection, 150);
        });

        // 滚动和窗口大小变化时隐藏
        window.addEventListener('scroll', () => hideToolbar(), { passive: true });
        window.addEventListener('resize', () => hideToolbar(), { passive: true });
    }

    /**
     * 初始化
     */
    function initialize() {
        console.log('📝 文本选择处理器初始化');
        bindEvents();
    }

    // 等待DOM就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // 导出模块
    window.selectionHandler = {
        getSelectedText,
        getSelectionCoords,
        showToolbar,
        hideToolbar
    };

})();
