# BarberFlow Web

React 19, Vite 7 e Axios. O frontend usa exclusivamente `/api` e o proxy Vite para o backend local: credenciais de banco nunca chegam ao navegador.

Com Node 22.12+ ou 24 LTS:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra http://127.0.0.1:5173. Inicie também o backend pelo guia da raiz. Se a API estiver em outra porta, defina `API_TARGET=http://127.0.0.1:8081` antes de executar o Vite.

`npm.cmd run build` produz `dist/`; `npm.cmd run preview` abre o build em 4173, com o mesmo proxy local. Em uma hospedagem futura, configure o servidor para encaminhar `/api` ao backend; não use o servidor Vite de desenvolvimento para produção.

## Uso

Selecione a unidade no topo. Os cadastros e indicadores respeitam a seleção. Clientes podem ser cadastrados com vínculo ou vinculados a partir de um cadastro existente. Editar o vínculo permite inativar/reativar sem apagar atendimentos. Na agenda, escolha cliente ativo, profissional e serviço, confira a disponibilidade e salve. Edite para confirmar, concluir ou cancelar. Assinaturas mostram o período e distinguem início futuro/período expirado do status administrativo.

Interface responsiva, navegação por teclado, labels nos campos, formulário modal nativo com foco controlado e mensagens de carregamento, sucesso e erro. O nome da unidade é mantido por identificador no armazenamento local do navegador.

`src/api.js` centraliza Axios e as mensagens de erro; `src/App.jsx` compõe as telas e formulários; `src/style.css` contém a apresentação responsiva. Os valores de preço são formatados em reais e as datas em pt-BR.

## Testes de navegador

Com backend e frontend iniciados, execute na raiz `scripts/testar-interface.ps1`. Linux/macOS: `npx playwright install chromium` e `npm run test:e2e`. Os testes utilizam a API real, criam uma unidade com nome de teste e a inativam após a execução. Eles devem ser executados no banco local de demonstração. Evidências e traces de falha ficam em `test-results`; screenshots locais em `.local/qa` na raiz. O script Windows mantém o Chromium em `.local/browsers`, para evitar downloads repetidos entre sessões.
