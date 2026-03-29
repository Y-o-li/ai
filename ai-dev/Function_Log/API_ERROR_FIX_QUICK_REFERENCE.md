# API 调用失败修复 - 快速参考卡

**版本**: v1.3.3 | **修复日期**: 2026-03-27

---

## 🎯 核心问题

**现象**: API 调用失败后，结果卡片一直转圈不显示错误  
**原因**: toolbar.js 只处理成功响应，缺少失败处理分支  
**影响**: 用户无法感知调用失败，体验极差

---

## ✅ 修复内容速览

### 1️⃣ toolbar.js - 添加错误处理

**位置**: 第 157-213 行

```javascript
else if (event.data.type === 'YANZHI_YOULI_LLM_RESPONSE') {
    if (event.data.success && event.data.result) {
        // ✅ 成功处理（原有逻辑）
    } else if (event.data.error) {
        // ⚠️ 新增：失败处理
        console.warn('[Toolbar] LLM 调用失败:', event.data.error);
        
        if (event.data.cardId && window.resultCardManager) {
            const card = window.resultCardManager.getCardById(event.data.cardId);
            if (card) {
                // 停止加载
                if (card.loadingEl) card.loadingEl.style.display = 'none';
                
                // 显示错误提示
                if (card.resultEl) {
                    card.resultEl.innerHTML = `...错误 UI...`;
                }
            }
        }
    }
}
```

**关键改进**:
- ✅ 添加 `else if (event.data.error)` 分支
- ✅ 停止加载动画
- ✅ 显示友好错误提示
- ✅ 支持建议信息和重试按钮

---

### 2️⃣ result-card.js - 新增 showError 方法

**位置**: 第 647-678 行

```javascript
/**
 * 显示错误信息
 * @param {string} error - 错误信息
 * @param {string} [suggestion] - 建议操作（可选）
 * @param {boolean} [retryable] - 是否可重试（可选）
 */
showError(error, suggestion = '', retryable = false) {
    // 隐藏加载
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    
    // 显示错误内容
    if (this.resultEl) {
        this.resultEl.innerHTML = `...错误 UI...`;
    }
    
    this.card.style.display = 'flex';
    this.isVisible = true;
}
```

**功能特性**:
- ✅ 统一的错误 UI 设计
- ✅ 支持可选建议
- ✅ 支持重试按钮
- ✅ 自动隐藏加载

---

### 3️⃣ toolbar.js - 添加 retryLLMCall 方法

**位置**: 第 1204-1217 行

```javascript
/**
 * 重试 LLM 调用
 * @param {string} cardId - 卡片 ID
 */
retryLLMCall(cardId) {
    console.log('[Toolbar] 重试 LLM 调用，cardId:', cardId);
    
    // TODO: 实现重试逻辑
    this.showToast('⚠️ 重试功能开发中，请重新选择文本进行操作', 'warning');
}
```

**说明**:
- ✅ 预留重试接口
- ✅ 当前显示友好提示
- ✅ 为未来扩展留空间

---

## 🧪 快速测试

### 测试命令（复制粘贴到控制台）

```javascript
// 测试 1: API Key 未配置
window.postMessage({
    type: 'YANZHI_YOULI_LLM_RESPONSE',
    success: false,
    error: 'API Key 未配置，请先进入插件设置页面配置',
    suggestion: '请在设置页面重新配置有效的 API Key',
    retryable: false,
    cardId: 'test-1'
}, '*');

// 测试 2: 网络错误
window.postMessage({
    type: 'YANZHI_YOULI_LLM_RESPONSE',
    success: false,
    error: '网络连接失败，请稍后重试',
    suggestion: '请检查网络连接状态',
    retryable: true,
    cardId: 'test-2'
}, '*');

// 测试 3: 超时错误
window.postMessage({
    type: 'YANZHI_YOULI_LLM_RESPONSE',
    success: false,
    error: '请求超时，请检查网络连接',
    retryable: true,
    cardId: 'test-3'
}, '*');
```

---

## 📊 错误消息映射表

| Backend 错误 | 前端显示 | 建议 | 可重试 |
|-------------|---------|------|--------|
| `API Key 未配置` | "API Key 未配置..." | "请在设置页面..." | ❌ |
| `API Key 无效` | "API Key 无效..." | "请在设置页面..." | ❌ |
| `网络连接失败` | "网络连接失败..." | "请检查网络..." | ✅ |
| `请求超时` | "请求超时..." | - | ✅ |
| `服务不可用` | "服务暂时不可用..." | - | ✅ |

---

## 🎯 验证步骤

### 标准测试流程

1. **准备环境**
   ```
   ✅ 确保插件已加载
   ✅ 打开任意网页
   ✅ 打开浏览器控制台 (F12)
   ```

2. **执行测试**
   ```
   ✅ 运行上述任一测试命令
   ✅ 观察结果卡片显示
   ```

3. **验证效果**
   ```
   ✅ 卡片停止转圈
   ✅ 显示红色错误提示
   ✅ 包含错误原因
   ✅ 包含建议操作（如有）
   ✅ 包含重试按钮（如可重试）
   ```

---

## 🔧 调试技巧

### 常用调试命令

```javascript
// 查看卡片管理器
console.log('卡片管理器:', window.resultCardManager);

// 查看工具栏
console.log('工具栏:', window.toolbar);

// 查看所有卡片
console.log('所有卡片:', window.resultCardManager?.cards);

// 手动触发错误
const card = window.resultCardManager?.getCardById('test-card');
if (card) {
    card.showError('测试错误', '这是建议', true);
}
```

---

## ⚠️ 注意事项

### 兼容性

- ✅ 保留旧版本兼容逻辑
- ✅ 如果没有 `resultCardManager`，尝试使用 `resultCard`
- ✅ 最后的兜底方案使用 `alert()`

### 安全性

- ✅ 错误消息经过 HTML 转义
- ✅ 防止 XSS 攻击
- ✅ 无动态 eval 代码

### 性能

- ✅ 零性能影响（仅在错误时执行）
- ✅ DOM 操作最小化
- ✅ 无内存泄漏

---

## 📝 相关文档

- 📄 [完整修复报告](./API_ERROR_FIX_REPORT.md)
- 📄 [系统维护报告](./SYSTEM_MAINTENANCE_REPORT.md)
- 📄 [开发者指南](./DEVELOPER_GUIDE.md)

---

**打印建议**: A4 纸张，单面彩色打印，便于对照测试
