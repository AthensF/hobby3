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
  
    // Class to represent a text range in the editor
    class TextRange {
      constructor(startPos, endPos) {
        this.startLineNumber = startPos.lineNumber;
        this.startColumn = startPos.column;
        this.endLineNumber = endPos.lineNumber;
        this.endColumn = endPos.column;
      }
    }
  
    // Constants for editor platforms
    const EditorPlatform = {
      UNSPECIFIED: 0,
      COLAB: 1,
      CUSTOM: 2
    };
  
    // Class that provides ghost text completions
    class GhostTextProvider {
      sessionId = this.generateSessionId();
    //   promiseMap = new Map();
      constructor(extensionId) {
        this.extensionId = extensionId;
        this.port = this.createPort();
        
        // Detect which platform we're on
        this.editorPlatform = EditorPlatform.UNSPECIFIED;
        if (/https:\/\/colab.research\.google\.com\/.*/.test(window.location.href)) {
          this.editorPlatform = EditorPlatform.COLAB;
        }
        
        // Send a test message
        this.sendTestMessage();
      }
      
      // Generate a unique session ID - note that this does not exist in the ref files
      generateSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15);
      }
      
      // STEP 1: Create a port connection to the service worker
      createPort() {
        const chromePort = chrome.runtime.connect(this.extensionId, {
          name: this.sessionId
        });
        
        // Handle port disconnection
        chromePort.onDisconnect.addListener(() => {
          console.log("Port disconnected, reconnecting...");
          this.port = this.createPort();
        });
        // STEP 2: Service worker should receive message .....
        // Handle messages from service worker
        chromePort.onMessage.addListener((message) => {
          console.log("Received message from service worker:", message);
        });
        
        return chromePort;
      }
      
      // Send a test message to the service worker
      sendTestMessage() {
        const message = {
          kind: "test",
          content: "foobar"
        };
        console.log("Sending test message to service worker");
        this.port.postMessage(message);
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
        
        // No suggestion for other text
        return { items: [] };
      }
      
      freeInlineCompletions() {
        // can I just do this?
        console.log("Freeing inline completions");
        return;
        // yes i can!
      } 
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
      }
    }

    // Class that provides Comple
  
    // Patch the Monaco environment to add our ghost text provider
    Object.defineProperties(window, {
      monaco: {
        get() {
          return this._ghostText_monaco;
        },
        set(monacoInstance) {
          // Store the monaco instance
          this._ghostText_monaco = monacoInstance;
          
          // Create our ghost text provider
          const ghostTextProvider = new GhostTextProvider(extensionId);
          
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