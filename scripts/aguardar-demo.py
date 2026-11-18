"""CI: porta HTTP aberta ainda não significa que as contas já foram criadas."""
import http.cookiejar
import json
import os
import time
import urllib.error
import urllib.request

base = os.environ.get('E2E_URL', 'http://127.0.0.1:5173').rstrip('/')
for attempt in range(90):
    try:
        session = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        with session.open(base + '/api/auth/csrf', timeout=3) as response:
            csrf = json.load(response)
        request = urllib.request.Request(base + '/api/auth/login', data=json.dumps({'email': 'admin@barberflow.local', 'senha': 'BarberFlow!2026'}).encode(), headers={'Content-Type': 'application/json', csrf['header']: csrf['token']})
        with session.open(request, timeout=5) as response:
            user = json.load(response)
        if any(role['perfil'] == 'ADMIN' for role in user['papeis']):
            print('Ambiente e autenticação de demonstração prontos.')
            break
    except (OSError, ValueError, KeyError, urllib.error.HTTPError):
        pass
    time.sleep(1)
else:
    raise SystemExit('O ambiente não concluiu a preparação do login.')
