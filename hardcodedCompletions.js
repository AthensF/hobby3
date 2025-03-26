/**
 * Hardcoded Completions
 * 
 * This file contains functions that provide ghost text suggestions
 * based on data from a Google Sheets document.
 */

(function() {
  "use strict";
  
  // Store for our completions data
  let completionsData = [];
  
  // Google Sheets URL (published as CSV)
  // Format: https://docs.google.com/spreadsheets/d/[SHEET_ID]/export?format=csv
  const sheetId = '1ys8qYpzYnLUNk744AYGj4e46H3v-mefvuDRsClxI2Js';
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  console.log('Google Sheets URL:', sheetsUrl);
  
  // Load the data from Google Sheets
  async function loadCompletionsData() {
    try {
      console.log('Fetching data from Google Sheets...');
      const response = await fetch(sheetsUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log('Received CSV data:', csvText.substring(0, 100) + '...');
      
      // Parse CSV (simple implementation)
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        if (values.length >= 2) {
          const entry = {
            userInput: values[0].trim(),
            output: values[1].trim()
          };
          
          completionsData.push(entry);
        }
      }
      
      console.log('Loaded completions data:', completionsData);
    } catch (error) {
      console.error('Error loading completions data:', error);
    }
  }
  
  // Call the load function immediately
  loadCompletionsData();
  
  // Define text range class for editor positions (needed for the completion)
  class TextRange {
    constructor(startPos, endPos) {
      this.startLineNumber = startPos.lineNumber;
      this.startColumn = startPos.column;
      this.endLineNumber = endPos.lineNumber;
      this.endColumn = endPos.column;
    }
  }

  /**
   * Provides completions based on Google Sheets data
   * @param {string} currentText - The current text in the editor
   * @param {object} editor - The Monaco editor instance
   * @returns {object|null} - Completion items or null if no completion
   */
  function provideHardcodedCompletion(currentText, editor) {
    console.log('🔍 Checking for hardcoded completions in Google Sheets data...');
    
    // If data hasn't loaded yet, return null
    if (completionsData.length === 0) {
      console.log('❌ No completions data loaded yet');
      return null;
    }
    
    // Check for matches in our data
    for (const entry of completionsData) {
      if (currentText.endsWith(entry.userInput)) {
        // Found a match, return the completion
        console.log('✅ Found hardcoded completion match!', {
          userInput: entry.userInput,
          completion: entry.output
        });
        
        const startPos = editor.getPositionAt(currentText.length);
        const endPos = startPos;
        
        return {
          items: [{
            insertText: entry.output,
            text: entry.output,
            range: new TextRange(startPos, endPos),
            command: {
              id: "ghostText.acceptCompletion",
              title: "Accept Completion",
              arguments: ["sheets-completion", undefined]
            }
          }]
        };
      }
    }
    
    // No match found
    return null;
  }
  
  // Expose the function to the global scope
  window.provideHardcodedCompletion = provideHardcodedCompletion;
})();