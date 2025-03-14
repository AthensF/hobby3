// // Simple service worker for Colab ghost text extension
// // This service worker handles communication between content script and background script

// // Listen for messages from content scripts
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     // Handle different message types
//     if (message.type === "success") {
//       // Content script loaded successfully
//       console.log("Content script loaded successfully");
//       sendResponse({ status: "acknowledged" });
//       return true;
//     }
    
//     // Handle any other messages
//     return false;
//   });
  
//   // Log when the service worker is installed
//   console.log("Ghost text service worker installed");