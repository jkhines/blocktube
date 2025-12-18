/**
 * Tests for content_script.js content bridge logic
 */

// Mock browser globals before requiring the module
global.window = global;
global.window.postMessage = jest.fn();
global.window.addEventListener = jest.fn();

// Now require the module
const contentScript = require('../src/scripts/content_script.js');

describe('content_script.js', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    contentScript._setEnabled(true);
    contentScript._setGlobalStorage(null);
    contentScript._setCompiledStorage(null);
  });

  describe('utils.sendStorage', () => {
    const { utils } = contentScript;

    test('should send compiled storage when enabled', () => {
      const compiledData = { filterData: { videoId: [] }, options: {} };
      contentScript._setCompiledStorage(compiledData);
      contentScript._setEnabled(true);
      
      utils.sendStorage();
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'BLOCKTUBE_CONTENT',
          type: 'storageData',
          data: compiledData
        }),
        'https://www.youtube.com'
      );
    });

    test('should fallback to global storage when compiled not available', () => {
      const globalData = { filterData: { videoId: ['test'] }, options: {} };
      contentScript._setGlobalStorage(globalData);
      contentScript._setCompiledStorage(null);
      contentScript._setEnabled(true);
      
      utils.sendStorage();
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: globalData
        }),
        'https://www.youtube.com'
      );
    });

    test('should send undefined data when disabled', () => {
      contentScript._setCompiledStorage({ filterData: {}, options: {} });
      contentScript._setEnabled(false);
      
      utils.sendStorage();
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'BLOCKTUBE_CONTENT',
          type: 'storageData',
          data: undefined
        }),
        'https://www.youtube.com'
      );
    });
  });

  describe('utils.sendReload', () => {
    const { utils } = contentScript;

    test('should send reload message with msg and duration', () => {
      utils.sendReload('Extension updated', 5000);
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'BLOCKTUBE_CONTENT',
          type: 'reloadRequired',
          data: { msg: 'Extension updated', duration: 5000 }
        }),
        'https://www.youtube.com'
      );
    });

    test('should handle undefined msg and duration', () => {
      utils.sendReload(undefined, undefined);
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reloadRequired',
          data: { msg: undefined, duration: undefined }
        }),
        'https://www.youtube.com'
      );
    });
  });

  describe('events.contextBlock', () => {
    const { events } = contentScript;

    beforeEach(() => {
      const mockPort = {
        postMessage: jest.fn()
      };
      contentScript._setPort(mockPort);
    });

    test('should send contextBlock message with video ID', () => {
      const mockPort = contentScript._getPort();
      
      events.contextBlock({
        type: 'videoId',
        info: {
          id: 'video123',
          text: 'Test Video'
        }
      });
      
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'contextBlock',
          data: expect.objectContaining({
            type: 'videoId',
            entries: expect.arrayContaining([
              expect.stringContaining('// Blocked by context menu'),
              'video123',
              ''
            ])
          })
        })
      );
    });

    test('should send contextBlock message with channel ID', () => {
      const mockPort = contentScript._getPort();
      
      events.contextBlock({
        type: 'channelId',
        info: {
          id: 'UC12345',
          text: 'Test Channel'
        }
      });
      
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'channelId'
          })
        })
      );
    });

    test('should handle array of IDs', () => {
      const mockPort = contentScript._getPort();
      
      events.contextBlock({
        type: 'channelId',
        info: {
          id: ['UC123', 'UC456'],
          text: 'Multiple Channels'
        }
      });
      
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entries: expect.arrayContaining(['UC123', 'UC456'])
          })
        })
      );
    });

    test('should not send message when id is missing', () => {
      const mockPort = contentScript._getPort();
      
      events.contextBlock({
        type: 'videoId',
        info: {
          id: null,
          text: 'No ID'
        }
      });
      
      expect(mockPort.postMessage).not.toHaveBeenCalled();
    });

    test('should not send message when id is undefined', () => {
      const mockPort = contentScript._getPort();
      
      events.contextBlock({
        type: 'videoId',
        info: {
          text: 'No ID'
        }
      });
      
      expect(mockPort.postMessage).not.toHaveBeenCalled();
    });

    test('should include timestamp in comment', () => {
      const mockPort = contentScript._getPort();
      
      events.contextBlock({
        type: 'videoId',
        info: {
          id: 'vid123',
          text: 'Test'
        }
      });
      
      const call = mockPort.postMessage.mock.calls[0][0];
      const comment = call.data.entries[0];
      expect(comment).toContain('Blocked by context menu');
      expect(comment).toContain('Test');
      // Should contain date-like pattern
      expect(comment).toMatch(/\d+/);
    });
  });

  describe('dateFormatter', () => {
    const { dateFormatter } = contentScript;

    test('should be an Intl.DateTimeFormat instance', () => {
      expect(dateFormatter).toBeDefined();
      expect(typeof dateFormatter.format).toBe('function');
    });

    test('should format dates correctly', () => {
      const formatted = dateFormatter.format(new Date(2024, 0, 15, 10, 30, 45));
      // Should contain date and time parts
      expect(formatted).toMatch(/\d+/);
    });
  });

  describe('State helpers', () => {
    
    test('_setPort and _getPort should work correctly', () => {
      const mockPort = { postMessage: jest.fn() };
      contentScript._setPort(mockPort);
      expect(contentScript._getPort()).toBe(mockPort);
    });

    test('_setEnabled and _getEnabled should work correctly', () => {
      contentScript._setEnabled(false);
      expect(contentScript._getEnabled()).toBe(false);
      contentScript._setEnabled(true);
      expect(contentScript._getEnabled()).toBe(true);
    });

    test('_setGlobalStorage should work correctly', () => {
      const testData = { filterData: {}, options: {} };
      contentScript._setGlobalStorage(testData);
      contentScript._setCompiledStorage(null);
      contentScript._setEnabled(true);
      
      contentScript.utils.sendStorage();
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ data: testData }),
        expect.any(String)
      );
    });

    test('_setCompiledStorage should override globalStorage', () => {
      const globalData = { filterData: { global: true }, options: {} };
      const compiledData = { filterData: { compiled: true }, options: {} };
      
      contentScript._setGlobalStorage(globalData);
      contentScript._setCompiledStorage(compiledData);
      contentScript._setEnabled(true);
      
      contentScript.utils.sendStorage();
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ data: compiledData }),
        expect.any(String)
      );
    });
  });

  describe('Message origin handling', () => {
    test('should use correct origin for postMessage', () => {
      contentScript._setEnabled(true);
      contentScript._setCompiledStorage({ test: true });
      
      contentScript.utils.sendStorage();
      
      // Should use https://www.youtube.com as origin (from test environment)
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.any(Object),
        'https://www.youtube.com'
      );
    });
  });

  describe('Reload message', () => {
    test('should send reload with custom message and duration', () => {
      contentScript.utils.sendReload('Custom reload message', 10000);
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reloadRequired',
          data: {
            msg: 'Custom reload message',
            duration: 10000
          }
        }),
        expect.any(String)
      );
    });

    test('should send reload with empty message', () => {
      contentScript.utils.sendReload('', 0);
      
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { msg: '', duration: 0 }
        }),
        expect.any(String)
      );
    });
  });

  describe('Context block with various data types', () => {
    beforeEach(() => {
      const mockPort = { postMessage: jest.fn() };
      contentScript._setPort(mockPort);
    });

    test('should handle empty string ID', () => {
      const mockPort = contentScript._getPort();
      
      contentScript.events.contextBlock({
        type: 'videoId',
        info: { id: '', text: 'Empty ID' }
      });
      
      // Empty string is falsy, so should not send
      expect(mockPort.postMessage).not.toHaveBeenCalled();
    });

    test('should handle single ID correctly', () => {
      const mockPort = contentScript._getPort();
      
      contentScript.events.contextBlock({
        type: 'channelId',
        info: { id: 'single_channel', text: 'Single Channel' }
      });
      
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'channelId',
            entries: expect.arrayContaining(['single_channel'])
          })
        })
      );
    });

    test('should handle empty array of IDs', () => {
      const mockPort = contentScript._getPort();
      
      contentScript.events.contextBlock({
        type: 'videoId',
        info: { id: [], text: 'Empty Array' }
      });
      
      // Empty array is truthy but has no IDs
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entries: expect.arrayContaining([
              expect.stringContaining('Empty Array'),
              ''
            ])
          })
        })
      );
    });
  });
});

