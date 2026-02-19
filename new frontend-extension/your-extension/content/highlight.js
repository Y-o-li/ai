// =============================================================================
// 本地煽动性词库检测与高亮模块
// =============================================================================
// 描述: 加载本地词库，检测页面文本中的煽动性内容并高亮显示
// =============================================================================

// =============================================================================
// 内联词库数据（解决CSP限制）
// =============================================================================
const INLINE_WORD_DATA = {
  "version": "1.0.0",
  "description": "本地煽动性词库 - 用于本地检测网页中的煽动性语言",
  "categories": {
    "basic_incitement": {
      "name": "基础煽动性词汇",
      "words": [
        "打倒", "推翻", "消灭", "杀死", "暴力", "反抗", "抵制", "斗争", "冲突", "破坏",
        "封杀", "妖魔化", "揭竿而起", "卖国贼", "汉奸", "走狗", "清算", "严惩"
      ]
    },
    "terrorism": {
      "name": "恐怖主义相关",
      "words": [
        "恐怖袭击", "爆炸", "袭击", "血洗", "屠杀", "极端", "恐怖组织", "炸弹", "纵火", "劫持",
        "血债血偿", "暴徒"
      ]
    },
    "political_incitement": {
      "name": "政治煽动相关",
      "words": [
        "颠覆", "造反", "起义", "革命", "暗杀", "政变", "分裂", "独立", "政权", "统治",
        "反华势力", "境外势力", "渗透"
      ]
    },
    "social_incitement": {
      "name": "社会煽动相关",
      "words": [
        "煽动", "蛊惑", "造谣", "传谣", "恐慌", "混乱", "暴乱", "骚乱", "聚众", "闹事",
        "妖言惑众", "煽风点火"
      ]
    },
    "discrimination": {
      "name": "歧视仇恨相关",
      "words": [
        "种族歧视", "民族仇恨", "宗教冲突", "地域歧视", "性别歧视", "排外", "仇恨", "敌视", "蔑视", "侮辱"
      ]
    }
  },
  "patterns": {
    "intensifiers": [
      "必须", "一定", "绝对", "坚决", "彻底", "全面", "马上", "立即"
    ],
    "call_to_action": [
      "行动起来", "一起", "大家", "所有人", "团结", "联合起来"
    ]
  }
};


class SensitiveWordDetector {
    constructor() {
        this.wordList = [];
        this.wordMap = new Map();
        this.isLoaded = false;
        this.cache = new Map();
        this.maxCacheSize = 200;
        
        // 配置
        this.config = {
            minTextLength: 1,
            highlightOpacity: 0.3,
            highConfidenceThreshold: 0.8,
            mediumConfidenceThreshold: 0.5
        };

        // 添加消息监听  
        this.setupMessageListener();  
    
    // 监听自定义事件
        window.addEventListener('yz-wordlist-ready', () => {
            if (window._yz_wordlist_data && !this.isLoaded) {
                console.log('📥 通过自定义事件获取词库数据');
                this.processWordList(window._yz_wordlist_data);
            }
        });
    }

    /**
     * 设置消息监听
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'YANZHI_YOULI_WORDLIST') {
                console.log('📥 highlight.js 收到消息数据');
                this.processWordList(event.data.data);
            }
        });
    }

    /**
     * 处理词库数据
     * @param {Object} data - 词库JSON数据
     */
    processWordList(data) {
        // 提取所有词汇
        this.wordList = [];
        Object.values(data.categories).forEach(category => {
            this.wordList.push(...category.words);
        });
        
        // 构建词频映射
        this.wordList.forEach((word, index) => {
            this.wordMap.set(word, {
                index,
                category: this.getWordCategory(word, data.categories)
            });
        });
        
        this.isLoaded = true;
        console.log('✅ 煽动性词库加载完成，共', this.wordList.length, '个词汇');
        
        // 触发一个自定义事件，让其他部分知道词库已加载
        window.dispatchEvent(new CustomEvent('yz-wordlist-loaded'));
    }

    async loadWordList() {
        // 如果已经加载，直接返回
        if (this.isLoaded) {
            return true;
        }
        
        // 直接使用内联数据
        console.log('📥 使用内联词库数据');
        this.processWordList(INLINE_WORD_DATA);
        return true;
    }

    /**
     * 获取词汇所属分类
     * @param {string} word - 词汇
     * @param {Object} categories - 分类对象
     * @returns {string} 分类名称
     */
    getWordCategory(word, categories) {
        for (const [key, category] of Object.entries(categories)) {
            if (category.words.includes(word)) {
                return category.name;
            }
        }
        return '未知分类';
    }

    /**
     * 检测文本中的煽动性内容
     * @param {string} text - 待检测文本
     * @returns {Object} 检测结果
     */
    detect(text) {
        if (!this.isLoaded || !text || text.length < this.config.minTextLength) {
            return { isInciting: false, confidence: 0, matches: [] };
        }

        // 检查缓存
        if (this.cache.has(text)) {
            return this.cache.get(text);
        }

        const matches = [];
        let totalScore = 0;

        // 遍历词库进行匹配
        for (const word of this.wordList) {
            if (text.includes(word)) {
                console.log(`🔍 发现匹配: "${word}" 在文本中`);
                const wordInfo = this.wordMap.get(word);
                const positions = this.findAllPositions(text, word);
                
                positions.forEach(pos => {
                    matches.push({
                        word,
                        category: wordInfo.category,
                        start: pos.start,
                        end: pos.end,
                        score: this.calculateWordScore(word, text)
                    });
                });
                
                totalScore += this.calculateWordScore(word, text);
            }
        }

        // 计算整体置信度
        const confidence = this.calculateConfidence(totalScore, matches.length, text.length);
        const isInciting = confidence >= this.config.mediumConfidenceThreshold;

        const result = {
            isInciting,
            confidence,
            matches: matches.sort((a, b) => a.start - b.start)
        };

        // 存入缓存
        this.addToCache(text, result);

        return result;
    }

    /**
     * 查找词汇在文本中的所有位置
     * @param {string} text - 文本
     * @param {string} word - 词汇
     * @returns {Array} 位置数组
     */
    findAllPositions(text, word) {
        const positions = [];
        let pos = text.indexOf(word);
        
        while (pos !== -1) {
            positions.push({ start: pos, end: pos + word.length });
            pos = text.indexOf(word, pos + 1);
        }
        
        return positions;
    }

    /**
     * 计算单个词汇的分数
     * @param {string} word - 词汇
     * @param {string} text - 文本
     * @returns {number} 分数
     */
    calculateWordScore(word, text) {
        // 基础分数
        let score = 1;
        
        // 词汇越长权重越高
        score += word.length * 0.1;
        
        // 如果词汇在文本开头，权重更高
        if (text.indexOf(word) === 0) {
            score += 0.5;
        }
        
        return score;
    }

    /**
     * 计算整体置信度
     * @param {number} totalScore - 总分数
     * @param {number} matchCount - 匹配数量
     * @param {number} textLength - 文本长度
     * @returns {number} 置信度 (0-1)
     */
    calculateConfidence(totalScore, matchCount, textLength) {
        if (matchCount === 0) return 0;
        
        // 基础置信度
        let confidence = Math.min(0.5 + (totalScore * 0.1), 0.95);
        
        // 根据匹配密度调整
        const density = matchCount / (textLength / 10);
        confidence = Math.min(confidence + density * 0.1, 0.98);
        
        return confidence;
    }

    /**
     * 添加到缓存
     * @param {string} key - 缓存键
     * @param {Object} value - 缓存值
     */
    addToCache(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * 高亮文本节点
     * @param {Node} node - 文本节点
     * @param {Object} detectionResult - 检测结果
     */
    highlight(node, detectionResult) {
        if (!detectionResult.isInciting || detectionResult.matches.length === 0) {
            return;
        }

        const text = node.textContent;
        const parent = node.parentNode;
        
        if (!parent) return;

        // 创建文档片段
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        // 按位置排序的匹配项
        const sortedMatches = detectionResult.matches.sort((a, b) => a.start - b.start);
        
        // 合并重叠的匹配项
        const mergedMatches = this.mergeOverlappingMatches(sortedMatches);

        mergedMatches.forEach(match => {
            // 添加匹配前的文本
            if (match.start > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(text.substring(lastIndex, match.start))
                );
            }

            // 创建高亮元素
            const highlightSpan = this.createHighlightSpan(
                text.substring(match.start, match.end),
                detectionResult.confidence,
                match
            );
            fragment.appendChild(highlightSpan);

            lastIndex = match.end;
        });

        // 添加剩余文本
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        // 替换原节点
        parent.replaceChild(fragment, node);
    }

    /**
     * 合并重叠的匹配项
     * @param {Array} matches - 匹配项数组
     * @returns {Array} 合并后的数组
     */
    mergeOverlappingMatches(matches) {
        if (matches.length <= 1) return matches;

        const merged = [matches[0]];
        
        for (let i = 1; i < matches.length; i++) {
            const current = matches[i];
            const last = merged[merged.length - 1];

            if (current.start <= last.end) {
                // 有重叠，合并
                last.end = Math.max(last.end, current.end);
                last.word = text.substring(last.start, last.end);
            } else {
                merged.push(current);
            }
        }

        return merged;
    }

    /**
     * 创建高亮元素
     * @param {string} text - 文本内容
     * @param {number} confidence - 置信度
     * @param {Object} match - 匹配信息
     * @returns {HTMLElement} 高亮元素
     */
    createHighlightSpan(text, confidence, match) {
        const span = document.createElement('span');
        span.className = 'yz-highlighted inciting-text';
        span.textContent = text;

        // 根据置信度设置背景色透明度
        const opacity = Math.min(confidence * this.config.highlightOpacity + 0.1, 0.6);
        span.style.backgroundColor = `rgba(255, 82, 82, ${opacity})`;
        span.style.color = confidence > 0.9 ? '#d32f2f' : '#c62828';
        
        // 添加提示信息
        const categoryText = match.category ? ` [${match.category}]` : '';
        span.title = `煽动性内容${categoryText} (置信度: ${(confidence * 100).toFixed(1)}%)`;

        return span;
    }
}

// 创建全局检测器实例
const detector = new SensitiveWordDetector();

/**
 * 扫描并高亮页面中的煽动性内容
 */
async function scanAndHighlight() {
    // 确保词库已加载
    if (!detector.isLoaded) {
        const loaded = await detector.loadWordList();
        if (!loaded) return;
    }

    // 获取所有文本节点
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // 跳过空白节点
                if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                
                // 跳过已高亮的节点
                const parent = node.parentElement;
                if (parent && (parent.classList.contains('yz-highlighted') || 
                    parent.classList.contains('inciting-text'))) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // 跳过脚本和样式标签
                if (parent && (parent.tagName === 'SCRIPT' || 
                    parent.tagName === 'STYLE' ||
                    parent.tagName === 'NOSCRIPT')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    const nodesToProcess = [];
    let node;
    
    while (node = walker.nextNode()) {
        if (node.textContent.trim().length >= detector.config.minTextLength) {
            nodesToProcess.push(node);
        }
    }

    console.log(`🔍 开始检测 ${nodesToProcess.length} 个文本节点...`);
    let detectedCount = 0;

    // 批量处理节点
    for (const textNode of nodesToProcess) {
        const text = textNode.textContent;
        const result = detector.detect(text);
        
        if (result.isInciting) {
            detector.highlight(textNode, result);
            detectedCount++;
        }
    }

    console.log(`✅ 检测完成，发现 ${detectedCount} 处煽动性内容`);
}

/**
 * 对单个节点进行检测（用于实时监听）
 * @param {Node} node - 文本节点
 */
function detectNode(node) {
    if (!detector.isLoaded) return;
    
    const text = node.textContent;
    if (text.trim().length < detector.config.minTextLength) return;
    
    const result = detector.detect(text);
    if (result.isInciting) {
        detector.highlight(node, result);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SensitiveWordDetector, scanAndHighlight, detectNode };
}

// 在浏览器环境中自动初始化
if (typeof window !== 'undefined' && !window.detector) {
    // 创建全局detector实例
    window.detector = new SensitiveWordDetector();

    // 等待DOM就绪后自动加载词库并扫描
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🎯 Highlight.js 自动初始化');
            await window.detector.loadWordList();
            await scanAndHighlight();
        });
    } else {
        // DOM已经就绪
        console.log('🎯 Highlight.js 自动初始化（DOM已就绪）');
        window.detector.loadWordList().then(() => {
            scanAndHighlight();
        });
    }
    // 调试函数：检查页面中是否包含特定词汇
    function debugCheckWord(word) {
        const bodyText = document.body.innerText;
        if (bodyText.includes(word)) {
            console.log(`✅ 页面包含词汇: "${word}"`);
            return true;
        } else {
            console.log(`❌ 页面不包含词汇: "${word}"`);
            return false;
        }
    }

    // 调试函数：列出所有未匹配的词汇
    function debugUnmatchedWords() {
        const testWords = [
            "封杀", "妖魔化", "揭竿而起", "卖国贼", "汉奸", "走狗", 
            "血债血偿", "清算", "反华势力", "境外势力", "渗透", 
            "妖言惑众", "煽风点火", "严惩"
        ];
        
        console.log('=== 词汇匹配调试 ===');
        testWords.forEach(word => {
            const bodyText = document.body.innerText;
            if (bodyText.includes(word)) {
                console.log(`✅ 页面包含: "${word}"`);
                // 检查是否在词库中
                if (detector.wordList.includes(word)) {
                    console.log(`   ✓ 词库中也包含: "${word}"`);
                } else {
                    console.log(`   ✗ 词库中不包含: "${word}" (!)`);
                }
            } else {
                console.log(`❌ 页面不包含: "${word}"`);
            }
        });
    }
    
}
