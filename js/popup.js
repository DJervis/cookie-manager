document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('cookieName');
  const valueInput = document.getElementById('cookieValue');
  const getBtn = document.getElementById('getCookie');
  const setBtn = document.getElementById('setCookie');
  const resultDiv = document.getElementById('result');
  let resultList = []

  chrome.storage.local.get(['cookieName'], (res) => {
    if(res && res.cookieName) {
      nameInput.value = res.cookieName;
    }
  });
  

  // 获取当前标签页
  const getCurrentTab = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    return tabs[0];
  };

  // 获取 Cookie
  getBtn.addEventListener('click', async () => {
    const tab = await getCurrentTab();
    const url = tab.url;
    const name = nameInput.value.trim();

    chrome.storage.local.set({cookieName: name})

    if (!name) {
      resultDiv.textContent = '❌ 请输入 Cookie 名称';
      return;
    }

    const names = name.split(',');

    resultDiv.textContent = '🔍 查询中...';
    resultList = [];
    
    for(let name of names) {
      chrome.runtime.sendMessage({
        action: 'getCookie',
        name,
        url
      }, (value) => {
        if (chrome.runtime.lastError) {
          // resultDiv.textContent = '❌ 错误: ' + chrome.runtime.lastError.message;
          resultList.push({name, value:'错误', err: true})
        } else if (value === null || value === undefined) {
          // resultDiv.textContent = '📭 未找到名为 "' + name + '" 的 Cookie';
          resultList.push({name, value:'未找到', err: true})
        } else {
          // resultDiv.textContent = '✅ 值: ' + value;
          resultList.push({name, value})
        }
      });
    }

    setTimeout(() => {
      resultDiv.innerHTML = '';
      resultList.forEach(item => {
        let str = `${item.name}: ${item.value} <br>`
        resultDiv.innerHTML += str;
      })
    }, 1000);

    
  });

  // 设置 Cookie
  setBtn.addEventListener('click', async () => {
    const tab = await getCurrentTab();
    const url = tab.url;
    const name = nameInput.value.trim();
    // const value = valueInput.value.trim();

    // if (!name) {
    //   resultDiv.textContent = '❌ 请填写名称和值';
    //   return;
    // }

    resultDiv.textContent = '⚙️ 设置中...';

    resultList.map(item => {
      if(item.err) return false;
      chrome.runtime.sendMessage({
        action: 'setCookie',
        name: item.name,
        value: item.value,
        url
      }, () => {
        resultDiv.textContent = '';
        if (chrome.runtime.lastError) {
          resultDiv.textContent += '❌ 失败: ' + chrome.runtime.lastError.message;
        } else {
          resultDiv.textContent += `✅ 成功设置 Cookie: ${name} = ${value}`;
        }
      });
    })

    
  });
});