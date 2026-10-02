// Userscript runtime shim for the SnoreClient iOS wrapper.
(() => {
    window.unsafeWindow = window;

    const pending = new Map();
    let seq = 0;

    window.GM_xmlhttpRequest = function (opts) {
        const id = ++seq;
        pending.set(id, opts);
        const msg = {
            id,
            url: opts.url,
            method: opts.method || "GET",
            headers: opts.headers || {},
            responseType: opts.responseType || "",
        };
        const data = opts.data;
        if (typeof data === "string") msg.data = data;
        else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            let bin = "";
            for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
            msg.dataBase64 = btoa(bin);
        } else if (data instanceof URLSearchParams) msg.data = data.toString();
        else if (data != null) msg.data = String(data);
        window.webkit.messageHandlers.gmxhr.postMessage(msg);
        return { abort() { pending.delete(id); } };
    };

    window.__snoreGmResponse = function (res) {
        const opts = pending.get(res.id);
        pending.delete(res.id);
        if (!opts) return;
        if (res.error) {
            opts.onerror?.({ error: res.error });
            return;
        }
        const bin = atob(res.body || "");
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const text = () => new TextDecoder().decode(u8);
        const r = {
            status: res.status,
            statusText: "",
            readyState: 4,
            finalUrl: res.finalUrl,
            responseHeaders: res.headers || "",
        };
        switch (opts.responseType) {
            case "blob": r.response = new Blob([u8]); break;
            case "arraybuffer": r.response = u8.buffer; break;
            case "json": r.response = JSON.parse(text()); r.responseText = text(); break;
            default: r.responseText = text(); r.response = r.responseText;
        }
        opts.onload?.(r);
    };
})();
