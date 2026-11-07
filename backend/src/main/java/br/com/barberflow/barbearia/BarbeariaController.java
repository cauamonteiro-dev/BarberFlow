package br.com.barberflow.barbearia;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/barbearias")
public class BarbeariaController {
    private final BarbeariaService service;

    public BarbeariaController(BarbeariaService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<BarbeariaResponse> cadastrar(@Valid @RequestBody BarbeariaRequest request) {
        BarbeariaResponse response = service.cadastrar(request);
        return ResponseEntity.created(URI.create("/api/barbearias/" + response.id())).body(response);
    }

    @GetMapping
    public List<BarbeariaResponse> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public BarbeariaResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }
}
