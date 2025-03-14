// Content script for Simple Colab Ghost Text extension
// This script injects the main script.js into the page

(() => {
  "use strict";
  if ("text/html" === document.contentType) {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("script.js?") + new URLSearchParams({ id: chrome.runtime.id }), // gets URL of script.js file in the extension + concat parameter of extensionId
    script.onload = function(){ this.remove() }, // cleans itself after it has finished loading, on loading
    (document.head || document.documentElement ).prepend(script)    // inserts the new script element at the beginnin of the document head or root.  This ensures that this runs before other scripts
  }
})();

