// =============================================================================
// 煽动性语言检测插件 - 后台脚本
// =============================================================================
// 描述: 作为Service Worker运行，处理插件的逻辑和消息传递
// 作用域: 在后台持续运行，不直接访问页面内容
// 作者: Incitement Detector Team
// 创建日期: 2025-12-16
// 版本: 1.0.0
// =============================================================================

// -----------------------------------------------------------------------------
// 消息监听器 - 处理来自popup的消息
// -----------------------------------------------------------------------------

/**
 * 监听来自popup script的消息
 * 主要功能：接收重新扫描请求，转发给content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 只处理rescan类型的消息
    if (request.action === 'rescan') {
        console.log('📥 Background: 收到rescan请求');
        
        // 查找当前活动的标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // 错误处理：检查tabs API是否正常工作
            if (chrome.runtime.lastError) {
                console.error('❌ 查询标签页失败:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: '查询标签页失败' });
                return;
            }
            
            // 检查是否找到活动标签页
            if (tabs && tabs[0]) {
                console.log('📤 Background: 向标签页', tabs[0].id, '发送rescan消息');
                
                // 向content script发送重新扫描消息
                chrome.tabs.sendMessage(tabs[0].id, { action: 'rescan' }, (response) => {
                    // 错误处理：检查消息发送是否成功
                    if (chrome.runtime.lastError) {
                        console.error('❌ 发送消息失败:', chrome.runtime.lastError.message);
                        sendResponse({ 
                            success: false, 
                            error: '内容脚本未加载，请刷新页面后重试' 
                        });
                    } else {
                        console.log('✅ Background: 收到内容脚本响应:', response);
                        sendResponse({ success: true });
                    }
                });
            } else {
                console.error('❌ 未找到活动标签页');
                sendResponse({ success: false, error: '未找到活动标签页' });
            }
        });
        
        // 返回true表示异步响应（重要！）
        return true;
    }
});

// -----------------------------------------------------------------------------
// 注意：此处移除了重复的消息监听器
// -----------------------------------------------------------------------------
// 原代码中有重复的消息监听器，会导致冲突和错误
// content script已经在自己的监听器中处理rescan消息
// 不需要background script转发，避免消息循环和undefined错误
// -----------------------------------------------------------------------------

/*
// ❌ 已删除的重复监听器（保留作为注释说明）：
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'rescan') {
        // 这段代码会导致错误：
        // 1. sender.tab可能为undefined
        // 2. 造成消息循环
        // 3. 与上面的监听器冲突
        chrome.tabs.sendMessage(sender.tab.id, { action: 'rescan' });
    }
});
*/