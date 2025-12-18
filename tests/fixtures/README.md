# YouTube Response Fixtures

This directory contains captured YouTube API responses used for regression testing.

## Fixture Files

| File | Description | Source Endpoint |
|------|-------------|-----------------|
| `search-response.json` | Search results with videos, channels, mixes | `/youtubei/v1/search` |
| `browse-response.json` | Home page with videos, shorts, movies | `/youtubei/v1/browse` |
| `next-response.json` | Watch page recommendations | `/youtubei/v1/next` |
| `guide-response.json` | Sidebar subscriptions and navigation | `/youtubei/v1/guide` |
| `comments-response.json` | Comment threads (new and legacy format) | `/youtubei/v1/next` |
| `player-response.json` | Video player data | `/youtubei/v1/player` |

## Capturing New Fixtures

### Method 1: Browser Console Script

1. Open YouTube in your browser
2. Open Developer Tools (F12) → Console
3. Paste and run this script:

```javascript
// YouTube Response Capture Script
(function() {
  const originalFetch = window.fetch;
  const captured = {};
  
  const endpoints = {
    '/youtubei/v1/search': 'search-response',
    '/youtubei/v1/browse': 'browse-response',
    '/youtubei/v1/next': 'next-response',
    '/youtubei/v1/guide': 'guide-response',
    '/youtubei/v1/player': 'player-response'
  };
  
  window.fetch = async function(resource, init) {
    const response = await originalFetch(resource, init);
    
    if (resource instanceof Request) {
      const url = new URL(resource.url);
      const endpointName = endpoints[url.pathname];
      
      if (endpointName && !captured[endpointName]) {
        const clone = response.clone();
        clone.json().then(data => {
          captured[endpointName] = data;
          console.log(`✓ Captured: ${endpointName}`);
          console.log(`  Run: downloadCapture('${endpointName}') to save`);
        }).catch(() => {});
      }
    }
    
    return response;
  };
  
  window.downloadCapture = function(name) {
    if (!captured[name]) {
      console.error(`No capture found for: ${name}`);
      console.log('Available:', Object.keys(captured));
      return;
    }
    
    const data = {
      _meta: {
        description: `YouTube ${name} response`,
        source: Object.keys(endpoints).find(k => endpoints[k] === name),
        captured: new Date().toISOString().split('T')[0]
      },
      ...captured[name]
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`✓ Downloaded: ${name}.json`);
  };
  
  window.listCaptures = function() {
    console.table(Object.keys(captured).map(k => ({ name: k, size: JSON.stringify(captured[k]).length })));
  };
  
  console.log('YouTube Response Capture active!');
  console.log('Navigate YouTube to capture responses.');
  console.log('Commands: listCaptures(), downloadCapture("name")');
})();
```

4. Navigate YouTube (search, home page, watch a video, etc.)
5. Use `listCaptures()` to see what's been captured
6. Use `downloadCapture('search-response')` to download

### Method 2: Network Tab Export

1. Open YouTube in your browser
2. Open Developer Tools (F12) → Network tab
3. Filter by "Fetch/XHR"
4. Perform the action you want to capture
5. Find the request (e.g., `search?...` or `browse?...`)
6. Right-click → Copy → Copy response
7. Save to a JSON file

## Sanitizing Fixtures

Before committing fixtures, consider:

1. **Remove personal data**: Subscriptions, watch history, recommendations
2. **Anonymize IDs**: Replace real video/channel IDs with test IDs
3. **Reduce size**: Remove unnecessary nested data
4. **Add test cases**: Include specific videos/channels for testing

Example sanitization:
```javascript
// Replace personal channel IDs with test IDs
const sanitized = JSON.stringify(data)
  .replace(/UC[a-zA-Z0-9_-]{22}/g, 'UC_TEST_CHANNEL_ID')
  .replace(/"videoId":"[^"]+"/g, '"videoId":"test_video_id"');
```

## Updating Fixtures

When YouTube changes their response format:

1. Capture new responses using the methods above
2. Update the fixture files
3. Run tests: `npm test`
4. Fix any failing tests due to schema changes
5. Commit the updated fixtures

## Best Practices

- Keep fixtures small and focused
- Include both "should be filtered" and "should be allowed" content
- Add `_meta` object with capture date and source
- Test edge cases (empty arrays, missing properties, etc.)

