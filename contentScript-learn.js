(()=>{
    if("text/html"===document.contentType){
        const e=document.createElement("script");
        e.src=chrome.runtime.getURL("script.js?")+new URLSearchParams({id:chrome.runtime.id}),
        e.onload=function(){this.remove()},
        (document.head||document.documentElement).prepend(e)
    }
})();