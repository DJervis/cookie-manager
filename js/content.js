// content.js
// 这个脚本运行在页面上下文中，可以访问 localStorage/sessionStorage

// 监听来自 background 或 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageStorage') {
    const { type, key } = request;

    let storage;
    if (type === 'local') storage = localStorage;
    else if (type === 'session') storage = sessionStorage;
    else return sendResponse({ error: 'Invalid storage type' });

    if (key) {
      // 获取单个 key
      const value = storage.getItem(key);
      sendResponse({
        type,
        name: key,
        value: value
      });
    } else {
      // 获取所有
      const items = {};
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        items[k] = storage.getItem(k);
      }
      sendResponse({
        type,
        all: items
      });
    }

    return true; // 保持异步通信
  }

  if (request.action === 'setPageStorage') {
    const { type, key, value } = request;
    let storage;
    if (type === 'local') storage = localStorage;
    else if (type === 'session') storage = sessionStorage;
    else return sendResponse({ error: 'Invalid storage type' });

    try {
      storage.setItem(key, value);
      sendResponse({ success: true, type, name: key, value });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }

    return true;
  }
});