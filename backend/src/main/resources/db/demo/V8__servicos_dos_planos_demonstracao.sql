INSERT INTO plano_servico (plano_id, servico_id)
SELECT p.id, s.id
FROM plano p
JOIN servico s ON s.barbearia_id = p.barbearia_id
WHERE p.id BETWEEN 1 AND 30
  AND p.nome IN ('Plano Corte Mensal', 'Plano Completo')
  AND s.status = 'ATIVO'
  AND (s.nome IN ('Corte Tradicional', 'Corte Degrade') OR
       (p.nome = 'Plano Completo' AND s.nome IN ('Barba', 'Corte + Barba')))
ON CONFLICT DO NOTHING;
