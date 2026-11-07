/* BARBERFLOW - POVOAMENTO DO BANCO DE DADOS
   200 registros fictícios e consistentes para a E3.
   Distribuição: 5 barbearias, 35 clientes, 50 vínculos, 15 barbeiros,
   25 serviços, 10 planos, 40 agendamentos e 20 assinaturas.
   A base foi pensada para SELECTs, JOINs, filtros, ORDER BY, GROUP BY,
   COUNT/SUM/AVG/MAX/MIN, análises por status e consultas por período. */

BEGIN;

-- 1) BARBEARIAS
INSERT INTO barbearia (id,nome,ativa) VALUES
(1,'Barbearia Central',TRUE),
(2,'Dom Barber',TRUE),
(3,'Corte & Estilo',TRUE),
(4,'Barber House',TRUE),
(5,'Nova Barbearia',FALSE);

-- 2) CLIENTES
INSERT INTO cliente (id,nome,telefone,email) VALUES
(1,'Lucas Almeida','31981000001','lucas.almeida@email.com'),
(2,'Matheus Oliveira','31981000002','matheus.oliveira@email.com'),
(3,'Gabriel Santos','31981000003','gabriel.santos@email.com'),
(4,'Rafael Souza','31981000004','rafael.souza@email.com'),
(5,'Pedro Henrique','31981000005','pedro.henrique@email.com'),
(6,'Joao Vitor','31981000006','joao.vitor@email.com'),
(7,'Felipe Costa','31981000007','felipe.costa@email.com'),
(8,'Bruno Martins','31981000008','bruno.martins@email.com'),
(9,'Gustavo Rocha','31981000009','gustavo.rocha@email.com'),
(10,'Henrique Lima','31981000010','henrique.lima@email.com'),
(11,'Caio Mendes','31981000011','caio.mendes@email.com'),
(12,'Daniel Ferreira','31981000012','daniel.ferreira@email.com'),
(13,'Thiago Ribeiro','31981000013','thiago.ribeiro@email.com'),
(14,'Leonardo Alves','31981000014','leonardo.alves@email.com'),
(15,'Vinicius Carvalho','31981000015','vinicius.carvalho@email.com'),
(16,'Arthur Gomes','31981000016','arthur.gomes@email.com'),
(17,'Eduardo Nunes','31981000017','eduardo.nunes@email.com'),
(18,'Rodrigo Barbosa','31981000018','rodrigo.barbosa@email.com'),
(19,'Marcelo Teixeira','31981000019','marcelo.teixeira@email.com'),
(20,'Anderson Castro','31981000020','anderson.castro@email.com'),
(21,'Diego Moreira','31981000021','diego.moreira@email.com'),
(22,'Igor Araujo','31981000022','igor.araujo@email.com'),
(23,'Renan Vieira','31981000023','renan.vieira@email.com'),
(24,'Samuel Freitas','31981000024','samuel.freitas@email.com'),
(25,'Murilo Cardoso','31981000025','murilo.cardoso@email.com'),
(26,'Vitor Hugo','31981000026','vitor.hugo@email.com'),
(27,'Alexandre Dias','31981000027','alexandre.dias@email.com'),
(28,'Guilherme Lopes','31981000028','guilherme.lopes@email.com'),
(29,'Nicolas Monteiro','31981000029','nicolas.monteiro@email.com'),
(30,'Enzo Martins','31981000030','enzo.martins@email.com'),
(31,'Joao Pedro','31981000031','joao.pedro@email.com'),
(32,'Carlos Eduardo','31981000032','carlos.eduardo@email.com'),
(33,'Marcos Vinicius','31981000033','marcos.vinicius@email.com'),
(34,'Wesley Santana','31981000034','wesley.santana@email.com'),
(35,'Otavio Pires','31981000035','otavio.pires@email.com');

-- 3) VÍNCULOS CLIENTE/BARBEARIA
INSERT INTO cliente_barbearia (id,cliente_id,barbearia_id,status) VALUES
(1,1,1,'ATIVO'),
(2,2,2,'ATIVO'),
(3,3,3,'ATIVO'),
(4,4,4,'ATIVO'),
(5,5,5,'ATIVO'),
(6,6,1,'ATIVO'),
(7,7,2,'INATIVO'),
(8,8,3,'ATIVO'),
(9,9,4,'ATIVO'),
(10,10,5,'ATIVO'),
(11,11,1,'ATIVO'),
(12,12,2,'ATIVO'),
(13,13,3,'ATIVO'),
(14,14,4,'INATIVO'),
(15,15,5,'ATIVO'),
(16,16,1,'ATIVO'),
(17,17,2,'ATIVO'),
(18,18,3,'ATIVO'),
(19,19,4,'ATIVO'),
(20,20,5,'ATIVO'),
(21,21,1,'INATIVO'),
(22,22,2,'ATIVO'),
(23,23,3,'ATIVO'),
(24,24,4,'ATIVO'),
(25,25,5,'ATIVO'),
(26,26,1,'ATIVO'),
(27,27,2,'ATIVO'),
(28,28,3,'INATIVO'),
(29,29,4,'ATIVO'),
(30,30,5,'ATIVO'),
(31,31,1,'ATIVO'),
(32,32,2,'ATIVO'),
(33,33,3,'ATIVO'),
(34,34,4,'ATIVO'),
(35,35,5,'INATIVO'),
(36,1,2,'ATIVO'),
(37,2,3,'ATIVO'),
(38,3,4,'ATIVO'),
(39,4,5,'ATIVO'),
(40,5,1,'ATIVO'),
(41,6,2,'ATIVO'),
(42,7,3,'ATIVO'),
(43,8,4,'ATIVO'),
(44,9,5,'ATIVO'),
(45,10,1,'ATIVO'),
(46,11,2,'ATIVO'),
(47,12,3,'ATIVO'),
(48,13,4,'ATIVO'),
(49,14,5,'ATIVO'),
(50,15,1,'ATIVO');

-- 4) BARBEIROS
INSERT INTO barbeiro (id,barbearia_id,nome,status) VALUES
(1,1,'Marcos','ATIVO'),
(2,2,'Rafael','ATIVO'),
(3,3,'Diego','ATIVO'),
(4,4,'Bruno','ATIVO'),
(5,5,'Felipe','INATIVO'),
(6,1,'Andre','ATIVO'),
(7,2,'Lucas','ATIVO'),
(8,3,'Caio','ATIVO'),
(9,4,'Gustavo','ATIVO'),
(10,5,'Renato','ATIVO'),
(11,1,'Victor','ATIVO'),
(12,2,'Thiago','INATIVO'),
(13,3,'Daniel','ATIVO'),
(14,4,'Leandro','ATIVO'),
(15,5,'Samuel','ATIVO');

-- 5) SERVIÇOS
INSERT INTO servico (id,barbearia_id,nome,preco,duracao_min,status) VALUES
(1,1,'Corte Tradicional',35.00,40,'ATIVO'),
(2,1,'Corte Degrade',45.00,50,'ATIVO'),
(3,1,'Barba',30.00,30,'ATIVO'),
(4,1,'Corte + Barba',65.00,70,'ATIVO'),
(5,1,'Sobrancelha',20.00,15,'ATIVO'),
(6,2,'Corte Tradicional',37.00,40,'ATIVO'),
(7,2,'Corte Degrade',47.00,50,'ATIVO'),
(8,2,'Barba',32.00,30,'ATIVO'),
(9,2,'Corte + Barba',67.00,70,'ATIVO'),
(10,2,'Sobrancelha',22.00,15,'ATIVO'),
(11,3,'Corte Tradicional',39.00,40,'ATIVO'),
(12,3,'Corte Degrade',49.00,50,'ATIVO'),
(13,3,'Barba',34.00,30,'ATIVO'),
(14,3,'Corte + Barba',69.00,70,'ATIVO'),
(15,3,'Sobrancelha',24.00,15,'ATIVO'),
(16,4,'Corte Tradicional',41.00,40,'ATIVO'),
(17,4,'Corte Degrade',51.00,50,'ATIVO'),
(18,4,'Barba',36.00,30,'ATIVO'),
(19,4,'Corte + Barba',71.00,70,'ATIVO'),
(20,4,'Sobrancelha',26.00,15,'ATIVO'),
(21,5,'Corte Tradicional',43.00,40,'ATIVO'),
(22,5,'Corte Degrade',53.00,50,'ATIVO'),
(23,5,'Barba',38.00,30,'ATIVO'),
(24,5,'Corte + Barba',73.00,70,'ATIVO'),
(25,5,'Sobrancelha',28.00,15,'INATIVO');

-- 6) PLANOS
INSERT INTO plano (id,barbearia_id,nome,preco,status) VALUES
(1,1,'Plano Corte Mensal',90.00,'ATIVO'),
(2,1,'Plano Completo',150.00,'ATIVO'),
(3,2,'Plano Corte Mensal',95.00,'ATIVO'),
(4,2,'Plano Completo',155.00,'ATIVO'),
(5,3,'Plano Corte Mensal',100.00,'ATIVO'),
(6,3,'Plano Completo',160.00,'ATIVO'),
(7,4,'Plano Corte Mensal',105.00,'ATIVO'),
(8,4,'Plano Completo',165.00,'ATIVO'),
(9,5,'Plano Corte Mensal',110.00,'ATIVO'),
(10,5,'Plano Completo',170.00,'INATIVO');

-- 7) AGENDAMENTOS
INSERT INTO agendamento (id,barbearia_id,cliente_id,barbeiro_id,servico_id,inicio,fim,status) VALUES
(1,1,1,1,1,'2026-02-01 09:00:00','2026-02-01 09:40:00','CONFIRMADO'),
(2,1,6,6,2,'2026-03-04 10:00:00','2026-03-04 10:50:00','CONCLUIDO'),
(3,1,11,11,3,'2026-04-07 11:00:00','2026-04-07 11:30:00','CANCELADO'),
(4,1,16,1,4,'2026-05-10 12:00:00','2026-05-10 13:10:00','AGENDADO'),
(5,1,26,6,5,'2026-06-13 13:00:00','2026-06-13 13:15:00','CONFIRMADO'),
(6,1,31,11,1,'2026-07-16 09:00:00','2026-07-16 09:40:00','CONCLUIDO'),
(7,1,5,1,2,'2026-08-19 10:00:00','2026-08-19 10:50:00','CANCELADO'),
(8,1,10,6,3,'2026-09-22 11:00:00','2026-09-22 11:30:00','AGENDADO'),
(9,2,2,2,6,'2026-03-01 09:00:00','2026-03-01 09:40:00','CONCLUIDO'),
(10,2,12,7,7,'2026-04-04 10:00:00','2026-04-04 10:50:00','CANCELADO'),
(11,2,17,12,8,'2026-05-07 11:00:00','2026-05-07 11:30:00','AGENDADO'),
(12,2,22,2,9,'2026-06-10 12:00:00','2026-06-10 13:10:00','CONFIRMADO'),
(13,2,27,7,10,'2026-07-13 13:00:00','2026-07-13 13:15:00','CONCLUIDO'),
(14,2,32,12,6,'2026-08-16 09:00:00','2026-08-16 09:40:00','CANCELADO'),
(15,2,1,2,7,'2026-09-19 10:00:00','2026-09-19 10:50:00','AGENDADO'),
(16,2,6,7,8,'2026-01-22 11:00:00','2026-01-22 11:30:00','CONFIRMADO'),
(17,3,3,3,11,'2026-04-01 09:00:00','2026-04-01 09:40:00','CANCELADO'),
(18,3,8,8,12,'2026-05-04 10:00:00','2026-05-04 10:50:00','AGENDADO'),
(19,3,13,13,13,'2026-06-07 11:00:00','2026-06-07 11:30:00','CONFIRMADO'),
(20,3,18,3,14,'2026-07-10 12:00:00','2026-07-10 13:10:00','CONCLUIDO'),
(21,3,23,8,15,'2026-08-13 13:00:00','2026-08-13 13:15:00','CANCELADO'),
(22,3,33,13,11,'2026-09-16 09:00:00','2026-09-16 09:40:00','AGENDADO'),
(23,3,2,3,12,'2026-01-19 10:00:00','2026-01-19 10:50:00','CONFIRMADO'),
(24,3,7,8,13,'2026-02-22 11:00:00','2026-02-22 11:30:00','CONCLUIDO'),
(25,4,4,4,16,'2026-05-01 09:00:00','2026-05-01 09:40:00','AGENDADO'),
(26,4,9,9,17,'2026-06-04 10:00:00','2026-06-04 10:50:00','CONFIRMADO'),
(27,4,19,14,18,'2026-07-07 11:00:00','2026-07-07 11:30:00','CONCLUIDO'),
(28,4,24,4,19,'2026-08-10 12:00:00','2026-08-10 13:10:00','CANCELADO'),
(29,4,29,9,20,'2026-09-13 13:00:00','2026-09-13 13:15:00','AGENDADO'),
(30,4,34,14,16,'2026-01-16 09:00:00','2026-01-16 09:40:00','CONFIRMADO'),
(31,4,3,4,17,'2026-02-19 10:00:00','2026-02-19 10:50:00','CONCLUIDO'),
(32,4,8,9,18,'2026-03-22 11:00:00','2026-03-22 11:30:00','CANCELADO'),
(33,5,5,5,21,'2026-06-01 09:00:00','2026-06-01 09:40:00','CONFIRMADO'),
(34,5,10,10,22,'2026-07-04 10:00:00','2026-07-04 10:50:00','CONCLUIDO'),
(35,5,15,15,23,'2026-08-07 11:00:00','2026-08-07 11:30:00','CANCELADO'),
(36,5,20,5,24,'2026-09-10 12:00:00','2026-09-10 13:10:00','AGENDADO'),
(37,5,25,10,21,'2026-01-13 13:00:00','2026-01-13 13:40:00','CONFIRMADO'),
(38,5,30,15,22,'2026-02-16 09:00:00','2026-02-16 09:50:00','CONCLUIDO'),
(39,5,4,5,23,'2026-03-19 10:00:00','2026-03-19 10:30:00','CANCELADO'),
(40,5,9,10,24,'2026-04-22 11:00:00','2026-04-22 12:10:00','AGENDADO');

-- 8) ASSINATURAS
INSERT INTO assinatura (id,cliente_id,plano_id,data_inicio,data_fim,status) VALUES
(1,1,1,'2026-01-06',NULL,'ATIVA'),
(2,6,2,'2026-02-06','2026-12-31','ATIVA'),
(3,11,1,'2026-03-06','2026-12-31','ENCERRADA'),
(4,16,2,'2026-04-06','2026-12-31','CANCELADA'),
(5,2,3,'2026-01-07',NULL,'ATIVA'),
(6,12,4,'2026-02-07','2026-12-31','ATIVA'),
(7,17,3,'2026-03-07','2026-12-31','ENCERRADA'),
(8,22,4,'2026-04-07','2026-12-31','CANCELADA'),
(9,3,5,'2026-01-08',NULL,'ATIVA'),
(10,8,6,'2026-02-08','2026-12-31','ATIVA'),
(11,13,5,'2026-03-08','2026-12-31','ENCERRADA'),
(12,18,6,'2026-04-08','2026-12-31','CANCELADA'),
(13,4,7,'2026-01-09',NULL,'ATIVA'),
(14,9,8,'2026-02-09','2026-12-31','ATIVA'),
(15,19,7,'2026-03-09','2026-12-31','ENCERRADA'),
(16,24,8,'2026-04-09','2026-12-31','CANCELADA'),
(17,5,9,'2026-01-10',NULL,'ATIVA'),
(18,10,10,'2026-02-10','2026-12-31','ATIVA'),
(19,15,9,'2026-03-10','2026-12-31','ENCERRADA'),
(20,20,10,'2026-04-10','2026-12-31','CANCELADA');

/* 9) AJUSTA AS SEQUÊNCIAS APÓS OS IDs MANUAIS. */
SELECT setval(pg_get_serial_sequence('barbearia','id'),(SELECT MAX(id) FROM barbearia),true);
SELECT setval(pg_get_serial_sequence('cliente','id'),(SELECT MAX(id) FROM cliente),true);
SELECT setval(pg_get_serial_sequence('cliente_barbearia','id'),(SELECT MAX(id) FROM cliente_barbearia),true);
SELECT setval(pg_get_serial_sequence('barbeiro','id'),(SELECT MAX(id) FROM barbeiro),true);
SELECT setval(pg_get_serial_sequence('servico','id'),(SELECT MAX(id) FROM servico),true);
SELECT setval(pg_get_serial_sequence('plano','id'),(SELECT MAX(id) FROM plano),true);
SELECT setval(pg_get_serial_sequence('agendamento','id'),(SELECT MAX(id) FROM agendamento),true);
SELECT setval(pg_get_serial_sequence('assinatura','id'),(SELECT MAX(id) FROM assinatura),true);

COMMIT;

-- CONFERÊNCIA: total por tabela
SELECT 'barbearia' tabela,COUNT(*) quantidade FROM barbearia UNION ALL
SELECT 'cliente',COUNT(*) FROM cliente UNION ALL
SELECT 'cliente_barbearia',COUNT(*) FROM cliente_barbearia UNION ALL
SELECT 'barbeiro',COUNT(*) FROM barbeiro UNION ALL
SELECT 'servico',COUNT(*) FROM servico UNION ALL
SELECT 'plano',COUNT(*) FROM plano UNION ALL
SELECT 'agendamento',COUNT(*) FROM agendamento UNION ALL
SELECT 'assinatura',COUNT(*) FROM assinatura;
