"""Checks the built cloud image against a disposable CI database."""
import http.client
from http.cookies import SimpleCookie
import json
import os
import re
import time

cookies = {}


def request(method, path, data=None, headers=None, verify_headers=None):
    conn = http.client.HTTPConnection("127.0.0.1", 10000, timeout=15)
    outgoing = {"X-Forwarded-Proto": "https", **(headers or {})}
    if cookies:
        outgoing["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())
    if data is not None:
        outgoing["Content-Type"] = "application/json"
    conn.request(method, path, json.dumps(data) if data is not None else None, outgoing)
    res = conn.getresponse()
    if verify_headers:
        verify_headers(res)
    body = res.read().decode()
    for key, value in res.getheaders():
        if key.lower() == "set-cookie":
            parsed = SimpleCookie(value)
            for name, cookie in parsed.items():
                if cookie["max-age"] == "0" or not cookie.value:
                    cookies.pop(name, None)
                    continue
                if name == "JSESSIONID":
                    assert cookie["secure"] and cookie["httponly"], "Session cookie must be secure and HttpOnly"
                cookies[name] = cookie.value
    status = res.status
    conn.close()
    return status, body


for attempt in range(90):
    try:
        if request("GET", "/api/auth/csrf")[0] == 200:
            break
    except (OSError, http.client.HTTPException):
        pass
    time.sleep(2)
else:
    raise RuntimeError("Cloud image did not start")

def verify_showcase_preview(response):
    assert response.getheader("X-Frame-Options") is None
    assert response.getheader("Content-Security-Policy") == (
        "frame-ancestors https://mostraplus.com.br"
    )


def verify_private_api(response):
    assert response.getheader("X-Frame-Options") == "DENY"
    assert response.getheader("Access-Control-Allow-Origin") is None


status, html = request("GET", "/", verify_headers=verify_showcase_preview)
assert status == 200 and '<div id="root">' in html, "Built frontend is missing"
assert request("HEAD", "/index.html", verify_headers=verify_showcase_preview)[0] == 200
asset = re.search(r'src="([^"]+\.js)"', html)
assert asset and request("GET", asset.group(1))[0] == 200, "Compiled asset unavailable"


def verify_content_type(expected):
    def verify(response):
        actual = response.getheader("Content-Type", "")
        assert expected in actual, f"Expected {expected}, received {actual!r}"
    return verify


assert 'rel="manifest" href="/manifest.json"' in html
status, manifest_text = request("GET", "/manifest.json", verify_headers=verify_content_type("json"))
assert status == 200 and json.loads(manifest_text)["display"] == "standalone"
assert request("GET", "/sw.js", verify_headers=verify_content_type("javascript"))[0] == 200
assert request("GET", "/offline.html", verify_headers=verify_content_type("text/html"))[0] == 200
icons = [icon["src"] for icon in json.loads(manifest_text)["icons"]]
apple_images = re.findall(r'rel="apple-touch-(?:icon|startup-image)"[^>]+href="([^"]+)"', html)
for url in icons + apple_images:
    assert request("HEAD", url, verify_headers=verify_content_type("image/png"))[0] == 200, url

assert request(
    "GET", "/api/auth/me",
    headers={"Origin": "https://mostraplus.com.br"},
    verify_headers=verify_private_api,
)[0] == 401
assert request("GET", "/api/clientes", verify_headers=verify_private_api)[0] == 401


def post(path, payload):
    status, body = request("GET", "/api/auth/csrf")
    assert status == 200
    csrf = json.loads(body)
    return request("POST", path, payload, {csrf["header"]: csrf["token"]})


assert post("/api/auth/login", {"email": "admin@barberflow.local", "senha": "BarberFlow!2026"})[0] == 401, "Demo credentials must be disabled"
status, body = post("/api/auth/login", {"email": os.environ["ADMIN_EMAIL"], "senha": os.environ["ADMIN_PASSWORD"]})
assert status == 200, "Cloud administrator cannot log in"
assert any(role["perfil"] == "ADMIN" for role in json.loads(body)["papeis"])
status, body = request("GET", "/api/barbearias")
assert status == 200 and len(json.loads(body)) == 1, "Initial shop missing"
assert post("/api/auth/logout", {})[0] == 204
assert request("GET", "/api/auth/me")[0] == 401, "Logout must end the session"
cookies.clear()
customer = {"nome": "Colega de teste", "email": "colega@example.com", "senha": "CloudClientTest!2026"}
assert post("/api/auth/cadastro", customer)[0] == 201
assert post("/api/auth/login", {"email": customer["email"], "senha": customer["senha"]})[0] == 200
assert request("GET", "/api/clientes")[0] == 403, "Customer must not list clients"
print("Cloud image: frontend, assets, secure session, bootstrap, registration and access checks passed.")
