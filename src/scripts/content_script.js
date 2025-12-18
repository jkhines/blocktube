(function () {
  'use strict';
  
  let port;
  let globalStorage;
  let compiledStorage;
  let enabled;
  
  // Cache the origin once
  const origin = document.location.origin;
  
  // Pre-create reusable message templates
  const storageMessage = { from: 'BLOCKTUBE_CONTENT', type: 'storageData', data: undefined };
  const reloadMessage = { from: 'BLOCKTUBE_CONTENT', type: 'reloadRequired', data: undefined };

  const utils = {
    sendStorage() {
      storageMessage.data = enabled ? (compiledStorage || globalStorage) : undefined;
      window.postMessage(storageMessage, origin);
    },
    sendReload(msg, duration) {
      reloadMessage.data = { msg, duration };
      window.postMessage(reloadMessage, origin);
    }
  };

  // Pre-create date formatter once
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  });

  const events = {
    contextBlock(data) {
      if (!data.info.id) return;

      const now = dateFormatter.format(new Date());
      const id = Array.isArray(data.info.id) ? data.info.id : [data.info.id];
      const entries = [`// Blocked by context menu (${data.info.text}) (${now})`, ...id, ''];
      port.postMessage({ type: 'contextBlock', data: { type: data.type, entries } });
    }
  };

  function connectToPort() {
    port = chrome.runtime.connect();
    // Listen for messages from background page
    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'filtersData': {
          if (msg.data) {
            globalStorage = msg.data.storage;
            compiledStorage = msg.data.compiledStorage;
            enabled = msg.data.enabled;
            utils.sendStorage();
          }
          break;
        }
        case 'reloadRequired': {
          utils.sendReload();
          break;
        }
        default:
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      connectToPort();
      
    });
  }

  connectToPort();

  // Listen for messages from injected page script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.from !== 'BLOCKTUBE_PAGE') return;

    const type = data.type;
    if (type === 'contextBlockData') {
      events.contextBlock(data.data);
    } else if (type === 'ready') {
      utils.sendStorage();
    }
  }, true);

  // Export for testing (Node.js/Jest environment)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      utils,
      events,
      dateFormatter,
      // Test helpers
      _setPort: (p) => { port = p; },
      _getPort: () => port,
      _setGlobalStorage: (s) => { globalStorage = s; },
      _setCompiledStorage: (s) => { compiledStorage = s; },
      _setEnabled: (e) => { enabled = e; },
      _getEnabled: () => enabled,
    };
  }

}());
