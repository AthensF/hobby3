// Simple service worker for Colab ghost text extension
// This service worker handles communication between content script and background script

// Listen for messages from content scripts - Still not needed lolz
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
// });

// Store connections from clients
const connectionClients = new Map();

// Listen for external connections (from script.js)
chrome.runtime.onConnectExternal.addListener((port) => {
  console.log("New connection established with session ID:", port.name);
  
  // Store the connection
  connectionClients.set(port.name, port);
  
  // Listen for messages on this port
  port.onMessage.addListener((message) => {
    console.log("Message received on port:", port.name, message);
    
    // Handle test messages
    if (message.kind === "test") {
      console.log("Received foobar:", message.content);
      
      // Send a response back if needed
      port.postMessage({
        kind: "test_response",
        content: "Received your message: " + message.content
      });
    }
  });
  
  // Handle disconnection
  port.onDisconnect.addListener(() => {
    console.log("Port disconnected:", port.name);
    connectionClients.delete(port.name);
  });
});

// Log when the service worker is installed
console.log("Ghost text service worker installed");