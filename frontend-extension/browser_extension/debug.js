// 调试脚本 - 临时注入到content script中用于调试
console.log('=== 调试模式启动 ===');

// 测试与background的通信
chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Ping失败:', chrome.runtime.lastError.message);
    } else {
        console.log('Ping成功:', response);
    }
});

// 测试API连接
async function testAPI() {
    try {
        const response = await fetch('http://localhost:8001/detect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: '测试暴力推翻' })
        });
        const result = await response.json();
        console.log('API测试结果:', result);
    } catch (error) {
        console.error('API测试失败:', error);
    }
}

testAPI();

console.log('=== 调试脚本执行完成 ===');