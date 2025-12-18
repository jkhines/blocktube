/**
 * Tests for inject.js core extension logic
 */

// Mock browser globals before requiring the module
global.window = global;
global.window.btDispatched = false;
global.window.btReloadRequired = false;
global.window.btExports = {};
global.window.addEventListener = jest.fn();
global.window.postMessage = jest.fn();

// Now require the module
const inject = require('../src/scripts/inject.js');

describe('inject.js core functions', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset storage data to a clean state
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [null, null],
        javascript: ''
      },
      options: {}
    });
    inject._setJsFilter(null);
  });

  describe('getObjectByPath', () => {
    const { getObjectByPath } = inject;

    test('should return value at simple path', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(getObjectByPath(obj, 'a.b.c')).toBe('value');
    });

    test('should return undefined for non-existent path', () => {
      const obj = { a: { b: 1 } };
      expect(getObjectByPath(obj, 'a.c.d')).toBeUndefined();
    });

    test('should return default value for non-existent path', () => {
      const obj = { a: 1 };
      expect(getObjectByPath(obj, 'b.c', 'default')).toBe('default');
    });

    test('should handle array path', () => {
      const obj = { a: { b: 'value' } };
      expect(getObjectByPath(obj, ['a', 'b'])).toBe('value');
    });

    test('should handle bracket notation for array access', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(getObjectByPath(obj, 'items[1].name')).toBe('second');
    });

    test('should handle nested bracket notation', () => {
      const obj = { data: [[1, 2], [3, 4]] };
      expect(getObjectByPath(obj, 'data[1][0]')).toBe(3);
    });

    test('should find value in array of objects', () => {
      const obj = { items: [{ id: 1 }, { id: 2, value: 'found' }] };
      expect(getObjectByPath(obj, 'items.value')).toBe('found');
    });

    test('should return undefined for null input', () => {
      expect(getObjectByPath(null, 'a.b')).toBeUndefined();
    });

    test('should return undefined for empty path', () => {
      expect(getObjectByPath({ a: 1 }, '')).toBeUndefined();
    });

    test('should handle out of bounds array index', () => {
      const obj = { items: [1, 2, 3] };
      expect(getObjectByPath(obj, 'items[10]')).toBeUndefined();
    });

    test('should handle negative array index', () => {
      // Negative indices are not matched by the regex pattern, so the path is treated differently
      const obj = { items: [1, 2, 3] };
      // The current implementation doesn't specifically handle negative indices in bracket notation
      // It returns the array because [-1] doesn't match the \d+ pattern
      const result = getObjectByPath(obj, 'items[-1]');
      expect(result).toBeDefined();
    });
  });

  describe('flattenRuns', () => {
    const { flattenRuns } = inject;

    test('should return simpleText if present', () => {
      const obj = { simpleText: 'Hello World' };
      expect(flattenRuns(obj)).toBe('Hello World');
    });

    test('should flatten runs array with text', () => {
      const obj = {
        runs: [
          { text: 'Hello' },
          { text: 'World' }
        ]
      };
      expect(flattenRuns(obj)).toBe('Hello World');
    });

    test('should return original object if no runs array', () => {
      const obj = { other: 'data' };
      expect(flattenRuns(obj)).toBe(obj);
    });

    test('should handle empty runs array', () => {
      const obj = { runs: [] };
      expect(flattenRuns(obj)).toBe('');
    });

    test('should handle single run', () => {
      const obj = { runs: [{ text: 'Single' }] };
      expect(flattenRuns(obj)).toBe('Single');
    });

    test('should skip runs without text property', () => {
      const obj = {
        runs: [
          { text: 'Hello' },
          { other: 'ignored' },
          { text: 'World' }
        ]
      };
      expect(flattenRuns(obj)).toBe('Hello World');
    });
  });

  describe('parseTime', () => {
    const { parseTime } = inject;

    test('should parse HH:MM:SS format', () => {
      expect(parseTime('1:30:00')).toBe(5400);
    });

    test('should parse MM:SS format', () => {
      expect(parseTime('5:30')).toBe(330);
    });

    test('should parse seconds only', () => {
      expect(parseTime('45')).toBe(45);
    });

    test('should return -2 for SHORTS', () => {
      expect(parseTime('SHORTS')).toBe(-2);
    });

    test('should handle zero values', () => {
      expect(parseTime('0:00')).toBe(0);
    });

    test('should handle large hours', () => {
      expect(parseTime('10:00:00')).toBe(36000);
    });

    test('should return NaN for invalid format', () => {
      expect(parseTime('invalid')).toBeNaN();
    });

    test('should return -1 for too many parts', () => {
      expect(parseTime('1:2:3:4')).toBe(-1);
    });
  });

  describe('parseViewCount', () => {
    const { parseViewCount } = inject;

    test('should parse simple view count', () => {
      expect(parseViewCount('1000 views')).toBe(1000);
    });

    test('should parse view count with commas', () => {
      expect(parseViewCount('1,234 views')).toBe(1234);
    });

    test('should parse K abbreviation', () => {
      expect(parseViewCount('5.2K views')).toBe(5200);
    });

    test('should parse M abbreviation', () => {
      expect(parseViewCount('1.5M views')).toBe(1500000);
    });

    test('should parse B abbreviation', () => {
      expect(parseViewCount('2B views')).toBe(2000000000);
    });

    test('should handle singular view', () => {
      expect(parseViewCount('1 view')).toBe(1);
    });

    test('should return undefined for non-English format', () => {
      expect(parseViewCount('1000 vues')).toBeUndefined();
    });

    test('should return undefined for invalid format', () => {
      expect(parseViewCount('invalid')).toBeUndefined();
    });
  });

  describe('deepClone', () => {
    const { deepClone } = inject;

    test('should clone simple object', () => {
      const obj = { a: 1, b: 2 };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    test('should clone nested object', () => {
      const obj = { a: { b: { c: 1 } } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone.a).not.toBe(obj.a);
    });

    test('should clone array', () => {
      const arr = [1, 2, { a: 3 }];
      const clone = deepClone(arr);
      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
      expect(clone[2]).not.toBe(arr[2]);
    });

    test('should handle null', () => {
      expect(deepClone(null)).toBe(null);
    });

    test('should handle primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });

    test('should clone empty object', () => {
      expect(deepClone({})).toEqual({});
    });

    test('should clone empty array', () => {
      expect(deepClone([])).toEqual([]);
    });

    test('should clone mixed nested structure', () => {
      const obj = {
        arr: [1, { nested: true }],
        obj: { arr: [2, 3] }
      };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone.arr[1]).not.toBe(obj.arr[1]);
    });
  });

  describe('transformToRegExp', () => {
    const { transformToRegExp } = inject;

    test('should transform string patterns to RegExp', () => {
      const data = {
        filterData: {
          videoId: [['abc123', '']],
          channelId: [['UC12345', 'i']],
          title: []
        }
      };
      transformToRegExp(data);
      expect(data.filterData.videoId[0]).toBeInstanceOf(RegExp);
      expect(data.filterData.channelId[0]).toBeInstanceOf(RegExp);
    });

    test('should handle empty filterData', () => {
      const data = { filterData: {} };
      expect(() => transformToRegExp(data)).not.toThrow();
    });

    test('should skip if no filterData', () => {
      const data = {};
      expect(() => transformToRegExp(data)).not.toThrow();
    });

    test('should remove global flag from regex', () => {
      const data = {
        filterData: {
          title: [['test', 'gi']]
        }
      };
      transformToRegExp(data);
      expect(data.filterData.title[0].flags).toBe('i');
    });

    test('should handle invalid regex gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const data = {
        filterData: {
          title: [['[invalid', '']]
        }
      };
      transformToRegExp(data);
      expect(data.filterData.title[0]).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  describe('ObjectFilter', () => {
    const { ObjectFilter, filterRules } = inject;

    beforeEach(() => {
      inject._setStorageData({
        filterData: {
          videoId: [/^blocked123$/],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: {}
      });
    });

    test('should filter matching video by ID', () => {
      const data = {
        videoRenderer: {
          videoId: 'blocked123',
          title: { simpleText: 'Test Video' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeUndefined();
    });

    test('should not filter non-matching video', () => {
      const data = {
        videoRenderer: {
          videoId: 'allowed456',
          title: { simpleText: 'Test Video' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeDefined();
    });

    test('should filter by channel name', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [/^BadChannel$/i],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: {}
      });

      const data = {
        videoRenderer: {
          videoId: 'vid123',
          shortBylineText: { simpleText: 'BadChannel' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeUndefined();
    });

    test('should filter by title', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [/blocked content/i],
          comment: [],
          vidLength: [null, null]
        },
        options: {}
      });

      const data = {
        videoRenderer: {
          videoId: 'vid123',
          title: { simpleText: 'This is blocked content here' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeUndefined();
    });

    test('should handle nested arrays', () => {
      inject._setStorageData({
        filterData: {
          videoId: [/^blocked$/],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: {}
      });

      const data = {
        contents: [
          { videoRenderer: { videoId: 'allowed1' } },
          { videoRenderer: { videoId: 'blocked' } },
          { videoRenderer: { videoId: 'allowed2' } }
        ]
      };
      ObjectFilter(data, filterRules.main);
      expect(data.contents.length).toBe(2);
      expect(data.contents.every(c => c.videoRenderer.videoId !== 'blocked')).toBe(true);
    });

    test('should return ObjectFilter instance', () => {
      const data = {};
      const result = ObjectFilter(data, filterRules.main);
      expect(result).toBeDefined();
      expect(result.object).toBe(data);
    });
  });

  describe('ObjectFilter.isDataEmpty', () => {
    const { ObjectFilter, filterRules } = inject;

    test('should return true when all filter data is empty', () => {
      // Ensure JS filter is disabled
      inject._setJsFilter(null);
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          description: [],
          vidLength: [NaN, NaN]
        },
        options: {
          shorts: false,
          movies: false,
          mixes: false,
          percent_watched_hide: NaN
        }
      });

      const filter = ObjectFilter({}, filterRules.main);
      expect(filter.isDataEmpty()).toBe(true);
    });

    test('should return false when videoId has filters', () => {
      inject._setStorageData({
        filterData: {
          videoId: [/test/],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: {}
      });

      const filter = ObjectFilter({}, filterRules.main);
      expect(filter.isDataEmpty()).toBe(false);
    });

    test('should return false when shorts option enabled', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { shorts: true }
      });

      const filter = ObjectFilter({}, filterRules.main);
      expect(filter.isDataEmpty()).toBe(false);
    });

    test('should return false when vidLength min is set', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [60, null]
        },
        options: {}
      });

      const filter = ObjectFilter({}, filterRules.main);
      expect(filter.isDataEmpty()).toBe(false);
    });
  });

  describe('ObjectFilter video length filtering', () => {
    const { ObjectFilter, filterRules } = inject;

    test('should filter videos shorter than minimum', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [60, null]
        },
        options: { vidLength_type: 'allow' }
      });

      const data = {
        videoRenderer: {
          videoId: 'vid1',
          thumbnailOverlays: [{
            thumbnailOverlayTimeStatusRenderer: {
              text: { simpleText: '0:30' }
            }
          }]
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeUndefined();
    });

    test('should filter videos longer than maximum', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, 300]
        },
        options: { vidLength_type: 'allow' }
      });

      const data = {
        videoRenderer: {
          videoId: 'vid1',
          thumbnailOverlays: [{
            thumbnailOverlayTimeStatusRenderer: {
              text: { simpleText: '10:00' }
            }
          }]
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeUndefined();
    });

    test('should filter shorts when shorts option enabled', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { shorts: true }
      });

      const data = {
        videoRenderer: {
          videoId: 'vid1',
          thumbnailOverlays: [{
            thumbnailOverlayTimeStatusRenderer: {
              text: { simpleText: 'SHORTS' }
            }
          }]
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeUndefined();
    });
  });

  describe('Extended matching (movies, mixes, shorts)', () => {
    const { ObjectFilter, filterRules } = inject;

    test('should filter movies when movies option enabled', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { movies: true }
      });

      const data = {
        movieRenderer: {
          videoId: 'movie123',
          title: { simpleText: 'Some Movie' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.movieRenderer).toBeUndefined();
    });

    test('should filter mixes when mixes option enabled', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { mixes: true }
      });

      const data = {
        radioRenderer: {
          videoId: 'mix123',
          title: { simpleText: 'Mix Playlist' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.radioRenderer).toBeUndefined();
    });

    test('should filter reelItemRenderer when shorts enabled', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { shorts: true }
      });

      const data = {
        reelItemRenderer: {
          videoId: 'short123',
          headline: { simpleText: 'Short Video' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.reelItemRenderer).toBeUndefined();
    });
  });

  describe('JavaScript filter function', () => {
    const { ObjectFilter, filterRules } = inject;

    test('should use custom JS filter when enabled', () => {
      const customFilter = jest.fn().mockReturnValue(true);
      inject._setJsFilter(customFilter);
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { enable_javascript: true }
      });

      const data = {
        videoRenderer: {
          videoId: 'vid123',
          title: { simpleText: 'Test' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(customFilter).toHaveBeenCalled();
      expect(data.videoRenderer).toBeUndefined();
    });

    test('should not filter when custom JS returns false', () => {
      const customFilter = jest.fn().mockReturnValue(false);
      inject._setJsFilter(customFilter);
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { enable_javascript: true }
      });

      const data = {
        videoRenderer: {
          videoId: 'vid123',
          title: { simpleText: 'Test' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(data.videoRenderer).toBeDefined();
    });

    test('should handle JS filter exception gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const customFilter = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      inject._setJsFilter(customFilter);
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: { enable_javascript: true }
      });

      const data = {
        videoRenderer: {
          videoId: 'vid123',
          title: { simpleText: 'Test' }
        }
      };
      ObjectFilter(data, filterRules.main);
      expect(consoleSpy).toHaveBeenCalled();
      expect(data.videoRenderer).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('blockMixes', () => {
    const { blockMixes } = inject;

    test('should add YouTube regex to channelName filters', () => {
      const data = {
        filterData: {
          channelName: []
        }
      };
      blockMixes(data);
      expect(data.filterData.channelName.length).toBe(1);
      expect(data.filterData.channelName[0]).toEqual(/^YouTube$/);
    });
  });

  describe('blockTrending', () => {
    const { blockTrending } = inject;

    test('should add trending IDs to channelId filters', () => {
      const data = {
        filterData: {
          channelId: []
        }
      };
      blockTrending(data);
      expect(data.filterData.channelId.length).toBe(3);
      expect(data.filterData.channelId).toContainEqual(/^FEtrending$/);
      expect(data.filterData.channelId).toContainEqual(/^FEexplore$/);
    });
  });

  describe('blockShorts', () => {
    const { blockShorts } = inject;

    test('should add shorts tab IDs to channelId filters', () => {
      const data = {
        filterData: {
          channelId: []
        }
      };
      blockShorts(data);
      expect(data.filterData.channelId.length).toBe(3);
      expect(data.filterData.channelId).toContainEqual(/^TAB_SHORTS$/);
      expect(data.filterData.channelId).toContainEqual(/^TAB_SHORTS_CAIRO$/);
    });
  });

  describe('Comment filtering', () => {
    const { ObjectFilter, filterRules } = inject;

    test('should filter comments by channel', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [/^UC_blocked$/],
          channelName: [],
          title: [],
          comment: [],
          vidLength: [null, null]
        },
        options: {}
      });

      const data = {
        commentRenderer: {
          authorEndpoint: {
            browseEndpoint: { browseId: 'UC_blocked' }
          },
          authorText: { simpleText: 'Blocked User' },
          contentText: { simpleText: 'Some comment' }
        }
      };
      ObjectFilter(data, filterRules.comments);
      expect(data.commentRenderer).toBeUndefined();
    });

    test('should filter comments by content', () => {
      inject._setStorageData({
        filterData: {
          videoId: [],
          channelId: [],
          channelName: [],
          title: [],
          comment: [/spam|buy now/i],
          vidLength: [null, null]
        },
        options: {}
      });

      const data = {
        commentRenderer: {
          authorEndpoint: {
            browseEndpoint: { browseId: 'UC_user' }
          },
          authorText: { simpleText: 'Some User' },
          contentText: { simpleText: 'BUY NOW cheap prices!' }
        }
      };
      ObjectFilter(data, filterRules.comments);
      expect(data.commentRenderer).toBeUndefined();
    });
  });

  describe('Filter rules structure', () => {
    const { filterRules, mergedFilterRules } = inject;

    test('should have main filter rules', () => {
      expect(filterRules.main).toBeDefined();
      expect(filterRules.main.videoRenderer).toBeDefined();
      expect(filterRules.main.compactVideoRenderer).toBeDefined();
    });

    test('should have ytPlayer filter rules', () => {
      expect(filterRules.ytPlayer).toBeDefined();
      expect(filterRules.ytPlayer.videoDetails).toBeDefined();
    });

    test('should have guide filter rules', () => {
      expect(filterRules.guide).toBeDefined();
      expect(filterRules.guide.guideEntryRenderer).toBeDefined();
    });

    test('should have comments filter rules', () => {
      expect(filterRules.comments).toBeDefined();
      expect(filterRules.comments.commentRenderer).toBeDefined();
    });

    test('mergedFilterRules should contain main and comments', () => {
      expect(mergedFilterRules.videoRenderer).toBeDefined();
      expect(mergedFilterRules.commentRenderer).toBeDefined();
    });
  });

  describe('Constants', () => {
    const { regexProps, regexPropsSet, deleteAllowed, contextMenuObjects, contextMenuObjectsList } = inject;

    test('regexProps should have expected properties', () => {
      expect(regexProps).toContain('videoId');
      expect(regexProps).toContain('channelId');
      expect(regexProps).toContain('channelName');
      expect(regexProps).toContain('title');
      expect(regexProps).toContain('comment');
    });

    test('regexPropsSet should be a Set with same values', () => {
      expect(regexPropsSet).toBeInstanceOf(Set);
      expect(regexPropsSet.has('videoId')).toBe(true);
      expect(regexPropsSet.has('title')).toBe(true);
    });

    test('deleteAllowed should be a Set', () => {
      expect(deleteAllowed).toBeInstanceOf(Set);
      expect(deleteAllowed.has('richItemRenderer')).toBe(true);
      expect(deleteAllowed.has('shelfRenderer')).toBe(true);
    });

    test('contextMenuObjects should be a Set', () => {
      expect(contextMenuObjects).toBeInstanceOf(Set);
      expect(contextMenuObjects.has('videoRenderer')).toBe(true);
    });

    test('contextMenuObjectsList should be an array', () => {
      expect(Array.isArray(contextMenuObjectsList)).toBe(true);
      expect(contextMenuObjectsList).toContain('videoRenderer');
      expect(contextMenuObjectsList).toContain('commentRenderer');
    });
  });
});

describe('getFlattenByPath', () => {
  const { getFlattenByPath } = inject;

  test('should get and flatten value at path', () => {
    const obj = {
      title: { simpleText: 'Test Title' }
    };
    expect(getFlattenByPath(obj, 'title')).toBe('Test Title');
  });

  test('should try multiple paths', () => {
    const obj = {
      longBylineText: { simpleText: 'Channel Name' }
    };
    expect(getFlattenByPath(obj, ['shortBylineText', 'longBylineText'])).toBe('Channel Name');
  });

  test('should return undefined for missing path', () => {
    const obj = { other: 'value' };
    expect(getFlattenByPath(obj, 'title')).toBeUndefined();
  });

  test('should handle undefined filterPath', () => {
    expect(getFlattenByPath({}, undefined)).toBeUndefined();
  });

  test('should flatten runs with multiple text items', () => {
    const obj = {
      title: {
        runs: [
          { text: 'Part' },
          { text: 'One' },
          { text: 'Two' }
        ]
      }
    };
    expect(getFlattenByPath(obj, 'title')).toBe('Part One Two');
  });
});

describe('Additional ObjectFilter tests', () => {
  const { ObjectFilter, filterRules } = inject;

  beforeEach(() => {
    jest.clearAllMocks();
    inject._setJsFilter(null);
  });

  test('should filter by channel ID', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_blocked_channel$/],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      videoRenderer: {
        videoId: 'vid123',
        shortBylineText: {
          runs: [{
            text: 'Some Channel',
            navigationEndpoint: {
              browseEndpoint: { browseId: 'UC_blocked_channel' }
            }
          }]
        }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.videoRenderer).toBeUndefined();
  });

  test('should handle compactVideoRenderer', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^blocked_vid$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      compactVideoRenderer: {
        videoId: 'blocked_vid',
        title: { simpleText: 'Test' }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.compactVideoRenderer).toBeUndefined();
  });

  test('should handle gridVideoRenderer', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^grid_blocked$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      gridVideoRenderer: {
        videoId: 'grid_blocked',
        title: { simpleText: 'Grid Video' }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.gridVideoRenderer).toBeUndefined();
  });

  test('should handle playlistVideoRenderer', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^playlist_blocked$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      playlistVideoRenderer: {
        videoId: 'playlist_blocked',
        title: { simpleText: 'Playlist Video' }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.playlistVideoRenderer).toBeUndefined();
  });

  test('should remove empty arrays after filtering', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^blocked$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      richItemRenderer: {
        content: {
          videoRenderer: {
            videoId: 'blocked',
            title: { simpleText: 'Blocked' }
          }
        }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.richItemRenderer).toBeUndefined();
  });

  test('should handle deeply nested content', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^deep_blocked$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      section: {
        items: [
          { videoRenderer: { videoId: 'deep_blocked', title: { simpleText: 'Deep' } } },
          { videoRenderer: { videoId: 'allowed', title: { simpleText: 'Allowed' } } }
        ]
      }
    };
    ObjectFilter(data, filterRules.main);
    // The blocked video should be removed, one should remain
    expect(data.section.items.length).toBe(1);
    expect(data.section.items[0].videoRenderer.videoId).toBe('allowed');
  });

  test('should filter videos in block mode for vidLength', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [60, 120]
      },
      options: { vidLength_type: 'block' }
    });

    // Video that's 90 seconds (within 60-120 range) should be blocked
    const data = {
      videoRenderer: {
        videoId: 'vid1',
        thumbnailOverlays: [{
          thumbnailOverlayTimeStatusRenderer: {
            text: { simpleText: '1:30' }
          }
        }]
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.videoRenderer).toBeUndefined();
  });

  test('should keep videos outside block range', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [60, 120]
      },
      options: { vidLength_type: 'block' }
    });

    // Video that's 180 seconds (outside 60-120 range) should be kept
    const data = {
      videoRenderer: {
        videoId: 'vid1',
        thumbnailOverlays: [{
          thumbnailOverlayTimeStatusRenderer: {
            text: { simpleText: '3:00' }
          }
        }]
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.videoRenderer).toBeDefined();
  });

  test('should handle guide renderer filtering', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_hidden_channel$/],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      guideEntryRenderer: {
        navigationEndpoint: {
          browseEndpoint: { browseId: 'UC_hidden_channel' }
        },
        title: { simpleText: 'Hidden Channel' }
      }
    };
    ObjectFilter(data, filterRules.guide);
    expect(data.guideEntryRenderer).toBeUndefined();
  });

  test('should filter live chat messages', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [/spam/i],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      liveChatTextMessageRenderer: {
        authorExternalChannelId: 'UC123',
        authorName: { simpleText: 'Spammer' },
        message: { simpleText: 'Check out my SPAM link' }
      }
    };
    ObjectFilter(data, filterRules.comments);
    expect(data.liveChatTextMessageRenderer).toBeUndefined();
  });

  test('should handle postRenderer filtering', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_blocked_poster$/],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      postRenderer: {
        authorEndpoint: {
          browseEndpoint: { browseId: 'UC_blocked_poster' }
        },
        authorText: { simpleText: 'Blocked Poster' }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.postRenderer).toBeUndefined();
  });

  test('should handle backstagePostRenderer filtering', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [/^Bad Creator$/i],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      backstagePostRenderer: {
        authorEndpoint: {
          browseEndpoint: { browseId: 'UC123' }
        },
        authorText: { simpleText: 'Bad Creator' }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.backstagePostRenderer).toBeUndefined();
  });

  test('should pass through non-matching content', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^blocked$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      videoRenderer: {
        videoId: 'allowed_video',
        title: { simpleText: 'Good Video' }
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.videoRenderer).toBeDefined();
    expect(data.videoRenderer.videoId).toBe('allowed_video');
  });

  test('should handle percent watched filtering', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: { percent_watched_hide: 90 }
    });

    const data = {
      videoRenderer: {
        videoId: 'vid1',
        thumbnailOverlays: [{
          thumbnailOverlayResumePlaybackRenderer: {
            percentDurationWatched: 95
          }
        }]
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.videoRenderer).toBeUndefined();
  });

  test('should keep videos under percent watched threshold', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: { percent_watched_hide: 90 }
    });

    const data = {
      videoRenderer: {
        videoId: 'vid1',
        thumbnailOverlays: [{
          thumbnailOverlayResumePlaybackRenderer: {
            percentDurationWatched: 50
          }
        }]
      }
    };
    ObjectFilter(data, filterRules.main);
    expect(data.videoRenderer).toBeDefined();
  });
});

describe('Edge cases and error handling', () => {
  const { ObjectFilter, filterRules, getObjectByPath, parseTime } = inject;

  test('should handle null object in filter', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    expect(() => ObjectFilter(null, filterRules.main)).not.toThrow();
  });

  test('should handle undefined properties gracefully', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/test/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = {
      videoRenderer: {
        // Missing videoId
        title: { simpleText: 'No ID' }
      }
    };
    expect(() => ObjectFilter(data, filterRules.main)).not.toThrow();
  });

  test('getObjectByPath should handle complex nested arrays', () => {
    const obj = {
      level1: [{
        level2: [{
          level3: 'found'
        }]
      }]
    };
    expect(getObjectByPath(obj, 'level1.level2.level3')).toBe('found');
  });

  test('parseTime should handle edge cases', () => {
    expect(parseTime('0:00:00')).toBe(0);
    expect(parseTime('23:59:59')).toBe(86399);
    expect(parseTime('99:99')).toBe(99 * 60 + 99);
  });
});

describe('parseViewCount enhanced tests', () => {
  const { parseViewCount } = inject;

  test('should handle view counts with commas correctly', () => {
    expect(parseViewCount('1,234 views')).toBe(1234);
    expect(parseViewCount('1,234,567 views')).toBe(1234567);
  });

  test('should handle abbreviated K views with decimal', () => {
    expect(parseViewCount('1.5K views')).toBe(1500);
    expect(parseViewCount('10K views')).toBe(10000);
  });

  test('should handle abbreviated M views with decimal', () => {
    expect(parseViewCount('1.5M views')).toBe(1500000);
    expect(parseViewCount('2.5M views')).toBe(2500000);
  });

  test('should handle abbreviated B views', () => {
    expect(parseViewCount('1B views')).toBe(1000000000);
    expect(parseViewCount('1.5B views')).toBe(1500000000);
  });

  test('should handle singular view', () => {
    expect(parseViewCount('1 view')).toBe(1);
  });

  test('should return undefined for non-English formats', () => {
    expect(parseViewCount('1000 vues')).toBeUndefined();
    expect(parseViewCount('1000 просмотров')).toBeUndefined();
  });

  test('should handle views with commas and K abbreviation', () => {
    // Edge case: commas with abbreviation shouldn't occur in real data
    // but implementation should handle it gracefully
    expect(parseViewCount('1,5K views')).toBe(15000); // Comma removed, becomes 15K
  });
});

describe('Badge parsing with optional chaining', () => {
  const { ObjectFilter, filterRules } = inject;

  beforeEach(() => {
    inject._setJsFilter((video) => {
      // Custom filter to test badge parsing
      return video.badges && video.badges.includes('verified');
    });
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [null, null],
        javascript: ''
      },
      options: { enable_javascript: true }
    });
  });

  afterEach(() => {
    inject._setJsFilter(null);
  });

  test('should handle badges with missing metadataBadgeRenderer gracefully', () => {
    const data = {
      videoRenderer: {
        videoId: 'vid123',
        title: { simpleText: 'Test' },
        badges: [
          { otherRenderer: { style: 'SOME_STYLE' } }, // Missing metadataBadgeRenderer
          null,
          undefined
        ]
      }
    };
    // Should not throw
    expect(() => ObjectFilter(data, filterRules.main)).not.toThrow();
  });

  test('should handle badges with valid metadataBadgeRenderer', () => {
    inject._setJsFilter((video) => {
      return video.badges && video.badges.includes('verified');
    });
    
    const data = {
      videoRenderer: {
        videoId: 'vid123',
        title: { simpleText: 'Test' },
        badges: [
          { metadataBadgeRenderer: { style: 'BADGE_STYLE_TYPE_VERIFIED' } }
        ]
      }
    };
    
    ObjectFilter(data, filterRules.main);
    // Video should be filtered because it has verified badge and our filter returns true
    expect(data.videoRenderer).toBeUndefined();
  });
});

