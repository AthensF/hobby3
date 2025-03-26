// Content script for Simple Colab Ghost Text extension
// This script injects the main script.js into the page
// Content script for Simple Colab Ghost Text extension
// This script injects the main script.js into the page

(() => {
  "use strict";
  if ("text/html" === document.contentType) {
    // Get URLs for resources
    const hardcodedScriptUrl = chrome.runtime.getURL("hardcodedCompletions.js");
    const mainScriptUrl = chrome.runtime.getURL("script.js");
    
    // First inject hardcodedCompletions.js
    const hardcodedScript = document.createElement("script");
    hardcodedScript.src = hardcodedScriptUrl + "?" + new URLSearchParams({ 
      id: chrome.runtime.id
    });
    hardcodedScript.onload = function() { 
      // After hardcodedCompletions.js is loaded, inject script.js
      const mainScript = document.createElement("script");
      mainScript.src = mainScriptUrl + "?" + new URLSearchParams({ id: chrome.runtime.id });
      mainScript.onload = function() { this.remove() };
      (document.head || document.documentElement).prepend(mainScript);
      
      // Remove the hardcoded script element
      this.remove();
    };
    (document.head || document.documentElement).prepend(hardcodedScript);
  }
})();
