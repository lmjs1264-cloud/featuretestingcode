import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// MARK: - glym web view setup

/// The app's main screen. Same as Capacitor's default, plus NavigationLogger.
class MainViewController: CAPBridgeViewController {
    private var navigationLogger: NavigationLogger?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView, let original = webView.navigationDelegate else { return }
        let logger = NavigationLogger(original: original)
        navigationLogger = logger // the web view only holds its delegate weakly
        webView.navigationDelegate = logger
    }
}

/// Sits in front of Capacitor's navigation handling. It:
/// 1. prints every page the app opens to the Xcode console (lines start with "🔎 NAV"),
///    showing only the address and the NAMES of query parameters, never their values;
/// 2. ignores cancelled/interrupted loads (normal during sign-in redirects) instead of
///    showing the "Can't reach Glymdot" page. Real connection errors still show it.
final class NavigationLogger: NSObject, WKNavigationDelegate {
    private let original: WKNavigationDelegate

    init(original: WKNavigationDelegate) {
        self.original = original
        super.init()
    }

    static func describe(_ url: URL?) -> String {
        guard let url = url, var parts = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return "(no url)"
        }
        let names = parts.queryItems?.map { $0.name }.joined(separator: ",") ?? ""
        parts.query = nil
        parts.fragment = nil
        let base = parts.string ?? url.absoluteString
        return names.isEmpty ? base : "\(base) [params: \(names)]"
    }

    private static func isHarmless(_ error: Error) -> Bool {
        let e = error as NSError
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return true } // -999
        if e.domain == "WebKitErrorDomain" && e.code == 102 { return true } // frame load interrupted
        return false
    }

    private static func failingURL(_ error: Error, _ webView: WKWebView) -> String {
        let info = (error as NSError).userInfo
        if let url = info[NSURLErrorFailingURLErrorKey] as? URL { return describe(url) }
        if let s = info[NSURLErrorFailingURLStringErrorKey] as? String { return describe(URL(string: s)) }
        return describe(webView.url)
    }

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let frame: String
        if navigationAction.targetFrame == nil {
            frame = "new-window"
        } else if navigationAction.targetFrame?.isMainFrame == true {
            frame = "main"
        } else {
            frame = "frame"
        }
        let method = navigationAction.request.httpMethod ?? "GET"
        let target = NavigationLogger.describe(navigationAction.request.url)
        let handler: (WKNavigationActionPolicy) -> Void = { policy in
            print("🔎 NAV \(frame) \(method) \(target) -> \(policy == .allow ? "allowed" : "BLOCKED/opened outside")")
            decisionHandler(policy)
        }
        let handled: Void? = original.webView?(webView, decidePolicyFor: navigationAction, decisionHandler: handler)
        if handled == nil {
            handler(.allow)
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let e = error as NSError
        print("🔎 NAV FAILED (before load) \(NavigationLogger.failingURL(error, webView)) -> \(e.domain) \(e.code): \(e.localizedDescription)")
        if NavigationLogger.isHarmless(error) { return }
        original.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        let e = error as NSError
        print("🔎 NAV FAILED (during load) \(NavigationLogger.failingURL(error, webView)) -> \(e.domain) \(e.code): \(e.localizedDescription)")
        if NavigationLogger.isHarmless(error) { return }
        original.webView?(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("🔎 NAV loaded \(NavigationLogger.describe(webView.url))")
        original.webView?(webView, didFinish: navigation)
    }

    // Everything else goes straight to Capacitor.
    override func responds(to aSelector: Selector!) -> Bool {
        return super.responds(to: aSelector) || original.responds(to: aSelector)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        if !super.responds(to: aSelector) && original.responds(to: aSelector) {
            return original
        }
        return super.forwardingTarget(for: aSelector)
    }
}
