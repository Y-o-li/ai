// =============================================================================
// 煽动性语言检测插件 - 弹窗脚本
// =============================================================================
// 描述: 控制插件弹窗界面的交互逻辑
// 作用域: 只在插件弹窗中运行，与用户界面交互
// 作者: Incitement Detector Team
// 创建日期: 2025-12-16
// 版本: 1.0.0
// =============================================================================

// -----------------------------------------------------------------------------
// DOM加载完成后初始化
// -----------------------------------------------------------------------------

/**
 * 页面加载完成后绑定事件监听器
 * 确保DOM元素已经存在后再操作
 */
document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素引用
    const scanButton = document.getElementById('scanButton');
    const statusDiv = document.getElementById('status');

    // -----------------------------------------------------------------------------
    // 状态显示函数
    // -----------------------------------------------------------------------------

    /**
     * 显示状态信息给用户
     * @param {string} message - 要显示的消息
     * @param {string} type - 状态类型：'success', 'error', 'loading'
     */
    function showStatus(message, type) {
        // 设置状态文本和样式
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        // 成功和错误消息自动隐藏（3秒后）
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    // -----------------------------------------------------------------------------
    // 重新扫描按钮事件处理
    // -----------------------------------------------------------------------------

    /**
     * 绑定重新扫描按钮的点击事件
     * 发送消息给background script触发页面重新检测
     */
    scanButton.addEventListener('click', () => {
        // 禁用按钮防止重复点击
        scanButton.disabled = true;
        scanButton.textContent = '扫描中...';
        
        // 显示加载状态
        showStatus('正在重新扫描页面...', 'loading');

        // 发送消息给background script
        chrome.runtime.sendMessage({ action: 'rescan' }, response => {
            // 恢复按钮状态
            scanButton.disabled = false;
            scanButton.textContent = '重新扫描页面';
            
            // 根据响应结果显示状态
            if (response && response.success) {
                showStatus('✅ 页面已重新扫描完成', 'success');
                console.log('✅ 弹窗收到成功响应');
            } else {
                const errorMsg = response ? response.error : '未知错误';
                showStatus(`❌ 重新扫描失败: ${errorMsg}`, 'error');
                console.error('❌ 弹窗收到失败响应:', response);
            }
        });
    });

    // -----------------------------------------------------------------------------
    // 初始化完成提示
    // -----------------------------------------------------------------------------
    
    console.log('🎯 插件弹窗界面已初始化完成');
});

// -----------------------------------------------------------------------------
// 错误处理 - 全局错误捕获
// -----------------------------------------------------------------------------

/**
 * 捕获弹窗中的未处理错误
 * 提供更好的调试信息
 */
window.addEventListener('error', (event) => {
    console.error('❌ 弹窗脚本发生错误:', event.error);
});

/**
 * 捕获Promise拒绝错误
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ 弹窗Promise被拒绝:', event.reason);
});