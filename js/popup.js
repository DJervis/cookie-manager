
const getActionMap = {
  'cookie': 'getCookie',
  'local': 'getLocalStorage',
  'session': 'getSessionStorage',
  'cookieAll': 'getAllCookies',
};
const setActionMap = {
  'cookie': 'setCookie',
  'local': 'setLocalStorage',
  'session': 'setSessionStorage',
};
const storageNames = ['cookieName','localName','sessionName','cookieResult','currentType','localResult','sessionResult'];

document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('cookieName');
  const valueInput = document.getElementById('cookieValue');
  const getBtn = document.getElementById('getCookie');
  const setBtn = document.getElementById('setCookie');
  const resultDiv = document.querySelector('.result-content');
  const resultTitle = document.querySelector('.result-title');
  let currentType = null;
  let resultList = [];
  let cookieResult = null;
  let localResult = null;
  let sessionResult = null;

  init();

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

    // chrome.storage.local.set({cookieName: name})
    if(currentType === 'cookie') {
      chrome.storage.local.set({cookieName: name})
    } else if(currentType === 'local') {
      chrome.storage.local.set({localName: name})
    } else {
      chrome.storage.local.set({sessionName: name})
    }

    if (!name) {
      resultTitle.textContent = '❌ 请输入key';
      return;
    }

    const funList = getFunList('get', url);

    resultTitle.textContent = '🔍 查询中...';
    resultList = [];

    Promise.all(funList).then(res => {
      console.log("🚀 => res:", res)
      resultTitle.textContent = '🔍 查询完成';
      resultList = res;
      let allList = [];
      resultList.forEach(item => {
        if(item.name==='all') {
          if(item.all) {
            for(let p in item.all) {
              allList.push({name: p, value: item.all[p]})
            }
          } else if(item.value && item.value.length) {
            allList = item.value.map(v => ({name:v.name, value:v.value}));
          }
        }
      })
      resultList = resultList.filter(v => v.name !== 'all');
      resultList = [...resultList, ...allList];
      renderResult(resultList)

      if(currentType === 'cookie') {
        chrome.storage.local.set({cookieResult: resultList})
      } else if(currentType === 'local') {
        chrome.storage.local.set({localResult: resultList})
      } else {
        chrome.storage.local.set({sessionResult: resultList})
      }
      
    })
    
  });

  // 设置 Cookie
  setBtn.addEventListener('click', async () => {
    const tab = await getCurrentTab();
    const url = tab.url;
    

    resultTitle.textContent = '⚙️ 设置中...';

    const funList = getFunList('set', url);

    if(funList.length) {
      Promise.all(funList).then(res => {
        resultTitle.textContent = '⚙️ 设置完成';
        renderResult(res)
      })
    } else {
      resultTitle.textContent = '无可用数据';
      resultDiv.innerHTML = '';
    }

  });

  
  function init() {
    chrome.storage.local.get(storageNames, (res) => {
      console.log('storageNames', res);
      if(res) {
        if(res.cookieResult) {
          cookieResult = res.cookieResult;
        }
        if(res.localResult) {
          localResult = res.localResult;
        }
        if(res.sessionResult) {
          sessionResult = res.sessionResult;
        }

        currentType = res.currentType || 'cookie';
        if(currentType) {
          $(`.type-item[data-type="${currentType}"]`).addClass('active');
          if(currentType === 'cookie') {
            resultTitle.textContent = '已缓存cookies';
            resultList = cookieResult;
            nameInput.value = res.cookieName || '';
          } else if(currentType === 'local') {
            resultTitle.textContent = '已缓存local storage';
            resultList = localResult;
            nameInput.value = res.localName || '';
          } else if(currentType === 'session') {
            resultTitle.textContent = '已缓存session storage';
            resultList = sessionResult;
            nameInput.value = res.sessionName || '';
          }
          if(resultList && resultList.length) {
            renderResult(resultList);
          } else {
            resultTitle.textContent = '无缓存数据';
            resultDiv.innerHTML = '';
          }
        }
      }
    });
  }

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

  function getFunList(type, url) {
    if(type === 'get') {
      const name = nameInput.value.trim();
      const names = name.split(',');
      let action = getActionMap[currentType];
      if(name==='all' && currentType==='cookie') {
        action = 'getAllCookies'
      }
      return names.map(name => {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: action,
            name: name=='all' ? null : name,
            url
          }, (res) => {
            console.log('getFunList--', res);
            if (chrome.runtime.lastError) {
              console.log(`${action}-${name}`, chrome.runtime.lastError.message);
              resolve({name, value:'错误', err: true})
            } else if (res.value === null || res.value === undefined) {
              resolve({name, value:'未找到', err: true})
            } else {
              resolve(res)
            }
          });
        })
      })
    } else if(type === 'set') {
      let action = setActionMap[currentType];
      return resultList.filter(v => !v.err).map(item => {
        return new Promise((resolve,reject) => {
          chrome.runtime.sendMessage({
            action: action,
            name: item.name,
            value: item.value,
            url
          }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({name:item.name, value: '❌ 失败: ' + chrome.runtime.lastError.message})
            } else if(!res.success) {
              resolve({name:item.name, value: '❌ 失败: ' + res.error})
            } else {
              resolve({name:item.name, value: '✅ 成功设置'})
            }
          });
        })
      })
    }
  }


  $('.type-list').on('click', '.type-item', function() {
    let type = $(this).data('type');
    $('.type-list .type-item').removeClass('active');
    $(this).addClass('active');
    currentType = type;
    chrome.storage.local.set({
      currentType: type
    });
    init();
  })

});
