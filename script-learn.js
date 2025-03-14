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
  
    function getLanguageId(editorModel) {
        return void 0 !== editorModel.getLanguageIdentifier ? editorModel.getLanguageIdentifier().language : editorModel.getLanguageId()
    }
    class CompletionServiceClient {
        sessionId = generateSessionId(); //generate unique session ID
        requestId = 0;
        promiseMap = new Map;
        constructor(extensionId) {
            this.extensionId = extensionId;
            this.port = this.createPort();
        }
        createPort() {
            const chromePort = chrome.runtime.connect(this.extensionId, {
                name: this.sessionId
            });
            // Handle port reconnection
            return chromePort.onDisconnect.addListener((() => {
                this.port = this.createPort()
            })), 
            // Handle responses
            chromePort.onMessage.addListener((async message => {
                if ("getCompletions" === message.kind) {
                    let completionResponse;
                    void 0 !== message.response && (completionResponse = CompletionResponse.fromJsonString(message.response)), this.promiseMap.get(message.requestId)?.(completionResponse), this.promiseMap.delete(message.requestId)
                }
            })), chromePort
        }
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
        async getCompletions(completionRequest) {
            // Get request ID
            const currentRequestId = Number(completionRequest.metadata?.requestId),
                // Create promise to handlye async
                responsePromise = new Promise((resolve => {
                    this.promiseMap.set(currentRequestId, resolve)
                })),
                // Create message to Chrome Extension
                message = {
                    kind: "getCompletions",
                    requestId: currentRequestId,
                    request: completionRequest.toJsonString()
                };
            return this.port.postMessage(message), responsePromise //send message through Chrome port
        }
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
    }
    class TextRange {
        constructor(startPos, endPos) {
            this.startLineNumber = startPos.lineNumber, this.startColumn = startPos.column, this.endLineNumber = endPos.lineNumber, this.endColumn = endPos.column
        }
    }
  
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
    class MonacoCompletionProvider {
        modelUriToEditor = new Map;
        constructor(extensionId, monacoSite, debounceMs) {
            this.extensionId = extensionId, 
            this.monacoSite = monacoSite, 
            this.client = new CompletionServiceClient(extensionId), 
            this.debounceMs = debounceMs
        }
        getIdeInfo() {
            return void 0 !== window.colab ? {
                ideName: "colab",
                ideVersion: window.colabVersionTag ?? "unknown"
            } : {
                ideName: "monaco",
                ideVersion: `unknown-${window.location.hostname}`
            }
        }
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
        relativePath() {
            if (this.monacoSite === EditorPlatform.COLAB) return _E();
            const currentUrl = window.location.href;
            return this.monacoSite === EditorPlatform.DEEPNOTE || this.monacoSite === EditorPlatform.DATABRICKS ? function(url) {
                const filename = url.split("/").pop();
                if (void 0 !== filename) return `${filename}.ipynb`
            }(currentUrl) : void 0
        }
        isNotebook() {
            return EditorPlatform.COLAB === this.monacoSite || EditorPlatform.DATABRICKS === this.monacoSite || EditorPlatform.DEEPNOTE === this.monacoSite
        }
        absolutePath(e) {
            return this.monacoSite === EditorPlatform.COLAB ? _E() : e.uri.path.replace(/^\//, "")
        }
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
          // fluffy replacement
          if (currentText.startsWith("Fluffy has g")) {
              // Return custom completion
              const startPos = editor.getPositionAt(currentText.length);
              const endPos = startPos;
              return {
                  items: [{
                      insertText: "under development",
                      text: "under development",
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
            var o;
            await (o = this.debounceMs ?? 0, new Promise((e => setTimeout(e, o))));
          // 4. Get completions from server
            const completionResponse = await this.client.getCompletions(completionRequest);
            if (void 0 === completionResponse) return;
          // 5. Transform completions into Monaco format  
            const monacoCompletions = completionResponse.completionItems.map((completionItem => function(monacoSite, completionItem, editor, offset, editorInstance) {
                if (!completionItem.completion || !completionItem.range) return;
              //   position of ghost text
                const {
                    value: textValue,
                    utf16Offset: utf160offset
                } = getEncodedEditorContent(monacoSite, editor), 
                startPosition = editor.getPositionAt(utf160offset + calculateTextWidth(textValue, Number(completionItem.range.startOffset) - offset)), 
                endPosition = editor.getPositionAt(utf160offset + calculateTextWidth(textValue, Number(completionItem.range.endOffset) - offset)), 
                completionRange = new TextRange(startPosition, endPosition);
                //   handle completion text and any suffix
                let postCompletionCallback, completionText = completionItem.completion.text;
                if (editorInstance && completionItem.suffix && completionItem.suffix.text.length > 0) {
                    completionText += completionItem.suffix.text;
                    const cursorOffset = Number(completionItem.suffix.deltaCursorOffset);
                    postCompletionCallback = () => {
                        const selection = editorInstance.getSelection();
                        if (null === selection) return void console.warn("Unexpected, no selection");
                        const newCursorPosition = editor.getPositionAt(editor.getOffsetAt(selection.getPosition()) + cursorOffset);
                        editorInstance.setSelection(new TextRange(newCursorPosition, newCursorPosition)), editorInstance._commandService.executeCommand("editor.action.inlineSuggest.trigger")
                    }
                }
                // return in Monaco format
                return {
                    insertText: completionText,
                    text: completionText,
                    range: completionRange,
                    command: {
                        id: "codeium.acceptCompletion",
                        title: "Accept Completion",
                        arguments: [completionItem.completion.completionId, postCompletionCallback]
                    }
                }
            }(this.monacoSite, completionItem, editor, additionalOffset, this.modelUriToEditor.get(editor.uri.toString())))).filter((e => void 0 !== e));
            return chrome.runtime.sendMessage(this.extensionId, {
                type: "success"
            }), {
                items: monacoCompletions
            }
        }
      //   
        handleItemDidShow() {}
        freeInlineCompletions() {}
      // actual handling of inline suggest feature
        addEditor(editor) {
          // Enable inline suggestions except for Databricks 
            this.monacoSite !== EditorPlatform.DATABRICKS && editor.updateOptions({
                inlineSuggest: {
                    enabled: !0
                }
            });
            //Track editor instance by their URI
            const editorUri = editor.getModel()?.uri.toString();
            var n;
            void 0 !== editorUri && this.modelUriToEditor.set(editorUri, editor), 
            //update tracking when editor model changes
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
        async acceptedLastCompletion(e) {
            await this.client.acceptedLastCompletion(this.getIdeInfo(), e)
        }
    }
    const EE = new URLSearchParams(document.currentScript.src.split("?")[1]).get("id");
    
    // Notify the extension that the script loaded successfully
    chrome.runtime.sendMessage(EE, {
        type: "success"
    });
    const TE = new Map([
            [/https:\/\/colab.research\.google\.com\/.*/, EditorPlatform.COLAB],
            [/https:\/\/(.*\.)?stackblitz\.com\/.*/, EditorPlatform.STACKBLITZ],
            [/https:\/\/(.*\.)?deepnote\.com\/.*/, EditorPlatform.DEEPNOTE],
            [/https:\/\/(.*\.)?(databricks\.com|azuredatabricks\.net)\/.*/, EditorPlatform.DATABRICKS],
            [/https:\/\/(.*\.)?quadratichq\.com\/.*/, EditorPlatform.QUADRATIC]
        ]),
        fE = e => Object.defineProperties(window, {
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
                    return this._codeium_monaco
                },
                set(t) {
                    let n = EditorPlatform.CUSTOM;
                    for (const [e, t] of TE)
                        if (e.test(window.location.href)) {
                            n = t;
                            break
                        } this._codeium_monaco = t;
                    const r = new MonacoCompletionProvider(EE, n, e);
                    t?.languages?.registerInlineCompletionsProvider && setTimeout((() => {
                        t.languages.registerInlineCompletionsProvider({
                            pattern: "**"
                        }, r), t.editor.registerCommand("codeium.acceptCompletion", ((e, t, n, a) => {
                            a?.(), r.acceptedLastCompletion(n).catch((e => {
                                console.error(e)
                            }))
                        })), t.editor.onDidCreateEditor((e => {
                            r.addEditor(e)
                        })), console.log("Codeium: Activated Monaco")
                    }))
                }
            }
        });
    let pE = !1;
    const SE = (e, t) => {
            const n = JSON.parse(e.innerText);
            n.exposeAppInBrowser = !0, e.innerText = JSON.stringify(n), pE = !0, Object.defineProperty(window, "jupyterapp", {
                get: function() {
                    return this._codeium_jupyterapp
                },
                set: function(e) {
                    if (e?.version.startsWith("3.")) {
                        const n = iE(EE, e, t);
                        e.registerPlugin(n), e.activatePlugin(n.id).then((() => {
                            console.log("Codeium: Activated JupyterLab 3.x")
                        }), (e => {
                            console.error(e)
                        }))
                    } else e?.version.startsWith("4.") ? chrome.runtime.sendMessage(EE, {
                        type: "error",
                        message: "Only JupyterLab 3.x is supported. Use the codeium-jupyter extension for JupyterLab 4"
                    }) : chrome.runtime.sendMessage(EE, {
                        type: "error",
                        message: `Codeium: Unexpected JupyterLab version: ${e?.version??"(unknown)"}. Only JupyterLab 3.x is supported`
                    });
                    this._codeium_jupyterapp = e
                }
            }), Object.defineProperty(window, "jupyterlab", {
                get: function() {
                    return this._codeium_jupyterlab
                },
                set: function(e) {
                    if (e?.version.startsWith("2.")) {
                        const n = iE(EE, e, t);
                        e.registerPlugin(n), e.activatePlugin(n.id).then((() => {
                            console.log("Codeium: Activated JupyterLab 2.x")
                        }), (e => {
                            console.error(e)
                        }))
                    }
                    this._codeium_jupyterlab = e
                }
            })
        },
        NE = [{
            name: "JSFiddle",
            pattern: /https?:\/\/(.*\.)?jsfiddle\.net(\/.*)?/,
            multiplayer: !1
        }, {
            name: "CodePen",
            pattern: /https:\/\/(.*\.)?codepen\.io(\/.*)?/,
            multiplayer: !1
        }, {
            name: "CodeShare",
            pattern: /https:\/\/(.*\.)?codeshare\.io(\/.*)?/,
            multiplayer: !0
        }],
        gE = (e, t) => Object.defineProperty(window, "CodeMirror", {
            get: function() {
                return this._codeium_CodeMirror
            },
            set: function(n) {
                if (this._codeium_CodeMirror = n, !pE)
                    if (n?.version?.startsWith("5."))
                        if (Object.prototype.hasOwnProperty.call(this, "Jupyter")) {
                            if (pE = !0, void 0 === e) return void console.warn("Codeium: found no keybindings for Jupyter Notebook");
                            {
                                const r = function(e, t, n, r) {
                                    const a = new JupyterCodeCompletionIntegration(e, t, n);
                                    return a.patchCellKeyEvent(r), a.patchShortcutManagerHandler(), a
                                }(EE, this.Jupyter, e, t);
                                ! function(e, t) {
                                    e.defineInitHook(t.clearCompletionInitHook())
                                }(n, r.codeMirrorManager), console.log("Codeium: Activating Jupyter Notebook")
                            }
                        } else {
                            let e = !1,
                                r = "";
                            for (const t of NE)
                                if (t.pattern.test(window.location.href)) {
                                    r = t.name, pE = !0, e = t.multiplayer;
                                    break
                                } pE && (new Zd(EE, n, e, t), console.log(`Codeium: Activating CodeMirror Site: ${r}`))
                        }
                else console.warn("Codeium: Codeium doesn't support CodeMirror 6")
            }
        }),
        IE = [{
            pattern: /https:\/\/console\.paperspace\.com\/.*\/notebook\/.*/,
            notebook: !0
        }, {
            pattern: /https?:\/\/www\.codewars\.com(\/.*)?/,
            notebook: !1
        }, {
            pattern: /https:\/\/(.*\.)?github\.com(\/.*)?/,
            notebook: !1
        }],
        CE = new Zd(EE, void 0, !1),
        OE = CE.editorHook(),
        yE = () => {
            const e = setInterval((() => {
                if (pE) return void clearInterval(e);
                let t = !1;
                for (const e of IE)
                    if (e.pattern.test(window.location.href)) {
                        t = e.notebook;
                        break
                    } const n = new Map;
                for (const e of document.getElementsByClassName("CodeMirror")) {
                    const r = e;
                    if (void 0 === r.CodeMirror) continue;
                    const a = r.CodeMirror;
                    OE(a), t && n.set(a.getDoc(), e.getBoundingClientRect().top)
                }
                if (t) {
                    const e = [...n.entries()].sort(((e, t) => e[1] - t[1])).map((([e]) => e));
                    CE.docs = e
                }
            }), 500)
        };
    Promise.all([async function(e) {
        return await new Promise((t => {
            chrome.runtime.sendMessage(e, {
                type: "jupyter_notebook_allowed_and_keybindings"
            }, (e => {
                t(e)
            }))
        }))
    }(EE), async function(e) {
        return await new Promise((t => {
            chrome.runtime.sendMessage(e, {
                type: "debounce_ms"
            }, (e => {
                t(e)
            }))
        }))
    }(EE)]).then((([e, t]) => {
        const n = e.allowed,
            r = e.keyBindings,
            a = t.debounceMs,
            i = ["monaco", "codemirror5", "none"],
            s = document.querySelector('meta[name="codeium:type"]'),
            o = s?.getAttribute("content")?.split(",").map((e => e.toLowerCase().trim())).filter((e => i.includes(e))) ?? [];
        if (o.includes("none")) return;
        const m = document.getElementById("jupyter-config-data");
        if (null === m) return o.includes("monaco") && fE(a), o.includes("codemirror5") && (gE(r, a), yE()), 0 === o.length && n ? (fE(a), gE(r, a), void yE()) : void 0;
        SE(m, a)
    }), (e => {
        console.error(e)
    }))
  })();