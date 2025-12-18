# Test Scenarios

Declarative test scenarios that pair filter configurations with expected outcomes.
Add new scenarios as JSON files - the runner automatically discovers and executes them.

## Scenario File Format

```json
{
  "name": "Scenario Group Name",
  "description": "What this scenario group tests",
  "tests": [
    {
      "name": "Individual test name",
      "filters": {
        "videoId": ["exact_id"],
        "channelId": ["UC_CHANNEL_ID"],
        "channelName": ["/regex pattern/i"],
        "title": ["/keyword/i"],
        "description": ["/sponsor|promo/i"],
        "comment": ["/spam/i"],
        "vidLength": [60, 300]
      },
      "options": {
        "shorts": true,
        "movies": true,
        "mixes": true,
        "vidLength_type": "allow",
        "percent_watched_hide": 90
      },
      "fixture": "search-response.json",
      "filterRules": "main",
      "expect": {
        "blocked": [
          { "videoId": "should_be_blocked", "reason": "optional explanation" }
        ],
        "allowed": [
          { "videoId": "should_remain" }
        ]
      }
    }
  ]
}
```

## Filter Patterns

| Type | Format | Example |
|------|--------|---------|
| Exact ID | Plain string | `"UC_CHANNEL_ID"` |
| Regex | `/pattern/flags` | `"/spam\|clickbait/i"` |
| Keyword | Plain string (auto word-boundary) | `"blocked"` |

## Available Fixtures

| Fixture | Source | Contains |
|---------|--------|----------|
| `search-response.json` | `/youtubei/v1/search` | Videos, channels, mixes |
| `browse-response.json` | `/youtubei/v1/browse` | Home page, shorts, movies |
| `next-response.json` | `/youtubei/v1/next` | Watch page recommendations |
| `guide-response.json` | `/youtubei/v1/guide` | Sidebar, subscriptions |
| `comments-response.json` | `/youtubei/v1/next` | Comments (new + legacy) |
| `player-response.json` | `/youtubei/v1/player` | Video player data |

## Filter Rules

| Value | Use For |
|-------|---------|
| `main` (default) | Videos, channels, search, browse |
| `guide` | Sidebar, subscriptions |
| `comments` | Comments, live chat |
| `merged` | Watch page with comments |
| `ytPlayer` | Player data |

## Expect Types

```json
{
  "blocked": [
    { "videoId": "id" },
    { "channelId": "UC_..." },
    { "type": "radioRenderer" },
    { "commentId": "comment_id" }
  ],
  "allowed": [
    { "videoId": "id" },
    { "channelId": "UC_..." }
  ]
}
```

## Running Scenarios

```bash
# Run all tests
npm test

# Run only scenario tests
npm test -- --testPathPattern=scenarios

# Run with verbose output
npm test -- --verbose --testPathPattern=scenarios
```

## Adding New Scenarios

1. Create a new `.json` file in this directory
2. Follow the format above
3. Run `npm test` - the runner auto-discovers new files

## Scenario Files

| File | Tests | Description |
|------|-------|-------------|
| `channel-blocking.json` | 3 | Channel ID and name blocking |
| `video-blocking.json` | 4 | Video ID and title blocking |
| `description-blocking.json` | 3 | Description snippet blocking |
| `content-type-blocking.json` | 4 | Shorts, movies, mixes |
| `duration-blocking.json` | 4 | Video length, percent watched |
| `comment-blocking.json` | 3 | Comment content and user blocking |

