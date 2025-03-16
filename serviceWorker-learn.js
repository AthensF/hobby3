(() => {
    "use strict";

    function retrieveSyncedData(key) {
        return new Promise(((resolve, reject) => {
            chrome.storage.sync.get([key], (result => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result[key])))
        }))
    }

    function getSyncedStorage(keys) {
        return new Promise(((resolve, reject) => {
            chrome.storage.sync.get(keys, (result => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result)))
        }))
    }

    function setSyncedStorage(keys, values) {
        return new Promise(((resolve, reject) => {
            chrome.storage.sync.set({
                [keys]: values
            }, (() => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()))
        }))
    }
    async function getPortalUrl() {
        const portalUrlData = await getSyncedStorage(["portalUrl"]);
        if (void 0 !== portalUrlData.portalUrl && "" !== portalUrlData.portalUrl) {
            try {
                new URL(portalUrlData.portalUrl)
            } catch (error) {
                return void console.log("Invalid portal URL:", portalUrlData.portalUrl)
            }
            return portalUrlData.portalUrl
        }
    }
    const allowedDomains = [/https:\/\/colab.research\.google\.com\/.*/, /https:\/\/(.*\.)?stackblitz\.com\/.*/, /https:\/\/(.*\.)?deepnote\.com\/.*/, /https:\/\/(.*\.)?(databricks\.com|azuredatabricks\.net)\/.*/, /https:\/\/(.*\.)?quadratichq\.com\/.*/, /https?:\/\/(.*\.)?jsfiddle\.net(\/.*)?/, /https:\/\/(.*\.)?codepen\.io(\/.*)?/, /https:\/\/(.*\.)?codeshare\.io(\/.*)?/, /https:\/\/console\.paperspace\.com\/.*\/notebook\/.*/, /https?:\/\/www\.codewars\.com(\/.*)?/, /https:\/\/(.*\.)?github\.com(\/.*)?/, /http:\/\/(localhost|127\.0\.0\.1):[0-9]+\/.*\.ipynb/, /https:\/\/(.*\.)?script.google.com(\/.*)?/].map((e => e.source)),
        DEFAULT_SERVER_URL = "https://server.codeium.com";

    function assertTruthy(condition, errorMessage) {
        if (!condition) throw new Error(errorMessage)
    }
    
    class IntentSearch extends Oe {
        query = "";
        constructor(partialData) {
            super(), Mt.util.initPartial(partialData, this)
        }
        static runtime = Mt;
        static typeName = "exa.chat_pb.IntentSearch";
        static fields = Mt.util.newFieldList((() => [{
            no: 1,
            name: "query",
            kind: "scalar",
            T: 9
        }]));
        static fromBinary(binaryData, options) {
            return (new IntentSearch).fromBinary(binaryData, options)
        }
        static fromJson(jsonData, options) {
            return (new IntentSearch).fromJson(jsonData, options)
        }
        static fromJsonString(jsonString, options) {
            return (new IntentSearch).fromJsonString(jsonString, options)
        }
        static equals(a, b) {
            return Mt.util.equals(IntentSearch, a, b)
        }
    }
    
    async function getClientSettings() {
        const storageData = await getSyncedStorage(["user", "enterpriseDefaultModel"]);
        return {
            apiKey: storageData.user?.apiKey,
            defaultModel: storageData.enterpriseDefaultModel
        }
    }
    class ClientSettingsPoller {
        constructor() {
            this.clientSettings = getClientSettings(), setInterval((async () => {
                this.clientSettings = await getClientSettings()
            }), 500)
        }
    }
    // ========== Important stuff, used for getCompletion down below
    class LanguageServerClient {
        constructor(serverUrl, sessionId) {
            this.sessionId = sessionId; 
            this.client = (async () => {
                const resolvedUrl = await serverUrl;
                if (void 0 !== resolvedUrl) return function(serverUrl) {
                    const clientConfig = ie({
                        baseUrl: serverUrl,
                        useBinaryFormat: !0
                    });
                    return y(languageServerServiceDefinition, clientConfig)
                }(resolvedUrl)
            })(), this.clientSettingsPoller = new ClientSettingsPoller
        }
        
        getHeaders(apiKey) {
            return void 0 === apiKey ? {} : {
                Authorization: `Basic ${apiKey}-${this.sessionId}`
            }
        }
        
        async getCompletions(completionRequest) {
            this.abortController?.abort();
            this.abortController = new AbortController;
            
            const clientSettings = await this.clientSettingsPoller.clientSettings;
            if (void 0 === clientSettings.apiKey || void 0 === completionRequest.metadata) return;
            
            completionRequest.metadata.apiKey = clientSettings.apiKey;
            completionRequest.modelName = clientSettings.defaultModel ?? "";
            const abortSignal = this.abortController.signal;
            
            const completionResponse = (await this.client)?.getCompletions(completionRequest, {
                signal: abortSignal,
                headers: this.getHeaders(completionRequest.metadata?.apiKey)
            });
            
            try {
                const result = await completionResponse;
                console.log("Completion response:", result.completionItems[0].completion.text);
                return result;
            } catch (error) {
                if (abortSignal.aborted) return;
                return void(error instanceof ConnectError ? error.code != StatusCode.Canceled && (console.log(error.message), chrome.runtime.sendMessage(chrome.runtime.id, {
                    type: "error",
                    message: error.message
                })) : (console.log(error.message), chrome.runtime.sendMessage(chrome.runtime.id, {
                    type: "error",
                    message: error.message
                })))
            }
        }
        
        async acceptedLastCompletion(completionRequest) {
            if (void 0 !== completionRequest.metadata) try {
                const clientSettings = await this.clientSettingsPoller.clientSettings;
                completionRequest.metadata.apiKey = clientSettings.apiKey, await ((await this.client)?.acceptCompletion(completionRequest, {
                    headers: this.getHeaders(completionRequest.metadata?.apiKey)
                }))
            } catch (error) {
                console.log(error.message)
            }
        }
    }
    
    async function clearLastError() {
        const lastError = await retrieveSyncedData("lastError");
        lastError && 0 !== Object.keys(lastError).length && await setSyncedStorage("lastError", {})
    }
    
    
    
    const stateTokens = [];
    
    chrome.runtime.onInstalled.addListener((async () => {
        if (await async function(defaultData) {
                const storedData = await new Promise(((resolve, reject) => {
                        chrome.storage.sync.get(null, (data => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(data)))
                    })),
                    mergedData = Object.assign({}, defaultData, storedData);
                var dataToStore;
                await (dataToStore = mergedData, new Promise(((resolve, reject) => {
                    chrome.storage.sync.set(dataToStore, (() => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()))
                })))
            }({
                settings: {},
                allowlist: {
                    defaults: allowedDomains,
                    current: allowedDomains
                }
            }), console.log("Extension successfully installed!"), void 0 === (await retrieveSyncedData("user"))?.apiKey) {
            await setupLoginState();
            const stateToken = s();
            stateTokens.push(stateToken);
            const portalUrl = await (async () => {
                const url = await getPortalUrl();
                return void 0 === url ? "https://codeium.com" : url
            })();
            void 0 !== portalUrl && await chrome.tabs.create({
                url: `${portalUrl}/profile?redirect_uri=chrome-extension://${chrome.runtime.id}&state=${stateToken}`
            })
        } else await setupLoggedInState()
    }));
    
    const keyBindingParser = keyBindingString => {
        const keyParts = keyBindingString.split("+").map((part => part.trim()));
        return {
            key: keyParts[keyParts.length - 1],
            ctrl: keyParts.includes("Ctrl"),
            alt: keyParts.includes("Alt"),
            shift: keyParts.includes("Shift"),
            meta: keyParts.includes("Meta")
        }
    };
    
    chrome.runtime.onStartup.addListener((async () => {
        void 0 === (await retrieveSyncedData("user"))?.apiKey ? await $p() : await Qp()
    }));
    
    chrome.runtime.onMessage.addListener((e => {
        if ("state" === e.type) {
            const t = e.payload;
            stateTokens.push(t.state)
        } else "manual" === e.type ? registerUserWithToken(e.token).catch((e => {
            console.error(e)
        })) : console.log("Unrecognized message:", e)
    }));
    
    const connectionClients = new Map;
    
    async function registerUserWithToken(token) {
        try {
            const portalUrl = await getPortalUrl(),
                n = await async function(firebaseIdToken) {
                    const apiServerUrl = await async function() {
                        const portalUrlData = (await retrieveSyncedData("portalUrl"))?.trim();
                        return void 0 === portalUrlData || "" === portalUrlData ? DEFAULT_SERVER_URL : `${portalUrlData.replace(/\/$/,"")}/_route/api_server`
                    }();
                    if (void 0 === apiServerUrl) throw new Error("apiServerUrl is undefined");
                    const client = y(am, ie({
                            baseUrl: apiServerUrl,
                            useBinaryFormat: !0,
                            defaultTimeoutMs: 5e3
                        })),
                        userData = await client.registerUser({
                            firebaseIdToken: firebaseIdToken
                        });
                    return {
                        api_key: userData.apiKey,
                        name: userData.name
                    }
                }(token);
            await setSyncedStorage("user", {
                apiKey: n.api_key,
                name: n.name,
                userPortalUrl: portalUrl
            }), await Qp()
        } catch (error) {
            console.log(error)
        }
    }
    
    chrome.runtime.onConnectExternal.addListener((port => {
        // Create a new LanguageServerClient for each connection and store it in connectionClients map
        connectionClients.set(port.name, new LanguageServerClient(
            async function() {
                const userData = await retrieveSyncedData("user"),
                portalUrlData = userData?.userPortalUrl;
                console.log("portalUrlData", portalUrlData);
            
            //  "If we don't have a portal URL from the user data, use the default server URL; 
            // otherwise, use the user's portal URL with the language server path appended to it."
                return (void 0 === portalUrlData || "" === portalUrlData )
                    ? DEFAULT_SERVER_URL 
                    : `${portalUrlData}/_route/language_server`; 
            }(), 
            port.name
        )); 
        
        // Add disconnect listener
        port.onDisconnect.addListener((port) => {
            connectionClients.delete(port.name)
        }); 
        
        // Handle messages from client
        port.onMessage.addListener((async (message, port) => {
            const client = connectionClients.get(port.name);

            if ("getCompletions" === message.kind) { // The magic happens here, sending request to server
                // console.log("Completion request:", JSON.parse(message.request)); // printing out the request
                const rawUserInput = JSON.parse(message.request).document.text;
                const codeMatch = rawUserInput.match(/CELL:\s*(.+)/s);
                const userInput = codeMatch ? codeMatch[1].trim() : rawUserInput;
                // extract and log user input text
                console.log("Completion request:", userInput) 
                // CRITICAL LINE: SEND IT! Send request to Codeium server
                const completionResponse = await (client?.getCompletions(
                    GetCompletionsRequest.fromJsonString(message.request)
                ));
                const response = {
                    kind: "getCompletions",
                    requestId: message.requestId,
                    response: completionResponse?.toJsonString()
                };
                
                port.postMessage(response);
            } else if ("acceptCompletion" == message.kind) {
                // console.log("COMPLETION ACCEPTED:", JSON.parse(message.request)); /////// // console.log does not appear here
                await (client?.acceptedLastCompletion(AcceptCompletionRequest.fromJsonString(message.request)))                
            } else {
                console.log("Unrecognized message:", message)
            }
        }))
    }))
})();