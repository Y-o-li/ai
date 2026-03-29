// =============================================================================
// 历史记录页面脚本
// =============================================================================

let currentFilter = 'all';
let currentSearch = '';
let allRecords = [];
let selectMode = false;
let selectedRecords = new Set();

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 初始化页面
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadRecords();
    bindEvents();
});

/**
 * 加载所有记录
 */
async function loadRecords() {
    try {
        const listEl = document.getElementById('historyList');
        listEl.innerHTML = '<div class="loading">加载中...</div>';
        
        allRecords = await window.historyManager.getAll();
        renderRecords();
        
        document.getElementById('totalCount').textContent = allRecords.length;
    } catch (error) {
        console.error('加载历史记录失败:', error);
        document.getElementById('historyList').innerHTML = '<div class="empty-state">❌ 加载失败</div>';
    }
}

/**
 * 渲染记录列表
 */
function renderRecords() {
    const listEl = document.getElementById('historyList');
    
    // 筛选
    let filtered = filterRecords(allRecords);
    
    // 更新显示的记录数量
    document.getElementById('totalCount').textContent = filtered.length;
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state">📭 暂无历史记录</div>';
        return;
    }
    
    // 按日期分组
    const grouped = groupByDate(filtered);
    
    let html = '';
    for (const [date, records] of Object.entries(grouped)) {
        html += `<div class="date-group">`;
        html += `<div class="date-header">${formatDate(date)}</div>`;
        
        records.forEach(record => {
            html += renderRecordItem(record);
        });
        
        html += `</div>`;
    }
    
    listEl.innerHTML = html;
    
    // 绑定卡片内按钮事件
    bindRecordEvents();
}

/**
 * 筛选记录
 */
function filterRecords(records) {
    let filtered = [...records];
    
    // 按类型筛选
    if (currentFilter === 'favorite') {
        filtered = filtered.filter(r => r.isFavorite);
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(r => r.type === currentFilter);
    }
    
    // 按搜索词筛选
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(r => {
            const fullOriginalText = r.originalTextFull || r.originalText || '';
            return fullOriginalText.toLowerCase().includes(searchLower) ||
                   (r.result || '').toLowerCase().includes(searchLower);
        });
    }
    
    return filtered;
}

/**
 * 按日期分组
 */
function groupByDate(records) {
    const groups = {};
    records.forEach(record => {
        if (!groups[record.date]) {
            groups[record.date] = [];
        }
        groups[record.date].push(record);
    });
    return groups;
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    
    const [year, month, day] = dateStr.split('-');
    return `${year}年${month}月${day}日`;
}

/**
 * 渲染单条记录
 */
function renderRecordItem(record) {
    const typeClass = record.type;
    const favoriteClass = record.isFavorite ? 'active' : '';
    const favoriteIcon = record.isFavorite ? '⭐' : '☆';
    const favoriteTitle = record.isFavorite ? '取消收藏' : '收藏';
    
    // 使用完整原文或截断的原文
    const fullOriginalText = record.originalTextFull || record.originalText || '';
    const originalPreview = fullOriginalText.length > 100 
        ? fullOriginalText.substring(0, 100) + '...' 
        : fullOriginalText;
    
    const resultPreview = record.result.length > 150 
        ? record.result.substring(0, 150) + '...' 
        : record.result;
    
    // 正确计算字符数
    const actualLength = fullOriginalText.length;
    
    const isSelected = selectedRecords.has(record.id);
    const selectedClass = isSelected ? 'selected' : '';
    const checkboxDisplay = selectMode ? 'flex' : 'none';
    const checkboxChecked = isSelected ? 'checked' : '';
    
    return `
        <div class="history-item ${selectedClass}" data-id="${record.id}">
            <div class="history-checkbox" style="display: ${checkboxDisplay};">
                <input type="checkbox" ${checkboxChecked} data-record-id="${record.id}">
            </div>
            <div class="history-item-content">
                <div class="history-item-header">
                    <span class="history-type ${typeClass}">${record.typeName}</span>
                    <span class="history-date">${new Date(record.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="history-original" title="${escapeHtml(fullOriginalText)}">${escapeHtml(originalPreview)}</div>
                <div class="history-result-preview">${escapeHtml(resultPreview)}</div>
                <div class="history-footer">
                    <span class="history-length">${actualLength} 字符</span>
                    <div class="history-actions">
                        <button class="favorite ${favoriteClass}" title="${favoriteTitle}">${favoriteIcon}</button>
                        <button class="view" title="查看详情">👁️</button>
                        <button class="reuse" title="重新分析">🔄</button>
                        <button class="delete" title="删除">🗑️</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 绑定记录卡片内的事件
 */
function bindRecordEvents() {
    // 绑定复选框事件
    document.querySelectorAll('.history-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.recordId;
            toggleRecordSelection(id);
        });
    });
    
    document.querySelectorAll('.favorite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const item = e.target.closest('.history-item');
            const id = item.dataset.id;
            await window.historyManager.toggleFavorite(id);
            await loadRecords(); // 重新加载
        });
    });
    
    document.querySelectorAll('.view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('.history-item');
            const id = item.dataset.id;
            showDetail(id);
        });
    });
    
    document.querySelectorAll('.reuse').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('.history-item');
            const id = item.dataset.id;
            reuseRecord(id);
        });
    });
    
    document.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('确定删除这条记录吗？')) return;
            
            const item = e.target.closest('.history-item');
            const id = item.dataset.id;
            await window.historyManager.delete(id);
            await loadRecords(); // 重新加载
        });
    });
}

/**
 * 显示详情弹窗
 */
async function showDetail(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    
    // 使用完整原文
    const fullOriginalText = record.originalTextFull || record.originalText || '';
    
    document.getElementById('modalTitle').textContent = record.typeName;
    document.getElementById('modalOriginal').textContent = fullOriginalText;
    document.getElementById('modalResult').innerHTML = formatResult(record.result);
    
    // 存储当前记录ID供按钮使用
    document.getElementById('modalCopyBtn').dataset.id = id;
    document.getElementById('modalReuseBtn').dataset.id = id;
    document.getElementById('modalDeleteBtn').dataset.id = id;
    
    document.getElementById('detailModal').classList.add('show');
}

/**
 * 格式化结果（支持简单markdown）
 */
function formatResult(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

/**
 * 重新分析记录
 */
async function reuseRecord(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    
    // 显示重新分析选项弹窗
    showReanalyzeModal(record);
}

/**
 * 显示重新分析选项弹窗
 */
function showReanalyzeModal(record) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'reanalyzeModal';
    
    const fullOriginalText = record.originalTextFull || record.originalText || '';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🔄 重新分析</h2>
                <button class="close-btn" id="reanalyzeCloseBtn">✕</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 8px;">原文预览:</div>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; max-height: 150px; overflow-y: auto; font-size: 14px;">
                        ${escapeHtml(fullOriginalText.substring(0, 200))}${fullOriginalText.length > 200 ? '...' : ''}
                    </div>
                    <div style="color: #666; font-size: 12px; margin-top: 4px;">
                        共 ${fullOriginalText.length} 字符
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 12px; color: #333;">选择分析类型:</div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="reanalyze-option" data-type="factCheck" style="padding: 16px; border: 2px solid #4CAF50; background: #f1f8f4; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; position: relative; overflow: hidden;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; background: #4CAF50; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; color: white;">✓</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #2d7a3e; font-size: 15px; margin-bottom: 4px;">事实核查</div>
                                    <div style="font-size: 12px; color: #555; line-height: 1.4;">验证文本中的事实准确性和可信度</div>
                                </div>
                            </div>
                        </button>
                        
                        <button class="reanalyze-option" data-type="summarize" style="padding: 16px; border: 2px solid #2196F3; background: #f0f7ff; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; position: relative; overflow: hidden;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; background: #2196F3; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; color: white;">☰</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #1565c0; font-size: 15px; margin-bottom: 4px;">语义总结</div>
                                    <div style="font-size: 12px; color: #555; line-height: 1.4;">提取核心观点和关键要点</div>
                                </div>
                            </div>
                        </button>
                        
                        <button class="reanalyze-option" data-type="neutralize" style="padding: 16px; border: 2px solid #FF9800; background: #fff8f0; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; position: relative; overflow: hidden;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; background: #FF9800; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; color: white;">◐</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #e65100; font-size: 15px; margin-bottom: 4px;">中性化改写</div>
                                    <div style="font-size: 12px; color: #555; line-height: 1.4;">去除情绪化表达，改写为客观中性的文本</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
                
                <div id="reanalyzeStatus" style="display: none; padding: 12px; background: #e3f2fd; border-radius: 4px; margin-top: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #2196F3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <span>正在分析中，请稍候...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加样式
    if (!document.getElementById('reanalyze-styles')) {
        const style = document.createElement('style');
        style.id = 'reanalyze-styles';
        style.textContent = `
            .reanalyze-option:hover {
                border-color: #667eea !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                transform: translateY(-2px);
            }
            .reanalyze-option:active {
                transform: translateY(0);
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 绑定选项点击事件
    modal.querySelectorAll('.reanalyze-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.type;
            await performReanalyze(record, type);
        });
    });
    
    // 绑定关闭事件（使用 ID 选择器）
    const closeBtn = document.getElementById('reanalyzeCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeReanalyzeModal);
    }
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReanalyzeModal();
        }
    });
}

/**
 * 关闭重新分析弹窗
 */
function closeReanalyzeModal() {
    const modal = document.getElementById('reanalyzeModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * 执行重新分析
 */
async function performReanalyze(record, type) {
    const statusEl = document.getElementById('reanalyzeStatus');
    const optionBtns = document.querySelectorAll('.reanalyze-option');
    
    try {
        // 显示加载状态
        statusEl.style.display = 'block';
        optionBtns.forEach(btn => btn.disabled = true);
        
        const fullOriginalText = record.originalTextFull || record.originalText || '';
        
        // 发送LLM请求
        const response = await chrome.runtime.sendMessage({
            action: 'llmProcess',
            type: type,
            text: fullOriginalText
        });
        
        if (response && response.success) {
            // 成功
            statusEl.innerHTML = `
                <div style="color: #4CAF50; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">✓</span>
                    <span>分析完成！新记录已保存到历史记录。</span>
                </div>
            `;
            
            // 2秒后关闭弹窗并刷新列表
            setTimeout(async () => {
                closeReanalyzeModal();
                await loadRecords();
            }, 2000);
        } else {
            // 失败
            statusEl.innerHTML = `
                <div style="color: #f44336; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">✕</span>
                    <span>分析失败: ${response?.error || '未知错误'}</span>
                </div>
            `;
            optionBtns.forEach(btn => btn.disabled = false);
        }
    } catch (error) {
        console.error('重新分析失败:', error);
        statusEl.innerHTML = `
            <div style="color: #f44336; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">✕</span>
                <span>分析失败: ${error.message}</span>
            </div>
        `;
        optionBtns.forEach(btn => btn.disabled = false);
    }
}

/**
 * 绑定页面事件
 */
function bindEvents() {
    // 筛选标签点击
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.type;
            renderRecords();
        });
    });
    
    // 搜索
    document.getElementById('searchBtn').addEventListener('click', () => {
        currentSearch = document.getElementById('searchInput').value.trim();
        renderRecords();
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentSearch = e.target.value.trim();
            renderRecords();
        }
    });
    
    // 选择模式切换
    document.getElementById('selectModeBtn').addEventListener('click', toggleSelectMode);
    
    // 导出全部
    document.getElementById('exportBtn').addEventListener('click', () => exportHistory(false));
    
    // 导出选中
    document.getElementById('exportSelectedBtn').addEventListener('click', () => exportHistory(true));
    
    // 删除选中
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
    
    // 清空全部
    document.getElementById('clearBtn').addEventListener('click', clearHistory);
    
    // 全选
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    
    // 取消全选
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    
    // 弹窗关闭
    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('detailModal').classList.remove('show');
    });
    
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            document.getElementById('detailModal').classList.remove('show');
        }
    });
    
    // 弹窗内按钮
    document.getElementById('modalCopyBtn').addEventListener('click', copyResult);
    document.getElementById('modalReuseBtn').addEventListener('click', reuseFromModal);
    document.getElementById('modalDeleteBtn').addEventListener('click', deleteFromModal);
}

/**
 * 导出历史记录为PDF
 */
async function exportHistory(selectedOnly = false) {
    try {
        let records;
        
        if (selectedOnly) {
            // 导出选中的记录
            if (selectedRecords.size === 0) {
                alert('请先选择要导出的记录');
                return;
            }
            records = allRecords.filter(r => selectedRecords.has(r.id));
        } else {
            // 导出全部记录
            records = await window.historyManager.exportToPDF();
        }
        
        if (records.length === 0) {
            alert('暂无历史记录可导出');
            return;
        }
        
        // 创建一个隐藏的打印页面
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>言之有理 - 历史记录</title>
    <style>
        body {
            font-family: "Microsoft YaHei", "SimSun", sans-serif;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 10px;
        }
        .export-info {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .record {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .record-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .record-type {
            font-weight: bold;
            color: #667eea;
            font-size: 16px;
        }
        .record-time {
            color: #999;
            font-size: 14px;
        }
        .section-title {
            font-weight: bold;
            color: #333;
            margin-top: 15px;
            margin-bottom: 8px;
        }
        .section-content {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        @media print {
            body {
                padding: 10px;
            }
            .record {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <h1>📚 言之有理 - 历史记录</h1>
    <div class="export-info">
        <div>导出时间: ${new Date().toLocaleString('zh-CN')}</div>
        <div>记录总数: ${records.length}${selectedOnly ? ' (选中记录)' : ''}</div>
    </div>
`);

        records.forEach((record, index) => {
            const timeText = new Date(record.timestamp).toLocaleString('zh-CN');
            const fullOriginalText = record.originalTextFull || record.originalText || '';
            
            printWindow.document.write(`
    <div class="record">
        <div class="record-header">
            <span class="record-type">${index + 1}. ${record.typeName || '未知类型'}</span>
            <span class="record-time">${timeText}</span>
        </div>
        <div class="section-title">原文 (${fullOriginalText.length} 字符):</div>
        <div class="section-content">${escapeHtml(fullOriginalText)}</div>
        <div class="section-title">结果:</div>
        <div class="section-content">${escapeHtml(record.result || '')}</div>
    </div>
`);
        });

        printWindow.document.write(`
</body>
</html>
`);
        printWindow.document.close();
        
        // 等待内容加载完成后打印
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
    } catch (error) {
        console.error('导出PDF失败:', error);
        alert('导出失败: ' + error.message);
    }
}

/**
 * 切换选择模式
 */
function toggleSelectMode() {
    selectMode = !selectMode;
    const btn = document.getElementById('selectModeBtn');
    const exportSelectedBtn = document.getElementById('exportSelectedBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectedCountEl = document.getElementById('selectedCount');
    
    if (selectMode) {
        btn.textContent = '✓ 退出选择';
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
        exportSelectedBtn.style.display = 'inline-block';
        deleteSelectedBtn.style.display = 'inline-block';
        selectedCountEl.style.display = 'inline';
    } else {
        btn.textContent = '☑️ 选择模式';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        exportSelectedBtn.style.display = 'none';
        deleteSelectedBtn.style.display = 'none';
        selectedCountEl.style.display = 'none';
        selectedRecords.clear();
    }
    
    renderRecords();
    updateSelectedCount();
}

/**
 * 切换记录选中状态
 */
function toggleRecordSelection(id) {
    if (selectedRecords.has(id)) {
        selectedRecords.delete(id);
    } else {
        selectedRecords.add(id);
    }
    
    // 更新UI
    const item = document.querySelector(`.history-item[data-id="${id}"]`);
    if (item) {
        if (selectedRecords.has(id)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }
    
    updateSelectedCount();
}

/**
 * 更新选中计数
 */
function updateSelectedCount() {
    document.getElementById('selectedCountNum').textContent = selectedRecords.size;
}

/**
 * 全选当前显示的记录
 */
function selectAll() {
    const filtered = filterRecords(allRecords);
    filtered.forEach(record => {
        selectedRecords.add(record.id);
    });
    renderRecords();
    updateSelectedCount();
}

/**
 * 取消全选
 */
function deselectAll() {
    selectedRecords.clear();
    renderRecords();
    updateSelectedCount();
}

/**
 * 删除选中的记录
 */
async function deleteSelected() {
    if (selectedRecords.size === 0) {
        alert('请先选择要删除的记录');
        return;
    }
    
    const count = selectedRecords.size;
    if (!confirm(`确定删除选中的 ${count} 条记录吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        // 批量删除
        for (const id of selectedRecords) {
            await window.historyManager.delete(id);
        }
        
        // 清空选中集合
        selectedRecords.clear();
        
        // 重新加载记录
        await loadRecords();
        
        alert(`成功删除 ${count} 条记录`);
    } catch (error) {
        console.error('批量删除失败:', error);
        alert('删除失败: ' + error.message);
    }
}

/**
 * 清空历史记录
 */
async function clearHistory() {
    if (!confirm('确定清空所有历史记录吗？此操作不可恢复。')) return;
    
    try {
        await window.historyManager.clear();
        selectedRecords.clear();
        await loadRecords();
        alert('已清空所有历史记录');
    } catch (error) {
        console.error('清空历史记录失败:', error);
        alert('清空失败: ' + error.message);
    }
}

/**
 * 从弹窗复制结果
 */
async function copyResult(e) {
    const id = e.target.dataset.id;
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    
    try {
        await navigator.clipboard.writeText(record.result);
        alert('已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
    }
}

/**
 * 从弹窗重新分析
 */
function reuseFromModal(e) {
    const id = e.target.dataset.id;
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    
    // 关闭详情弹窗
    document.getElementById('detailModal').classList.remove('show');
    
    // 显示重新分析弹窗
    showReanalyzeModal(record);
}

/**
 * 从弹窗删除
 */
async function deleteFromModal(e) {
    if (!confirm('确定删除这条记录吗？')) return;
    
    const id = e.target.dataset.id;
    await window.historyManager.delete(id);
    document.getElementById('detailModal').classList.remove('show');
    await loadRecords();
}