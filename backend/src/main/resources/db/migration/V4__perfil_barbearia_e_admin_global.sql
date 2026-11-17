-- A conta global é explícita e nunca concedida pelo formulário de acessos.
ALTER TABLE usuario ADD COLUMN admin_global BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE permissao DROP CONSTRAINT permissao_perfil_check;
ALTER TABLE permissao DROP CONSTRAINT permissao_check;
ALTER TABLE permissao ADD CONSTRAINT ck_permissao_perfil CHECK(perfil IN ('ADMIN','BARBEARIA','BARBEIRO'));
ALTER TABLE permissao ADD CONSTRAINT ck_permissao_profissional CHECK ((perfil='BARBEIRO' AND barbeiro_id IS NOT NULL) OR (perfil IN ('ADMIN','BARBEARIA') AND barbeiro_id IS NULL));
-- Administradores legados continuam locais, sem promoção automática a acesso global.
UPDATE permissao SET perfil='BARBEARIA' WHERE perfil='ADMIN';
