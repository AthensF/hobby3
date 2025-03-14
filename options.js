// ... existing code ...

// Main Options component for the Codeium extension
const Oa = () => {
  const t = e.createRef();
  const o = e.createRef();
  const [a, i] = e.useState("");
  const s = e.createRef();
  const [u, c] = e.useState("");
  const [d, f] = e.useState("");
  const [p, m] = e.useState("");
  const [h, g] = e.useState("");
  const [v, y] = e.useState(0);
  const b = e.createRef();
  const [x, w] = e.useState({key: "", ctrl: false, alt: false, shift: false, meta: false});
  const [k, S] = e.useState(false);
  const [E, C] = e.useState(false);
  const [Z, R] = e.useState(false);
  
  // Format key combinations like "Ctrl+Alt+K"
  const T = e => {
    const t = [];
    if (e.ctrl) t.push("Ctrl");
    if (e.alt) t.push("Alt");
    if (e.shift) t.push("Shift");
    if (e.meta) t.push("Meta");
    return [...t, e.key.toUpperCase()].join("+");
  };
  
  // Handle key press events for shortcuts
  const M = e => {
    e.preventDefault();
    const t = e.key;
    if (t !== "Control" && t !== "Alt" && t !== "Shift" && t !== "Meta") {
      const n = e.ctrlKey;
      const r = e.altKey;
      const o = e.shiftKey;
      const a = e.metaKey;
      w({key: t, ctrl: n, alt: r, shift: o, meta: a});
      setTimeout(() => {
        if (e.currentTarget) {
          e.currentTarget.blur();
          document.activeElement?.blur();
        }
      }, 0);
    }
  };
  
  // Load saved settings on component mount
  e.useEffect(() => {
    (async () => {
      i(await Za("portalUrl") ?? "");
    })().catch(e => {
      console.error(e);
    });
    
    (async () => {
      c(await Za("enterpriseDefaultModel") ?? "");
    })().catch(e => {
      console.error(e);
    });
    
    (async () => {
      f(await Za("jupyterlabKeybindingAccept") ?? "Tab");
    })().catch(e => {
      console.error(e);
    });
    
    (async () => {
      m(await Za("jupyterlabKeybindingDismiss") ?? "Escape");
    })().catch(e => {
      console.error(e);
    });
    
    (async () => {
      g(await Za("jupyterNotebookKeybindingAccept") ?? "Tab");
    })().catch(e => {
      console.error(e);
    });
    
    (async () => {
      y(await Za("jupyterDebounceMs") ?? 0);
    })().catch(e => {
      console.error(e);
    });
  }, []);
  
  const O = e.useMemo(() => a !== "" ? a : Ca, [a]);
  
  return e.createElement(
    pa, 
    {sx: {width: "100%", maxWidth: 400, bgcolor: "background.paper"}},
    
    // Telemetry settings section
    e.createElement(
      e.Fragment, 
      null,
      e.createElement(
        P, 
        {variant: "body2"},
        e.createElement(l.Z, {
          fontSize: "small", 
          sx: {verticalAlign: "bottom", marginRight: "0.2em", marginLeft: "0.4em", bottom: "-0.1em"}
        }),
        " ",
        "Edit telemetry settings at the",
        " ",
        e.createElement(
          ia, 
          {href: `${O}/profile`, target: "_blank"},
          "Codeium website",
          e.createElement(r.Z, {fontSize: "small", sx: {verticalAlign: "bottom"}})
        )
      ),
      e.createElement(ya, {sx: {padding: "0.5em"}})
    ),
    
    // Login section
    e.createElement(
      pa, 
      {sx: {my: 2, mx: 2}},
      e.createElement(P, {variant: "h6"}, " Alternative ways to log in "),
      e.createElement(Ir, {
        id: "token",
        label: "Token",
        variant: "standard",
        fullWidth: true,
        type: "password",
        inputRef: t
      }),
      e.createElement(
        pa, 
        {sx: {display: "flex", justifyContent: "space-between"}},
        e.createElement(
          xo, 
          {variant: "text", onClick: Ma, sx: {textTransform: "none"}},
          "Get Token ",
          e.createElement(r.Z, null)
        ),
        e.createElement(
          xo, 
          {
            variant: "text", 
            onClick: async () => {
              const e = t.current?.value;
              await chrome.runtime.sendMessage({type: "manual", token: e});
            },
            sx: {textTransform: "none"}
          },
          "Enter Token ",
          e.createElement(n.Z, null)
        )
      )
    ),
    
    e.createElement(ya, {sx: {padding: "0.5em"}}),
    
    // Enterprise settings section
    e.createElement(
      pa, 
      {sx: {my: 2, mx: 2}},
      e.createElement(P, {variant: "h6"}, " Enterprise settings "),
      e.createElement(Ir, {
        id: "portal",
        label: "Portal URL",
        variant: "standard",
        fullWidth: true,
        type: "url",
        inputRef: o,
        value: a,
        onChange: e => i(e.target.value)
      }),
      e.createElement(
        pa, 
        {sx: {display: "flex", justifyContent: "flex-end"}},
        e.createElement(
          xo, 
          {
            variant: "text", 
            onClick: async () => {
              const e = o.current?.value;
              await Pa("portalUrl", e);
            },
            sx: {textTransform: "none"}
          },
          "Enter Portal URL ",
          e.createElement(n.Z, null)
        )
      ),
      
      e.createElement(Ir, {
        id: "model",
        label: "Default Model",
        variant: "standard",
        fullWidth: true,
        inputRef: s,
        value: u,
        onChange: e => c(e.target.value)
      }),
      e.createElement(
        pa, 
        {sx: {display: "flex", justifyContent: "flex-end"}},
        e.createElement(
          xo, 
          {
            variant: "text", 
            onClick: async () => {
              const e = s.current?.value;
              await Pa("enterpriseDefaultModel", e);
            },
            sx: {textTransform: "none"}
          },
          "Enter Default Model ",
          e.createElement(n.Z, null)
        )
      )
    ),
    
    e.createElement(ya, {sx: {padding: "0.5em"}}),
    
    // Allowlist section
    e.createElement(
      pa, 
      {sx: {my: 2, mx: 2}},
      e.createElement(Ta, null)
    ),
    
    e.createElement(ya, {sx: {padding: "0.5em"}}),
    
    // Jupyter settings section
    e.createElement(
      pa, 
      {sx: {my: 2, mx: 2}},
      e.createElement(P, {variant: "h6"}, " Jupyter Settings "),
      e.createElement(
        P, 
        {variant: "body2"},
        'Press the desired key combination in the input field. For example, press "Ctrl+Tab" for a Ctrl+Tab shortcut.'
      ),
      
      // JupyterLab settings
      e.createElement(P, {variant: "subtitle1", sx: {mt: 2, mb: 1}}, "JupyterLab"),
      e.createElement(Ir, {
        id: "jupyterlabKeybindingAccept",
        label: "Accept Shortcut",
        variant: "standard",
        fullWidth: true,
        value: k ? "Press keys..." : d || "Tab",
        onFocus: () => S(true),
        onBlur: async () => {
          S(false);
          if (x.key) {
            const e = T(x);
            f(e);
            await Pa("jupyterlabKeybindingAccept", e);
            w({key: "", ctrl: false, alt: false, shift: false, meta: false});
          }
        },
        onKeyDown: M
      }),
      
      e.createElement(Ir, {
        id: "jupyterlabKeybindingDismiss",
        label: "Dismiss Shortcut",
        variant: "standard",
        fullWidth: true,
        value: E ? "Press keys..." : p || "Escape",
        onFocus: () => C(true),
        onBlur: async () => {
          C(false);
          if (x.key) {
            const e = T(x);
            m(e);
            await Pa("jupyterlabKeybindingDismiss", e);
            w({key: "", ctrl: false, alt: false, shift: false, meta: false});
          }
        },
        onKeyDown: M
      }),
      
      // Jupyter Notebook settings
      e.createElement(P, {variant: "subtitle1", sx: {mt: 2, mb: 1}}, "Jupyter Notebook"),
      e.createElement(Ir, {
        id: "jupyterNotebookKeybindingAccept",
        label: "Accept Shortcut",
        variant: "standard",
        fullWidth: true,
        value: Z ? "Press keys..." : h || "Tab",
        onFocus: () => R(true),
        onBlur: async () => {
          R(false);
          if (x.key) {
            const e = T(x);
            g(e);
            await Pa("jupyterNotebookKeybindingAccept", e);
            w({key: "", ctrl: false, alt: false, shift: false, meta: false});
          }
        },
        onKeyDown: M
      }),
      
      // Performance settings
      e.createElement(P, {variant: "subtitle1", sx: {mt: 2, mb: 1}}, "Performance"),
      e.createElement(Ir, {
        id: "jupyterDebounceMs",
        label: "Debounce (ms)",
        variant: "standard",
        fullWidth: true,
        type: "number",
        inputRef: b,
        value: v,
        onChange: e => y(Number(e.target.value))
      }),
      e.createElement(
        pa, 
        {sx: {display: "flex", justifyContent: "flex-end"}},
        e.createElement(
          xo, 
          {
            variant: "text", 
            onClick: async () => {
              const e = parseInt(b.current?.value ?? "0");
              await Pa("jupyterDebounceMs", e);
            },
            sx: {textTransform: "none"}
          },
          "Save ",
          e.createElement(n.Z, null)
        )
      )
    )
  );
};

// Render the options page
const za = document.getElementById("codeium-options");
if (za !== null) {
  t.render(e.createElement(Oa, null), za);
}

// ... existing code ...