document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('cookieName');
  const valueInput = document.getElementById('cookieValue');
  const getBtn = document.getElementById('getCookie');
  const setBtn = document.getElementById('setCookie');
  const resultDiv = document.querySelector('.result-content');
  const resultTitle = document.querySelector('.result-title');
  let resultList = []

  chrome.storage.local.get(['cookieName','cookieResult'], (res) => {
    if(res) {
      if(res.cookieName) nameInput.value = res.cookieName;
      if(res.cookieResult) {
        resultTitle.textContent = '已缓存cookies';
        resultList = res.cookieResult;
        renderResult(resultList);
      }
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
      resultTitle.textContent = '❌ 请输入 Cookie 名称';
      return;
    }

    const names = name.split(',');
    const funList = names.map(name => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'getCookie',
          name,
          url
        }, (value) => {
          if (chrome.runtime.lastError) {
            // resultList.push({name, value:'错误', err: true})
            resolve({name, value:'错误', err: true})
          } else if (value === null || value === undefined) {
            // resultList.push({name, value:'未找到', err: true})
            resolve({name, value:'未找到', err: true})
          } else {
            // resultList.push({name, value})
            resolve({name, value})
          }
        });
      })
    })

    resultTitle.textContent = '🔍 查询中...';
    resultList = [];

    Promise.all(funList).then(res => {
      console.log("🚀 => res:", res)
      resultTitle.textContent = '🔍 查询完成';
      resultList = res;
      renderResult(resultList)
      chrome.storage.local.set({cookieResult: resultList})
    })
    
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

    resultTitle.textContent = '⚙️ 设置中...';

    const funList = resultList.filter(v => !v.err).map(item => {
      return new Promise((resolve,reject) => {
        chrome.runtime.sendMessage({
          action: 'setCookie',
          name: item.name,
          value: item.value,
          url
        }, () => {
          if (chrome.runtime.lastError) {
            resolve({name:item.name, value: '❌ 失败: ' + chrome.runtime.lastError.message})
          } else {
            resolve({name:item.name, value: '✅ 成功设置'})
          }
        });
      })
    })

    if(funList.length) {
      Promise.all(funList).then(res => {
        resultTitle.textContent = '⚙️ 设置完成';
        renderResult(res)
      })
    } else {
      resultTitle.textContent = '无可用cookie';
      resultDiv.innerHTML = '';
    }

  });


  // 渲染结果
  function renderResult(resultList) {
    resultDiv.innerHTML = '';

    let list = resultList.map(item => {
      let str = `<div class="res-item">
        <span class="name">${item.name}</span>
        <span class="value">${item.value}</span>
      </div>`
      return str
    })
    let html = `<div class="list">
      <div class="res-item res-th">
        <span class="name">Name</span>
        <span class="value">Value</span>
      </div>
      ${list.join('')}
    </div>`;

    resultDiv.innerHTML = html;
  }

});