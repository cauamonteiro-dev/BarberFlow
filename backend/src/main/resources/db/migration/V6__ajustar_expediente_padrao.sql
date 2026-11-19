-- Replace legacy full-day slots with the same default as new professionals.
-- Keep custom time ranges and existing appointments intact.
DELETE FROM expediente
WHERE dia_semana = 7
  AND inicio = TIME '00:00'
  AND fim IN (TIME '23:59', TIME '23:59:59');

UPDATE expediente
SET inicio = TIME '09:00', fim = TIME '18:00'
WHERE dia_semana BETWEEN 1 AND 6
  AND inicio = TIME '00:00'
  AND fim IN (TIME '23:59', TIME '23:59:59');
