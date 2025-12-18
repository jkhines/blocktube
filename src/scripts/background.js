'use strict';

const has = Object.prototype.hasOwnProperty;
const unicodeBoundry = "[ \n\r\t!@#$%^&*()_\\-=+\\[\\]\\\\\\|;:'\",\\.\\/<>\\?`~:]+";
const ports = {};
let enabled = true;
let initStorage = false;
let compiledStorage;
let storage = {
  filterData: {
    videoId: [],
    channelId: [],
    channelName: [],
    comment: [],
    title: [],
    description: [],
    vidLength: [null, null],
    javascript: "",
    percentWatchedHide: null
  },
  options: {
    trending: false,
    mixes: false,
    shorts: false,
    movies: false,
    suggestions_only: false,
    autoplay: false,
    enable_javascript: false,
    block_message: "",
    block_feedback: false,
    disable_db_normalize: false,
    disable_you_there: false,
    disable_on_history: false
  },
};

// Precompiled regex for parsing raw regex patterns
const rawRegexPattern = /^\/(.*)\/(.*)$/;
// Set for faster type checking
const idTypes = new Set(['channelId', 'videoId']);

const utils = {
  compileRegex(entriesArr, type) {
    if (!Array.isArray(entriesArr)) {
      return undefined;
    }
    // empty dataset
    if (entriesArr.length === 1 && entriesArr[0] === '') return [];

    // skip empty and comments lines - use for loop instead of filter for performance
    const seen = new Set();
    const filtered = [];
    for (let i = 0, len = entriesArr.length; i < len; i++) {
      const x = entriesArr[i];
      if (!x || x === '' || x.startsWith('//')) continue;
      const trimmed = x.trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        filtered.push(trimmed);
      }
    }

    const isIdType = idTypes.has(type);
    const result = new Array(filtered.length);
    
    for (let i = 0, len = filtered.length; i < len; i++) {
      const v = filtered[i];

      // unique id
      if (isIdType) {
        result[i] = [`^${v}$`, ''];
        continue;
      }

      // raw regex
      const parts = rawRegexPattern.exec(v);
      if (parts !== null) {
        result[i] = [parts[1], parts[2]];
        continue;
      }

      // regular keyword
      result[i] = ['(^|' + unicodeBoundry + ')(' +
        v.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') +
        ')(' + unicodeBoundry + '|$)', 'i'];
    }
    
    return result;
  },

  compileAll(data) {
    const sendData = { filterData: {}, options: data.options };
    const filterData = data.filterData;

    // compile regex props - use for loop instead of forEach
    const regexProps = ['title', 'channelName', 'channelId', 'videoId', 'comment', 'description'];
    for (let i = 0; i < 6; i++) {
      const p = regexProps[i];
      const dataArr = this.compileRegex(filterData[p], p);
      if (dataArr) {
        sendData.filterData[p] = dataArr;
      }
    }

    sendData.filterData.vidLength = filterData.vidLength;
    sendData.filterData.javascript = filterData.javascript;

    return sendData;
  },

  sendFilters(port) {
    port.postMessage({ type: 'filtersData', data: { storage, compiledStorage, enabled } });
  },

  sendFiltersToAll() {
    const message = { type: 'filtersData', data: { storage, compiledStorage, enabled } };
    const portKeys = Object.keys(ports);
    for (let i = 0, len = portKeys.length; i < len; i++) {
      try {
        ports[portKeys[i]].postMessage(message);
      } catch (e) {
        console.error('Where are you my child?');
      }
    }
  },

  sendReloadToAll() {
    const message = { type: 'reloadRequired' };
    const portKeys = Object.keys(ports);
    for (let i = 0, len = portKeys.length; i < len; i++) {
      try {
        ports[portKeys[i]].postMessage(message);
      } catch (e) {
        console.error('Where are you my child?');
      }
    }
  }
};

chrome.storage.local.get(['storageData', 'enabled'], (data) => {
  if (data !== undefined && Object.keys(data).length > 0) {
    storage = data.storageData;
    compiledStorage = utils.compileAll(data.storageData);
  }
  if (Object.hasOwn(data, 'enabled')) {
    enabled = data.enabled
  }
  initStorage = true;
  utils.sendFiltersToAll();

  chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener((port) => {
        const key = port.sender.contextId || port.sender.frameId;
        delete ports[key];
    });
    const key = port.sender.contextId || port.sender.frameId;
    ports[key] = port;
    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'contextBlock': {
          storage.filterData[msg.data.type].push(...msg.data.entries);
          chrome.storage.local.set({storageData: storage});
          break;
        }
      }
    });
    utils.sendFilters(port);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (has.call(changes, 'storageData')) {
      storage = changes.storageData.newValue;
      compiledStorage = utils.compileAll(changes.storageData.newValue);
      utils.sendFiltersToAll();
    }
    if (has.call(changes, 'enabled')) {
      enabled = changes.enabled.newValue;
      utils.sendFiltersToAll();
    }
  });

});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    utils.sendReloadToAll();
  }
});

// Export for testing (Node.js/Jest environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    utils,
    // Test helpers to access/modify internal state
    _getStorage: () => storage,
    _setStorage: (data) => { storage = data; },
    _getEnabled: () => enabled,
    _setEnabled: (val) => { enabled = val; },
    _getPorts: () => ports,
    _getCompiledStorage: () => compiledStorage,
    _setCompiledStorage: (data) => { compiledStorage = data; },
  };
}