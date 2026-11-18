"""Valida o pacote local sem alterar registros de negócio nem encerrar o servidor."""
import hashlib
import http.cookiejar
import json
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:8181'


class Session:
    def __init__(self):
        self.open = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, path, body=None, headers=None):
        req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json', **(headers or {})})
        try:
            with self.open.open(req, timeout=15) as result:
                data = result.read().decode('utf-8-sig')
                return result.status, json.loads(data) if data else None
        except urllib.error.HTTPError as error:
            return error.code, None

    def post(self, path, body, headers=None):
        status, csrf = self.call('/api/auth/csrf')
        assert status == 200
        return self.call(path, body, {csrf['header']: csrf['token'], **(headers or {})})

    def login(self, email):
        status, user = self.post('/api/auth/login', {'email': email, 'senha': 'BarberFlow!2026'})
        assert status == 200, (email, status)
        return user


anonymous = Session()
assert anonymous.call('/api/auth/me')[0] == 401
assert anonymous.post('/api/local-demo/encerrar', {})[0] == 401
admin = Session()
assert any(p['perfil'] == 'ADMIN' for p in admin.login('admin@barberflow.local')['papeis'])
# Mesmo o administrador não pode encerrar o processo sem a chave local do iniciador.
assert admin.post('/api/local-demo/encerrar', {})[0] == 403
owner = Session()
assert all(p['barbearia_id'] == 1 for p in owner.login('barbearia1@barberflow.local')['papeis'])
assert len(owner.call('/api/barbearias')[1]) == 1
assert owner.call('/api/servicos?barbeariaId=2')[0] == 403
client = Session()
assert client.login('cliente@barberflow.local')['clienteId'] is not None
assert client.call('/api/clientes')[0] == 403
assert client.post('/api/local-demo/encerrar', {}, {'X-BarberFlow-Local-Control': 'incorreta'})[0] == 403
barber = Session()
assert any(p['perfil'] == 'BARBEIRO' for p in barber.login('barbeiro@barberflow.local')['papeis'])

def get(path):
    status, records = admin.call(path)
    assert status == 200, (path, status)
    return records


records = {'barbearias': get('/api/barbearias'), 'clientes': get('/api/clientes')}
for kind in ['vinculos', 'barbeiros', 'servicos', 'planos', 'assinaturas', 'agendamentos']:
    records[kind] = []
for shop in records['barbearias']:
    records['vinculos'].extend(get(f"/api/barbearias/{shop['id']}/clientes"))
    for kind in ['barbeiros', 'servicos', 'planos', 'assinaturas', 'agendamentos']:
        records[kind].extend(get(f"/api/{kind}?barbeariaId={shop['id']}"))
counts = {kind: len(rows) for kind, rows in records.items()}
assert counts == {'barbearias': 15, 'clientes': 105, 'vinculos': 150, 'barbeiros': 45, 'servicos': 75, 'planos': 30, 'assinaturas': 60, 'agendamentos': 120}, counts
fingerprint = hashlib.sha256(json.dumps(records, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
print(json.dumps({'counts': counts, 'total': sum(counts.values()), 'fingerprint': fingerprint, 'login_perfis': 4, 'isolamento': 'ok', 'controle_local': 'ok'}, ensure_ascii=False, indent=2))
