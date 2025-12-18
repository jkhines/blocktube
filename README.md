# BlockTube

WebExtension for Chrome and Firefox.  
Filter and block unwanted content from YouTube™.

## Extension features

* Block videos via: **Video Title** / **Channel Name** / **Channel ID** / **Video ID**
* Block comments via **User** / **Comment content**
* Block videos within YouTube using context menus
* Blocked videos do not appear anywhere on the site
* Support for `m.youtube.com` on Firefox for Android and Kiwi Browser
* Block complete channels
* Supports both keywords and raw Regex
* Does not break or limit any features of YouTube like playlist or autoplay
* Hide and block the Trending section
* Protect extension options with a password
* Filtering is done before any DOM rendering

## Install

* [**Chrome Webstore**](https://chrome.google.com/webstore/detail/blocktube/bbeaicapbccfllodepmimpkgecanonai?hl=en-US)
* [**Firefox AMO**](https://addons.mozilla.org/en-US/firefox/addon/blocktube/)

## FAQ
  
* What is the difference between "Channel ID" and "Channel Name"  
  Channel names on YouTube are not unique and can be duplicated/changed  
  whereas Channel ID is a unique identification string that never changes.  
  If you want to block a specific single channel the preferred method is using it's ID,  
  If you want to block multiple channels sharing similar name use it's name.

* How can I get a channel's ID?  
  Channel ID looks like this: UCXXXXXXXXXXXXXXXX  
  To get it, simply browse to a channel page and look at the URL `/channel/UCXXXXXXXXXXXXXXXXXXXX`  
  If the URL is `/user/BadChannelExample` use [This site](https://vabs.github.io/youtube-channel-name-converter/) to convert the username to the channel ID

* How to block comments from specific user?  
  Blocked channels comments are removed as well, so just add the user's name/channel ID
  to your filters

* What is the behaviour when browsing blocked channel?  
  User will be redirected to YouTube homepage.

* What is the behaviour when browsing blocked video?  
  You can choose between two options:
  - Block the entire page and leave a custom message
  - Auto redirect user to the next video

* How can I ensure this extension cannot be bypassed?   
  TODO

## Development & Build

### Prerequisites

```bash
# Install Node.js and npm
sudo apt install nodejs npm

# Clone and install dependencies
git clone https://github.com/amitbl/blocktube
cd blocktube
npm install
```

### Local Development

For Chrome development, load the extension directly from the repository root:

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the repository root folder

Edit files in `src/` and reload the extension to see changes.

### Production Builds

```bash
# Build for Chrome
npm run build:chrome
# Output: dist/chrome/blocktube_chrome_VERSION.zip

# Build for Firefox
npm run build:firefox
# Output: dist/firefox/blocktube_firefox_VERSION.zip

# Build for Firefox self-hosted
npm run build:firefox-selfhosted

# Clean build outputs
npm run clean
```

### Testing

```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Firefox Temporary Installation

For Firefox development, build the extension first then follow:
https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/

## Future work

* User-friendly options UI
* Sync options to cloud provider / enterprise policies
* Whitelist mode
* Dynamic rules (match multiple rules to block a video)

## License

This project is licensed under the GPLv3 License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

* Extension Icon from: http://www.designbolts.com/2013/09/08/40-free-shaded-social-media-icons/
