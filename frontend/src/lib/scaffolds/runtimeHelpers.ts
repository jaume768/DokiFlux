/**
 * Runtime instrumentation injected into every preview, regardless of framework.
 * Forwards runtime errors and in-iframe navigation events to the parent window
 * (Dokiflux app) so the autofix loop and the URL input work.
 *
 * Kept as a plain string so it can be embedded in index.html (Vite) or in a
 * <Script strategy="beforeInteractive"> in Next's layout.
 */
export const RUNTIME_HELPERS_SCRIPT = `(function() {
  // --- Navigation tracking ---
  function reportPath() {
    var p = location.pathname + location.search + location.hash;
    window.parent.postMessage({ type: 'dokiflux-navigation', path: p }, '*');
  }
  var origPush = history.pushState;
  var origReplace = history.replaceState;
  history.pushState = function() {
    origPush.apply(this, arguments);
    reportPath();
  };
  history.replaceState = function() {
    origReplace.apply(this, arguments);
    reportPath();
  };
  window.addEventListener('popstate', reportPath);
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'dokiflux-navigate') {
      history.pushState({}, '', e.data.path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });
  document.addEventListener('DOMContentLoaded', reportPath);

  // --- Runtime error forwarding ---
  var lastError = "";
  var errorTimeout = null;
  function sendError(error) {
    if (error === lastError) return;
    lastError = error;
    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(function() {
      window.parent.postMessage({ type: "dokiflux-runtime-error", error: error }, "*");
    }, 500);
  }
  window.onerror = function(message, source, lineno, colno, error) {
    var errorMsg = message + " at " + source + ":" + lineno + ":" + colno;
    if (error && error.stack) errorMsg += "\\n" + error.stack;
    sendError(errorMsg);
    return false;
  };
  window.onunhandledrejection = function(event) {
    var reason = event.reason;
    var errorMsg = "Unhandled Promise Rejection: ";
    if (reason instanceof Error) {
      errorMsg += reason.message;
      if (reason.stack) errorMsg += "\\n" + reason.stack;
    } else {
      errorMsg += String(reason);
    }
    sendError(errorMsg);
  };
  var originalConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var errorMsg = args.map(function(arg) {
      if (arg instanceof Error) return arg.message + (arg.stack ? "\\n" + arg.stack : "");
      if (typeof arg === "object") return JSON.stringify(arg);
      return String(arg);
    }).join(" ");
    sendError("Console Error: " + errorMsg);
    originalConsoleError.apply(console, arguments);
  };

  // --- Content-ready signal (so parent iframe hides loader) ---
  function signalReadyWhenPainted() {
    var rootEl = document.getElementById('root') || document.getElementById('__next') || document.body;
    function signalReady() {
      requestAnimationFrame(function() {
        setTimeout(function() {
          window.parent.postMessage({ type: "dokiflux-content-ready" }, "*");
        }, 150);
      });
    }
    if (rootEl && rootEl.children.length > 0) {
      signalReady();
      return;
    }
    if (!rootEl) return;
    var observer = new MutationObserver(function() {
      if (rootEl.children.length > 0) {
        observer.disconnect();
        signalReady();
      }
    });
    observer.observe(rootEl, { childList: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', signalReadyWhenPainted);
  } else {
    signalReadyWhenPainted();
  }
})();`;
