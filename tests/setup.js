// Jest setup file for browser extension testing

// Mock chrome extension API
global.chrome = {
  runtime: {
    connect: jest.fn(() => ({
      postMessage: jest.fn(),
      onMessage: { addListener: jest.fn() },
      onDisconnect: { addListener: jest.fn() }
    })),
    onConnect: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    OnInstalledReason: { UPDATE: 'update' },
    openOptionsPage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn()
    },
    onChanged: { addListener: jest.fn() }
  },
  tabs: {
    reload: jest.fn()
  }
};

// Mock window.postMessage
global.postMessage = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

