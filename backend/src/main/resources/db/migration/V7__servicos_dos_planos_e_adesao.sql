CREATE TABLE plano_servico (
    plano_id BIGINT NOT NULL REFERENCES plano(id),
    servico_id BIGINT NOT NULL REFERENCES servico(id),
    PRIMARY KEY (plano_id, servico_id)
);

ALTER TABLE assinatura DROP CONSTRAINT ck_assinatura_status;
ALTER TABLE assinatura ADD CONSTRAINT ck_assinatura_status
    CHECK (status IN ('PENDENTE', 'ATIVA', 'ENCERRADA', 'CANCELADA'));

CREATE UNIQUE INDEX uq_assinatura_pendente
    ON assinatura (cliente_id, plano_id) WHERE status = 'PENDENTE';

ALTER TABLE assinatura ADD CONSTRAINT uq_assinatura_cliente UNIQUE (id, cliente_id);
ALTER TABLE agendamento ADD COLUMN assinatura_id BIGINT;
ALTER TABLE agendamento ADD CONSTRAINT fk_agendamento_assinatura_cliente
    FOREIGN KEY (assinatura_id, cliente_id) REFERENCES assinatura (id, cliente_id);
ALTER TABLE agendamento ADD CONSTRAINT ck_agendamento_valor_plano
    CHECK (assinatura_id IS NULL OR (valor_acordado IS NOT NULL AND valor_acordado = 0 AND NOT valor_estimado));
CREATE INDEX ix_agendamento_assinatura ON agendamento (assinatura_id, inicio)
    WHERE assinatura_id IS NOT NULL;
