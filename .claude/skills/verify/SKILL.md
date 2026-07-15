---
name: verify
description: Verify BlockTube extension changes at runtime by loading the unpacked extension into headless Google Chrome via CDP and driving real YouTube pages.
---

# Verify BlockTube at runtime

The extension loads unpacked straight from the repo root (manifest.json, MV3). No build step is needed for verification.

## Launch Chrome with the extension

Branded Google Chrome 137+ ignores `--load-extension`; use the CDP `Extensions.loadUnpacked` command instead:

```bash
PROFILE=$(mktemp -d /tmp/btprof-XXXX)
nohup google-chrome-stable --headless=new --remote-debugging-port=9223 \
  --enable-unsafe-extension-debugging --user-data-dir="$PROFILE" \
  --no-first-run --window-size=1600,1000 about:blank >/tmp/bt-chrome.log 2>&1 &
```

Then over the browser-level websocket (`webSocketDebuggerUrl` from `http://127.0.0.1:9223/json/version`), send `Extensions.loadUnpacked` with `path` set to the repo root. It returns the extension ID (path-derived; for this repo path it is `jajodbakgbcpdadchafncmfcgikjcikh`).

Gotchas:
- Chrome rejects websocket connections with an Origin header; with Python `websocket-client` pass `suppress_origin=True` (`uv run` with `# /// script dependencies = ["websocket-client"] ///`).
- `/json/new?<url>` requires the PUT method.
- When killing Chrome, do not `pkill -f` a pattern that appears in your own shell command line — it kills your shell (exit 144). Kill by PID from `pgrep -f "user-data-dir=/tmp/btprof"`.

## Drive it

- Options page: `chrome-extension://<ID>/src/ui/options.html`. Toggle checkboxes by id (ids match `storageData.options` keys, e.g. `disable_shorts`), then `document.getElementById('save_btn').click()`. The save button no-ops while it has the `disabled-btn` class, and programmatic `.value` assignment does not clear it — dispatch a bubbling `change` event on any form input first. Filter list textareas are CodeMirror editors: `document.querySelector('#title-tab-content .CodeMirror').CodeMirror.setValue(...)`. Confirm persistence with `chrome.storage.local.get('storageData', ...)` evaluated in the options page context.
- Desktop watch page: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` loads reliably headless (video + sidebar + comments after scrolling). Sidebar item count: `document.querySelectorAll('ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer, ytd-watch-next-secondary-results-renderer yt-lockup-view-model').length`.
- Mobile: emulate with `Emulation.setUserAgentOverride` (Android UA) + `Emulation.setDeviceMetricsOverride(mobile=true)`, then navigate to `m.youtube.com`. Suggested items: `ytm-video-with-context-renderer`. Metadata section: `ytm-slim-video-metadata-section-renderer`.
- `window.btDispatched === true` in the page confirms inject.js ran.
- Always run an A/B control (option off, reload) — YouTube layout varies, so a bare "0 items" is not evidence without the populated control.
