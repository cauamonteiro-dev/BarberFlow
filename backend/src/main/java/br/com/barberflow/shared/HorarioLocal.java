package br.com.barberflow.shared;

import java.time.LocalDateTime;
import java.time.ZoneId;

public final class HorarioLocal {
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private HorarioLocal() {}

    public static LocalDateTime agora() {
        return LocalDateTime.now(FUSO);
    }
}
