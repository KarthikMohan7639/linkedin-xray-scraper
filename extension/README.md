# LinkedIn X-Ray Scraper

A Manifest V3 Chrome Extension that scrapes LinkedIn profiles from Google search results

## Features

- **Popup Interface**: Input job title, location, and number of pages to scrape
- **Automatic Scraping**: Scrapes h3 (name) and href (profile URL) from Google search results
- **Auto-Pagination**: Automatically clicks "Next" button with 3-second delay until page limit is reached
- **Floating UI**: Displays a real-time counter showing number of profiles found
- **CSV Export**: Download scraped profiles as a CSV file
- **Chrome Storage**: All data is stored locally using chrome.storage API

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `linkedin-xray-scraper` directory

## Usage

1. Click the extension icon to open the popup
2. Enter:
   - **Job Title**: The position you're searching for (e.g., "Software Engineer")
   - **Location**: Optional location filter (e.g., "San Francisco")
   - **Number of Pages**: How many Google search pages to scrape (1-50)
3. Click "Start Scraping" - this will:
   - Open a new tab with Google search results for `site:linkedin.com/in [your query]`
   - Automatically scrape profile names and URLs from each page
   - Navigate through pages automatically with 3-second delays
   - Show a floating status indicator on the page
4. Once scraping is complete, click "Export to CSV" in the popup to download the results

## Permissions

- **storage**: To save scraped profiles locally
- **scripting**: To inject content scripts for scraping
- **host_permissions**: Access to `https://www.google.com/*` for scraping search results

## Files

- `manifest.json`: Extension configuration (Manifest V3)
- `popup.html`: User interface for the extension popup
- `popup.js`: Handles user input and CSV export
- `content.js`: Scrapes profiles and handles pagination
- `icon*.png`: Extension icons

## Technical Details

### Scraping Process

1. The content script runs on Google search pages (`https://www.google.com/search*`)
2. It searches for `div.g` elements (search result containers)
3. Extracts `h3` text (profile name) and `a[href]` (profile URL)
4. Filters for URLs containing `linkedin.com/in/`
5. Stores results in `chrome.storage.local`

### Auto-Pagination

- After scraping a page, waits 3 seconds
- Clicks the "Next" button (ID: `pnnext`)
- Continues until reaching the specified page limit
- Updates the floating UI with progress

### Data Storage

Profiles are stored in the following format:
```json
{
  "profiles": [
    {
      "name": "John Doe - Software Engineer",
      "url": "https://www.linkedin.com/in/johndoe"
    }
  ]
}
```

## Notes

- This extension scrapes public search results from Google
- Respects robots.txt and rate limits with 3-second delays
- All data is stored locally in your browser
- No data is sent to external servers

## License

MIT