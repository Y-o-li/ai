// =============================================================================
// 本地煽动性词库检测与高亮模块
// =============================================================================
// 描述: 加载本地词库，检测页面文本中的煽动性内容并高亮显示
// =============================================================================

// =============================================================================
// 内联词库数据（解决 CSP 限制）- 扩充版 v2.0.0
// =============================================================================
const INLINE_WORD_DATA = {
  "version": "2.0.0",
  "description": "本地煽动性词库 - 用于本地检测网页中的煽动性语言（扩充版）",
  "categories": {
    "basic_incitement": {
      "name": "基础煽动性词汇",
      "words": [
        "打倒", "推翻", "消灭", "杀死", "暴力", "反抗", "抵制", "斗争", "冲突", "破坏",
        "封杀", "妖魔化", "揭竿而起", "卖国贼", "汉奸", "走狗", "清算", "严惩",
        "摧毁", "粉碎", "铲除", "肃清", "清除", "砸烂", "撕碎", "践踏", "蹂躏", "扼杀",
        "敌人", "叛徒", "帮凶", "爪牙", "毒瘤", "祸害", "恶魔", "罪犯", "败类",
        "邪恶", "残忍", "野蛮", "疯狂", "丧心病狂", "令人发指", "惨无人道", "灭绝人性",
        "绝不放过", "血债血偿", "以眼还眼", "赶尽杀绝", "斩草除根", "不留后路"
      ]
    },
    "terrorism": {
      "name": "恐怖主义相关",
      "words": [
        "恐怖袭击", "爆炸", "袭击", "血洗", "屠杀", "极端", "恐怖组织", "炸弹", "纵火", "劫持",
        "血债血偿", "暴徒", "暗杀", "行刺", "谋害", "刺杀", "恐怖分子", "激进组织",
        "武装分子", "自杀式", "人体炸弹", "恐怖活动", "恐怖主义", "极端主义",
        "宗教极端", "暴力恐怖", "分裂势力"
      ]
    },
    "political_incitement": {
      "name": "政治煽动相关",
      "words": [
        "颠覆", "造反", "起义", "革命", "暗杀", "政变", "分裂", "独立", "政权", "统治",
        "反华势力", "境外势力", "渗透", "夺权", "篡位", "谋反", "叛乱", "暴动",
        "兵变", "宫廷政变", "颜色革命", "和平演变", "推翻政府", "颠覆国家",
        "危害国家安全", "勾结境外", "卖国求荣", "汉奸", "卖国贼"
      ]
    },
    "social_incitement": {
      "name": "社会煽动相关",
      "words": [
        "煽动", "蛊惑", "造谣", "传谣", "恐慌", "混乱", "暴乱", "骚乱", "聚众", "闹事",
        "妖言惑众", "煽风点火", "集结", "示威", "游行", "请愿", "上访", "集体维权",
        "群体事件", "围堵", "冲击", "占领", "静坐", "绝食", "抗议", "声讨",
        "谴责", "号召", "动员", "鼓动", "唆使", "教唆"
      ]
    },
    "discrimination": {
      "name": "歧视仇恨相关",
      "words": [
        "种族歧视", "民族仇恨", "宗教冲突", "地域歧视", "性别歧视", "排外", "仇恨", "敌视", "蔑视", "侮辱",
        "诽谤", "污蔑", "抹黑", "丑化", "标签化", "刻板印象", "偏见", "歧视",
        "排斥", "孤立", "霸凌", "网络暴力", "人肉搜索", "恶意攻击"
      ]
    }
  },
  "patterns": {
    "intensifiers": [
      "必须", "一定", "绝对", "坚决", "彻底", "全面", "马上", "立即",
      "立刻", "赶快", "赶紧", "务必", "切不可", "绝不能"
    ],
    "call_to_action": [
      "行动起来", "一起", "大家", "所有人", "团结", "联合起来",
      "携手", "共同", "一齐", "都来", "别再"
    ],
    "dangerous_patterns": [
      "我们必须", "我们要", "让我们一起", "大家都要", "所有人必须",
      "坚决做到", "彻底消灭", "绝不放过", "一定要", "切不可"
    ]
  },
  "synonyms": {
    "暴力": ["武力", "强制", "强硬手段", "激烈方式"],
    "打倒": ["推翻", "颠覆", "拉下马", "搞垮"],
    "消灭": ["铲除", "肃清", "清除", "抹去", "除掉"],
    "反抗": ["抵抗", "反对", "对抗", "回击"],
    "斗争": ["战斗", "抗争", "搏斗", "较量"],
    "敌人": ["对手", "敌对势力", "对立面", "仇敌"],
    "破坏": ["毁坏", "摧毁", "损害", "败坏"]
  },
  "whitelist": [
    "研究表明", "数据显示", "据统计", "专家认为", "据报道", "据悉",
    "文章指出", "论文提到", "历史上", "在小说中", "电影里"
  ]
};


class SensitiveWordDetector {
    constructor() {
        this.wordList = [];
        this.wordMap = new Map();
        this.isLoaded = false;
        // 优化 1: 使用 CacheManager 替代简单的 Map
        this.cache = new CacheManager(500, 5 * 60 * 1000); // 500 条，5 分钟 TTL
        
        // 新增：Trie 树结构
        this.trieTree = null;
        
        // 新增：同义词和白名单
        this.synonyms = {};
        this.whitelist = [];
        this.patterns = {};
        
        // 配置
        this.config = {
            minTextLength: 1,
            highlightOpacity: 0.3,
            highConfidenceThreshold: 0.8,
            mediumConfidenceThreshold: 0.5,
            contextWindowSize: 20,
            maxCacheTextLength: 1000, // 优化 2: 超过此长度的文本不缓存
            batchProcessSize: 50 // 优化 3: 批量处理节点数
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
     * @param {Object} data - 词库 JSON 数据
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
            
        // 新增：保存同义词和白名单
        if (data.synonyms) {
            this.synonyms = data.synonyms;
        }
        if (data.whitelist) {
            this.whitelist = data.whitelist;
        }
        if (data.patterns) {
            this.patterns = data.patterns;
        }
            
        // 新增：构建 Trie 树
        this.buildTrieTree();
            
        this.isLoaded = true;
        console.log('✅ 煽动性词库加载完成，共', this.wordList.length, '个词汇');
        console.log('🌳 Trie 树构建完成');
        console.log('📝 同义词组:', Object.keys(this.synonyms).length);
        console.log('✅ 白名单词汇:', this.whitelist.length);
            
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
     * 构建 Trie 树（前缀树）用于快速匹配
     */
    buildTrieTree() {
        const root = { children: {}, isEnd: false, word: null, category: null };
        
        for (const word of this.wordList) {
            let node = root;
            const wordInfo = this.wordMap.get(word);
            
            for (const char of word) {
                if (!node.children[char]) {
                    node.children[char] = { children: {}, isEnd: false, word: null, category: null };
                }
                node = node.children[char];
            }
            node.isEnd = true;
            node.word = word;
            node.category = wordInfo ? wordInfo.category : null;
        }
        
        this.trieTree = root;
    }

    /**
     * 使用 Trie 树进行多模式匹配
     * @param {string} text - 待检测文本
     * @returns {Array} 匹配结果数组
     */
    matchWithTrie(text) {
        if (!this.trieTree) return [];
        
        const matches = [];
        const len = text.length;
        
        for (let i = 0; i < len; i++) {
            let node = this.trieTree;
            let matchStr = '';
            
            for (let j = i; j < len; j++) {
                const char = text[j];
                if (!node.children[char]) break;
                
                node = node.children[char];
                matchStr += char;
                
                if (node.isEnd) {
                    matches.push({
                        word: node.word,
                        start: i,
                        end: j + 1,
                        category: node.category
                    });
                }
            }
        }
        
        return matches;
    }

    /**
     * 检查是否在白名单语境中
     * @param {string} text - 完整文本
     * @param {number} matchStart - 匹配开始位置
     * @returns {boolean}
     */
    isInWhitelistContext(text, matchStart) {
        // 检查前后文是否包含白名单短语
        const contextStart = Math.max(0, matchStart - 10);
        const context = text.substring(contextStart, matchStart + 20);
        
        for (const phrase of this.whitelist) {
            if (context.includes(phrase)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检测程度副词和号召性短语
     * @param {string} text - 上下文文本
     * @returns {Object} 模式检测结果
     */
    detectPatterns(text) {
        const result = {
            hasIntensifier: false,
            hasCallToAction: false,
            hasDangerousPattern: false,
            intensifiers: [],
            callToActions: [],
            dangerousPatterns: []
        };
        
        // 检测程度副词
        if (this.patterns.intensifiers) {
            for (const intensifier of this.patterns.intensifiers) {
                if (text.includes(intensifier)) {
                    result.hasIntensifier = true;
                    result.intensifiers.push(intensifier);
                }
            }
        }
        
        // 检测号召性短语
        if (this.patterns.call_to_action) {
            for (const call of this.patterns.call_to_action) {
                if (text.includes(call)) {
                    result.hasCallToAction = true;
                    result.callToActions.push(call);
                }
            }
        }
        
        // 检测危险句式
        if (this.patterns.dangerous_patterns) {
            for (const pattern of this.patterns.dangerous_patterns) {
                if (text.includes(pattern)) {
                    result.hasDangerousPattern = true;
                    result.dangerousPatterns.push(pattern);
                }
            }
        }
        
        return result;
    }

    /**
     * 检测否定词
     * @param {string} context - 上下文
     * @returns {boolean}
     */
    containsNegation(context) {
        const negations = [
            '不', '没', '无', '非', '勿', '别',
            '不要', '不能', '不会', '不可', '不许', '未必', '不妨'
        ];
        return negations.some(neg => context.includes(neg));
    }

    /**
     * 判断是否为疑问句
     * @param {string} context - 上下文
     * @returns {boolean}
     */
    isQuestion(context) {
        return /[？?]/.test(context) || 
               /^(什么 | 为什么 | 怎么 | 如何 | 是否 | 能否|难道)/.test(context);
    }

    /**
     * 生成缓存键（优化：包含上下文信息）
     * @param {string} text - 待检测文本
     * @param {Object} options - 选项
     * @returns {string} 缓存键
     */
    getCacheKey(text, options = {}) {
        // 如果文本过长，跳过缓存或使用 hash
        if (text.length > this.config.maxCacheTextLength) {
            return `hash:${this.simpleHash(text)}`;
        }
            
        // 构建包含上下文信息的缓存键
        const contextFlags = [
            options.isInQuote ? 'Q' : '0',      // 是否在引用块中
            options.isInEditable ? 'E' : '0',   // 是否在可编辑区域
            options.parentTag || 'N'             // 父标签类型
        ].join('_');
            
        return `${text.length}:${contextFlags}:${text.substring(0, 100)}`;
    }
    
    /**
     * 简单的字符串 hash 函数（用于长文本）
     * @param {string} str - 字符串
     * @returns {number} hash 值
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
    
    /**
     * 检测文本中的煽动性内容（优化版：LRU 缓存 + 上下文理解）
     * @param {string} text - 待检测文本
     * @param {Object} options - 选项参数
     * @returns {Object} 检测结果
     */
    detect(text, options = {}) {
        if (!this.isLoaded || !text || text.length < this.config.minTextLength) {
            return { isInciting: false, confidence: 0, matches: [] };
        }
        
        // 优化 1: 检查缓存（带上下文信息）
        const cacheKey = this.getCacheKey(text, options);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            console.log(`✅ 使用缓存结果：${cacheKey.substring(0, 50)}...`);
            return cachedResult;
        }
        
        // 新增：使用 Trie 树进行快速匹配
        const baseMatches = this.matchWithTrie(text);
                
        // 处理匹配结果，添加上下文理解
        const enhancedMatches = [];
        let totalScore = 0;
        
        for (const match of baseMatches) {
            // 检查白名单语境
            if (this.isInWhitelistContext(text, match.start)) {
                console.log(`⚠️ 白名单语境，跳过："${match.word}"`);
                continue; // 跳过学术、新闻等语境
            }
        
            // 提取上下文
            const contextStart = Math.max(0, match.start - this.config.contextWindowSize);
            const contextEnd = Math.min(text.length, match.end + this.config.contextWindowSize);
            const context = text.substring(contextStart, contextEnd);
        
            // 检测否定词和疑问句
            const hasNegation = this.containsNegation(context);
            const isQuestionContext = this.isQuestion(context);
        
            // 检测模式（程度副词、号召性等）
            const patternResult = this.detectPatterns(context);
        
            // 计算基础分数
            let wordScore = this.calculateWordScore(match.word, text);
        
            // 根据语境调整分数
            if (hasNegation) {
                wordScore *= 0.3; // 否定语境降权，如"不应该使用暴力"
            }
            if (isQuestionContext) {
                wordScore *= 0.5; // 疑问语境降权，如"什么是暴力？"
            }
        
            // 危险模式加权
            if (patternResult.hasIntensifier) {
                wordScore *= 1.3; // "必须暴力"比"暴力"更严重
            }
            if (patternResult.hasCallToAction) {
                wordScore *= 1.5; // "大家一起反抗"更严重
            }
            if (patternResult.hasDangerousPattern) {
                wordScore *= 1.8; // 危险句式，大幅提高权重
            }
        
            enhancedMatches.push({
                ...match,
                score: wordScore,
                context,
                hasNegation,
                isQuestionContext,
                patterns: patternResult
            });
        
            totalScore += wordScore;
        }
        
        // 计算整体置信度
        const confidence = this.calculateConfidence(totalScore, enhancedMatches.length, text.length);
        const isInciting = confidence >= this.config.mediumConfidenceThreshold;
        
        const result = {
            isInciting,
            confidence,
            matches: enhancedMatches.sort((a, b) => a.start - b.start)
        };
        
        // 优化 2: 存入缓存（自动处理 TTL 和 LRU）
        this.cache.set(cacheKey, result);
        
        // 定期清理过期缓存
        if (this.cache.getStats().size >= this.cache.maxSize * 0.9) {
            const cleaned = this.cache.cleanup();
            console.log(`🧹 清理了 ${cleaned} 个过期缓存项`);
        }
        
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
     * 清理过期缓存
     */
    clearOldCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
        console.log(`🧹 清理缓存完成，当前缓存大小：${this.cache.size}`);
    }

    /**
     * 高亮文本节点（优化版：批量 DOM 操作 + 合并相邻项）
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

        // 优化 1: 先收集所有需要创建的 DOM 元素信息
        const sortedMatches = detectionResult.matches.sort((a, b) => a.start - b.start);
        const mergedMatches = this.mergeOverlappingMatches(sortedMatches, text);
        
        // 优化 2: 合并相邻的匹配项（减少 DOM 元素数量）
        const adjacentMerged = this.mergeAdjacentMatches(mergedMatches);

        // 优化 3: 批量创建 DOM 元素
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        const elementsToCreate = [];

        // 第一阶段：收集所有要创建的元素
        adjacentMerged.forEach(match => {
            // 添加匹配前的文本
            if (match.start > lastIndex) {
                elementsToCreate.push({
                    type: 'text',
                    content: text.substring(lastIndex, match.start)
                });
            }

            // 创建高亮元素信息
            elementsToCreate.push({
                type: 'highlight',
                text: text.substring(match.start, match.end),
                confidence: detectionResult.confidence,
                match: match
            });

            lastIndex = match.end;
        });

        // 添加剩余文本
        if (lastIndex < text.length) {
            elementsToCreate.push({
                type: 'text',
                content: text.substring(lastIndex)
            });
        }

        // 第二阶段：批量创建 DOM 元素
        elementsToCreate.forEach(item => {
            if (item.type === 'text') {
                fragment.appendChild(document.createTextNode(item.content));
            } else {
                const span = this.createHighlightSpan(item.text, item.confidence, item.match);
                fragment.appendChild(span);
            }
        });

        // 优化 4: 一次性替换原节点（减少重排重绘）
        try {
            parent.replaceChild(fragment, node);
        } catch (error) {
            console.error('❌ 高亮替换失败:', error);
            // 降级处理：不替换，只记录日志
        }
    }

    /**
     * 合并重叠的匹配项
     * @param {Array} matches - 匹配项数组
     * @param {string} text - 原始文本
     * @returns {Array} 合并后的数组
     */
    mergeOverlappingMatches(matches, text) {
        if (matches.length <= 1) return matches;

        const merged = [matches[0]];
        
        for (let i = 1; i < matches.length; i++) {
            const current = matches[i];
            const last = merged[merged.length - 1];

            if (current.start <= last.end) {
                // 有重叠，合并
                last.end = Math.max(last.end, current.end);
                last.word = text.substring(last.start, last.end);
                // 合并分类信息
                if (current.category && !last.category) {
                    last.category = current.category;
                }
                // 累加分数
                if (current.score) {
                    last.score = (last.score || 0) + current.score;
                }
            } else {
                merged.push(current);
            }
        }

        return merged;
    }

    /**
     * 合并相邻的匹配项（优化：减少 DOM 元素数量）
     * @param {Array} matches - 匹配项数组
     * @returns {Array} 合并后的数组
     */
    mergeAdjacentMatches(matches) {
        if (matches.length <= 1) return matches;

        const merged = [];
        let currentGroup = null;

        for (const match of matches) {
            if (!currentGroup) {
                // 开始新组
                currentGroup = { ...match };
            } else if (
                // 检查是否相邻或重叠
                match.start <= currentGroup.end + 1 &&
                // 检查是否具有相同的置信度级别（可以合并为相同样式）
                Math.abs(match.score - (currentGroup.score || 0)) < 0.5
            ) {
                // 合并到当前组
                currentGroup.end = Math.max(currentGroup.end, match.end);
                currentGroup.word = currentGroup.word.substring(0, currentGroup.start - match.start) + 
                                   match.word.substring(currentGroup.end - match.start);
                currentGroup.score = (currentGroup.score || 0) + (match.score || 0);
                // 保留更重要的分类
                if (match.category && !currentGroup.category) {
                    currentGroup.category = match.category;
                }
            } else {
                // 保存当前组，开始新组
                merged.push(currentGroup);
                currentGroup = { ...match };
            }
        }

        // 添加最后一组
        if (currentGroup) {
            merged.push(currentGroup);
        }

        return merged;
    }

    /**
     * 创建高亮元素（优化版：支持嵌套安全）
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
        span.title = `煽动性内容${categoryText} (置信度：${(confidence * 100).toFixed(1)}%)`;
            
        // 优化：添加数据属性，便于调试和样式控制
        span.dataset.confidence = confidence.toFixed(2);
        span.dataset.category = match.category || 'unknown';
        span.dataset.score = match.score?.toFixed(2) || '0';
            
        // 嵌套安全：防止重复高亮
        span.dataset.isHighlighted = 'true';
            
        return span;
    }
}

// 创建全局检测器实例
const detector = new SensitiveWordDetector();

/**
 * 扫描并高亮页面中的煽动性内容（优化版：批量处理）
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
    let cacheHitCount = 0;

    // 优化 1: 批量处理节点（使用 requestIdleCallback 避免阻塞）
    const batchSize = detector.config.batchProcessSize;
    let currentIndex = 0;

    function processBatch() {
        const startTime = performance.now();
        
        while (currentIndex < nodesToProcess.length) {
            // 检查是否超过当前批次大小
            if (currentIndex % batchSize === 0 && currentIndex > 0) {
                // 让出主线程，避免阻塞
                requestIdleCallback(processBatch, { timeout: 100 });
                return;
            }

            const textNode = nodesToProcess[currentIndex];
            const text = textNode.textContent;
            
            // 获取上下文信息（用于缓存键）
            const parent = textNode.parentElement;
            const options = {
                isInQuote: parent?.closest('blockquote') !== null,
                isInEditable: TextUtils.isInEditableArea(textNode),
                parentTag: parent?.tagName || 'TEXT'
            };
            
            // 检测前检查缓存
            const cacheKey = detector.getCacheKey(text, options);
            const cachedResult = detector.cache.get(cacheKey);
            if (cachedResult) {
                cacheHitCount++;
            }
            
            const result = detector.detect(text, options);
            
            if (result.isInciting) {
                detector.highlight(textNode, result);
                detectedCount++;
            }
            
            currentIndex++;
        }

        // 完成所有处理
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`✅ 检测完成，发现 ${detectedCount} 处煽动性内容`);
        console.log(`📊 缓存命中率：${(cacheHitCount / nodesToProcess.length * 100).toFixed(2)}%`);
        console.log(`⏱️ 总耗时：${duration.toFixed(2)}ms`);
        
        // 输出缓存统计
        const stats = detector.cache.getStats();
        console.log(`💾 缓存状态：${stats.size}/${stats.maxSize}, 命中率：${stats.hitRate}%`);
    }

    // 开始第一批处理
    requestIdleCallback(processBatch, { timeout: 1000 });
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
    
    // 优化：添加性能监控函数
    window.getPerformanceReport = function() {
        const cacheStats = window.detector.cache.getStats();
        console.log('📊 ====== 性能报告 ======');
        console.log(`💾 缓存状态：${cacheStats.size}/${cacheStats.maxSize}`);
        console.log(`🎯 缓存命中率：${cacheStats.hitRate}%`);
        console.log(`⏱️ 平均 TTL: ${(cacheStats.avgTTL / 1000).toFixed(0)}秒`);
        console.log(`📝 词库大小：${window.detector.wordList.length} 词`);
        console.log(`🌳 Trie 树节点：${JSON.stringify(window.detector.trieTree).length} bytes`);
        console.log('========================');
        return cacheStats;
    };
    
    // 清理缓存函数
    window.clearCache = function() {
        window.detector.cache.clear();
        console.log('✅ 缓存已清空');
    };
}
