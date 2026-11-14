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


## Identidade visual e temas

A identidade parte da logo principal fornecida pelo autor: azul-marinho `#1B2936`, dourado `#D4B480` e branco quente `#FCFAF8`. O PNG original é preservado em `public/brand/barberflow.png`; a imagem completa aparece no painel e seu emblema é enquadrado por CSS na navegação, sem modificar o arquivo.

As cores da interface usam variáveis semânticas em `src/style.css`, com superfícies, textos, bordas e estados próprios para os temas claro e escuro. Verde/vermelho permanecem reservados aos estados de sucesso/erro, acompanhados de texto. A identidade mantém as fontes locais DM Sans e Manrope.

O botão **Modo escuro** no topo alterna os temas. Sem escolha salva, a plataforma segue `prefers-color-scheme` e acompanha as mudanças do sistema. A escolha manual fica em `localStorage` (`barberflow.theme`), persiste após recarga e sincroniza entre abas. Se o armazenamento estiver bloqueado, a alternância continua funcionando na sessão.

Um script curto no `index.html` aplica o tema antes de carregar a interface, evitando um primeiro quadro com o tema incorreto. `useTheme.js` centraliza a preferência; `ThemeToggle.jsx` expõe um botão com estado acessível por `aria-pressed`. O atributo `color-scheme` também adapta os controles nativos e a meta `theme-color` acompanha o fundo da aplicação.

Os testes em `tests/theme.spec.js` verificam logo carregada, temas em painéis/formulários, persistência, sincronização entre abas, preferência do sistema, armazenamento bloqueado e layouts móveis. A suíte completa da interface agora contém cinco testes. Screenshots dos temas ficam em `.local/qa/brand-*`.
