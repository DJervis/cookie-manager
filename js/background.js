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

    return true; // 保持异步通信
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

    return true; // 保持异步通信
  }

  if (request.action === 'getAllCookies') {
    const { url } = request;
    chrome.cookies.getAll({ url }, (cookies) => {
      sendResponse(cookies);
    });
    return true;
  }
});