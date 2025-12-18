(function () {
  'use strict';
  
  let port;
  let globalStorage;
  let compiledStorage;
  let enabled;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000;
  
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
    // Check if extension context is still valid before attempting to connect.
    if (!chrome.runtime?.id) {
      return;
    }

    try {
      port = chrome.runtime.connect();
    } catch (e) {
      // Extension context invalidated, stop attempting to reconnect.
      return;
    }

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
      // Check if extension context is still valid before scheduling reconnect.
      if (!chrome.runtime?.id) {
        return;
      }
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        setTimeout(connectToPort, delay);
      }
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
