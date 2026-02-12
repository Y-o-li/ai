// =============================================================================
// 煽动性语言检测插件 - 内容脚本
// =============================================================================
// 描述: 注入到网页中的脚本，负责文本检测和高亮显示
// 作用域: 在每个网页中独立运行
// 作者: Incitement Detector Team
// 创建日期: 2025-12-16
// 版本: 1.0.0
// =============================================================================

// -----------------------------------------------------------------------------
// 配置常量
// -----------------------------------------------------------------------------

// 后端API端点 - 固定使用8001端口
const apiEndpoint = 'http://localhost:8001/detect';

// 全局状态变量 - 防止重复扫描
let isScanning = false;

// -----------------------------------------------------------------------------
// API连接检查功能
// -----------------------------------------------------------------------------

/**
 * 检查API服务是否可用
 * @returns {Promise<boolean>} API是否可用
 */
async function checkAPIAvailable() {
    try {
        const response = await fetch('http://localhost:8001/health', {
            method: 'GET',
            timeout: 2000
        });
        if (response.ok) {
            console.log('✅ API服务可用: http://localhost:8001');
            return true;
        }
    } catch (error) {
        console.warn('❌ API服务不可用:', error.message);
    }
    return false;
}

// -----------------------------------------------------------------------------
// 核心检测功能
// -----------------------------------------------------------------------------

/**
 * 主要的文本检测和高亮函数
 * 扫描整个页面的文本节点，检测煽动性内容并进行高亮显示
 */
async function detectAndHighlight() {
    // 防止重复扫描机制
    if (isScanning) {
        console.log('⚠️ 检测已在进行中，跳过本次请求');
        return;
    }
    isScanning = true;
    
    try {
        // 步骤1: 检查API服务是否可用
        const isAPIAvailable = await checkAPIAvailable();
        if (!isAPIAvailable) {
            console.error('❌ API服务不可用，请确保后端服务正在运行');
            isScanning = false;
            return;
        }
        
        // 步骤2: 获取页面所有文本节点
        const textNodes = getTextNodes(document.body);
        console.log(`🔍 开始检测 ${textNodes.length} 个文本节点...`);
        
        let detectedCount = 0; // 统计检测到的煽动性内容数量
        
        // 步骤3: 逐个检测文本节点
        for (const node of textNodes) {
            const text = node.textContent.trim();
            
            // 只检测长度大于10的文本（提高效率，避免检测零碎字符）
            if (text.length > 10) {
                try {
                    // 发送检测请求到后端API
                    const response = await fetch(apiEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ content: text })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    // 解析检测结果
                    const result = await response.json();
                    
                    // 步骤4: 如果满足置信度要求，进行高亮显示
                    if (result.is_inciting && result.confidence >= 0.8) {
                        highlightTextNode(node, result.confidence);
                        detectedCount++;
                        console.log(`🚨 检测到煽动性内容 (置信度: ${result.confidence}):`, 
                                  text.substring(0, 50) + '...');
                    }
                } catch (error) {
                    console.error('❌ 检测请求失败:', error, '文本:', text.substring(0, 50));
                }
            }
        }
        
        console.log(`✅ 页面检测完成，共检测到 ${detectedCount} 处煽动性内容`);
        
    } catch (error) {
        console.error('❌ 检测过程中发生严重错误:', error);
    } finally {
        // 确保扫描状态被重置
        isScanning = false;
    }
}

/**
 * 获取指定元素下的所有文本节点
 * 使用TreeWalker高效遍历DOM树
 * @param {Element} element - 要搜索的根元素
 * @returns {Array<Node>} 文本节点数组
 */
function getTextNodes(element) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,  // 只获取文本节点
        null,
        false
    );
    
    const nodes = [];
    let node;
    
    while (node = walker.nextNode()) {
        // 过滤空白文本节点
        if (node.textContent.trim().length > 0) {
            nodes.push(node);
        }
    }
    
    return nodes;
}

/**
 * 高亮显示检测到的煽动性文本
 * 创建红色背景的span元素替换原始文本节点
 * @param {Node} node - 原始文本节点
 * @param {number} confidence - 检测置信度 (0.0-1.0)
 */
function highlightTextNode(node, confidence) {
    // 创建高亮容器元素 - 使用内联样式保持最小影响
    const span = document.createElement('span');
    span.className = 'inciting-text';  // CSS类名，便于样式管理
    
    // 设置视觉样式 - 保持原有排版的红色背景高亮
    span.style.backgroundColor = `rgba(255, 0, 0, ${confidence * 0.4})`;  // 降低透明度
    span.style.color = confidence > 0.9 ? 'white' : 'black';  // 高置信度用白色文字
    span.style.fontWeight = 'normal';  // 保持原有字体粗细，避免布局变化
    span.style.textDecoration = 'none';  // 保持原有文本装饰
    span.style.lineHeight = 'inherit';  // 继承行高
    span.style.fontFamily = 'inherit';   // 继承字体
    span.style.fontSize = 'inherit';     // 继承字号
    span.style.letterSpacing = 'inherit'; // 继承字间距
    span.style.display = 'inline';       // 保持内联特性
    span.style.margin = '0';            // 移除外边距
    span.style.padding = '0';           // 移除内边距，避免尺寸变化
    span.style.border = 'none';         // 移除边框，避免尺寸变化
    span.style.borderRadius = '0';       // 移除圆角，避免布局变化
    
    // 添加悬停提示 - 显示具体置信度
    span.title = `煽动性内容 (置信度: ${(confidence * 100).toFixed(1)}%)`;
    
    // 复制原始文本内容
    span.textContent = node.textContent;
    
    // 替换原始节点为高亮节点
    node.parentNode.replaceChild(span, node);
}

// -----------------------------------------------------------------------------
// 页面初始化和消息处理
// -----------------------------------------------------------------------------

// 页面加载完成后自动执行一次检测
console.log('🎯 煽动性语言检测插件已加载');
detectAndHighlight();

// 监听来自background script的消息（主要用于手动重新扫描）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'rescan') {
        console.log('🔄 收到重新扫描请求，开始重新检测页面...');
        detectAndHighlight();
        sendResponse({ success: true });
    }
});

// -----------------------------------------------------------------------------
// 实时内容监听 - 检测动态加载的内容
// -----------------------------------------------------------------------------

// 创建DOM变化观察器，实时检测新增内容
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            // 处理新添加的文本节点
            if (addedNode.nodeType === Node.TEXT_NODE) {
                detectAndHighlightForNode(addedNode);
            } 
            // 处理新添加的元素节点（可能包含子文本节点）
            else if (addedNode.nodeType === Node.ELEMENT_NODE) {
                // 递归检查元素的子节点
                Array.from(addedNode.childNodes).forEach(childNode => {
                    if (childNode.nodeType === Node.TEXT_NODE) {
                        detectAndHighlightForNode(childNode);
                    }
                });
            }
        });
    });
});

// 启动观察器，监听整个body的子元素变化
observer.observe(document.body, { 
    childList: true,    // 监听子元素的添加/删除
    subtree: true       // 监听所有后代元素
});

/**
 * 对单个文本节点进行检测（用于实时监听）
 * 简化版本的检测函数，不重复扫描整个页面
 * @param {Node} node - 要检测的文本节点
 */
function detectAndHighlightForNode(node) {
    const text = node.textContent.trim();
    
    // 只检测有意义的文本内容
    if (text.length > 10) {
        fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: text })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(result => {
            if (result.is_inciting && result.confidence >= 0.8) {
                highlightTextNode(node, result.confidence);
                console.log(`🚨 实时检测到煽动性内容 (置信度: ${result.confidence}):`, 
                          text.substring(0, 50) + '...');
            }
        })
        .catch(error => {
            console.error('❌ 实时检测请求失败:', error, '文本:', text.substring(0, 50));
        });
    }
}