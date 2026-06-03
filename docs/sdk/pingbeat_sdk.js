"use strict";

class PingBeatClient {
  constructor(opts) {
    this.apiKey = opts.apiKey;
    this.ingestUrl = opts.ingestUrl.replace(/\/+$/, "") + "/";
    this.flushInterval = opts.flushInterval ?? 30000;
    this.maxBatchSize = opts.maxBatchSize ?? 500;
    this.timeout = opts.timeout ?? 5000;
    this.sampleRate = Math.max(0, Math.min(1, opts.sampleRate ?? 1.0));
    this.excludedPaths = opts.excludedPaths ?? [
      "/health",
      "/readyz",
      "/favicon.ico",
    ];
    this.debug = opts.debug ?? false;

    this._buffer = [];
    this._timer = null;
    this._started = false;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._scheduleFlush();

    const onExit = () => {
      this._flushSync();
    };
    process.once("beforeExit", onExit);
    process.once("SIGINT", () => { onExit(); process.exit(0); });
    process.once("SIGTERM", () => { onExit(); process.exit(0); });
  }

  shutdown() {
    if (this._timer) clearTimeout(this._timer);
    this._flushSync();
    this._started = false;
  }

  capture({ endpoint, method, statusCode, responseTimeMs, timestamp }) {
    if (!this.apiKey) return;

    if (this.sampleRate < 1.0 && Math.random() > this.sampleRate) return;

    this._buffer.push({
      endpoint,
      method: (method || "GET").toUpperCase(),
      status_code: Number(statusCode),
      response_time_ms: Math.round(responseTimeMs * 100) / 100,
      timestamp: timestamp || new Date().toISOString(),
    });

    if (this._buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  isExcluded(path) {
    return this.excludedPaths.some((p) => path.startsWith(p));
  }

  async flush() {
    if (this._buffer.length === 0) return;
    const batch = this._buffer.splice(0);

    if (this.debug) {
      console.log(`[pingbeat] flushing ${batch.length} metrics`);
    }

    await this._send(batch);
  }

  _flushSync() {
    if (this._buffer.length === 0) return;
    const batch = this._buffer.splice(0);

    if (this.debug) {
      console.log(`[pingbeat] shutdown flush ${batch.length} metrics`);
    }

    this._send(batch).catch(() => {});
  }

  async _send(metrics) {
    const body = JSON.stringify({
      api_key: this.apiKey,
      metrics,
    });

    try {
      if (typeof globalThis.fetch === "function") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        await fetch(this.ingestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } else {
        await this._sendHttp(body);
      }

      if (this.debug) {
        console.log("[pingbeat] flush succeeded");
      }
    } catch (_err) {
      if (this.debug) {
        console.log("[pingbeat] flush failed:", _err.message);
      }
    }
  }

  _sendHttp(body) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.ingestUrl);
      const lib = url.protocol === "https:" ? require("https") : require("http");

      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
          timeout: this.timeout,
        },
        (res) => {
          res.resume();
          resolve();
        }
      );

      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
      req.write(body);
      req.end();
    });
  }

  _scheduleFlush() {
    this._timer = setTimeout(() => {
      this.flush().finally(() => {
        if (this._started) this._scheduleFlush();
      });
    }, this.flushInterval);

    if (this._timer.unref) this._timer.unref();
  }
}

let _client = null;

function init(opts) {
  _client = new PingBeatClient(opts);
  _client.start();
  return _client;
}

function getClient() {
  return _client;
}

function capture(metric) {
  if (_client) _client.capture(metric);
}

async function flush() {
  if (_client) await _client.flush();
}

function shutdown() {
  if (_client) _client.shutdown();
}

function expressMiddleware() {
  return function pingbeatMiddleware(req, res, next) {
    const client = getClient();
    if (!client) return next();

    const path = req.originalUrl || req.url;
    if (client.isExcluded(path)) return next();

    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const elapsed =
        Number(process.hrtime.bigint() - start) / 1_000_000;

      client.capture({
        endpoint: req.route ? req.route.path : req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: elapsed,
      });
    });

    next();
  };
}

module.exports = {
  PingBeatClient,
  init,
  getClient,
  capture,
  flush,
  shutdown,
  expressMiddleware,
};
