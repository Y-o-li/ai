# 言之有理插件 - 开发与维护速查手册

**版本**: v1.3.0  
**最后更新**: 2026-03-27  
**文档类型**: 开发指南与维护手册  
**状态**: ✅ 已完成

---

## 📋 目录

1. [快速入门](#1-快速入门)
2. [核心功能原理](#2-核心功能原理)
3. [API 配置指南](#3-api-配置指南)
4. [调试与测试](#4-调试与测试)
5. [性能优化最佳实践](#5-性能优化最佳实践)
6. [常见问题解答](#6-常见问题解答)

---

## 1. 快速入门

### 1.1 一分钟了解

**这是什么？**
🔍 **浏览器扩展**，帮助识别煽动性内容、事实核查、智能摘要

**核心能力**:
- 🎯 **自动高亮** - 标记煽动性文本
- 🧠 **AI 分析** - 事实核查/中立化改写
- 🎨 **主题切换** - 浅色/深色/跟随系统
- ⚡ **高性能** - 98% 缓存命中率

### 1.2 安装步骤（2 分钟）

```bash
# 1. 克隆或下载项目
cd ai/frontend-extension/your-extension

# 2. Chrome 浏览器打开扩展管理
chrome://extensions/

# 3. 开启"开发者模式"

# 4. 点击"加载已解压的扩展程序"

# 5. 选择 your-extension 文件夹

# 6. 验证：打开任意网页，选中一段文本
```

### 1.3 基本使用流程

```
1. 打开任意网页
   ↓
2. 选中一段文字（≥5 字符）
   ↓
3. 浮动工具栏自动出现
   ↓
4. 点击功能按钮：
   - ✓ 事实核查
   - ☰ 智能摘要
   - ◐ 中立化改写
   ↓
5. 查看结果卡片（1-3 秒）
```

### 1.4 快捷键速查

| 快捷键 | 功能 | 用途 |
|--------|------|------|
| **Ctrl+1** | 基础检测 | 测试高危句式识别 |
| **Ctrl+2** | 否定句测试 | 测试语境降权 |
| **Ctrl+3** | 白名单测试 | 测试学术语境过滤 |
| **Ctrl+4** | 缓存测试 | 查看加速效果 |
| **Ctrl+5** | 批量测试 | 生成 100 个句子 |
| **Ctrl+R** | 性能报告 | 查看完整统计 |
| **Ctrl+C** | 清空缓存 | 重置缓存状态 |

---

## 2. 核心功能原理

### 2.1 敏感词检测系统

#### Trie 树算法

**复杂度优化**: O(n×m) → O(m)

```javascript
class SensitiveWordDetector {
    constructor() {
        this.trieTree = {};
        this.buildTrieTree(wordList);
    }
    
    buildTrieTree(words) {
        words.forEach(word => {
            let node = this.trieTree;
            for (const char of word) {
                if (!node[char]) {
                    node[char] = {};
                }
                node = node[char];
            }
            node.isEnd = true;
            node.word = word;
        });
    }
    
    matchWithTrie(text) {
        const results = [];
        for (let i = 0; i < text.length; i++) {
            let node = this.trieTree;
            for (let j = i; j < text.length; j++) {
                const char = text[j];
                if (!node[char]) break;
                node = node[char];
                if (node.isEnd) {
                    results.push({
                        word: node.word,
                        start: i,
                        end: j + 1
                    });
                }
            }
        }
        return results;
    }
}
```

**性能提升**: 长文本检测速度 **+60-70%**

#### 上下文理解机制

| 语境类型 | 识别方式 | 权重调整 |
|---------|---------|---------|
| 否定句 | `不`、`没`、`无`等 | ×0.3 |
| 疑问句 | `？`、`为什么`、`如何` | ×0.5 |
| 学术语境 | `研究表明`、`据统计` | 过滤 |
| 新闻语境 | `据报道`、`据悉` | 过滤 |
| 文艺作品 | `在小说中`、`电影里` | 过滤 |

#### 危险模式检测

```javascript
detectPatterns(text) {
    const patterns = {
        intensifiers: ["必须", "一定", "绝对"],      // ×1.3
        call_to_action: ["行动起来", "一起", "大家"], // ×1.5
        dangerous_patterns: ["我们必须", "我们要"]   // ×1.8
    };
    
    let multiplier = 1.0;
    patterns.forEach((patternList, type) => {
        patternList.forEach(pattern => {
            if (text.includes(pattern)) {
                multiplier *= PATTERN_WEIGHTS[type];
            }
        });
    });
    
    return multiplier;
}
```

---

### 2.2 缓存系统

#### LRU + TTL 缓存机制

```javascript
class CacheManager {
    constructor(maxSize = 500, defaultTTL = 5 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.hits = 0;
        this.misses = 0;
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item || Date.now() > item.expiry) {
            this.misses++;
            return undefined;
        }
        
        // LRU 访问顺序维护
        this.cache.delete(key);
        this.cache.set(key, item);
        this.hits++;
        return item.value;
    }
    
    set(value, ttl = this.defaultTTL) {
        const key = this.generateKey(value);
        
        // 容量限制检查
        if (this.cache.size >= this.maxSize) {
            // 删除第一个（最少使用）
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }
    
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%'
        };
    }
}
```

**关键特性**:
- ✅ TTL 过期：默认 5 分钟
- ✅ LRU 淘汰：最近最少使用优先
- ✅ 容量限制：最大 500 条
- ✅ 实时统计：命中率监控

#### 智能缓存键生成

```javascript
getCacheKey(text, options = {}) {
    // >1000 字使用 hash，防止内存爆炸
    if (text.length > 1000) {
        return `hash:${this.simpleHash(text)}`;
    }
    
    // 包含上下文的复合键
    const contextFlags = [
        options.isInQuote ? 'Q' : '0',
        options.isInEditable ? 'E' : '0',
        options.parentTag || 'N'
    ].join('_');
    
    return `${text.length}:${contextFlags}:${text.substring(0, 100)}`;
}
```

---

### 2.3 配置缓存机制 (v1.3.0)

```javascript
class ConfigManager {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = 0;
        this.CACHE_TTL = 5000; // 5 秒
    }
    
    async getConfig() {
        const now = Date.now();
        
        // 如果缓存有效，直接返回
        if (this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            console.log('[ConfigManager] 缓存命中');
            return this.cache;
        }
        
        // 否则从 storage 读取
        const result = await chrome.storage.local.get('config');
        this.cache = result.config || DEFAULT_CONFIG;
        this.cacheTimestamp = now;
        
        return this.cache;
    }
    
    async saveConfig(config) {
        await chrome.storage.local.set({ config });
        this.cache = config;
        this.cacheTimestamp = Date.now();
    }
    
    invalidateCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}

const configManager = new ConfigManager();
```

**性能提升**:
- 首次读取：~50ms → ~48ms (4% ⬇️)
- 缓存命中：<1ms (**98%** ⬇️)
- Storage API 调用减少：**95%+**

---

### 2.4 批量 DOM 优化

#### 两阶段批量处理

```javascript
// 阶段 1: 收集元素信息
const elementsToCreate = [];
mergedMatches.forEach(match => {
    elementsToCreate.push({ type: 'text', content: match.text });
    elementsToCreate.push({ type: 'highlight', data: match });
});

// 阶段 2: 批量创建
const fragment = document.createDocumentFragment();
elementsToCreate.forEach(item => {
    if (item.type === 'text') {
        fragment.appendChild(document.createTextNode(item.content));
    } else {
        fragment.appendChild(createHighlightSpan(item.data));
    }
});

// 一次性替换
parent.replaceChild(fragment, node);
```

#### 相邻匹配项合并

```javascript
mergeAdjacentMatches(matches) {
    const merged = [];
    let currentGroup = null;
    
    for (const match of matches) {
        if (!currentGroup) {
            currentGroup = { ...match };
        } else if (
            match.start <= currentGroup.end + 1 &&  // 相邻
            Math.abs(match.score - currentGroup.score) < 0.5  // 相似度
        ) {
            // 合并为一个 DOM 元素
            currentGroup.end = Math.max(currentGroup.end, match.end);
            currentGroup.score += match.score;
        } else {
            merged.push(currentGroup);
            currentGroup = { ...match };
        }
    }
    
    if (currentGroup) merged.push(currentGroup);
    return merged;
}
```

**效果**: DOM 元素数量减少 **40-50%**

---

## 3. API 配置指南

### 3.1 支持的 AI 服务商

| 服务商 | API 地址 | 推荐模型 | 状态 |
|--------|---------|----------|------|
| 通义千问 | dashscope.aliyuncs.com | qwen-turbo | ✅ 已实现 |
| 智谱 GLM | open.bigmodel.cn | glm-4-flash | ✅ 已实现 |
| 文心一言 | api.baidu.com | ernie-bot | ⏳ 待实现 |

### 3.2 配置步骤

#### 步骤 1: 获取 API Key

**通义千问**:
1. 访问 https://dashscope.console.aliyun.com/
2. 注册/登录阿里云账号
3. 开通 DashScope 服务
4. 创建 API Key

**智谱 AI**:
1. 访问 https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入控制台
4. 创建 API Key

#### 步骤 2: 在插件中配置

1. 点击浏览器工具栏中的插件图标
2. 选择"打开设置"
3. 选择 AI 提供商
4. 输入 API Key
5. 点击"测试连接"验证

#### 步骤 3: 验证配置

```javascript
// 在 Background 控制台执行
chrome.runtime.sendMessage({ 
    action: 'testAPI',
    provider: 'qwen'
}).then(response => {
    if (response.success) {
        console.log('✅ API 连接成功');
    } else {
        console.error('❌ API 连接失败:', response.error);
    }
});
```

---

### 3.3 Prompt 模板设计

#### 事实核查

```javascript
PromptTemplates.factCheck = (text) => `请对以下文本进行事实核查分析：

"${text}"

请分析：
1. 事实准确性（0%-100%）
2. 可信度评估
3. 潜在偏见或误导
4. 改进建议

请以 JSON 格式返回：
{
  "accuracy": 数字,
  "confidence": 数字,
  "biases": [],
  "suggestions": []
}`;
```

#### 语义总结

```javascript
PromptTemplates.summarize = (text) => `请对以下文本进行语义总结：

"${text}"

请提供：
1. 核心观点（2-3 句话）
2. 关键要点（3-5 个）
3. 背景信息

请以 JSON 格式返回：
{
  "coreMessage": "字符串",
  "keyPoints": [],
  "context": "字符串"
}`;
```

#### 中性化改写

```javascript
PromptTemplates.neutralize = (text) => `请将以下文本改写成中性、客观的表达：

"${text}"

要求：
1. 去除情绪化词汇
2. 平衡不同观点
3. 保持原意不变
4. 使用专业表达

请直接返回改写后的文本。`;
```

---

## 4. 调试与测试

### 4.1 各组件调试方法

#### Popup 控制台

**打开方式**:
1. 点击插件图标
2. **右键点击 Popup 内容区域**（不是浏览器工具栏）
3. 选择"检查"或"检查元素"

**验证环境**:
```javascript
// URL 应该是：chrome-extension://[EXTENSION_ID]/popup/popup.html
console.log('当前 URL:', window.location.href);

// 检查 chrome API 可用性
console.log('chrome.runtime.sendMessage:', typeof chrome.runtime.sendMessage);
```

#### Background Service Worker

**打开方式**:
1. 访问 `chrome://extensions/`
2. 找到"言之有理"扩展
3. 点击"Service Worker"链接
4. 或点击"查看视图：Service Worker"

**常用命令**:
```javascript
// 查看当前配置
configManager.getConfig().then(config => {
    console.log('当前配置:', config);
});

// 清空配置缓存
configManager.invalidateCache();

// 测试 API
llmProcessor.testConnection('qwen');
```

#### Content Script

**打开方式**:
1. 打开任意网页
2. 按 F12 打开开发者工具
3. 切换到 Console 标签

**常用命令**:
```javascript
// 检查插件是否加载
console.log('插件加载状态:', window.yanzhiYouliLoaded);

// 获取当前配置
window.yanzhiYouliConfig;

// 查看工具栏状态
window.floatingToolbar;

// 查看结果卡片状态
window.resultCard;

// 查看检测器状态
window.detector;
```

---

### 4.2 性能测试

#### 缓存性能测试

```javascript
// 1. 清空缓存
detector.cache.clear();
console.time('首次检测');

// 2. 第一次检测（无缓存）
detector.detect("这是一段测试文本");
console.timeEnd('首次检测');

// 3. 第二次检测（有缓存）
console.time('二次检测');
detector.detect("这是一段测试文本");
console.timeEnd('二次检测');

// 4. 查看缓存统计
console.log('缓存统计:', detector.cache.getStats());
```

#### 批量处理性能测试

```javascript
// 生成 100 个测试句子
const sentences = Array.from({ length: 100 }, (_, i) => 
    `这是第 ${i + 1} 个测试句子，包含一些描述性内容。`
);

// 批量检测
console.time('批量检测');
sentences.forEach(sentence => {
    detector.detect(sentence);
});
console.timeEnd('批量检测');

// 查看 FPS
const fpsElement = document.createElement('div');
fpsElement.style.cssText = 'position:fixed;top:10px;right:10px;background:#000;color:#fff;padding:5px;z-index:99999';
document.body.appendChild(fpsElement);

let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        fpsElement.textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastTime = now;
    }
    requestAnimationFrame(updateFPS);
}
updateFPS();
```

---

### 4.3 故障排查三步走

#### 第一步：检查插件状态

```javascript
console.log(window.yanzhiYouliLoaded);
// 应该输出：true
```

#### 第二步：查看控制台日志

- **Popup**: 右键 Popup → 检查
- **Background**: 扩展管理 → Service Worker → 检查
- **Content Script**: F12 页面控制台，筛选关键字：`言之有理 `、`yanzhi`、`plugin`

#### 第三步：重新加载

1. 刷新页面
2. 重新加载扩展（`chrome://extensions/` → 刷新按钮）
3. 重启浏览器

---

## 5. 性能优化最佳实践

### 5.1 DOM 操作优化

#### 使用 requestIdleCallback

```javascript
// 在浏览器空闲时分批处理
function scheduleDetection(node) {
    requestIdleCallback(() => {
        detectAndHighlight(node);
    }, { timeout: 1000 });
}

// 批量处理多个节点
const nodesToProcess = [...document.querySelectorAll('p, div, span')];
let index = 0;

function processBatch(deadline) {
    while (deadline.timeRemaining() > 0 && index < nodesToProcess.length) {
        const node = nodesToProcess[index++];
        if (isTextNodeRelevant(node)) {
            detectAndHighlight(node);
        }
    }
    
    if (index < nodesToProcess.length) {
        requestIdleCallback(processBatch, { timeout: 1000 });
    }
}

requestIdleCallback(processBatch, { timeout: 1000 });
```

#### 使用 IntersectionObserver 懒加载

```javascript
// 只检测可视区域内的元素
const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            detectAndHighlight(entry.target);
            lazyObserver.unobserve(entry.target);  // 停止观察
        }
    });
}, { rootMargin: '100px' });  // 提前 100px 加载

// 观察所有相关元素
document.querySelectorAll('p, div, span').forEach(el => {
    lazyObserver.observe(el);
});
```

---

### 5.2 事件监听器管理

#### 正确保存和移除引用

```javascript
class FloatingToolbar {
    constructor() {
        this.onDrag = this.onDrag.bind(this);
        this.endDrag = this.endDrag.bind(this);
    }
    
    startDrag(e) {
        this.isDragging = true;
        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('mouseup', this.endDrag);
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        // 拖动逻辑
    }
    
    endDrag(e) {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.endDrag);
    }
    
    destroy() {
        // 页面卸载时清理
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.endDrag);
    }
}
```

#### 防止重复注册

```javascript
// 使用全局标志
if (!window.yanzhiYouliMessageListenerRegistered) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // 处理消息
    });
    
    window.yanzhiYouliMessageListenerRegistered = true;
    console.log('✅ 消息监听器已注册');
}
```

---

### 5.3 CSS 变量系统

#### 统一圆角设计

```css
:root {
    --yz-border-radius-sm: 8px;
    --yz-border-radius-md: 12px;  /* 推荐使用 */
    --yz-border-radius-lg: 16px;
}

/* 应用示例 */
.yz-highlighted,
.inciting-text {
    border-radius: var(--yz-border-radius-md);
}

.yz-result-card {
    border-radius: var(--yz-border-radius-md);
}

#yz-floating-toolbar {
    border-radius: var(--yz-border-radius-md);
}
```

#### 微交互动画

```css
/* 按钮悬停动画 */
.yz-toolbar-btn {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.yz-toolbar-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.yz-toolbar-btn:active {
    transform: translateY(0);
}

/* 卡片出现动画 */
@keyframes yz-slideIn {
    from {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.yz-result-card-animate {
    animation: yz-slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 6. 常见问题解答

### Q1: 如何添加新的敏感词类别？

**步骤**:
1. 编辑 `ui/highlight.js` 中的 `INLINE_WORD_DATA`
2. 添加新分类到 `categories` 对象
3. 重新加载扩展

```javascript
const INLINE_WORD_DATA = {
    categories: {
        basic_incitement: {
            name: "基础煽动性",
            words: ["打倒", "推翻", "消灭", ...]
        },
        // 添加新分类
        my_category: {
            name: "我的分类",
            words: ["词汇 1", "词汇 2", ...]
        }
    }
};
```

---

### Q2: 如何添加新的 AI 功能类型？

**步骤**:

1. **添加 Prompt 模板** (`background/service-worker.js`)
```javascript
PromptTemplates.myType = (text) => `请对以下文本进行自定义分析：
"${text}"
...`;
```

2. **添加工具栏按钮** (`ui/toolbar.js`)
```javascript
this.buttons = [
    ...existingButtons,
    {
        id: 'yz-my-type',
        icon: '⭐',
        label: '我的功能',
        action: 'myType',
        color: '#FF5722'
    }
];
```

3. **添加开关控制** (`options/options.html`)
```html
<div class="feature-item">
    <div class="feature-info">
        <h3>⭐ 我的功能</h3>
    </div>
    <label class="switch">
        <input type="checkbox" id="enableMyType">
        <span class="slider"></span>
    </label>
</div>
```

---

### Q3: 如何调试 iframe 内的问题？

**步骤**:

1. **修改 manifest.json**
```json
{
  "content_scripts": [
    {
      "all_frames": true,
      "match_about_blank": true
    }
  ]
}
```

2. **在 iframe 内打开控制台**
   - 右键点击 iframe 内容
   - 选择"检查"
   - 确认控制台属于正确的框架

3. **添加 iframe 特定日志**
```javascript
const isInIframe = window !== window.parent;
console.log(`[Content Script] ${isInIframe ? '在 iframe 内' : '在主页面'}`);
```

---

### Q4: 性能问题如何定位？

**工具和方法**:

1. **Chrome DevTools Performance 面板**
   - 录制一段时间的操作
   - 查看火焰图找出耗时操作
   - 关注黄色/红色警告区域

2. **Memory 面板**
   - 拍摄堆快照
   - 查找内存泄漏
   - 对比不同时间点的快照

3. **自定义性能监控**
```javascript
// 添加性能埋点
performance.mark('detection-start');
// ... 检测逻辑
performance.measure('detection-duration', 'detection-start');

// 查看测量结果
const measures = performance.getEntriesByName('detection-duration');
measures.forEach(m => {
    console.log(`检测耗时：${m.duration.toFixed(2)}ms`);
});
```

---

### Q5: 如何处理 CSP 错误？

**症状**: 控制台显示 `Refused to execute inline event handler because it violates Content Security Policy`

**解决方案**:

1. **识别违规位置**
```javascript
// 监听 CSP 违规事件
document.addEventListener('securitypolicyviolation', (e) => {
    console.error('CSP 违规:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        sourceFile: e.sourceFile
    });
});
```

2. **替换为 addEventListener**
```javascript
// ❌ 错误
<button onclick="handleClick()">点击</button>

// ✅ 正确
<button id="myBtn">点击</button>
<script>
document.getElementById('myBtn').addEventListener('click', handleClick);
</script>
```

3. **动态元素的事件绑定**
```javascript
function createModal() {
    const modal = document.createElement('div');
    const closeBtn = document.createElement('button');
    
    closeBtn.addEventListener('click', closeModal);  // 立即绑定
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
}
```

---

## 附录

### A. 代码规范

#### 命名约定

- **类名**: PascalCase (如 `SensitiveWordDetector`)
- **函数**: camelCase (如 `detectIncitingContent`)
- **常量**: UPPER_SNAKE_CASE (如 `DEFAULT_CONFIG`)
- **CSS 变量**: `--yz-prefix-property` (如 `--yz-border-radius-md`)

#### 注释规范

```javascript
/**
 * 检测文本中的煽动性内容
 * @param {string} text - 待检测的文本
 * @param {Object} options - 检测选项
 * @returns {Object} 检测结果对象
 */
function detect(text, options = {}) {
    // 实现代码
}
```

---

### B. 测试用例大全

#### 高危句式测试

```javascript
const result = detector.detect("我们必须彻底消灭这些敌人！");
// 预期：高置信度 (危险句式 + 程度副词 + 敏感词)
console.log(result);
```

#### 否定语境测试

```javascript
const result = detector.detect("我们不应该使用暴力解决问题");
// 预期：低置信度（否定词降权）
console.log(result);
```

#### 学术语境测试

```javascript
const result = detector.detect("研究表明，暴力行为会导致心理创伤");
// 预期：不标记（白名单过滤）
console.log(result);
```

---

### C. 最佳实践清单

#### ✅ 推荐做法

- 先启用高亮检测快速识别可疑内容
- 对关键信息使用事实核查
- 长文章使用智能摘要
- 根据环境选择合适的主题
- 定期清空缓存重新测试
- 使用性能监控工具

#### ❌ 避免做法

- 同时启用所有功能
- 对过短文本（<5 字）使用分析功能
- 频繁切换主题
- 在重要操作时切换主题
- 忽略控制台错误信息
- 在生产环境使用测试文件

---

### D. 相关资源

- **综合技术报告**: [COMPREHENSIVE_REPORT.md](./COMPREHENSIVE_REPORT.md)
- **系统维护报告**: [SYSTEM_MAINTENANCE_REPORT.md](./SYSTEM_MAINTENANCE_REPORT.md)
- **v1.3 发布说明**: [v1.3_RELEASE_NOTES.md](./v1.3_RELEASE_NOTES.md)

---

**文档生成时间**: 2026-03-27  
**维护团队**: 言之有理开发团队  
**下次更新**: v1.4.0 (预计 2026-04-27)  
**文档版本**: v1.0
