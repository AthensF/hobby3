/**
 * Simple Colab Ghost Text
 * 
 * This script provides ghost text suggestions in Google Colab notebooks.
 * It's a simplified version extracted from a more complex codebase for learning purposes.
 */

(function() {
    "use strict";  
    // Get the extension ID from the URL parameters
    const extensionId = new URLSearchParams(document.currentScript.src.split("?")[1]).get("id");

    chrome.runtime.sendMessage(extensionId, {
      type: "success"
    });
  
    // Define editor platforms
    const EditorPlatform = {
      UNSPECIFIED: "unspecified",
      COLAB: "colab"
    };

    // Define text range class for editor positions
    class TextRange {
      constructor(startPos, endPos) {
        this.startLineNumber = startPos.lineNumber;
        this.startColumn = startPos.column;
        this.endLineNumber = endPos.lineNumber;
        this.endColumn = endPos.column;
      }
    }

    // Class that handles communication with the service worker
    class CompletionServiceClient {
      sessionId = this.generateSessionId();
      promiseMap = new Map();
      requestId = 0;
      
      constructor(extensionId) {
        this.extensionId = extensionId;
        this.port = this.createPort();
      }
      
      // Generate a unique session ID
      generateSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15);
      }
      
      // Create a port connection to the service worker
      createPort() {
        const chromePort = chrome.runtime.connect(this.extensionId, {
          name: this.sessionId
        });
        
        // Handle port disconnection
        chromePort.onDisconnect.addListener(() => {
          console.log("Port disconnected, reconnecting...");
          this.port = this.createPort();
        });
        
        // Handle messages from service worker
        chromePort.onMessage.addListener((message) => {
          
          if (message.kind === "getCompletions") {
            const resolve = this.promiseMap.get(message.requestId);
            if (resolve) {
              resolve(message.response); //completionResponse, returned back to Promise requester
              this.promiseMap.delete(message.requestId);
            }
            // console.log("Completion response at CSC:", message.response); // this is coming back
          }
        });
        
        return chromePort;
      }
      
      // Send a test message to the service worker
    //   sendTestMessage(content) {
    //     const message = {
    //       kind: "test",
    //       content: content,
    //       sessionId: this.sessionId          
    //     };
    //     console.log("Sending test message to service worker");
    //     this.port.postMessage(message);
    //   }
      
      // Send a completion request to the service worker
      async getCompletions(completionRequest) {
        const currentRequestId = ++this.requestId;
        
        // Create promise to handle async response
        const responsePromise = new Promise(resolve => {
          this.promiseMap.set(currentRequestId, resolve);
        });
        
        // Create message to service worker
        const message = {
          kind: "getCompletions",
          requestId: currentRequestId,
          sessionId: this.sessionId,
          request: typeof completionRequest === 'string' ? completionRequest : completionRequest.toJsonString()
        };        
        
        // Send message through Chrome port
        this.port.postMessage(message);
        return responsePromise;
      }
      
      // Notify service worker that a completion was accepted
      acceptedCompletion(completionId) {
        const message = {
          kind: "acceptCompletion",
          completionId: completionId
        };
        this.port.postMessage(message);
      }
    }

    // Class that integrates with the Monaco editor
    class MonacoCompletionProvider {
      constructor(extensionId) {
        this.client = new CompletionServiceClient(extensionId);
        
        // Detect which platform we're on
        this.editorPlatform = EditorPlatform.UNSPECIFIED;
        if (/https:\/\/colab.research\.google\.com\/.*/.test(window.location.href)) {
          this.editorPlatform = EditorPlatform.COLAB;
        }
        
        // Send test messages
        // this.client.sendTestMessage("foo");

      }
      
      // Provide inline completions for the editor
      async provideInlineCompletions(editor, cursorPosition) {
        // Get the current text in the editor
        const currentText = editor.getValue();
        
        // Check if the text matches our trigger phrase
        if (currentText.startsWith("My cat is")) {
          // Return our hardcoded ghost text suggestion
          const startPos = editor.getPositionAt(currentText.length);
          const endPos = startPos;
          
          return {
            items: [{
              insertText: " a madhouse",
              text: " a madhouse",
              range: new TextRange(startPos, endPos),
              command: {
                id: "ghostText.acceptCompletion",
                title: "Accept Completion",
                arguments: ["hardcoded-completion", undefined]
              }
            }]
          };
        }        
                  
        // Create a simple completion request with the current text
        const completionRequest = currentText;
        const completionResponse = await this.client.getCompletions(completionRequest);
        console.log("Completion response at PIC:", completionResponse);
        
        // If no completion response, return empty items
        if (!completionResponse) {
          return { items: [] };
        }
        
        // Transform the completion response into Monaco format
        const monacoCompletions = [];
        
        try {
          // Extract completion text from the OpenAI response structure
          let completionText = '';
          
          // Check if we have the expected OpenAI response structure
            
            
            // Extract the completion text from the OpenAI response
            completionText = completionResponse.choices[0].message.content;
            console.log("Extracted completion text:", completionText);
            
            // Get the current cursor position
            const startPos = cursorPosition || editor.getPosition();
            const endPos = startPos;
            
            // Create a completion item in Monaco format
            const monacoCompletion = {
              insertText: completionText,
              text: completionText,
              range: new TextRange(startPos, endPos),
              command: {
                id: "ghostText.acceptCompletion",
                title: "Accept Completion",
                arguments: ["openai-completion", undefined]
              }
            };
            
            monacoCompletions.push(monacoCompletion);
          
        } catch (error) {
          console.error("Error processing completion response:", error);
        }
        
        // Return the formatted completions
        return {
          items: monacoCompletions
        };
      }
      
      freeInlineCompletions() {}
  
      // Called when an editor is added
      addEditor(editor) {
        // Enable inline suggestions
        editor.updateOptions({
          inlineSuggest: {
            enabled: true
          }
        });
      }
      
      // Called when a completion is accepted
      async acceptedCompletion(completionId) {
        console.log(`Completion accepted: ${completionId}`);
        await this.client.acceptedCompletion(completionId);
      }
    }

    // Patch the Monaco environment to add our ghost text provider
    // see setupMonacoEnvironment in script-learn
    Object.defineProperties(window, {
      monaco: {
        get() {
          return this._ghostText_monaco;
        },
        set(monacoInstance) {
          // Store the monaco instance
          this._ghostText_monaco = monacoInstance;
          
          // Create our ghost text provider
          const ghostTextProvider = new MonacoCompletionProvider(extensionId);
          // Check if the monaco property exists and if it's configurable
     

          
          // Register the provider with Monaco
          if (monacoInstance?.languages?.registerInlineCompletionsProvider) {
            setTimeout(() => {
              // Register for all file types - Do not remove
              monacoInstance.languages.registerInlineCompletionsProvider({
                pattern: "**"
              }, ghostTextProvider);
              
              // Register command to handle accepting completions
              monacoInstance.editor.registerCommand("ghostText.acceptCompletion", (_, __, completionId, callback) => {
                if (callback) {
                  callback();
                }
                ghostTextProvider.acceptedCompletion(completionId).catch(error => {
                  console.error(error);
                });
              });
              
              // Add our provider to all editors
              monacoInstance.editor.onDidCreateEditor((editor) => {
                ghostTextProvider.addEditor(editor);
              });
              
              console.log("Ghost Text: Activated for Monaco editor");
            });
          }
        }
      }
    });
  })();
