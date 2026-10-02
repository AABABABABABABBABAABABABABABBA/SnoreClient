// SPDX-License-Identifier: GPL-3.0-or-later

import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.applicationNameForUserAgent = "SnoreClient"

        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "gmxhr")
        for (name, time) in [("bridge", WKUserScriptInjectionTime.atDocumentStart), ("SnoreClient.user", .atDocumentStart)] {
            if let url = Bundle.main.url(forResource: name, withExtension: "js"),
               let source = try? String(contentsOf: url) {
                controller.addUserScript(WKUserScript(source: source, injectionTime: time, forMainFrameOnly: true))
            }
        }
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.07, green: 0.06, blue: 0.1, alpha: 1)
        webView.uiDelegate = context.coordinator
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        context.coordinator.webView = webView
        webView.load(URLRequest(url: URL(string: "https://discord.com/app")!))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
        weak var webView: WKWebView?

        // Native side of GM_xmlhttpRequest so the userscript can talk to the cloud and other origins Discord's CSP blocks.
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "gmxhr", let body = message.body as? [String: Any],
                  let id = body["id"] as? Int, let urlString = body["url"] as? String, let url = URL(string: urlString) else { return }

            var request = URLRequest(url: url)
            request.httpMethod = (body["method"] as? String) ?? "GET"
            if let headers = body["headers"] as? [String: String] {
                for (k, v) in headers { request.setValue(v, forHTTPHeaderField: k) }
            }
            if let data = body["data"] as? String { request.httpBody = data.data(using: .utf8) }
            else if let b64 = body["dataBase64"] as? String { request.httpBody = Data(base64Encoded: b64) }

            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                var result: [String: Any] = ["id": id]
                if let error = error {
                    result["error"] = error.localizedDescription
                } else if let http = response as? HTTPURLResponse {
                    result["status"] = http.statusCode
                    result["finalUrl"] = http.url?.absoluteString ?? urlString
                    result["headers"] = http.allHeaderFields.map { "\($0.key): \($0.value)" }.joined(separator: "\n")
                    result["body"] = (data ?? Data()).base64EncodedString()
                }
                guard let json = try? JSONSerialization.data(withJSONObject: result), let text = String(data: json, encoding: .utf8) else { return }
                DispatchQueue.main.async {
                    self?.webView?.evaluateJavaScript("window.__snoreGmResponse(\(text))", completionHandler: nil)
                }
            }.resume()
        }

        // Open target=_blank links in the same view
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url { webView.load(URLRequest(url: url)) }
            return nil
        }

        // Grant mic and camera to discord.com without a prompt each time
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(origin.host.hasSuffix("discord.com") ? .grant : .deny)
        }

        // Keep external links out of the Discord session
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url, let host = url.host else { return decisionHandler(.allow) }
            let allowed = ["discord.com", "discordapp.com", "discord.gg", "discordapp.net", "discord.media"]
            if allowed.contains(where: { host == $0 || host.hasSuffix("." + $0) }) || url.scheme == "about" || url.scheme == "blob" {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }
    }
}
