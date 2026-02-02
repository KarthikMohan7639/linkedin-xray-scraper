// Content script for scraping LinkedIn profiles from Google search results

let floatingDiv = null;
let scrapingActive = false;
let profiles = [];

// Initialize the content script
async function init() {
  const settings = await chrome.storage.local.get(['isScrapingActive', 'currentPage', 'maxPages']);
  
  if (settings.isScrapingActive) {
    scrapingActive = true;
    createFloatingDiv();
    await scrapeProfiles();
    
    // Check if we should continue to next page
    const currentPage = settings.currentPage || 1;
    const maxPages = settings.maxPages || 1;
    
    if (currentPage < maxPages) {
      // Wait 3 seconds and click next
      setTimeout(() => {
        clickNextButton(currentPage + 1);
      }, 3000);
    } else {
      // Scraping complete
      await chrome.storage.local.set({ isScrapingActive: false });
      updateFloatingDiv('Scraping complete!', true);
      setTimeout(() => {
        if (floatingDiv) {
          floatingDiv.remove();
        }
      }, 3000);
    }
  }
}

// Create floating div to show progress
function createFloatingDiv() {
  if (floatingDiv) {
    return;
  }
  
  floatingDiv = document.createElement('div');
  floatingDiv.id = 'linkedin-scraper-status';
  floatingDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #0077b5 0%, #00a0dc 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    font-weight: 500;
    min-width: 200px;
    text-align: center;
  `;
  floatingDiv.textContent = 'Initializing scraper...';
  document.body.appendChild(floatingDiv);
}

// Update floating div with profile count
function updateFloatingDiv(message, isComplete = false) {
  if (floatingDiv) {
    floatingDiv.textContent = message;
    if (isComplete) {
      floatingDiv.style.background = 'linear-gradient(135deg, #28a745 0%, #34ce57 100%)';
    }
  }
}

// Scrape profiles from current page
async function scrapeProfiles() {
  const profileLinks = [];
  
  // Find all div.g elements (Google search result containers)
  const searchResults = document.querySelectorAll('div.g');
  
  searchResults.forEach((result) => {
    // Find h3 element for the name
    const h3 = result.querySelector('h3');
    
    // Find the link (href)
    const link = result.querySelector('a[href*="linkedin.com/in/"]');
    
    if (h3 && link) {
      const name = h3.textContent.trim();
      const url = link.href;
      
      // Only add if it's a valid LinkedIn profile URL
      if (url.includes('linkedin.com/in/')) {
        profileLinks.push({
          name: name,
          url: url
        });
      }
    }
  });
  
  // Get existing profiles from storage
  const result = await chrome.storage.local.get(['profiles']);
  const existingProfiles = result.profiles || [];
  
  // Merge with new profiles (avoiding duplicates based on URL)
  const urlSet = new Set(existingProfiles.map(p => p.url));
  const newProfiles = profileLinks.filter(p => !urlSet.has(p.url));
  
  const allProfiles = [...existingProfiles, ...newProfiles];
  
  // Save to storage
  await chrome.storage.local.set({ profiles: allProfiles });
  
  // Update UI
  updateFloatingDiv(`Found ${allProfiles.length} profiles`);
  
  profiles = allProfiles;
}

// Click the next button to go to next page
async function clickNextButton(nextPageNumber) {
  const nextButton = document.getElementById('pnnext');
  
  if (nextButton && !nextButton.disabled) {
    // Update current page
    await chrome.storage.local.set({ currentPage: nextPageNumber });
    updateFloatingDiv(`Loading page ${nextPageNumber}...`);
    
    // Click the next button
    nextButton.click();
  } else {
    // No more pages
    await chrome.storage.local.set({ isScrapingActive: false });
    updateFloatingDiv('No more pages', true);
    setTimeout(() => {
      if (floatingDiv) {
        floatingDiv.remove();
      }
    }, 3000);
  }
}

// Start the script
init();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.profiles) {
    const newProfiles = changes.profiles.newValue || [];
    if (scrapingActive && floatingDiv) {
      updateFloatingDiv(`Found ${newProfiles.length} profiles`);
    }
  }
});
