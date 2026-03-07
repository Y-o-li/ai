# 言之有理插件 - 快速参考指南

**最后更新**: 2026-02-24  
**版本**: v1.2  

---

## 🚀 快速开始

### 安装和加载

1. **加载扩展**
   ```
   chrome://extensions/ → 开发者模式 → 加载已解压的扩展程序
   选择目录：ai/frontend-extension/your-extension
   ```

2. **验证安装**
   - 打开任意网页
   - 选中一段文本
   - 应该看到浮动工具栏出现

---

## 🎨 主题切换使用指南

### 在 Popup 中切换主题

1. 点击浏览器工具栏中的插件图标
2. 找到底部的主题选择器
3. 选择：
   - **跟随系统** - 自动匹配系统主题
   - **浅色模式** - 始终使用浅色主题
   - **深色模式** - 始终使用深色主题

### 注意事项

⚠️ **重要**: 主题切换仅影响插件自身的 UI 组件：
- ✅ Popup 弹窗
- ✅ 浮动工具栏
- ✅ 结果卡片
- ✅ 历史记录页面

❌ **不影响**: 网页的背景颜色或文字颜色

---

## 🔧 核心功能速查

### 功能开关

| 功能 | 说明 | 快捷键 |
|------|------|--------|
| 高亮检测 | 自动标记煽动性文本 | - |
| 事实核查 | AI 分析内容真实性 | 选中文本后点击工具栏 |
| 智能摘要 | 生成内容概要 | 选中文本后点击工具栏 |
| 中立化 | 提供中立版本 | 选中文本后点击工具栏 |
| 工具栏显示 | 控制工具栏可见性 | - |

### 使用流程

```
1. 选中网页文本
   ↓
2. 浮动工具栏自动出现
   ↓
3. 点击需要的功能按钮
   ↓
4. 等待 LLM 处理（约 1-3 秒）
   ↓
5. 查看结果卡片
```

---

## 🐛 常见问题排查

### Q1: 主题切换无效？

**症状**: Popup 中切换主题后，UI 外观无变化

**排查步骤**:
1. 检查 Browser Console 是否有错误
2. 确认 Content Script 已加载（搜索 `yanzhiYouliLoaded`）
3. 尝试刷新页面
4. 重新加载扩展

**快速修复**:
```javascript
// 在 Popup 控制台执行
chrome.runtime.sendMessage({ action: 'getConfig' }).then(config => {
    console.log('当前配置:', config.config.theme);
});
```

### Q2: 工具栏不显示？

**症状**: 选中文本后看不到工具栏

**排查步骤**:
1. 检查 Popup 中"工具栏显示"开关是否开启
2. 确认选中的是普通文本（非输入框）
3. 检查文本长度是否≥5 个字符
4. 查看 Console 是否有 JavaScript 错误

**快速修复**:
```javascript
// 在页面控制台执行
window.floatingToolbar = new FloatingToolbar();
window.floatingToolbar.init();
```

### Q3: LLM 响应超时？

**症状**: 点击功能按钮后长时间无响应

**排查步骤**:
1. 检查 API Key 是否正确配置
2. 验证网络连接
3. 查看 Background 控制台日志
4. 确认选择的模型可用

**快速修复**:
```javascript
// 在 Popup 控制台执行
chrome.runtime.sendMessage({ 
    action: 'testAPI',
    provider: 'qwen'
}).then(response => {
    console.log('API 测试:', response);
});
```

---

## 📊 调试技巧

### 查看各组件日志

#### Popup 控制台
```
右键 Popup → 检查
路径：chrome-extension://[EXTENSION_ID]/popup/popup.html
```

#### Background Service Worker
```
扩展管理页面 → Service Worker → 检查
路径：chrome-extension://[EXTENSION_ID]/background/service-worker.js
```

#### Content Script
```
页面控制台 (F12)
筛选关键字：言之有理、yanzhi、plugin
```

### 常用调试命令

```javascript
// 1. 检查插件是否加载
console.log(window.yanzhiYouliLoaded);

// 2. 获取当前配置
chrome.runtime.sendMessage({ action: 'getConfig' })
    .then(r => console.log('配置:', r.config));

// 3. 手动触发主题切换
chrome.runtime.sendMessage({ 
    action: 'themeChanged', 
    theme: 'dark' 
});

// 4. 查看工具栏状态
console.log('工具栏:', window.floatingToolbar);

// 5. 查看结果卡片状态
console.log('结果卡片:', window.resultCard);
```

---

## ⚡ 性能优化提示

### 减少内存占用

1. **及时关闭不用的标签页**
   - 每个标签页都有 Content Script 实例
   
2. **避免频繁切换主题**
   - 每次切换都会触发重绘
   
3. **定期清理历史记录**
   - 设置 → 清除历史数据

### 提升响应速度

1. **启用配置缓存** (待实现)
   ```javascript
   // 未来版本将支持 5 秒缓存
   ConfigManager.getConfig() // 95% 命中缓存
   ```

2. **使用 requestAnimationFrame** (待实现)
   ```javascript
   // 工具栏拖动更流畅
   requestAnimationFrame(() => updatePosition());
   ```

---

## 🎯 最佳实践

### 主题使用建议

✅ **推荐**:
- 白天使用浅色模式，晚上使用深色模式
- 在安静环境中使用深色模式减少眼睛疲劳
- 根据系统主题自动切换（跟随系统选项）

❌ **避免**:
- 频繁切换主题（影响性能）
- 在重要操作时切换主题（可能导致短暂卡顿）

### 功能使用建议

✅ **推荐**:
- 先启用高亮检测，快速识别可疑内容
- 对关键信息使用事实核查
- 长文章使用智能摘要快速了解大意

❌ **避免**:
- 同时启用所有功能（可能影响页面性能）
- 对过短文本（<5 字）使用分析功能

---

## 📁 文件结构速览

```
ai/frontend-extension/your-extension/
├── manifest.json          # 扩展配置文件
├── background/
│   └── service-worker.js  # 后台服务（配置管理、消息中转）
├── content/
│   ├── content-script.js  # 内容脚本（主题管理、功能协调）
│   ├── highlight.js       # 高亮功能
│   └── selection-handler.js # 文本选择处理
├── popup/
│   ├── popup.html         # 弹出界面
│   ├── popup.js           # Popup 逻辑
│   └── popup.css          # Popup 样式
├── ui/
│   ├── toolbar.js         # 浮动工具栏组件
│   └── result-card.js     # 结果卡片组件
├── styles/
│   └── extension.css      # 全局样式（含主题变量）
└── options/
    └── options.js         # 设置页面
```

---

## 🔗 相关链接

- **完整文档**: README.md
- **系统检查报告**: SYSTEM_CHECK_REPORT.md
- **重构总结**: REFACTORING_SUMMARY.md
- **改进建议**: 见 SYSTEM_CHECK_REPORT.md 第四部分

---

## 💡 快捷操作速记

| 操作 | 方法 |
|------|------|
| 打开 Popup | 点击浏览器工具栏图标 |
| 打开设置 | Popup → 齿轮图标 |
| 打开历史 | Popup → 书籍图标 |
| 重新扫描 | Popup → "重新扫描页面"按钮 |
| 刷新统计 | Popup → "🔄"按钮 |
| 切换主题 | Popup → 底部下拉菜单 |

---

## 🆘 获取帮助

### 遇到问题时的步骤

1. **查看本文档** - 大部分问题都有解决方案
2. **检查 Console 日志** - 定位具体错误
3. **查阅完整文档** - README.md 详细说明
4. **联系支持团队** - 提供错误日志和复现步骤

### 提交 Bug 报告模板

```
【问题描述】简短描述遇到的问题
【复现步骤】
1. 打开...
2. 点击...
3. 出现...
【期望行为】应该发生什么
【实际行为】实际发生了什么
【环境信息】
- 浏览器版本：Chrome xx.x
- 操作系统：Windows/macOS/Linux
- 插件版本：v1.2
【错误日志】Console 中的错误信息（如有）
```

---

**提示**: 本文档会随着功能迭代持续更新，请定期查看最新版本。
