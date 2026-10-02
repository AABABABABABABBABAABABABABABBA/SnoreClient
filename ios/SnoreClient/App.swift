// SnoreClient for iOS: Discord web inside a WebView with SnoreClient injected.
// SPDX-License-Identifier: GPL-3.0-or-later

import SwiftUI

@main
struct SnoreClientApp: App {
    var body: some Scene {
        WindowGroup {
            WebView()
                .ignoresSafeArea(.container, edges: .bottom)
                .preferredColorScheme(.dark)
        }
    }
}
