/**
 * Declarative Scenario Test Runner
 * 
 * Loads test scenarios from JSON files and executes them against fixtures.
 * This provides a simple, maintainable way to define regression tests.
 */

const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = global;
global.window.btDispatched = false;
global.window.btReloadRequired = false;
global.window.btExports = {};
global.window.addEventListener = jest.fn();
global.window.postMessage = jest.fn();

const inject = require('../../src/scripts/inject.js');
const { ObjectFilter, filterRules, mergedFilterRules, deepClone } = inject;

// Load all scenario files
const scenarioDir = __dirname;
const scenarioFiles = fs.readdirSync(scenarioDir)
  .filter(f => f.endsWith('.json'))
  .map(f => ({
    name: f,
    data: require(path.join(scenarioDir, f))
  }));

// Load all fixtures
const fixtureDir = path.join(__dirname, '..', 'fixtures');
const fixtures = {};
fs.readdirSync(fixtureDir)
  .filter(f => f.endsWith('.json'))
  .forEach(f => {
    fixtures[f] = require(path.join(fixtureDir, f));
  });

/**
 * Convert user-friendly filter format to internal format
 */
function buildStorageData(scenario) {
  const filters = scenario.filters || {};
  const options = scenario.options || {};
  
  return {
    filterData: {
      videoId: compilePatterns(filters.videoId || []),
      channelId: compilePatterns(filters.channelId || []),
      channelName: compilePatterns(filters.channelName || []),
      title: compilePatterns(filters.title || []),
      comment: compilePatterns(filters.comment || []),
      description: compilePatterns(filters.description || []),
      vidLength: filters.vidLength || [NaN, NaN]
    },
    options: {
      shorts: options.shorts || false,
      movies: options.movies || false,
      mixes: options.mixes || false,
      trending: options.trending || false,
      vidLength_type: options.vidLength_type || 'allow',
      percent_watched_hide: options.percent_watched_hide || NaN,
      ...options
    }
  };
}

/**
 * Convert string patterns to RegExp objects
 */
function compilePatterns(patterns) {
  return patterns.map(p => {
    // Raw regex: /pattern/flags
    const match = /^\/(.*)\/([gimsu]*)$/.exec(p);
    if (match) {
      return new RegExp(match[1], match[2]);
    }
    // Exact match for IDs
    return new RegExp(`^${escapeRegex(p)}$`, 'i');
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find all video/content IDs in a data structure
 */
function findAllIds(obj, idType = 'videoId') {
  const ids = new Set();
  
  function traverse(o) {
    if (!o || typeof o !== 'object') return;
    
    if (Array.isArray(o)) {
      o.forEach(traverse);
      return;
    }
    
    // Check for videoId
    if (idType === 'videoId' && o.videoId) {
      ids.add(o.videoId);
    }
    if (idType === 'videoId' && o.contentId) {
      ids.add(o.contentId);
    }
    
    // Check for channelId in various locations
    if (idType === 'channelId') {
      if (o.channelId) ids.add(o.channelId);
      if (o.browseId && o.browseId.startsWith('UC')) ids.add(o.browseId);
      const nestedChannelId = o.navigationEndpoint?.browseEndpoint?.browseId;
      if (nestedChannelId && nestedChannelId.startsWith('UC')) ids.add(nestedChannelId);
    }
    
    // Check for commentId
    if (idType === 'commentId') {
      if (o.commentId) ids.add(o.commentId);
      const nestedCommentId = o.properties?.commentId;
      if (nestedCommentId) ids.add(nestedCommentId);
    }
    
    // Check for renderer types
    if (idType === 'type') {
      const rendererKeys = ['radioRenderer', 'compactRadioRenderer', 'movieRenderer', 
                           'compactMovieRenderer', 'reelItemRenderer', 'shortsLockupViewModel'];
      rendererKeys.forEach(key => {
        if (o[key]) ids.add(key);
      });
    }
    
    // Recurse
    Object.values(o).forEach(traverse);
  }
  
  traverse(obj);
  return ids;
}

/**
 * Get the appropriate filter rules for a scenario
 */
function getFilterRules(scenario) {
  const rulesName = scenario.filterRules || 'main';
  switch (rulesName) {
    case 'guide': return filterRules.guide;
    case 'comments': return filterRules.comments;
    case 'merged': return mergedFilterRules;
    case 'ytPlayer': return filterRules.ytPlayer;
    default: return filterRules.main;
  }
}

// Generate tests for each scenario file
scenarioFiles.forEach(({ name: fileName, data: scenarioFile }) => {
  describe(`Scenario: ${scenarioFile.name}`, () => {
    
    beforeEach(() => {
      inject._setJsFilter(null);
    });

    scenarioFile.tests.forEach(scenario => {
      test(scenario.name, () => {
        // Setup storage data
        const storageData = buildStorageData(scenario);
        inject._setStorageData(storageData);
        
        // Load and clone fixture
        const fixtureName = scenario.fixture;
        if (!fixtures[fixtureName]) {
          throw new Error(`Fixture not found: ${fixtureName}`);
        }
        const data = deepClone(fixtures[fixtureName]);
        
        // Get IDs before filtering
        const beforeVideoIds = findAllIds(data, 'videoId');
        const beforeTypes = findAllIds(data, 'type');
        const beforeChannelIds = findAllIds(data, 'channelId');
        const beforeCommentIds = findAllIds(data, 'commentId');
        
        // Apply filter
        const rules = getFilterRules(scenario);
        ObjectFilter(data, rules);
        
        // Get IDs after filtering
        const afterVideoIds = findAllIds(data, 'videoId');
        const afterTypes = findAllIds(data, 'type');
        const afterChannelIds = findAllIds(data, 'channelId');
        const afterCommentIds = findAllIds(data, 'commentId');
        
        // Check blocked expectations
        if (scenario.expect.blocked) {
          scenario.expect.blocked.forEach(expected => {
            if (expected.videoId) {
              expect(afterVideoIds.has(expected.videoId)).toBe(false);
            }
            if (expected.type) {
              expect(afterTypes.has(expected.type)).toBe(false);
            }
            if (expected.channelId) {
              expect(afterChannelIds.has(expected.channelId)).toBe(false);
            }
            if (expected.commentId) {
              expect(afterCommentIds.has(expected.commentId)).toBe(false);
            }
          });
        }
        
        // Check allowed expectations
        if (scenario.expect.allowed) {
          scenario.expect.allowed.forEach(expected => {
            if (expected.videoId) {
              expect(afterVideoIds.has(expected.videoId)).toBe(true);
            }
            if (expected.channelId) {
              expect(afterChannelIds.has(expected.channelId)).toBe(true);
            }
            if (expected.commentId) {
              expect(afterCommentIds.has(expected.commentId)).toBe(true);
            }
          });
        }
      });
    });
  });
});

// Summary test
describe('Scenario Summary', () => {
  test('All scenario files loaded', () => {
    expect(scenarioFiles.length).toBeGreaterThan(0);
    console.log(`Loaded ${scenarioFiles.length} scenario files with ${
      scenarioFiles.reduce((sum, f) => sum + f.data.tests.length, 0)
    } tests`);
  });
  
  test('All fixtures available', () => {
    const requiredFixtures = [
      'search-response.json',
      'browse-response.json',
      'next-response.json',
      'guide-response.json',
      'comments-response.json'
    ];
    requiredFixtures.forEach(f => {
      expect(fixtures[f]).toBeDefined();
    });
  });
});

