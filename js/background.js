// background.js

// 向当前标签页的 content script 发送消息
function sendMessageToTab(tabId, message, callback) {
  chrome.tabs.sendMessage(tabId, message, callback);
}

// 获取当前标签页
function getCurrentTab() {
  return new Promise((resolve,reject) => {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }).then(tabs => {
      console.log('getCurrentTab', tabs);
      resolve(tabs[0])
    }).catch(err => {
      console.log('getCurrentTab', err);
      resolve(null)
    })
  })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCookie') {
    const { name, url } = request;

    chrome.cookies.get({ url, name }, (cookie) => {
      if (chrome.runtime.lastError) {
        sendResponse(null);
      } else {
        sendResponse(cookie ? cookie.value : null);
      }
    });
  }

  if (request.action === 'setCookie') {
    const { name, value, url } = request;

    chrome.cookies.set({
      url: url,
      name: name,
      value: value,
      path: '/',
      // 可选：设置过期时间（例如 1 小时后）
      // expirationDate: Math.floor(Date.now() / 1000) + 3600
    }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('设置 Cookie 失败:', chrome.runtime.lastError);
      }
      sendResponse();
    });
  }

  if (request.action === 'getAllCookies') {
    const { url } = request;
    chrome.cookies.getAll({ url }, (cookies) => {
      sendResponse(cookies);
    });
  }

  if (request.action === 'getLocalStorage' || request.action === 'getSessionStorage') {
    getCurrentTab().then((tab) => {
      console.log('getCurrentTab---', tab)
      if(!tab) return;
      const type = request.action === 'getLocalStorage' ? 'local' : 'session';
      const key = request.name; // 可选：指定 key

      sendMessageToTab(tab.id, {
        action: 'getPageStorage',
        type,
        key
      }, (result) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse(result);
        }
      });
    })
  }

  // 设置页面 storage
  if (request.action === 'setLocalStorage' || request.action === 'setSessionStorage') {
    getCurrentTab().then((tab) => {
      if(!tab) return;
      const type = request.action === 'setLocalStorage' ? 'local' : 'session';
      const { name, value } = request;

      sendMessageToTab(tab.id, {
        action: 'setPageStorage',
        type,
        key: name,
        value
      }, (result) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(result);
        }
      });
    })
  }

  return true; // 保持异步通信
});