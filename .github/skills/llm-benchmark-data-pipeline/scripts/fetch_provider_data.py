from __future__ import annotations

import json
import os
import time
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ProviderEndpoint:
    name: str
    path: str
    method: str = "GET"
    body: Optional[Dict[str, Any]] = None
    headers: Dict[str, str] = field(default_factory=dict)


@dataclass
class ProviderConfig:
    name: str
    base_url: str
    api_key_env: Optional[str]
    endpoints: List[ProviderEndpoint]
    headers: Dict[str, str] = field(default_factory=dict)


PROVIDERS: List[ProviderConfig] = [
    ProviderConfig(
        name="example-provider",
        base_url="https://api.example.com",
        api_key_env="EXAMPLE_PROVIDER_API_KEY",
        endpoints=[
            ProviderEndpoint(name="pricing", path="/v1/pricing"),
            ProviderEndpoint(name="models", path="/v1/models"),
        ],
    ),
]


def build_headers(config: ProviderConfig, endpoint: ProviderEndpoint) -> Dict[str, str]:
    headers: Dict[str, str] = {"Accept": "application/json"}
    if config.api_key_env:
        api_key = os.getenv(config.api_key_env, "")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
    headers.update(config.headers)
    headers.update(endpoint.headers)
    return headers


def request_json(
    url: str,
    method: str,
    headers: Dict[str, str],
    body: Optional[Dict[str, Any]],
) -> Any:
    payload: Optional[bytes] = None
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
    request = urllib.request.Request(url, data=payload, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_provider(config: ProviderConfig, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    results: Dict[str, Any] = {}

    for endpoint in config.endpoints:
        url = f"{config.base_url.rstrip('/')}{endpoint.path}"
        results[endpoint.name] = request_json(
            url,
            endpoint.method,
            build_headers(config, endpoint),
            endpoint.body,
        )
        time.sleep(0.2)

    output_path = os.path.join(output_dir, f"{config.name}.json")
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(results, handle, ensure_ascii=False, indent=2)

    return output_path


def main() -> None:
    output_dir = os.getenv("RAW_OUTPUT_DIR", "./data/raw")
    written = [fetch_provider(provider, output_dir) for provider in PROVIDERS]
    print(f"Saved {len(written)} raw files to {output_dir}")


if __name__ == "__main__":
    main()
