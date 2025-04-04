(() => {
    "use strict";
    
    
    const EditorPlatform = {
        UNSPECIFIED: 0,
        COLAB: 1,        // Google Colab
        STACKBLITZ: 2,   // StackBlitz online IDE
        DEEPNOTE: 3,     // Deepnote notebook platform
        DATABRICKS: 4,   // Databricks notebook
        QUADRATIC: 5,    // Quadratic computational notebook
        CUSTOM: 6        // Custom/other Monaco implementations
    };
  
    // Function to get the language ID of an editor model
    function getLanguageId(editorModel) {
        return void 0 !== editorModel.getLanguageIdentifier ? editorModel.getLanguageIdentifier().language : editorModel.getLanguageId()
    }

    // Class representing a completion service client
    class CompletionServiceClient {
        // Initialize the client with a unique session ID and request ID
        sessionId = generateSessionId(); 
        requestId = 0;
        promiseMap = new Map;

        // Constructor to initialize the client with an extension ID
        constructor(extensionId) {
            this.extensionId = extensionId;
            this.port = this.createPort();
        }
        // Step 1 - Send request to Chrome Extension
        async getCompletions(completionRequest) {
            // Get request ID
            const currentRequestId = Number(completionRequest.metadata?.requestId),
                // Create a promise to handle the async response
                responsePromise = new Promise((resolve => {
                    this.promiseMap.set(currentRequestId, resolve)
                })),
                // Create a message to send to the Chrome extension
                message = {
                    kind: "getCompletions",
                    requestId: currentRequestId,
                    request: completionRequest.toJsonString()
                };

            // Send the message to the Chrome extension and return the response promise
            this.port.postMessage(message);
            return responsePromise;
        }
        
        // Method to create a port for communication with the Chrome extension
        createPort() {
            // Create a port with the extension ID and session ID
            const chromePort = chrome.runtime.connect(this.extensionId, {
                name: this.sessionId
            });
            
            // Handle port reconnection
            chromePort.onDisconnect.addListener(() => {
                this.port = this.createPort();
            });
            
            // Step 2 - Handle responses
            chromePort.onMessage.addListener(async message => {
                if ("getCompletions" === message.kind) {
                    let completionResponse = undefined;
                    
                    // Parse the response if it exists
                    if (message.response !== undefined) {
                        completionResponse = CompletionResponse.fromJsonString(message.response);
                    }
                    
                    // Get the promise resolver for this request and call it if it exists
                    const promiseResolver = this.promiseMap.get(message.requestId);
                    if (promiseResolver) {
                        promiseResolver(completionResponse);
                    }
                    
                    // Clean up the promise map
                    this.promiseMap.delete(message.requestId);
                }
            });
            
            return chromePort;
        }

        // Method to send an accept completion message to the Chrome extension
        acceptedLastCompletion(ideInfo, completionId) {
            const message = {
                kind: "acceptCompletion",
                request: new CompletionAcceptRequest({
                    metadata: this.getMetadata(ideInfo),
                    completionId: completionId
                }).toJsonString()
            };
            this.port.postMessage(message)
        }

        // Method to get metadata for a request
        getMetadata(ideInfo) {
            return new MetadataRequest({
                ideName: ideInfo.ideName,
                ideVersion: ideInfo.ideVersion,
                extensionName: "chrome",
                extensionVersion: "1.26.3",
                locale: navigator.language,
                sessionId: this.sessionId,
                requestId: BigInt(++this.requestId),
                userAgent: navigator.userAgent,
                url: window.location.href
            })
        }
    }

    // Class representing a text range
    class TextRange {
        constructor(startPos, endPos) {
            this.startLineNumber = startPos.lineNumber, 
            this.startColumn = startPos.column, 
            this.endLineNumber = endPos.lineNumber, 
            this.endColumn = endPos.column
        }
    }
  
    // Function to get encoded editor content
    function getEncodedEditorContent(e, t) {
        const n = "string" == typeof t ? t : t.getValue();
        if (e !== EditorPlatform.DATABRICKS || !n.startsWith("%")) return {
            value: n,
            utf16Offset: 0
        };
        const r = n.indexOf("\n"),
            a = -1 === r ? n.length : r + 1;
        return {
            value: n.substring(a),
            utf16Offset: a
        }
    }
  
    // Function to get the relative path of a file
    function _E() {
        const e = window.colab?.global.notebookModel.fileId;
        if (void 0 !== e) {
            if ("drive" === e.source) {
                let t = e.fileId;
                return t = t.replace(/^\//, ""), `${t}.ipynb`
            }
            return e.fileId.replace(/^\//, "")
        }
    }

    // Class representing a Monaco completion provider
    class MonacoCompletionProvider {
        // Initialize the provider with a map of model URIs to editors
        modelUriToEditor = new Map;

        // Constructor to initialize the provider with an extension ID, Monaco site, and debounce time
        constructor(extensionId, monacoSite, debounceMs) {
            this.extensionId = extensionId, 
            this.monacoSite = monacoSite, 
            this.client = new CompletionServiceClient(extensionId), 
            this.debounceMs = debounceMs
        }

        // Method to provide inline completions for an editor
        async provideInlineCompletions(editor, cursorPosition) { 
            // editor is monaco editor
            // insert easter egg:
            const currentText = editor.getValue();
            if (currentText.startsWith("My cat is")) {
                // Return custom completion
                const startPos = editor.getPositionAt(currentText.length);
                const endPos = startPos;
                return {
                    items: [{
                        insertText: " a madhouse, from mee mee",
                        text: " a madhouse, from Atheus",
                        range: new TextRange(startPos, endPos),
                        command: {
                            id: "codeium.acceptCompletion",
                            title: "Accept Completion",
                            arguments: ["easter-egg-completion", undefined]
                        }
                    }]
                };
            }
            // end easter egg:       
            
            // 1. Get text context and cursor position
              const {
                  text: documentText,
                  utf8ByteOffset: byteOffset,
                  additionalUtf8ByteOffset: additionalOffset
              } = this.computeTextAndOffsets(editor, cursorPosition),
              
              // 2. Create completion request     
              totalByteOffset = additionalOffset + byteOffset,
              completionRequest = new Pu({
                  metadata: this.client.getMetadata(this.getIdeInfo()),
                  document: {
                      text: documentText,
                      editorLanguage: getLanguageId(editor),
                      language: oE(getLanguageId(editor)),
                      cursorOffset: BigInt(totalByteOffset),
                      lineEnding: "\n",
                      absoluteUri: "file:///" + this.absolutePath(editor)
                  },
                  editorOptions: {
                      tabSize: BigInt(editor.getOptions().tabSize),
                      insertSpaces: editor.getOptions().insertSpaces
                  }
              });
              
            // 3.  Wait for debounce
              var debounceTimeMs;
              await (debounceTimeMs = this.debounceMs ?? 0, new Promise((resolve => setTimeout(resolve, debounceTimeMs))));
            // 4. Get completions from server
              const completionResponse = await this.client.getCompletions(completionRequest); // this will be a CSC method, which is koher because we already have a CSC client (see constructor)
              if (void 0 === completionResponse) return;
            // 5. Transform completions into Monaco format  
            const monacoCompletions = completionResponse.completionItems.map((completionItem) => {
                // This function transforms each completionItem into Monaco's expected format
                function transformToMonacoFormat(monacoSite, completionItem, editor, offset, editorInstance) {
                    // Skip if there's no completion or range
                  if (!completionItem.completion || !completionItem.range) return;
                    
                    // Calculate position of ghost text
                  const {
                      value: textValue,
                      utf16Offset: utf160offset
                    } = getEncodedEditorContent(monacoSite, editor);
                    
                    // Calculate start and end positions for the completion
                    const startPosition = editor.getPositionAt(
                        utf160offset + calculateTextWidth(textValue, Number(completionItem.range.startOffset) - offset)
                    );
                    
                    const endPosition = editor.getPositionAt(
                        utf160offset + calculateTextWidth(textValue, Number(completionItem.range.endOffset) - offset)
                    );
                    
                    const completionRange = new TextRange(startPosition, endPosition);
                    
                    // Handle completion text and any suffix
                    let postCompletionCallback;
                    let completionText = completionItem.completion.text;
                    
                    // Add suffix text if available and set up post-completion cursor positioning
                  if (editorInstance && completionItem.suffix && completionItem.suffix.text.length > 0) {
                      completionText += completionItem.suffix.text;
                      const cursorOffset = Number(completionItem.suffix.deltaCursorOffset);
                      postCompletionCallback = () => {
                          const selection = editorInstance.getSelection();
                          if (null === selection) return void console.warn("Unexpected, no selection");
                            
                            const newCursorPosition = editor.getPositionAt(
                                editor.getOffsetAt(selection.getPosition()) + cursorOffset
                            );
                            
                            editorInstance.setSelection(new TextRange(newCursorPosition, newCursorPosition));
                            editorInstance._commandService.executeCommand("editor.action.inlineSuggest.trigger");
                        };
                  }
                    
                    // Return in Monaco format
                  return {
                      insertText: completionText,
                      text: completionText,
                      range: completionRange,
                      command: {
                          id: "codeium.acceptCompletion",
                          title: "Accept Completion",
                          arguments: [completionItem.completion.completionId, postCompletionCallback]
                      }
                    };
                }
                
                return transformToMonacoFormat(
                    this.monacoSite,
                    completionItem,
                    editor,
                    additionalOffset,
                    this.modelUriToEditor.get(editor.uri.toString())
                );
            }).filter((item) => item !== undefined);

            // Send success message back to extension
            chrome.runtime.sendMessage(this.extensionId, {
                  type: "success"
            });

            // Return the formatted completions
            return {
                  items: monacoCompletions
            };
        }

        // Method to get IDE information
        getIdeInfo() {
            return void 0 !== window.colab ? {
                ideName: "colab",
                ideVersion: window.colabVersionTag ?? "unknown"
            } : {
                ideName: "monaco",
                ideVersion: `unknown-${window.location.hostname}`
            }
        }

        // Method to get text models for an editor
        textModels(e) {
            if (this.monacoSite === EditorPlatform.COLAB) return [...window.colab?.global.notebookModel.singleDocument.models ?? []];
            if (this.monacoSite === EditorPlatform.DEEPNOTE) {
                const t = e.uri.toString().split(":")[0],
                    n = [];
                for (const [e, r] of this.modelUriToEditor) e.toString().split(":")[0] === t && n.push(r);
                return n.sort(((e, t) => (e.getDomNode()?.getBoundingClientRect().top ?? 0) - (t.getDomNode()?.getBoundingClientRect().top ?? 0))), n.map((e => e.getModel())).filter((e => null !== e))
            }
            return []
        }

        // Method to get the relative path of a file
        relativePath() {
            if (this.monacoSite === EditorPlatform.COLAB) return _E();
            const currentUrl = window.location.href;
            return this.monacoSite === EditorPlatform.DEEPNOTE || this.monacoSite === EditorPlatform.DATABRICKS ? function(url) {
                const filename = url.split("/").pop();
                if (void 0 !== filename) return `${filename}.ipynb`
            }(currentUrl) : void 0
        }

        // Method to check if the editor is a notebook
        isNotebook() {
            return EditorPlatform.COLAB === this.monacoSite || EditorPlatform.DATABRICKS === this.monacoSite || EditorPlatform.DEEPNOTE === this.monacoSite
        }

        // Method to get the absolute path of a file
        absolutePath(e) {
            return this.monacoSite === EditorPlatform.COLAB ? _E() : e.uri.path.replace(/^\//, "")
        }

        // Method to compute text and offsets for an editor
        computeTextAndOffsets(e, t) {
          // Specifically handle Databricks environment  
          if (this.monacoSite === EditorPlatform.DATABRICKS) {
                const commands = (window.notebook?.commandCollection().models ?? []).filter((e => "command" === e.attributes.type));
                if (0 !== commands.length) {
                    const modelMap = new Map;
                    for (const editor of this.modelUriToEditor.values()) {
                        const model = editor.getModel();
                        if (null === model) continue;
                        const content = getEncodedEditorContent(this.monacoSite, model).value;
                        modelMap.set(content, model)
                    }
                    const a = [...commands];
                    a.sort(((e, t) => e.attributes.position - t.attributes.position));
                    const i = a.map((e => e.attributes.command)),
                        s = e.getValue();
                    let bestMatchPrefix, bestMatchSuffix;
                    for (const [e, t] of i.entries()) s.startsWith(t) && (void 0 === bestMatchPrefix || t.length > bestMatchPrefix.length) && (bestMatchPrefix = {
                        idx: e,
                        length: t.length
                    }), t.startsWith(s) && (void 0 === bestMatchSuffix || t.length < bestMatchSuffix.length) && (bestMatchSuffix = {
                        idx: e,
                        length: t.length
                    });
                    void 0 !== bestMatchPrefix ? i[bestMatchPrefix.idx] = s : void 0 !== bestMatchSuffix && (i[bestMatchSuffix.idx] = s);
                    const c = getEncodedEditorContent(this.monacoSite, e);
                    return $d({
                        isNotebook: this.isNotebook(),
                        textModels: i.map((e => getEncodedEditorContent(this.monacoSite, e).value)),
                        currentTextModel: c.value,
                        utf16CodeUnitOffset: e.getOffsetAt(t) - c.utf16Offset,
                        getText: e => e,
                        getLanguage: (e, t) => {
                            const n = modelMap.get(e);
                            return void 0 !== n ? oE(getLanguageId(n)) : (void 0 !== t && (e = i[t]), e.startsWith("%sql") ? Qe.SQL : e.startsWith("%r") ? Qe.R : e.startsWith("%python") ? Qe.PYTHON : e.startsWith("%md") ? Qe.MARKDOWN : e.startsWith("%scala") ? Qe.SCALA : Qe.UNSPECIFIED)
                        }
                    })
                }
            }
            if (this.monacoSite === EditorPlatform.COLAB) {
                const n = window.colab?.global.notebookModel.cells,
                    r = [],
                    a = new Map;
                for (const e of n ?? []) {
                    let t = e.textModel.getValue();
                    if ("code" === e.type) {
                        if (void 0 !== e.outputs.currentOutput && e.outputs.currentOutput.outputItems.length > 0) {
                            const n = e.outputs.currentOutput.outputItems[0].data;
                            void 0 !== n && (void 0 !== n["text/plain"] ? t = t + "\nOUTPUT:\n" + n["text/plain"].join() : void 0 !== n["text/html"] && (t = t + "\nOUTPUT:\n" + n["text/html"].join()))
                        }
                        a.set(t, oE(getLanguageId(e.textModel)))
                    }
                    r.push(t)
                }
                const i = getEncodedEditorContent(this.monacoSite, e);
                return $d({
                    isNotebook: this.isNotebook(),
                    textModels: r.map((e => getEncodedEditorContent(this.monacoSite, e).value)),
                    currentTextModel: i.value,
                    utf16CodeUnitOffset: e.getOffsetAt(t) - i.utf16Offset,
                    getText: e => e,
                    getLanguage: e => a.get(getEncodedEditorContent(this.monacoSite, e).value) ?? Qe.UNSPECIFIED
                })
            }
            return $d({
                isNotebook: this.isNotebook(),
                textModels: this.textModels(e),
                currentTextModel: e,
                utf16CodeUnitOffset: e.getOffsetAt(t) - getEncodedEditorContent(this.monacoSite, e).utf16Offset,
                getText: e => getEncodedEditorContent(this.monacoSite, e).value,
                getLanguage: e => oE(getLanguageId(e))
            })
        }
        
        // Method to handle item did show
        handleItemDidShow() {}

        // Method to free inline completions
        freeInlineCompletions() {}

        // Method to add an editor to the provider
        addEditor(editor) {
          // Enable inline suggestions except for Databricks 
            this.monacoSite !== EditorPlatform.DATABRICKS && editor.updateOptions({
                inlineSuggest: {
                    enabled: !0
                }
            });
            // Track editor instance by their URI
            const editorUri = editor.getModel()?.uri.toString();
            var n;
            void 0 !== editorUri && this.modelUriToEditor.set(editorUri, editor), 
            // Update tracking when editor model changes
            editor.onDidChangeModel((modelChange => {
                const oldUri = modelChange.oldModelUrl?.toString();
                void 0 !== oldUri && this.modelUriToEditor.delete(oldUri);
                const newUri = modelChange.newModelUrl?.toString();
                void 0 !== newUri && this.modelUriToEditor.set(newUri, editor)
            })), 
            // Special handling for DeepNote
            this.monacoSite === EditorPlatform.DEEPNOTE && (editor.onKeyDown = (n = editor.onKeyDown, function(e, t) {
                n.call(this, function(e) {
                    return function(t) {
                        if ("Tab" !== t.browserEvent.key) return e(t)
                    }
                }(e), t)
            }))
        }

        // Method to accept the last completion
        async acceptedLastCompletion(e) {
            await this.client.acceptedLastCompletion(this.getIdeInfo(), e)
        }
    }

    // https://claude.ai/chat/e4c8a458-ec36-4b91-b1b4-8d7a0bc02dd6 for variable name recommendations - athensDOTfitzcheungATgmail
    
    // Get the extension ID from the script URL
    const extensionId = new URLSearchParams(document.currentScript.src.split("?")[1]).get("id");
    
    // Define debounce time for completion requests
    const debounceMs = 0;
    
    // Map of URL patterns to editor platforms
    const mapUrlToPlatform = new Map([
        [/https:\/\/colab.research\.google\.com\/.*/, EditorPlatform.COLAB],
        [/https:\/\/(.*\.)?stackblitz\.com\/.*/, EditorPlatform.STACKBLITZ],
        [/https:\/\/(.*\.)?deepnote\.com\/.*/, EditorPlatform.DEEPNOTE],
        [/https:\/\/(.*\.)?(databricks\.com|azuredatabricks\.net)\/.*/, EditorPlatform.DATABRICKS],
        [/https:\/\/(.*\.)?quadratichq\.com\/.*/, EditorPlatform.QUADRATIC]
    ]);
    
    // Function to set up the Monaco environment
    const setupMonacoEnvironment = debounceMs => Object.defineProperties(window, {
        MonacoEnvironment: {
            get() {
                return void 0 === this._codeium_MonacoEnvironment && (this._codeium_MonacoEnvironment = {
                    globalAPI: !0
                }), this._codeium_MonacoEnvironment
            },
            set(e) {
                void 0 !== e && (e.globalAPI = !0), this._codeium_MonacoEnvironment = e
            }
        },
        monaco: {
            get() {
                return this._ghostText_monaco
            },
            set(monacoInstance) {
                let monacoSite = EditorPlatform.CUSTOM;
                for (const [e, t] of mapUrlToPlatform)
                    if (e.test(window.location.href)) {
                        monacoSite = t;
                        break
                    } this._ghostText_monaco = monacoInstance;  
                const ghostTextProvider = new MonacoCompletionProvider(extensionId, monacoSite, debounceMs); 
                monacoInstance?.languages?.registerInlineCompletionsProvider && setTimeout((() => {
                    monacoInstance.languages.registerInlineCompletionsProvider({
                        pattern: "**"
                    }, ghostTextProvider);
                    
                    monacoInstance.editor.registerCommand("codeium.acceptCompletion", ((e, t, n, a) => {
                        a?.(), ghostTextProvider.acceptedLastCompletion(n).catch((e => {
                            console.error(e)
                        }))
                    }));
                    
                    monacoInstance.editor.onDidCreateEditor((e => {
                        ghostTextProvider.addEditor(e)
                    })), console.log("Codeium: Activated Monaco")
                }))
            }
        }
    });

    // Notify the extension that the script loaded successfully
    chrome.runtime.sendMessage(extensionId, {
        type: "success"
    });

    // Set up the Monaco environment
    setupMonacoEnvironment(debounceMs);
  })();