from __future__ import annotations

import atexit
import logging
import random
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

try:
    import requests as _requests
except ImportError:
    _requests = None

__all__ = [
    "init",
    "capture",
    "flush",
    "shutdown",
    "PingBeatClient",
    "PingBeatDjangoMiddleware",
    "PingBeatFastAPIMiddleware",
    "pingbeat_flask_init",
]

logger = logging.getLogger("pingbeat_sdk")

class PingBeatClient:
    def __init__(
        self,
        api_key: str,
        ingest_url: str,
        flush_interval: float = 30,
        max_batch_size: int = 500,
        timeout: float = 5,
        sample_rate: float = 1.0,
        excluded_paths: tuple[str, ...] = ("/health", "/readyz", "/favicon.ico"),
        debug: bool = False,
    ) -> None:
        self.api_key = api_key
        self.ingest_url = ingest_url.rstrip("/") + "/"
        self.flush_interval = flush_interval
        self.max_batch_size = max_batch_size
        self.timeout = timeout
        self.sample_rate = max(0.0, min(1.0, sample_rate))
        self.excluded_paths = excluded_paths
        self.debug = debug

        self._buffer: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None
        self._started = False

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        self._schedule_flush()
        atexit.register(self.shutdown)

    def shutdown(self) -> None:
        if self._timer is not None:
            self._timer.cancel()
        self.flush()
        self._started = False

    def capture(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: float,
        timestamp: Optional[str] = None,
    ) -> None:
        if not self.api_key:
            return

        if self.sample_rate < 1.0 and random.random() > self.sample_rate:
            return

        metric: Dict[str, Any] = {
            "endpoint": endpoint,
            "method": method.upper(),
            "status_code": int(status_code),
            "response_time_ms": round(response_time_ms, 2),
            "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
        }

        should_flush = False
        with self._lock:
            self._buffer.append(metric)
            should_flush = len(self._buffer) >= self.max_batch_size

        if should_flush:
            threading.Thread(target=self.flush, daemon=True).start()

    def is_excluded(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.excluded_paths)

    def flush(self) -> None:
        with self._lock:
            if not self._buffer:
                return
            batch = self._buffer[:]
            self._buffer.clear()

        if self.debug:
            logger.debug("pingbeat: flushing %d metrics", len(batch))

        self._send(batch)

    def _send(self, metrics: List[Dict[str, Any]]) -> None:
        if _requests is None:
            logger.warning(
                "pingbeat: 'requests' package not installed — metrics dropped"
            )
            return
        try:
            resp = _requests.post(
                self.ingest_url,
                json={"api_key": self.api_key, "metrics": metrics},
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )
            if self.debug:
                logger.debug("pingbeat: ingest responded %s", resp.status_code)
        except Exception:
            if self.debug:
                logger.debug("pingbeat: flush failed (network error)", exc_info=True)

    def _schedule_flush(self) -> None:
        self._timer = threading.Timer(self.flush_interval, self._timer_tick)
        self._timer.daemon = True
        self._timer.start()

    def _timer_tick(self) -> None:
        self.flush()
        if self._started:
            self._schedule_flush()

_client: Optional[PingBeatClient] = None

def init(
    api_key: str,
    ingest_url: str,
    *,
    flush_interval: float = 30,
    max_batch_size: int = 500,
    timeout: float = 5,
    sample_rate: float = 1.0,
    excluded_paths: tuple[str, ...] = ("/health", "/readyz", "/favicon.ico"),
    debug: bool = False,
) -> PingBeatClient:
    global _client
    _client = PingBeatClient(
        api_key=api_key,
        ingest_url=ingest_url,
        flush_interval=flush_interval,
        max_batch_size=max_batch_size,
        timeout=timeout,
        sample_rate=sample_rate,
        excluded_paths=excluded_paths,
        debug=debug,
    )
    _client.start()
    return _client

def get_client() -> Optional[PingBeatClient]:
    return _client

def capture(
    endpoint: str,
    method: str = "GET",
    status_code: int = 200,
    response_time_ms: float = 0.0,
    timestamp: Optional[str] = None,
) -> None:
    if _client is not None:
        _client.capture(endpoint, method, status_code, response_time_ms, timestamp)

def flush() -> None:
    if _client is not None:
        _client.flush()

def shutdown() -> None:
    if _client is not None:
        _client.shutdown()

class PingBeatDjangoMiddleware:
    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        client = get_client()
        if client is None or client.is_excluded(request.path):
            return self.get_response(request)

        started = time.perf_counter()
        response = self.get_response(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        client.capture(
            endpoint=request.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=elapsed_ms,
        )
        return response

class PingBeatFastAPIMiddleware:
    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        client = get_client()
        path = scope.get("path", "/")

        if client is None or client.is_excluded(path):
            await self.app(scope, receive, send)
            return

        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            method = scope.get("method", "GET")
            client.capture(
                endpoint=path,
                method=method,
                status_code=status_code,
                response_time_ms=elapsed_ms,
            )

def pingbeat_flask_init(app: Any) -> None:
    from flask import g, request

    @app.before_request
    def _pb_before() -> None:
        g._pingbeat_start = time.perf_counter()

    @app.after_request
    def _pb_after(response: Any) -> Any:
        client = get_client()
        start = getattr(g, "_pingbeat_start", None)
        if client is None or start is None:
            return response

        if client.is_excluded(request.path):
            return response

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        client.capture(
            endpoint=request.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=elapsed_ms,
        )
        return response
