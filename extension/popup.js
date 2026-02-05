// LinkedIn Duplicate Remover - Main Script
// Performs Set Difference: (New Data - Master Data) based on LinkedIn Profile IDs

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const masterFileInput = document.getElementById('masterFile');
  const searchResultsInput = document.getElementById('searchResultsFiles');
  const processBtn = document.getElementById('processBtn');
  const statusLog = document.getElementById('statusLog');

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Extracts LinkedIn Profile ID from a URL string
   * 
   * Robust extraction handling all common LinkedIn URL formats:
   * - https://www.linkedin.com/in/john-doe-123/     → john-doe-123
   * - linkedin.com/in/jane-smith (no protocol)     → jane-smith
   * - https://www.linkedin.com/in/karthik?query=x  → karthik
   * - https://in.linkedin.com/in/regional-user     → regional-user
   * - /in/direct-path                              → direct-path
   * 
   * @param {string} url - LinkedIn profile URL (any format)
   * @returns {string|null} - Normalized profile ID (lowercase) or null if not found
   */
  function extractLinkedInID(url) {
    // Guard: Ensure we have a valid string input
    if (!url || typeof url !== 'string') {
      return null;
    }
    
    // Clean the input - trim whitespace
    const cleanUrl = url.trim();
    
    if (!cleanUrl) {
      return null;
    }
    
    // Regex Pattern Explanation:
    // \/in\/        - Match literal "/in/"
    // ([^\/\?#]+)   - Capture group: one or more characters that are NOT:
    //                 - / (path separator)
    //                 - ? (query string start)
    //                 - # (hash/fragment start)
    // This cleanly stops at trailing slashes, query params, or hash fragments
    const regex = /\/in\/([^\/\?#]+)/i;
    const match = cleanUrl.match(regex);
    
    if (match && match[1]) {
      try {
        // Decode URL-encoded characters (e.g., %20 → space)
        // Normalize to lowercase for consistent comparison
        // Trim any accidental whitespace
        return decodeURIComponent(match[1]).toLowerCase().trim();
      } catch (e) {
        // If decodeURIComponent fails (malformed URI), return raw match
        return match[1].toLowerCase().trim();
      }
    }
    
    return null;
  }

  /**
   * Auto-detects the column containing LinkedIn URLs by checking values
   * Handles various column names: "Profile Link", "url", "Person Linkedin Url", etc.
   * @param {Object} rowObject - A single row object from the parsed data
   * @returns {string|null} - Column name containing LinkedIn URL or null
   */
  function findUrlColumn(rowObject) {
    if (!rowObject || typeof rowObject !== 'object') {
      return null;
    }
    
    const keys = Object.keys(rowObject);
    
    for (const key of keys) {
      const value = rowObject[key];
      
      // Check if the value contains a LinkedIn profile URL pattern
      if (value && typeof value === 'string' && value.includes('linkedin.com/in/')) {
        return key;
      }
    }
    
    return null;
  }

  /**
   * Finds the URL column from an array of rows (checks first few rows)
   * @param {Array} rows - Array of row objects
   * @returns {string|null} - Column name or null
   */
  function detectUrlColumnFromData(rows) {
    // Check first 10 rows to find the URL column (in case first row has empty value)
    const sampleSize = Math.min(10, rows.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const column = findUrlColumn(rows[i]);
      if (column) {
        return column;
      }
    }
    
    return null;
  }

  // ============================================================
  // LOGGING UTILITY
  // ============================================================

  function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    statusLog.appendChild(entry);
    statusLog.scrollTop = statusLog.scrollHeight;
  }

  function clearLog() {
    statusLog.innerHTML = '';
  }

  // ============================================================
  // FILE PARSING
  // ============================================================

  /**
   * Parse file (CSV or XLSX) using SheetJS
   * @param {File} file - File object to parse
   * @returns {Promise<Array>} - Array of row objects
   */
  async function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          resolve(jsonData);
        } catch (err) {
          reject(new Error(`Failed to parse file: ${file.name}`));
        }
      };

      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsBinaryString(file);
    });
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================

  masterFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      log(`Master file selected: ${file.name}`, 'info');
    }
  });

  searchResultsInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      log(`${files.length} search result file(s) selected`, 'info');
    }
  });

  // ============================================================
  // MAIN PROCESS
  // ============================================================

  processBtn.addEventListener('click', async () => {
    clearLog();
    
    const masterFile = masterFileInput.files[0];
    const searchFiles = searchResultsInput.files;

    // Validation
    if (!masterFile) {
      log('Error: Please upload a master database file.', 'error');
      return;
    }

    if (searchFiles.length === 0) {
      log('Error: Please upload at least one search results file.', 'error');
      return;
    }

    try {
      processBtn.disabled = true;
      processBtn.classList.add('processing');
      processBtn.querySelector('.btn-text').textContent = 'Processing...';

      // --------------------------------------------------------
      // STEP A: Build Master ID Set
      // --------------------------------------------------------
      log('Parsing master database...', 'info');
      const masterData = await parseFile(masterFile);
      log(`Master database loaded: ${masterData.length} rows`, 'info');

      // Detect URL column in master data
      const masterUrlColumn = detectUrlColumnFromData(masterData);
      
      if (!masterUrlColumn) {
        log('Warning: No LinkedIn URL column detected in master file. Using all columns.', 'error');
      } else {
        log(`Detected URL column in master: "${masterUrlColumn}"`, 'info');
      }

      // Build the Set of master LinkedIn IDs
      const masterIds = new Set();
      let masterIdCount = 0;

      for (const row of masterData) {
        let linkedInId = null;
        
        if (masterUrlColumn) {
          linkedInId = extractLinkedInID(row[masterUrlColumn]);
        } else {
          // Fallback: try to find URL in any column
          const column = findUrlColumn(row);
          if (column) {
            linkedInId = extractLinkedInID(row[column]);
          }
        }
        
        if (linkedInId) {
          masterIds.add(linkedInId);
          masterIdCount++;
        }
      }

      log(`Found ${masterIdCount} LinkedIn IDs in Master database`, 'success');

      // --------------------------------------------------------
      // STEP B & C: Process New Files and Filter
      // --------------------------------------------------------
      const finalExport = [];
      let totalNewRecords = 0;
      let duplicatesFound = 0;

      for (let i = 0; i < searchFiles.length; i++) {
        const file = searchFiles[i];
        log(`Processing file ${i + 1}/${searchFiles.length}: ${file.name}...`, 'info');
        
        const newData = await parseFile(file);
        totalNewRecords += newData.length;
        log(`File contains ${newData.length} rows`, 'info');

        // Detect URL column in this file
        const newUrlColumn = detectUrlColumnFromData(newData);
        
        if (!newUrlColumn) {
          log(`Warning: No LinkedIn URL column detected in ${file.name}`, 'error');
          continue;
        }
        
        log(`Detected URL column: "${newUrlColumn}"`, 'info');

        // Filter rows: keep only those NOT in master
        let fileUniqueCount = 0;
        let fileDuplicateCount = 0;

        for (const row of newData) {
          const linkedInId = extractLinkedInID(row[newUrlColumn]);
          
          if (!linkedInId) {
            // No valid LinkedIn ID found, skip this row
            continue;
          }

          if (!masterIds.has(linkedInId)) {
            // This ID is NOT in master - it's unique, add to export
            finalExport.push(row);
            fileUniqueCount++;
          } else {
            fileDuplicateCount++;
          }
        }

        duplicatesFound += fileDuplicateCount;
        log(`  → ${fileUniqueCount} unique, ${fileDuplicateCount} duplicates`, 'info');
      }

      log(`Total records processed: ${totalNewRecords}`, 'info');
      log(`Total duplicates removed: ${duplicatesFound}`, 'info');
      log(`Unique records to export: ${finalExport.length}`, 'success');

      // --------------------------------------------------------
      // STEP D: Export Results
      // --------------------------------------------------------
      if (finalExport.length > 0) {
        log('Exporting unique records...', 'info');
        
        // Generate filename with date
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `Cleaned_Leads_${dateStr}.xlsx`;
        
        // Create workbook and export
        const worksheet = XLSX.utils.json_to_sheet(finalExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Unique Records');
        XLSX.writeFile(workbook, filename);
        
        log(`Export complete! File: ${filename}`, 'success');
        log('Check your downloads folder.', 'success');
      } else {
        log('No unique records found. All entries already exist in master database.', 'info');
      }

    } catch (error) {
      log(`Error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      processBtn.disabled = false;
      processBtn.classList.remove('processing');
      processBtn.querySelector('.btn-text').textContent = 'Process & Export Unique Records';
    }
  });
});
