-- 15 consultas do anexo acadêmico, extraídas sem modificar o original.
-- Execute no banco de desenvolvimento/demonstração pelo pgAdmin.

-- Consulta 1
SELECT id, nome, telefone, email
FROM cliente
ORDER BY nome ASC;

-- Consulta 2
SELECT id, nome, telefone, email
FROM cliente
WHERE nome ILIKE '%Lucas%'
ORDER BY nome;

-- Consulta 3
SELECT c.id, c.nome, cb.status AS status_vinculo
FROM cliente c
JOIN cliente_barbearia cb ON cb.cliente_id = c.id
WHERE cb.barbearia_id = 1
ORDER BY c.nome;

-- Consulta 4
SELECT id, nome, barbearia_id, status
FROM barbeiro
WHERE status = 'ATIVO'
ORDER BY barbearia_id, nome;

-- Consulta 5
SELECT id, nome, barbearia_id, preco, duracao_min
FROM servico
WHERE preco BETWEEN 25.00 AND 50.00
  AND status = 'ATIVO'
ORDER BY preco ASC;

-- Consulta 6
SELECT b.nome AS barbearia, s.nome AS servico,
       s.preco, s.duracao_min
FROM servico s
JOIN barbearia b ON b.id = s.barbearia_id
WHERE s.status = 'ATIVO'
ORDER BY b.nome, s.preco DESC;

-- Consulta 7
SELECT a.id AS agendamento_id, b.nome AS barbearia,
       c.nome AS cliente, br.nome AS barbeiro, s.nome AS servico,
       a.inicio, a.fim, a.status
FROM agendamento a
JOIN barbearia b ON b.id = a.barbearia_id
JOIN cliente c ON c.id = a.cliente_id
JOIN barbeiro br ON br.id = a.barbeiro_id
JOIN servico s ON s.id = a.servico_id
ORDER BY a.inicio;

-- Consulta 8
SELECT id, barbearia_id, cliente_id, barbeiro_id,
       servico_id, inicio, fim, status
FROM agendamento
WHERE inicio >= TIMESTAMP '2026-01-01 00:00:00'
  AND inicio <  TIMESTAMP '2026-04-01 00:00:00'
ORDER BY inicio;

-- Consulta 9
SELECT status, COUNT(*) AS quantidade
FROM agendamento
GROUP BY status
ORDER BY quantidade DESC;

-- Consulta 10
SELECT b.nome AS barbearia, COUNT(s.id) AS total_servicos,
       ROUND(AVG(s.preco), 2) AS preco_medio
FROM barbearia b
JOIN servico s ON s.barbearia_id = b.id
WHERE s.status = 'ATIVO'
GROUP BY b.id, b.nome
ORDER BY preco_medio DESC;

-- Consulta 11
SELECT a.id AS assinatura_id, c.nome AS cliente,
       p.nome AS plano, b.nome AS barbearia,
       a.data_inicio, a.data_fim, a.status
FROM assinatura a
JOIN cliente c ON c.id = a.cliente_id
JOIN plano p ON p.id = a.plano_id
JOIN barbearia b ON b.id = p.barbearia_id
ORDER BY a.status, a.data_inicio DESC;

-- Consulta 12
SELECT br.id, br.nome AS barbeiro, b.nome AS barbearia,
       COUNT(a.id) AS total_agendamentos
FROM barbeiro br
JOIN barbearia b ON b.id = br.barbearia_id
JOIN agendamento a ON a.barbeiro_id = br.id
GROUP BY br.id, br.nome, b.nome
HAVING COUNT(a.id) > 2
ORDER BY total_agendamentos DESC;

-- Consulta 13
SELECT b.id, b.nome AS barbearia,
       COUNT(a.id) AS total_agendamentos
FROM barbearia b
LEFT JOIN agendamento a ON a.barbearia_id = b.id
GROUP BY b.id, b.nome
ORDER BY total_agendamentos DESC, b.nome;

-- Consulta 14
SELECT s.id, b.nome AS barbearia, s.nome AS servico, s.preco
FROM servico s
JOIN barbearia b ON b.id = s.barbearia_id
WHERE s.preco > (SELECT AVG(preco) FROM servico)
ORDER BY s.preco DESC;

-- Consulta 15
SELECT c.id, c.nome,
       COUNT(cb.barbearia_id) AS quantidade_barbearias
FROM cliente c
JOIN cliente_barbearia cb ON cb.cliente_id = c.id
WHERE cb.status = 'ATIVO'
GROUP BY c.id, c.nome
HAVING COUNT(cb.barbearia_id) > 1
ORDER BY quantidade_barbearias DESC, c.nome;
