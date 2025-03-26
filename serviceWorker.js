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
    // console.log("Message received on port:", port.name, message);

    if (message.kind === "getCompletions"){
        callOpenAI(message, port)
            .then(completionResponse => {
                const response = {
                    kind: "getCompletions", // Note: should match what script.js expects
                    response: completionResponse,
                    requestId: message.requestId
                }
                // console.log("Completion response:", response); // 
                // firing off a Completion response.  response.choices.0.message.content = 'chase after a pointer and pounce'
                // Completion response: { kind: 'getCompletions', response: { ... }, requestId: 1n }
                // response
                // : 
                // choices
                // : 
                // 0
                // : 
                // message
                // : 
                // {role: 'assistant', content: 'chase after the laser pointer and pounce on anything that moves.', refusal: null, annotations: Array(0)}

                port.postMessage(response);
            })
            .catch(error => {
                console.error("Error in completion:", error);
            });
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
        const system_prompt = "You are a word class Veterinary in Emergency room setting.  You are typing  Subjective, Objective, Assessment, and Plan notes.  Your job is to predict the most logical text that should be written at the location of the <mask/>. You should complete the end of words, especially for long medical terminology.  Your answer can be a single word, or multiple sentences. If the <mask/> is in the middle of a word, you should make suggestions that will complete that word If the <mask/> is in the middle of a partial sentence, your answer should go as far as the next 5 or 6 words that you think should complete the sentence . You are not allowed to have any overlapping text directly surrounding the <mask/>.  Your answer must be in the same language as the text directly surrounding the <mask/>. Your response must include two parts: THOUGHT and ANSWER.  Your response must have the following format: \n THOUGHT: here, you reason about the answer; use the 80/20 principle to be brief. Use at most 20 words here. \n ANSWER: here, you write the text that should be at the location of <mask/>.  \n \n \n The <mask/> is located in a paragraph. Your answer must complete this paragraph or sentence in a way that fits the surrounding text without overlapping with it. It must be in the same language as the paragraph.";
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "ft:gpt-4o-mini-2024-07-18:personal::B4Yni8zt",
                messages: [{
                    role: "system",
                    content: system_prompt
                }, {
                    role: "user",
                    content: message.request
                }],
                temperature: message.temperature || 0.1,
                // max_tokens: message.max_tokens || 1000
                max_tokens: 100
            })
        })        
        const data = await response.json()
        console.log("Server response serviceWorker", data);
        // Send response to the port
        return data;


    } catch (error){
        console.error("Error calling API", error);
        port.postMessage({
            kind: "completionError",
            error: error.message,
            requestId: message.requestId
        });
    }
}



