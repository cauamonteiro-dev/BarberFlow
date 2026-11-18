# Abrir o BarberFlow local

1. Dê dois cliques em **INICIAR-BARBERFLOW.cmd**.
2. Aguarde a mensagem **BarberFlow pronto**. O iniciador confere a interface e faz login real com os quatro perfis antes de abrir o navegador.
3. Use **http://localhost:8181/**. Mantenha a janela do iniciador aberta durante a apresentação.
4. Para encerrar com segurança, use **ENCERRAR-BARBERFLOW.cmd**. O banco é preservado.

Não é necessário iniciar front e backend separadamente, abrir o Vite ou usar as portas 5173 e 5175. O pacote local serve a interface compilada e a API no mesmo endereço e usa PostgreSQL próprio, restrito à máquina. Ele não utiliza o Render nem o banco da nuvem.

## Contas da demonstração

Senha de todas as contas abaixo: **BarberFlow!2026**.

| Perfil | E-mail |
| --- | --- |
| Administrador geral | admin@barberflow.local |
| Barbearia 1 | barbearia1@barberflow.local |
| Barbearias 2 a 15 | barbearia2@barberflow.local até barbearia15@barberflow.local |
| Barbeiro | barbeiro@barberflow.local |
| Cliente | cliente@barberflow.local |

Este ambiente possui uma base de demonstração persistente separada das execuções antigas, com os 600 registros iniciais. Ela fica em `.local/demo-dados`. Reiniciar não repete o povoamento e não apaga alterações realizadas. As senhas não são redefinidas em cada inicialização.

## Execução após reiniciar o computador

Abra novamente o mesmo iniciador. O pacote atual já está preparado e funciona sem baixar dependências da internet. Requer Java 21 instalado nesta máquina. Não mova nem apague a pasta do projeto ou `.local/demo-runtime`.

Abrir o iniciador duas vezes reutiliza o mesmo servidor e confere os logins novamente. Se a porta estiver ocupada por outro programa, o iniciador informa o problema sem encerrá-lo. Os registros ficam em `.local/demo-servidor.log` e `.local/demo-erros.log`.

## Após modificar o projeto

O iniciador compara a versão preparada com os arquivos atuais. Se houver mudanças, encerre a execução anterior e abra novamente: ele recompila o pacote com Node/npm e JDK 21. Na primeira preparação de uma cópia nova pode ser necessária internet para instalar dependências. Também é possível preparar manualmente com `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/preparar-demo.ps1`.

As cópias antigas abertas por outros comandos podem continuar exibindo telas e contas anteriores. Nesta máquina, os atalhos `C:\Users\cauae\Documents\Codex\INICIAR-BARBERFLOW.cmd` e `ENCERRAR-BARBERFLOW.cmd` apontam para esta cópia atualizada. A pasta original `C:\Portifolio\ProjetosDev\BarberFlow` não foi sobrescrita.
