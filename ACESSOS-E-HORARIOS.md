# Testar os perfis, horários e faturamento

Esta entrega amplia a versão anterior. O GitBook publicado permanece inalterado: o texto proposto para sua atualização está em `PROPOSTA-DOCUMENTACAO-ACESSOS.md` e depende da aprovação do autor.

## Executar localmente

Na raiz, use os scripts existentes em dois terminais:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backend-local.ps1
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local.ps1
```

Abra http://127.0.0.1:5173. A migração V3 adiciona contas, permissões, expedientes, bloqueios e os campos financeiros. Os dados existentes em `.local/postgres` são mantidos; as migrações anteriores não são editadas.

O launcher local habilita explicitamente `barberflow.demo-acessos=true`, somente para o banco de demonstração. As três contas abaixo são criadas sem redefinir a senha de uma conta já existente:

| Perfil | E-mail | Senha inicial |
| --- | --- | --- |
| Administrador | admin@barberflow.local | BarberFlow!2026 |
| Barbeiro | barbeiro@barberflow.local | BarberFlow!2026 |
| Cliente | cliente@barberflow.local | BarberFlow!2026 |

O administrador de demonstração recebe acesso às unidades do banco local. O barbeiro corresponde ao primeiro profissional da carga; o cliente corresponde ao primeiro cliente. Esses acessos são para demonstração no computador. A aplicação convencional não habilita contas de demonstração por padrão.

## Primeiro administrador fora do modo demo

Na configuração local de execução, informe `ADMIN_EMAIL` e `ADMIN_PASSWORD` (10 a 72 caracteres, respeitando o limite de 72 bytes UTF-8 do BCrypt), com `ADMIN_SHOP_ID` para uma barbearia existente ou `ADMIN_SHOP_NAME` para criar a primeira. A configuração só é utilizada enquanto não houver nenhum administrador. Remova essas variáveis após a criação e não versione a senha.

O bootstrap não possui endpoint público. Em hospedagem com HTTPS, configure `SESSION_COOKIE_SECURE=true`. O cookie de sessão é HttpOnly e SameSite=Lax; o prazo de inatividade é de 30 minutos. O frontend usa token CSRF nas mutações e não guarda senha ou token de sessão em localStorage.

## Roteiro por perfil

**Administrador:** entre com a conta administrativa. A gestão existente continua disponível, filtrada pelas unidades administradas. “Acessos e horários” permite criar contas ou adicionar perfis na unidade, selecionar o profissional de um acesso de barbeiro, criar um acesso de cliente para um cadastro existente e remover permissões da equipe. Não é possível remover o último administrador de uma unidade. Uma mesma conta pode acumular funções; “Meu perfil” alterna as áreas disponíveis.

No expediente, adicione faixas por dia da semana. Para uma pausa de almoço, use duas faixas (por exemplo 09:00–12:00 e 13:00–18:00). Para férias ou ausências, crie bloqueios com início, término e motivo. A API rejeita mudanças que invalidem reservas futuras: resolva esses atendimentos antes de reduzir o expediente. Uma lista vazia fecha a agenda do profissional.

Profissionais existentes recebem inicialmente faixas amplas em todos os dias para preservar o comportamento da versão anterior. Profissionais novos recebem segunda a sábado, 09:00–18:00. Ajuste o expediente real antes de disponibilizar a agenda. Não são suportadas faixas atravessando a meia-noite; represente-as em dias separados.

**Cliente:** entre ou use o cadastro público. Selecione a barbearia, o profissional, o serviço e um horário disponível. A disponibilidade é conferida novamente ao salvar. A primeira reserva cria o vínculo com a unidade; vínculos inativados pelo administrador não são reativados automaticamente. Só é possível remarcar ou cancelar reservas próprias futuras em aberto. A reserva cancelada ou concluída não pode ser reaberta pelo cliente. A área mostra seu histórico e suas assinaturas.

O cadastro público não assume um cliente existente apenas pela coincidência do e-mail. Para um cadastro anterior, o administrador deve criar o acesso vinculado à pessoa correta. O cliente não pode escolher um identificador de outra pessoa nem se atribuir perfis de funcionário.

**Barbeiro:** a área mostra apenas sua agenda, os clientes desses atendimentos e seu expediente/bloqueios. É possível confirmar e concluir atendimentos atribuídos a ele; a conclusão só é permitida após o início. Relatórios executivos, preços e gestão de contas permanecem exclusivos do administrador.

## Faturamento de serviços realizados

Novas reservas registram o preço combinado. Uma mudança posterior do catálogo não modifica esse valor. Ao trocar de serviço, é registrado o novo preço; a remarcação do mesmo serviço preserva o valor já combinado. Para o cliente, se o preço exibido estiver desatualizado, a API rejeita a reserva para que o valor seja revisado.

A conclusão registra `concluido_em` uma única vez. Reservas concluídas não podem ser alteradas ou reabertas. O relatório soma `valor_acordado` de atendimentos CONCLUIDOS, usando a data de conclusão. Os atendimentos ainda em aberto são agrupados pela data agendada. O relatório identifica quantos registros concluídos contêm estimativas históricas.

Nos registros anteriores à V3, o valor foi preenchido com o preço disponível no catálogo e marcado `valor_estimado=true`; para concluídos antigos, a data de término agendada é a referência aproximada de conclusão. Esses dados não são apresentados como valores históricos exatos. Não há cobrança, registro de recebimento ou processamento de pagamentos.

## Verificação

`mvnw.cmd verify` em `backend` executa a suíte de domínio e a suíte de acesso com PostgreSQL temporário. `npm.cmd run build` compila o frontend. Com os dois servidores ativos, `scripts/testar-interface.ps1` executa os fluxos reais no navegador, incluindo cadastro de cliente, reserva, remarcação, cancelamento, portais, temas e telas administrativas.

Os testes de interface criam registros identificados como testes no banco demo e inativam as unidades de teste ao terminar. Os testes de API não utilizam o banco pessoal. A migração e o bootstrap não são um mecanismo de recuperação de senha; recuperação por e-mail e autenticação de dois fatores não integram esta entrega.
