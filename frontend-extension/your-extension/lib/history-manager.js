// =============================================================================
// 历史记录管理器（通过 background 转发）
// =============================================================================

class HistoryManager {
  /**
   * 安全地发送消息到 background
   */
  async sendMessage(action, data = {}) {
    // 方法1：通过 chrome.runtime.sendMessage
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        return await chrome.runtime.sendMessage({ action, ...data });
      } catch (error) {
        console.warn(`HistoryManager: chrome.runtime.sendMessage 失败，尝试备用通道`, error);
      }
    }

    // 方法2：通过 postMessage 转发（需要 content-script 中转）
    return new Promise((resolve) => {
      const messageId = Date.now() + Math.random().toString(36);
      
      const handler = (event) => {
        if (event.data && event.data.type === 'YANZHI_YOULI_HISTORY_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler);
          resolve(event.data.response);
        }
      };
      
      window.addEventListener('message', handler);
      
      window.postMessage({
        type: 'YANZHI_YOULI_HISTORY_REQUEST',
        id: messageId,
        action: action,
        data: data
      }, '*');
      
      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({ success: false, error: '请求超时' });
      }, 5000);
    });
  }

  /**
   * 获取所有历史记录
   */
  async getAll() {
    const response = await this.sendMessage('historyGetAll');
    return response.success ? response.records : [];
  }

  /**
   * 添加新记录
   */
  async add(type, originalText, result) {
    const response = await this.sendMessage('historyAdd', {
      type,
      originalText,
      result
    });
    return response.success ? response.record : null;
  }

  /**
   * 删除记录
   */
  async delete(id) {
    const response = await this.sendMessage('historyDelete', { id });
    return response.success;
  }

  /**
   * 清空所有记录
   */
  async clear() {
    const response = await this.sendMessage('historyClear');
    return response.success;
  }

  /**
   * 切换收藏状态
   */
  async toggleFavorite(id) {
    const response = await this.sendMessage('historyToggleFavorite', { id });
    return response.success;
  }

  /**
   * 导出历史记录为JSON
   */
  async exportToJSON() {
    const records = await this.getAll();
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      count: records.length,
      records: records
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 从JSON导入历史记录
   */
  async importFromJSON(jsonStr) {
    try {
      const importData = JSON.parse(jsonStr);
      if (!importData.records || !Array.isArray(importData.records)) {
        throw new Error('无效的数据格式');
      }
      alert('导入功能开发中');
      return { success: false };
    } catch (error) {
      console.error('导入历史记录失败:', error);
      return { success: false, error: error.message };
    }
  }
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.historyManager = new HistoryManager();
}