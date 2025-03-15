(() => {
    "use strict";


    function retrieveSyncedData(e) {
        return new Promise(((t, n) => {
            chrome.storage.sync.get([e], (a => chrome.runtime.lastError ? n(chrome.runtime.lastError) : t(a[e])))
        }))
    }

    function me(e) {
        return new Promise(((t, n) => {
            chrome.storage.sync.get(e, (e => chrome.runtime.lastError ? n(chrome.runtime.lastError) : t(e)))
        }))
    }

    function ue(e, t) {
        return new Promise(((n, a) => {
            chrome.storage.sync.set({
                [e]: t
            }, (() => chrome.runtime.lastError ? a(chrome.runtime.lastError) : n()))
        }))
    }
    async function ce() {
        const e = await retrieveSyncedData("portalUrl");
        if (void 0 !== e && "" !== e) {
            try {
                new URL(e)
            } catch (t) {
                return void console.log("Invalid portal URL:", e)
            }
            return e
        }
    }
    const le = [/https:\/\/colab.research\.google\.com\/.*/, /https:\/\/(.*\.)?stackblitz\.com\/.*/, /https:\/\/(.*\.)?deepnote\.com\/.*/, /https:\/\/(.*\.)?(databricks\.com|azuredatabricks\.net)\/.*/, /https:\/\/(.*\.)?quadratichq\.com\/.*/, /https?:\/\/(.*\.)?jsfiddle\.net(\/.*)?/, /https:\/\/(.*\.)?codepen\.io(\/.*)?/, /https:\/\/(.*\.)?codeshare\.io(\/.*)?/, /https:\/\/console\.paperspace\.com\/.*\/notebook\/.*/, /https?:\/\/www\.codewars\.com(\/.*)?/, /https:\/\/(.*\.)?github\.com(\/.*)?/, /http:\/\/(localhost|127\.0\.0\.1):[0-9]+\/.*\.ipynb/, /https:\/\/(.*\.)?script.google.com(\/.*)?/].map((e => e.source)),
        DEFAULT_SERVER_URL = "https://server.codeium.com";

    function _e(e, t) {
        if (!e) throw new Error(t)
    }
    
    class cu extends Oe {
        query = "";
        constructor(e) {
            super(), Mt.util.initPartial(e, this)
        }
        static runtime = Mt;
        static typeName = "exa.chat_pb.IntentSearch";
        static fields = Mt.util.newFieldList((() => [{
            no: 1,
            name: "query",
            kind: "scalar",
            T: 9
        }]));
        static fromBinary(e, t) {
            return (new cu).fromBinary(e, t)
        }
        static fromJson(e, t) {
            return (new cu).fromJson(e, t)
        }
        static fromJsonString(e, t) {
            return (new cu).fromJsonString(e, t)
        }
        static equals(e, t) {
            return Mt.util.equals(cu, e, t)
        }
    }
    // --=======cutting=======--
    
    async function Kp() {
        const e = await me(["user", "enterpriseDefaultModel"]);
        return {
            apiKey: e.user?.apiKey,
            defaultModel: e.enterpriseDefaultModel
        }
    }
    class Wp {
        constructor() {
            this.clientSettings = Kp(), setInterval((async () => {
                this.clientSettings = await Kp()
            }), 500)
        }
    }
    // ========== Important stuff, used for getCompletion down below
    class LanguageServerClient {
        constructor(e, sessionId) {
            this.sessionId = sessionId; 
            this.client = (async () => {
                const t = await e;
                if (void 0 !== t) return function(e) {
                    const t = ie({
                        baseUrl: e,
                        useBinaryFormat: !0
                    });
                    return y(languageServerServiceDefinition, t)
                }(t)
            })(), this.clientSettingsPoller = new Wp
        }
        getHeaders(e) {
            return void 0 === e ? {} : {
                Authorization: `Basic ${e}-${this.sessionId}`
            }
        }
        // ====== transplant =====
        async getCompletions(completionRequest) {
            // console.log does not appear here
            // console.log("getCompletions called with request:", completionRequest); /////////

            this.abortController?.abort();
            this.abortController = new AbortController;
            
            // Get client settings abd API key
            const clientSettings = await this.clientSettingsPoller.clientSettings;
            if (void 0 === clientSettings.apiKey || void 0 === completionRequest.metadata) return;
            
            // Add API key to the request
            completionRequest.metadata.apiKey = clientSettings.apiKey;
            completionRequest.modelName = clientSettings.defaultModel ?? "";
            const abortSignal = this.abortController.signal;
            
            // THIS is the actual server call
            const completionResponse = (await this.client)?.getCompletions(completionRequest, {
                signal: abortSignal,
                headers: this.getHeaders(completionRequest.metadata?.apiKey)
            });
            
            try {
                const result = await completionResponse;
                // console.log("Completion response full response object:", result); // Log the full response
                console.log("Completion response:", result.completionItems[0].completion.text); // Log the full response

                return result;
            } catch (error) {
                if (abortSignal.aborted) return;
                return void(error instanceof ConnectError ? error.code != StatusCode.Canceled && (console.log(error.message), chrome.runtime.sendMessage(chrome.runtime.id, { // this where the error calls out
                    type: "error",
                    message: error.message
                })) : (console.log(error.message), chrome.runtime.sendMessage(chrome.runtime.id, {
                    type: "error",
                    message: error.message
                })))
            }
        }
        // ====== transplant ======
        async acceptedLastCompletion(e) {
            
            if (void 0 !== e.metadata) try {
                const t = await this.clientSettingsPoller.clientSettings;
                e.metadata.apiKey = t.apiKey, await ((await this.client)?.acceptCompletion(e, {
                    headers: this.getHeaders(e.metadata?.apiKey)
                }))
            } catch (e) {
                console.log(e.message)
            }
        }
    }
    async function jp() {
        const e = await retrieveSyncedData("lastError");
        e && 0 !== Object.keys(e).length && await ue("lastError", {})
    }
    async function $p() {
        await Promise.all([chrome.action.setPopup({
            popup: "popup.html"
        }), chrome.action.setBadgeText({
            text: "Login"
        }), chrome.action.setIcon({
            path: {
                16: "/icons/16/codeium_square_inactive.png",
                32: "/icons/32/codeium_square_inactive.png",
                48: "/icons/48/codeium_square_inactive.png",
                128: "/icons/128/codeium_square_inactive.png"
            }
        }), chrome.action.setTitle({
            title: "Codeium"
        }), jp()])
    }
    async function Qp() {
        await Promise.all([chrome.action.setPopup({
            popup: "logged_in_popup.html"
        }), chrome.action.setBadgeText({
            text: ""
        }), chrome.action.setIcon({
            path: {
                16: "/icons/16/codeium_square_logo.png",
                32: "/icons/32/codeium_square_logo.png",
                48: "/icons/48/codeium_square_logo.png",
                128: "/icons/128/codeium_square_logo.png"
            }
        }), chrome.action.setTitle({
            title: "Codeium"
        }), jp()])
    }
    const Zp = [];
    chrome.runtime.onInstalled.addListener((async () => {
        if (await async function(e) {
                const t = await new Promise(((e, t) => {
                        chrome.storage.sync.get(null, (n => chrome.runtime.lastError ? t(chrome.runtime.lastError) : e(n)))
                    })),
                    n = Object.assign({}, e, t);
                var a;
                await (a = n, new Promise(((e, t) => {
                    chrome.storage.sync.set(a, (() => chrome.runtime.lastError ? t(chrome.runtime.lastError) : e()))
                })))
            }({
                settings: {},
                allowlist: {
                    defaults: le,
                    current: le
                }
            }), console.log("Extension successfully installed!"), void 0 === (await retrieveSyncedData("user"))?.apiKey) {
            await $p();
            const e = s();
            Zp.push(e);
            const t = await (async () => {
                const e = await ce();
                return void 0 === e ? "https://codeium.com" : e
            })();
            void 0 !== t && await chrome.tabs.create({
                url: `${t}/profile?redirect_uri=chrome-extension://${chrome.runtime.id}&state=${e}`
            })
        } else await Qp()
    }));
    const eS = e => {
        const t = e.split("+").map((e => e.trim()));
        return {
            key: t[t.length - 1],
            ctrl: t.includes("Ctrl"),
            alt: t.includes("Alt"),
            shift: t.includes("Shift"),
            meta: t.includes("Meta")
        }
    };
    chrome.runtime.onMessageExternal.addListener(((e, t, n) => "jupyter_notebook_allowed_and_keybindings" === e.type ? ((async () => {
        let e = !1;
        const a = {
            accept: {
                key: "Tab",
                ctrl: !1,
                alt: !1,
                shift: !1,
                meta: !1
            }
        };
        if (void 0 === t.url) return void n({
            allowed: !1,
            keyBindings: a
        });
        const {
            allowlist: r,
            jupyterNotebookKeybindingAccept: s
        } = await me(["allowlist", "jupyterNotebookKeybindingAccept"]);
        for (const n of function(e) {
                void 0 === e && (e = {
                    defaults: [],
                    current: []
                });
                for (const t of le) e.defaults.includes(t) || e.current.includes(t) || e.current.push(t);
                for (const t of e.defaults) !le.includes(t) && e.current.includes(t) && e.current.splice(e.current.indexOf(t), 1);
                return e.current
            }(r))
            if (new RegExp(n).test(t.url)) {
                e = !0;
                break
            } n({
            allowed: e,
            keyBindings: {
                accept: s ? eS(s) : a
            }
        })
    })().catch((e => {
        console.error(e)
    })), !0) : "jupyterlab" === e.type ? ((async () => {
        const {
            jupyterlabKeybindingAccept: e,
            jupyterlabKeybindingDismiss: t
        } = await me(["jupyterlabKeybindingAccept", "jupyterlabKeybindingDismiss"]), a = {
            accept: e ? eS(e) : {
                key: "Tab",
                ctrl: !1,
                alt: !1,
                shift: !1,
                meta: !1
            },
            dismiss: t ? eS(t) : {
                key: "Escape",
                ctrl: !1,
                alt: !1,
                shift: !1,
                meta: !1
            }
        };
        n(a)
    })().catch((e => {
        console.error(e)
    })), !0) : "debounce_ms" === e.type ? ((async () => {
        const {
            jupyterDebounceMs: e
        } = await me(["jupyterDebounceMs"]);
        n({
            debounceMs: e || 0
        })
    })().catch((e => {
        console.error(e)
    })), !0) : void("error" != e.type ? "success" != e.type ? "string" == typeof e.token && "string" == typeof e.state ? (async () => {
        const t = e,
            n = await retrieveSyncedData("user");
        void 0 === n?.apiKey && await nS(t.token)
    })().catch((e => {
        console.error(e)
    })) : console.log("Unexpected message:", e) : Qp().catch((e => {
        console.error(e)
    })) : async function(e) {
        await Promise.all([chrome.action.setPopup({
            popup: "logged_in_popup.html"
        }), chrome.action.setIcon({
            path: {
                16: "/icons/16/codeium_square_error.png",
                32: "/icons/32/codeium_square_error.png",
                48: "/icons/48/codeium_square_error.png",
                128: "/icons/128/codeium_square_error.png"
            }
        }), chrome.action.setTitle({
            title: `Codeium (error: ${e})`
        }), ue("lastError", {
            message: e
        })])
    }(e.message).catch((e => {
        console.error(e)
    }))))), chrome.runtime.onStartup.addListener((async () => {
        void 0 === (await retrieveSyncedData("user"))?.apiKey ? await $p() : await Qp()
    })), chrome.runtime.onMessage.addListener((e => {
        if ("state" === e.type) {
            const t = e.payload;
            Zp.push(t.state)
        } else "manual" === e.type ? nS(e.token).catch((e => {
            console.error(e)
        })) : console.log("Unrecognized message:", e)
    }));
    const connectionClients = new Map;
    async function nS(e) {
        try {
            const t = await ce(),
                n = await async function(firebaseIdToken) {
                    const t = await async function() {
                        const e = (await retrieveSyncedData("portalUrl"))?.trim();
                        return void 0 === e || "" === e ? DEFAULT_SERVER_URL : `${e.replace(/\/$/,"")}/_route/api_server`
                    }();
                    if (void 0 === t) throw new Error("apiServerUrl is undefined");
                    const n = y(am, ie({
                            baseUrl: t,
                            useBinaryFormat: !0,
                            defaultTimeoutMs: 5e3
                        })),
                        userData = await n.registerUser({
                            firebaseIdToken: firebaseIdToken
                        });
                    return {
                        api_key: userData.apiKey,
                        name: userData.name
                    }
                }(e);
            await ue("user", {
                apiKey: n.api_key,
                name: n.name,
                userPortalUrl: t
            }), await Qp()
        } catch (e) {
            console.log(e)
        }
    }
    chrome.runtime.onConnectExternal.addListener((port => {

        // Create a new LanguageServerClient for each connection and store it in connectionClients map
        connectionClients.set(port.name, new LanguageServerClient(
            async function() {
                const userData = await retrieveSyncedData("user"),
                portalUrl = userData?.userPortalUrl;
                console.log("portalUrl", portalUrl);
            
            //  "If we don't have a portal URL from the user data, use the default server URL; 
            // otherwise, use the user's portal URL with the language server path appended to it."
                return (void 0 === portalUrl || "" === portalUrl )
                    ? DEFAULT_SERVER_URL 
                    : `${portalUrl}/_route/language_server`; 
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

    // previously
    // chrome.runtime.onConnectExternal.addListener((port => {
    //     connectionClients.set(port.name, new LanguageServerClient(async function() {
    //         const userData = await retrieveSyncedData("user"),
    //             portalUrl = userData?.userPortalUrl;
    //         console.log("portalUrl", portalUrl);
            
    //         //  "If we don't have a portal URL from the user data, use the default server URL; 
    //         // otherwise, use the user's portal URL with the language server path appended to it."
    //         return void 0 === portalUrl || "" === portalUrl ? DEFAULT_SERVER_URL : `${portalUrl}/_route/language_server` 
    //     }(), port.name)), port.onDisconnect.addListener((port => {
    //         connectionClients.delete(port.name)
    //     })), port.onMessage.addListener((async (message, port) => {
    //         const client = connectionClients.get(port.name);
    //         if ("getCompletions" === message.kind) { // The magic happens here, sending request to server
    //             console.log("Parsed completion request:", JSON.parse(message.request)); // printing out the request
    //             const completionResponse = await (client?.getCompletions(GetCompletionsRequest.fromJsonString(message.request))),
    //                 response = {
    //                     kind: "getCompletions",
    //                     requestId: message.requestId,
    //                     response: completionResponse?.toJsonString()
    //                 };
    //             port.postMessage(response)
    //         } else "acceptCompletion" == message.kind ? await (client?.acceptedLastCompletion(AcceptCompletionRequest.fromJsonString(message.request))) : console.log("Unrecognized message:", message)
    //     }))
    // }))
    
})();