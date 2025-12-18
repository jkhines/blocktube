/**
 * Integration tests using real YouTube response fixtures
 * 
 * These tests verify that the ObjectFilter correctly filters
 * realistic YouTube data structures.
 */

// Mock browser globals
global.window = global;
global.window.btDispatched = false;
global.window.btReloadRequired = false;
global.window.btExports = {};
global.window.addEventListener = jest.fn();
global.window.postMessage = jest.fn();

const inject = require('../../src/scripts/inject.js');
const { ObjectFilter, filterRules, mergedFilterRules, deepClone } = inject;

// Load fixtures
const searchFixture = require('../fixtures/search-response.json');
const browseFixture = require('../fixtures/browse-response.json');
const commentsFixture = require('../fixtures/comments-response.json');
const guideFixture = require('../fixtures/guide-response.json');
const nextFixture = require('../fixtures/next-response.json');
const playerFixture = require('../fixtures/player-response.json');

describe('Integration: Search Results Filtering', () => {
  beforeEach(() => {
    inject._setJsFilter(null);
  });

  test('should filter videos by blocked channel ID', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_BLOCKED_CHANNEL$/],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(searchFixture);
    ObjectFilter(data, filterRules.main);

    const videos = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents;

    // Should have removed the blocked video
    const blockedVideo = videos.find(v => 
      v.videoRenderer?.videoId === 'BLOCKED_VIDEO_001'
    );
    expect(blockedVideo).toBeUndefined();

    // Should keep other videos
    const allowedVideo = videos.find(v => 
      v.videoRenderer?.videoId === 'dQw4w9WgXcQ'
    );
    expect(allowedVideo).toBeDefined();
  });

  test('should filter videos by blocked video ID', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^BLOCKED_VIDEO_001$/],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(searchFixture);
    ObjectFilter(data, filterRules.main);

    const videos = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents;

    const blockedVideo = videos.find(v => 
      v.videoRenderer?.videoId === 'BLOCKED_VIDEO_001'
    );
    expect(blockedVideo).toBeUndefined();
  });

  test('should filter mixes when mixes option enabled', () => {
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
      options: { mixes: true }
    });

    const data = deepClone(searchFixture);
    ObjectFilter(data, filterRules.main);

    const items = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents;

    const mix = items.find(v => v.radioRenderer);
    expect(mix).toBeUndefined();
  });

  test('should filter short videos by duration', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [60, NaN] // Minimum 60 seconds
      },
      options: { vidLength_type: 'allow' }
    });

    const data = deepClone(searchFixture);
    ObjectFilter(data, filterRules.main);

    const videos = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents;

    // 15-second video should be filtered
    const shortVideo = videos.find(v => 
      v.videoRenderer?.videoId === 'short_video_123'
    );
    expect(shortVideo).toBeUndefined();

    // 3:33 video should remain
    const normalVideo = videos.find(v => 
      v.videoRenderer?.videoId === 'dQw4w9WgXcQ'
    );
    expect(normalVideo).toBeDefined();
  });
});

describe('Integration: Browse/Home Page Filtering', () => {
  beforeEach(() => {
    inject._setJsFilter(null);
  });

  test('should filter videos by title keyword', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [/CLICKBAIT/i],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(browseFixture);
    ObjectFilter(data, filterRules.main);

    const items = data.contents.twoColumnBrowseResultsRenderer
      .tabs[0].tabRenderer.content.richGridRenderer.contents;

    const blockedVideo = items.find(item => 
      item.richItemRenderer?.content?.videoRenderer?.videoId === 'blocked_by_title'
    );
    expect(blockedVideo).toBeUndefined();
  });

  test('should filter videos by percent watched', () => {
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
      options: { percent_watched_hide: 90 }
    });

    const data = deepClone(browseFixture);
    ObjectFilter(data, filterRules.main);

    const items = data.contents.twoColumnBrowseResultsRenderer
      .tabs[0].tabRenderer.content.richGridRenderer.contents;

    // 95% watched video should be filtered
    const watchedVideo = items.find(item => 
      item.richItemRenderer?.content?.videoRenderer?.videoId === 'mostly_watched_video'
    );
    expect(watchedVideo).toBeUndefined();
  });

  test('should filter shorts when shorts option enabled', () => {
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
      options: { shorts: true }
    });

    const data = deepClone(browseFixture);
    ObjectFilter(data, filterRules.main);

    const items = data.contents.twoColumnBrowseResultsRenderer
      .tabs[0].tabRenderer.content.richGridRenderer.contents;

    // reelItemRenderer (shorts) should be filtered
    const shorts = items.find(item => 
      item.richSectionRenderer?.content?.richShelfRenderer?.contents?.some(
        c => c.richItemRenderer?.content?.reelItemRenderer
      )
    );
    // The shelf itself may be removed or its contents may be empty
    if (shorts) {
      const reelItems = shorts.richSectionRenderer.content.richShelfRenderer.contents
        .filter(c => c.richItemRenderer?.content?.reelItemRenderer);
      expect(reelItems.length).toBe(0);
    }
  });

  test('should filter movies when movies option enabled', () => {
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
      options: { movies: true }
    });

    const data = deepClone(browseFixture);
    ObjectFilter(data, filterRules.main);

    const items = data.contents.twoColumnBrowseResultsRenderer
      .tabs[0].tabRenderer.content.richGridRenderer.contents;

    const movie = items.find(item => 
      item.richItemRenderer?.content?.movieRenderer
    );
    expect(movie).toBeUndefined();
  });
});

describe('Integration: Guide/Sidebar Filtering', () => {
  beforeEach(() => {
    inject._setJsFilter(null);
  });

  test('should filter subscribed channels by ID', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_BLOCKED_SUBSCRIPTION$/],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(guideFixture);
    ObjectFilter(data, filterRules.guide);

    // Find the subscriptions section
    const subscriptionsSection = data.items.find(item => 
      item.guideSectionRenderer?.title?.simpleText === 'Subscriptions'
    );

    if (subscriptionsSection) {
      const blockedChannel = subscriptionsSection.guideSectionRenderer.items.find(item =>
        item.guideEntryRenderer?.navigationEndpoint?.browseEndpoint?.browseId === 'UC_BLOCKED_SUBSCRIPTION'
      );
      expect(blockedChannel).toBeUndefined();
    }
  });

  test('should filter trending when trending option enabled', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^FEtrending$/, /^FEexplore$/],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: { trending: true }
    });

    const data = deepClone(guideFixture);
    ObjectFilter(data, filterRules.guide);

    // Find the main section
    const mainSection = data.items[0];
    const trendingEntry = mainSection.guideSectionRenderer.items.find(item =>
      item.guideEntryRenderer?.navigationEndpoint?.browseEndpoint?.browseId === 'FEtrending'
    );
    expect(trendingEntry).toBeUndefined();
  });
});

describe('Integration: Watch Page Recommendations Filtering', () => {
  beforeEach(() => {
    inject._setJsFilter(null);
  });

  test('should filter blocked recommendations', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_BLOCKED_CHANNEL$/],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(nextFixture);
    ObjectFilter(data, mergedFilterRules);

    const results = data.contents.twoColumnWatchNextResults
      .secondaryResults.secondaryResults.results;

    const blockedRecommendation = results.find(r =>
      r.compactVideoRenderer?.videoId === 'BLOCKED_RECOMMENDED'
    );
    expect(blockedRecommendation).toBeUndefined();

    // Other recommendations should remain
    const allowedRecommendation = results.find(r =>
      r.compactVideoRenderer?.videoId === 'recommended_1'
    );
    expect(allowedRecommendation).toBeDefined();
  });

  test('should filter shorts in recommendations', () => {
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
      options: { shorts: true }
    });

    const data = deepClone(nextFixture);
    ObjectFilter(data, mergedFilterRules);

    const results = data.contents.twoColumnWatchNextResults
      .secondaryResults.secondaryResults.results;

    // Video with "SHORTS" duration should be filtered
    const shortsVideo = results.find(r =>
      r.compactVideoRenderer?.videoId === 'short_recommended'
    );
    expect(shortsVideo).toBeUndefined();
  });

  test('should filter mix recommendations', () => {
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
      options: { mixes: true }
    });

    const data = deepClone(nextFixture);
    ObjectFilter(data, mergedFilterRules);

    const results = data.contents.twoColumnWatchNextResults
      .secondaryResults.secondaryResults.results;

    const mix = results.find(r => r.compactRadioRenderer);
    expect(mix).toBeUndefined();
  });
});

describe('Integration: Comments Filtering', () => {
  beforeEach(() => {
    inject._setJsFilter(null);
  });

  test('should filter comments by content keyword', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [],
        channelName: [],
        title: [],
        comment: [/spam|BUY NOW/i],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(commentsFixture);
    ObjectFilter(data, filterRules.comments);

    // Check that spam comment was filtered
    const mutations = data.frameworkUpdates.entityBatchUpdate.mutations;
    const spamComment = mutations.find(m =>
      m.payload?.commentEntityPayload?.properties?.commentId === 'comment_spam_1'
    );
    expect(spamComment).toBeUndefined();

    // Normal comments should remain
    const normalComment = mutations.find(m =>
      m.payload?.commentEntityPayload?.properties?.commentId === 'comment_normal_1'
    );
    expect(normalComment).toBeDefined();
  });

  test('should filter comments by blocked user ID', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_BLOCKED_COMMENTER$/],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(commentsFixture);
    ObjectFilter(data, filterRules.comments);

    const mutations = data.frameworkUpdates.entityBatchUpdate.mutations;
    const blockedUserComment = mutations.find(m =>
      m.payload?.commentEntityPayload?.properties?.commentId === 'comment_blocked_user'
    );
    expect(blockedUserComment).toBeUndefined();
  });

  test('should filter legacy comment format', () => {
    inject._setStorageData({
      filterData: {
        videoId: [],
        channelId: [/^UC_BLOCKED_LEGACY$/],
        channelName: [],
        title: [],
        comment: [],
        description: [],
        vidLength: [NaN, NaN]
      },
      options: {}
    });

    const data = deepClone(commentsFixture);
    ObjectFilter(data, filterRules.comments);

    const legacyComments = data.onResponseReceivedEndpoints[0]
      .reloadContinuationItemsCommand.continuationItems;

    const blockedLegacy = legacyComments.find(c =>
      c.commentRenderer?.authorEndpoint?.browseEndpoint?.browseId === 'UC_BLOCKED_LEGACY'
    );
    expect(blockedLegacy).toBeUndefined();
  });
});

describe('Integration: Combined Filters', () => {
  beforeEach(() => {
    inject._setJsFilter(null);
  });

  test('should apply multiple filters simultaneously', () => {
    inject._setStorageData({
      filterData: {
        videoId: [/^BLOCKED_VIDEO_001$/],
        channelId: [],
        channelName: [/^Blocked Channel$/i],
        title: [],
        comment: [],
        description: [],
        vidLength: [60, NaN] // Min 60 seconds
      },
      options: { mixes: true }
    });

    const data = deepClone(searchFixture);
    ObjectFilter(data, filterRules.main);

    const videos = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents;

    // Blocked video by ID
    expect(videos.find(v => v.videoRenderer?.videoId === 'BLOCKED_VIDEO_001')).toBeUndefined();

    // Short video (15 sec) should be blocked
    expect(videos.find(v => v.videoRenderer?.videoId === 'short_video_123')).toBeUndefined();

    // Mix should be blocked
    expect(videos.find(v => v.radioRenderer)).toBeUndefined();

    // Normal video should remain
    expect(videos.find(v => v.videoRenderer?.videoId === 'abc123normal')).toBeDefined();
  });
});

describe('Integration: JavaScript Custom Filter', () => {
  test('should use custom JS filter for complex logic', () => {
    const customFilter = (video, objectType) => {
      // Block videos with view count over 1 million
      if (video.viewCount && video.viewCount > 1000000) {
        return true;
      }
      return false;
    };

    inject._setJsFilter(customFilter);
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
      options: { enable_javascript: true }
    });

    const data = deepClone(searchFixture);
    ObjectFilter(data, filterRules.main);

    const videos = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents;

    // Rick Astley video with 1.5B views should be filtered
    const highViewVideo = videos.find(v =>
      v.videoRenderer?.videoId === 'dQw4w9WgXcQ'
    );
    expect(highViewVideo).toBeUndefined();

    // Video with 100K views should remain
    const normalViewVideo = videos.find(v =>
      v.videoRenderer?.videoId === 'abc123normal'
    );
    expect(normalViewVideo).toBeDefined();
  });
});

describe('Integration: No Filters Applied', () => {
  test('should not modify data when no filters configured', () => {
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
      options: {}
    });

    const data = deepClone(searchFixture);
    const originalCount = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents.length;

    ObjectFilter(data, filterRules.main);

    const afterCount = data.contents.twoColumnSearchResultsRenderer
      .primaryContents.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents.length;

    expect(afterCount).toBe(originalCount);
  });
});

