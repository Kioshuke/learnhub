(function () {

  const SEVERITY = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low"
  };

  const IGNORED_ERRORS = [
    "ResizeObserver loop",
    "NetworkError when attempting to fetch resource",
    "Script error",
    "The operation was aborted",
    "cancelled",
    "AbortError"
  ];

  function classifySeverity(error) {
    const msg = String(error.message || error || "").toLowerCase();
    const stack = String(error.stack || "").toLowerCase();

    if (
      msg.includes("out of memory") ||
      msg.includes("stack overflow") ||
      msg.includes("security") ||
      msg.includes("xss") ||
      (msg.includes("cannot read") && msg.includes("null")) ||
      (msg.includes("undefined") && msg.includes("is not a function")) ||
      stack.includes("app crashed") ||
      msg.includes("critical")
    ) return SEVERITY.CRITICAL;

    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("timeout") ||
      msg.includes("abort") ||
      msg.includes("firebase") &&
      (msg.includes("error") || msg.includes("fail")) ||
      msg.includes("permission denied") ||
      msg.includes("unauthorized") ||
      msg.includes("not found") && msg.includes("document") ||
      msg.includes("cannot read property")
    ) return SEVERITY.HIGH;

    if (
      msg.includes("typeerror") ||
      msg.includes("referenceerror") ||
      msg.includes("syntaxerror") ||
      msg.includes("rangeerror") ||
      msg.includes("undefined is not") ||
      msg.includes("null is not") ||
      msg.includes("invalid")
    ) return SEVERITY.MEDIUM;

    return SEVERITY.LOW;
  }

  function getFileInfo(stack) {
    if (!stack) return { file: "unknown", line: 0 };
    const lines = String(stack).split("\n");
    for (const line of lines) {
      const match = line.match(/(https?:\/\/[^\s)]+|[a-zA-Z0-9_\-/]+\.(?:js|html))[:]?(\d+)?[:]?(\d+)?/);
      if (match) {
        let file = match[1];
        if (file.startsWith(window.location.origin)) {
          file = file.replace(window.location.origin, "");
        }
        return { file: file || "unknown", line: parseInt(match[2]) || 0 };
      }
    }
    return { file: "unknown", line: 0 };
  }

  function getUserInfo() {
    try {
      const u = window.currentLearnHubUser;
      if (u) return { uid: u.uid || "", email: u.email || "", displayName: u.displayName || "" };
      const nameEl = document.getElementById("userName");
      const emailEl = document.getElementById("popupEmail");
      return {
        uid: "",
        email: emailEl ? emailEl.textContent : "",
        displayName: nameEl ? nameEl.textContent : ""
      };
    } catch (e) {
      return { uid: "", email: "", displayName: "" };
    }
  }

  function getBrowserInfo() {
    return {
      userAgent: navigator.userAgent.substring(0, 200),
      url: window.location.href.substring(0, 500),
      referrer: document.referrer.substring(0, 500),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: Date.now()
    };
  }

  function shouldIgnore(msg) {
    return IGNORED_ERRORS.some(pat => String(msg || "").includes(pat));
  }

  let logQueue = [];
  let flushTimer = null;

  function sendLogsToFirestore(logs) {
    if (!logs || !logs.length) return;

    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < logs.length; i += batchSize) {
      batches.push(logs.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const payload = batch.map(log => ({
        ...log,
        _sentAt: new Date().toISOString()
      }));

      const url = `https://firestore.googleapis.com/v1/projects/onthi12-thpttanhong/databases/(default)/documents/errorLogs`;

      for (const log of payload) {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              message: { stringValue: String(log.message || "").substring(0, 500) },
              severity: { stringValue: log.severity || "low" },
              file: { stringValue: log.file || "unknown" },
              line: { integerValue: log.line || 0 },
              stack: { stringValue: String(log.stack || "").substring(0, 2000) },
              url: { stringValue: log.url || "" },
              userAgent: { stringValue: String(log.userAgent || "").substring(0, 200) },
              uid: { stringValue: log.uid || "" },
              email: { stringValue: log.email || "" },
              displayName: { stringValue: log.displayName || "" },
              timestamp: { integerValue: log.timestamp || Date.now() },
              viewed: { booleanValue: false },
              resolved: { booleanValue: false },
              _createdAt: { stringValue: new Date().toISOString() }
            }
          })
        }).catch(() => {});
      }
    }
  }

  function flushQueue() {
    if (logQueue.length === 0) return;
    const batch = logQueue.splice(0);
    sendLogsToFirestore(batch);
  }

  function enqueueLog(log) {
    logQueue.push(log);
    if (log.severity === SEVERITY.CRITICAL || log.severity === SEVERITY.HIGH) {
      flushQueue();
      return;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushQueue();
      }, 3000);
    }
  }

  function captureError(error, source) {
    if (!error) return;
    const msg = String(error.message || error || "Unknown error");
    if (shouldIgnore(msg)) return;

    const severity = classifySeverity(error);
    const fileInfo = getFileInfo(error.stack || source);
    const user = getUserInfo();
    const browser = getBrowserInfo();

    enqueueLog({
      message: msg.substring(0, 500),
      severity,
      file: fileInfo.file,
      line: fileInfo.line,
      stack: String(error.stack || source || "").substring(0, 2000),
      ...browser,
      ...user,
      source: "js"
    });
  }

  window.onerror = function (message, source, lineno, colno, error) {
    if (shouldIgnore(message)) return true;
    const severity = classifySeverity(error || message);
    const user = getUserInfo();
    const browser = getBrowserInfo();

    enqueueLog({
      message: String(message || "").substring(0, 500),
      severity,
      file: (source || "unknown").replace(window.location.origin, ""),
      line: lineno || 0,
      stack: error ? String(error.stack || "").substring(0, 2000) : "",
      ...browser,
      ...user,
      source: "window.onerror"
    });
    return true;
  };

  window.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason;
    const msg = String(reason?.message || reason || "Unhandled Promise rejection");
    if (shouldIgnore(msg)) return;

    captureError(reason, "unhandledrejection");

    const severity = classifySeverity(reason);
    if (severity === SEVERITY.CRITICAL || severity === SEVERITY.HIGH) {
      event.preventDefault();
    }
  });

  const origConsoleError = console.error;
  console.error = function () {
    const args = Array.from(arguments);
    const msg = args.map(a => String(a?.message || a || "")).join(" ");
    if (!shouldIgnore(msg)) {
      const error = args.find(a => a instanceof Error) || new Error(msg);
      captureError(error, "console.error");
    }
    return origConsoleError.apply(console, args);
  };

  window.addEventListener("load", () => {
    if (navigator.sendBeacon) {
      window.addEventListener("beforeunload", () => {
        flushQueue();
      });
    }
  });

  const origFetch = window.fetch;
  window.fetch = function () {
    const url = arguments[0];
    const urlStr = typeof url === "string" ? url : url?.url || "";
    return origFetch.apply(this, arguments).catch(function (err) {
      if (
        urlStr.includes("errorLogs") ||
        urlStr.includes("firestore.googleapis.com") ||
        shouldIgnore(err.message)
      ) throw err;

      const severity = urlStr.includes("firebase") ? SEVERITY.HIGH : SEVERITY.MEDIUM;
      const user = getUserInfo();
      const browser = getBrowserInfo();

      enqueueLog({
        message: `Fetch failed: ${urlStr} — ${err.message || "Unknown"}`,
        severity,
        file: "fetch",
        line: 0,
        stack: String(err.stack || "").substring(0, 2000),
        ...browser,
        ...user,
        source: "fetch"
      });
      throw err;
    });
  };

  document.addEventListener("error", function (e) {
    const target = e.target;
    if (target && (target.tagName === "IMG" || target.tagName === "SCRIPT" || target.tagName === "LINK" || target.tagName === "IFRAME")) {
      const src = target.src || target.href || "";
      if (!src || shouldIgnore(src)) return;
      const user = getUserInfo();
      const browser = getBrowserInfo();
      enqueueLog({
        message: `Resource load failed: ${target.tagName} — ${src}`,
        severity: SEVERITY.MEDIUM,
        file: src.replace(window.location.origin, ""),
        line: 0,
        stack: "",
        ...browser,
        ...user,
        source: "resource"
      });
    }
  }, true);

})();
