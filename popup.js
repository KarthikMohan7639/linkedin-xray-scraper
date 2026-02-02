document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const exportBtn = document.getElementById('exportBtn');
  const statusDiv = document.getElementById('status');
  
  // Load and display current profile count
  updateProfileCount();
  
  startBtn.addEventListener('click', async function() {
    const title = document.getElementById('title').value.trim();
    const location = document.getElementById('location').value.trim();
    const pages = parseInt(document.getElementById('pages').value) || 1;
    
    if (!title) {
      showStatus('Please enter a job title', 'error');
      return;
    }
    
    // Build the search query
    let query = `site:linkedin.com/in ${title}`;
    if (location) {
      query += ` ${location}`;
    }
    
    // Store the pagination settings in chrome.storage
    await chrome.storage.local.set({
      maxPages: pages,
      currentPage: 1,
      isScrapingActive: true
    });
    
    // Clear previous profiles before starting new scrape
    await chrome.storage.local.set({ profiles: [] });
    
    // Construct Google search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    // Open the search in a new tab
    chrome.tabs.create({ url: searchUrl });
    
    showStatus(`Starting scrape for ${pages} page(s)...`, 'success');
  });
  
  exportBtn.addEventListener('click', async function() {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];
    
    if (profiles.length === 0) {
      showStatus('No profiles to export', 'error');
      return;
    }
    
    // Convert to CSV
    const csv = convertToCSV(profiles);
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin_profiles_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus(`Exported ${profiles.length} profiles`, 'success');
  });
  
  function convertToCSV(profiles) {
    const headers = ['Name', 'URL'];
    const rows = profiles.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.url.replace(/"/g, '""')}"`
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'show';
    statusDiv.style.backgroundColor = type === 'error' ? '#ffebee' : '#e8f5e9';
    statusDiv.style.color = type === 'error' ? '#c62828' : '#2e7d32';
    
    setTimeout(() => {
      statusDiv.className = '';
    }, 3000);
  }
  
  async function updateProfileCount() {
    const result = await chrome.storage.local.get(['profiles']);
    const profiles = result.profiles || [];
    if (profiles.length > 0) {
      showStatus(`${profiles.length} profiles stored`, 'success');
    }
  }
  
  // Listen for storage changes to update count
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.profiles) {
      const newProfiles = changes.profiles.newValue || [];
      if (newProfiles.length > 0) {
        showStatus(`${newProfiles.length} profiles found`, 'success');
      }
    }
  });
});
