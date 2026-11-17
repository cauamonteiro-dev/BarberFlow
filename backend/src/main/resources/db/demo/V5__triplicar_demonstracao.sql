-- Exclusivo do perfil demo: 600 registros de negócio, sem alterar V2 já aplicada.
-- IDs originais mantidos; cópias isoladas por unidade, preservando todas as FKs.
INSERT INTO barbearia(id,nome,ativa) SELECT b.id+5*k,b.nome||CASE k WHEN 1 THEN ' Norte' ELSE ' Sul' END,b.ativa FROM barbearia b CROSS JOIN generate_series(1,2) k WHERE b.id<=5;
INSERT INTO cliente(id,nome,telefone,email) SELECT c.id+35*k,c.nome||CASE k WHEN 1 THEN ' Costa' ELSE ' Dias' END,'31982'||lpad((c.id+35*k)::text,6,'0'),'demo.'||(c.id+35*k)||'@example.test' FROM cliente c CROSS JOIN generate_series(1,2) k WHERE c.id<=35;
INSERT INTO cliente_barbearia(id,cliente_id,barbearia_id,status) SELECT v.id+50*k,v.cliente_id+35*k,v.barbearia_id+5*k,v.status FROM cliente_barbearia v CROSS JOIN generate_series(1,2) k WHERE v.id<=50;
INSERT INTO barbeiro(id,barbearia_id,nome,status) SELECT b.id+15*k,b.barbearia_id+5*k,b.nome||CASE k WHEN 1 THEN ' Costa' ELSE ' Dias' END,b.status FROM barbeiro b CROSS JOIN generate_series(1,2) k WHERE b.id<=15;
INSERT INTO servico(id,barbearia_id,nome,preco,duracao_min,status) SELECT s.id+25*k,s.barbearia_id+5*k,s.nome,round(s.preco*(1+0.08*k),2),s.duracao_min,s.status FROM servico s CROSS JOIN generate_series(1,2) k WHERE s.id<=25;
INSERT INTO plano(id,barbearia_id,nome,preco,status) SELECT p.id+10*k,p.barbearia_id+5*k,p.nome,round(p.preco*(1+0.08*k),2),p.status FROM plano p CROSS JOIN generate_series(1,2) k WHERE p.id<=10;
INSERT INTO agendamento(id,barbearia_id,cliente_id,barbeiro_id,servico_id,inicio,fim,status,valor_acordado,valor_estimado,concluido_em)
SELECT a.id+40*k,a.barbearia_id+5*k,a.cliente_id+35*k,a.barbeiro_id+15*k,a.servico_id+25*k,t.inicio,t.inicio+(a.fim-a.inicio),a.status,s.preco,false,CASE WHEN a.status='CONCLUIDO' THEN t.inicio+(a.fim-a.inicio) END
FROM agendamento a CROSS JOIN generate_series(1,2) k JOIN servico s ON s.id=a.servico_id+25*k
CROSS JOIN LATERAL (SELECT (CASE WHEN a.status IN ('AGENDADO','CONFIRMADO') THEN current_date+(a.id%14+1)::int ELSE current_date-(a.id%60+1)::int END)+a.inicio::time inicio) t WHERE a.id<=40;
INSERT INTO assinatura(id,cliente_id,plano_id,data_inicio,data_fim,status) SELECT a.id+20*k,a.cliente_id+35*k,a.plano_id+10*k,current_date-90,CASE WHEN a.data_fim IS NOT NULL THEN current_date+90 END,a.status FROM assinatura a CROSS JOIN generate_series(1,2) k WHERE a.id<=20;
INSERT INTO expediente(barbeiro_id,dia_semana,inicio,fim) SELECT b.id,d,'00:00'::time,'23:59:59'::time FROM barbeiro b CROSS JOIN generate_series(1,7) d WHERE b.id>15 AND b.id<=45;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['barbearia','cliente','cliente_barbearia','barbeiro','servico','plano','agendamento','assinatura'] LOOP EXECUTE format('SELECT setval(pg_get_serial_sequence(%L,''id''),(SELECT max(id) FROM %I),true)',t,t); END LOOP; END $$;
