// =============================================================================
// 备选高亮方案 - 更保守的文本高亮方法
// =============================================================================
// 描述: 使用CSS背景色实现最小影响的文本高亮
// 用途: 如果主要高亮方法仍影响排版，可以使用此备选方案
// 作者: Incitement Detector Team
// =============================================================================

/**
 * 备选方案1: 使用CSS背景色和最小样式
 * @param {Node} node - 原始文本节点
 * @param {number} confidence - 检测置信度
 */
function highlightTextNodeMinimal(node, confidence) {
    const span = document.createElement('span');
    span.className = 'inciting-text-minimal';
    
    // 最小化样式改变
    span.style.backgroundColor = `rgba(255, 0, 0, ${confidence * 0.3})`;
    span.style.color = 'inherit';  // 继承原有文字颜色
    span.style.fontWeight = 'inherit';  // 继承原有字体粗细
    span.style.textDecoration = 'inherit';  // 继承原有文本装饰
    span.style.fontSize = 'inherit';
    span.style.lineHeight = 'inherit';
    span.style.fontFamily = 'inherit';
    
    span.title = `煽动性内容 (置信度: ${(confidence * 100).toFixed(1)}%)`;
    span.textContent = node.textContent;
    
    node.parentNode.replaceChild(span, node);
}

/**
 * 备选方案2: 使用文字阴影而非背景色
 * @param {Node} node - 原始文本节点
 * @param {number} confidence - 检测置信度
 */
function highlightTextNodeShadow(node, confidence) {
    const span = document.createElement('span');
    span.className = 'inciting-text-shadow';
    
    // 使用红色文字阴影作为标记
    span.style.textShadow = `2px 2px 3px rgba(255, 0, 0, ${confidence * 0.6})`;
    span.style.borderBottom = `2px dotted rgba(255, 0, 0, ${confidence * 0.7})`;
    
    // 保持其他样式不变
    span.style.color = 'inherit';
    span.style.fontWeight = 'inherit';
    span.style.backgroundColor = 'transparent';
    span.style.textDecoration = 'inherit';
    span.style.fontSize = 'inherit';
    span.style.lineHeight = 'inherit';
    span.style.fontFamily = 'inherit';
    
    span.title = `煽动性内容 (置信度: ${(confidence * 100).toFixed(1)}%)`;
    span.textContent = node.textContent;
    
    node.parentNode.replaceChild(span, node);
}

/**
 * 备选方案3: 使用边框底线标记
 * @param {Node} node - 原始文本节点
 * @param {number} confidence - 检测置信度
 */
function highlightTextNodeUnderline(node, confidence) {
    const span = document.createElement('span');
    span.className = 'inciting-text-underline';
    
    // 使用波浪下划线标记
    span.style.borderBottom = `3px wavy rgba(255, 0, 0, ${confidence})`;
    span.style.textDecoration = 'none';  // 移除原有下划线
    span.style.boxShadow = `0 -2px 0 rgba(255, 0, 0, ${confidence * 0.2})`;  // 顶部淡色背景
    
    // 保持其他样式不变
    span.style.color = 'inherit';
    span.style.fontWeight = 'inherit';
    span.style.backgroundColor = 'transparent';
    span.style.fontSize = 'inherit';
    span.style.lineHeight = 'inherit';
    span.style.fontFamily = 'inherit';
    span.style.display = 'inline';
    span.style.padding = '0';
    span.style.margin = '0';
    
    span.title = `煽动性内容 (置信度: ${(confidence * 100).toFixed(1)}%)`;
    span.textContent = node.textContent;
    
    node.parentNode.replaceChild(span, node);
}

/**
 * 备选方案4: 完全不影响排版的CSS类方案
 * @param {Node} node - 原始文本节点
 * @param {number} confidence - 检测置信度
 */
function highlightTextNodeCSSClass(node, confidence) {
    // 先定义CSS样式
    if (!document.querySelector('#incitement-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'incitement-highlight-styles';
        style.textContent = `
            .incitement-highlight-low {
                background-color: rgba(255, 0, 0, 0.2) !important;
                color: inherit !important;
                font-weight: inherit !important;
                text-decoration: inherit !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                font-size: inherit !important;
                line-height: inherit !important;
                font-family: inherit !important;
            }
            .incitement-highlight-medium {
                background-color: rgba(255, 0, 0, 0.35) !important;
                color: inherit !important;
                font-weight: inherit !important;
                text-decoration: inherit !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                font-size: inherit !important;
                line-height: inherit !important;
                font-family: inherit !important;
            }
            .incitement-highlight-high {
                background-color: rgba(255, 0, 0, 0.5) !important;
                color: inherit !important;
                font-weight: inherit !important;
                text-decoration: inherit !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                font-size: inherit !important;
                line-height: inherit !important;
                font-family: inherit !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 根据置信度选择CSS类
    const span = document.createElement('span');
    let cssClass = 'incitement-highlight-low';
    
    if (confidence >= 0.9) {
        cssClass = 'incitement-highlight-high';
    } else if (confidence >= 0.85) {
        cssClass = 'incitement-highlight-medium';
    }
    
    span.className = cssClass;
    span.title = `煽动性内容 (置信度: ${(confidence * 100).toFixed(1)}%)`;
    span.textContent = node.textContent;
    
    node.parentNode.replaceChild(span, node);
}

// 使用说明：
// 如果主要的高亮函数仍然影响排版，请：
// 1. 将 highlightTextNode 函数替换为上面任一备选函数
// 2. 例如：highlightTextNode(node, confidence) 改为 highlightTextNodeMinimal(node, confidence)
// 3. 重新加载浏览器插件测试效果