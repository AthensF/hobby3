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

importScripts('config.js');

// Store connections from clients
const connectionClients = new Map();

// Listen for external connections (from script.js)
chrome.runtime.onConnectExternal.addListener((port) => {  
  // TODO Store the connection, create a LSC for each connection
  connectionClients.set(port.name, port);
  // TODO add a client, to send the connection to external party like OpenAI
  
  










  // Listen for messages on this port
  port.onMessage.addListener((message) => {
    // TODO add client, that get from connectClients
    console.log("Message received on port:", port.name, message);
    if (message.kind === "getCompletions"){
        console.log("Received getCompletions:", message);
        console.log("completionRequest:", message.request);
        callOpenAI(message, port);
    }
    


    
    // Handle test messages
    // if (message.kind === "test") {
    //   console.log("Received foobar:", message.content, " sessionId: ", message.sessionId);
      
    //   // Send a response back if needed
    //   port.postMessage({
    //     kind: "test_response",
    //     content: "Acknowledging your message: " + message.content + " sessionId: " + message.sessionId
    //   });
    // }
  });
  
  // Handle disconnection
  port.onDisconnect.addListener(() => {
    console.log("Port disconnected:", port.name);
    connectionClients.delete(port.name);
  });
});

async function callOpenAI(message, port){
    try {
        const apiUrl =  "https://api.openai.com/v1/chat/completions";
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: message.request
                }],
                temperature: message.temperature || 0.7,
                max_tokens: message.max_tokens || 1000
            })
        })        
        const data = await response.json()
        console.log("Server response", data);
        // Send response to the port
        port.postMessage({
            kind: "completionResponse",
            response: data,
            requestId: message.requestId
        })

    } catch (error){
        console.error("Error calling API", error);
        port.postMessage({
            kind: "completionError",
            error: error.message,
            requestId: message.requestId
        });
    }
}