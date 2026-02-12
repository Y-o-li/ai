// 在content_script.js的第101行，替换函数调用
highlightTextNode(node, result.confidence);  // 改为：
highlightTextNodeMinimal(node, result.confidence);  // 或其他备选函数
