// =============================================================================
// 历史记录页面脚本
// =============================================================================

let currentFilter = 'all';
let currentSearch = '';
let allRecords = [];

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
        filtered = filtered.filter(r => 
            r.originalText.toLowerCase().includes(searchLower) ||
            r.result.toLowerCase().includes(searchLower)
        );
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
    const originalPreview = record.originalText.length > 100 
        ? record.originalText.substring(0, 100) + '...' 
        : record.originalText;
    const resultPreview = record.result.length > 150 
        ? record.result.substring(0, 150) + '...' 
        : record.result;
    
    return `
        <div class="history-item" data-id="${record.id}">
            <div class="history-item-header">
                <span class="history-type ${typeClass}">${record.typeName}</span>
                <span class="history-date">${new Date(record.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="history-original" title="${record.originalText}">${originalPreview}</div>
            <div class="history-result-preview">${resultPreview}</div>
            <div class="history-footer">
                <span class="history-length">${record.length} 字符</span>
                <div class="history-actions">
                    <button class="favorite ${favoriteClass}" title="收藏">⭐</button>
                    <button class="view" title="查看详情">👁️</button>
                    <button class="reuse" title="重新分析">🔄</button>
                    <button class="delete" title="删除">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 绑定记录卡片内的事件
 */
function bindRecordEvents() {
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
    
    document.getElementById('modalTitle').textContent = record.typeName;
    document.getElementById('modalOriginal').textContent = record.originalText;
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
function reuseRecord(id) {
    // TODO: 在content-script中实现重新分析功能
    alert('此功能即将实现');
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
    
    // 导出
    document.getElementById('exportBtn').addEventListener('click', exportHistory);
    
    // 清空
    document.getElementById('clearBtn').addEventListener('click', clearHistory);
    
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
    document.getElementById('modalDeleteBtn').addEventListener('click', deleteFromModal);
}

/**
 * 导出历史记录
 */
async function exportHistory() {
    const json = await window.historyManager.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 清空历史记录
 */
async function clearHistory() {
    if (!confirm('确定清空所有历史记录吗？此操作不可恢复。')) return;
    await window.historyManager.clear();
    await loadRecords();
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
 * 从弹窗删除
 */
async function deleteFromModal(e) {
    if (!confirm('确定删除这条记录吗？')) return;
    
    const id = e.target.dataset.id;
    await window.historyManager.delete(id);
    document.getElementById('detailModal').classList.remove('show');
    await loadRecords();
}