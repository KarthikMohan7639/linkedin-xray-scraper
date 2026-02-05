# LinkedIn Duplicate Remover - Chrome Extension

A Chrome extension to remove duplicate LinkedIn profiles by comparing new search results against a master database.

## Project Structure

```
GoogleSearchResScraper/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html             # Extension popup UI
├── popup.js               # Main application logic
├── libs/
│   └── xlsx.full.min.js   # SheetJS library (download required)
├── icons/
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
└── README.md              # This file
```

## Setup Instructions

### 1. Download the SheetJS Library

Download `xlsx.full.min.js` from the SheetJS CDN and place it in the `libs/` folder:

**Option A: Download directly**
- Visit: https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js
- Save as: `libs/xlsx.full.min.js`

**Option B: Use npm**
```bash
npm install xlsx
# Copy node_modules/xlsx/dist/xlsx.full.min.js to libs/
```

### 2. Add Extension Icons

Create or add icons to the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

### 3. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `GoogleSearchResScraper` folder
5. The extension icon should appear in your toolbar

## Usage

1. Click the extension icon in Chrome toolbar
2. **Step 1**: Upload your master database file (.csv or .xlsx) - this is your existing LinkedIn contacts
3. **Step 2**: Upload one or more new search result files (.csv) - these are the new profiles to check
4. Click **Process & Export Unique Records**
5. The extension will download a CSV file containing only the unique records not found in your master database

## How It Works

The extension compares records using these identifier fields (in order of priority):
- LinkedIn URL
- Profile URL
- Email

Records from the search results that don't match any entry in the master database are exported as unique records.

## Tech Stack

- **Manifest V3** - Latest Chrome extension manifest format
- **HTML/CSS/JS** - Standard web technologies
- **SheetJS (xlsx)** - For parsing Excel and CSV files
