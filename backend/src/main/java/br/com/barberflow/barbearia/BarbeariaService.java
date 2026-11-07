package br.com.barberflow.barbearia;

import br.com.barberflow.shared.RecursoNaoEncontradoException;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BarbeariaService {
    private final BarbeariaRepository repository;

    public BarbeariaService(BarbeariaRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public BarbeariaResponse cadastrar(BarbeariaRequest request) {
        Barbearia barbearia = new Barbearia(request.nome(), request.ativa());
        return BarbeariaResponse.from(repository.save(barbearia));
    }

    public List<BarbeariaResponse> listar() {
        return repository.findAll(Sort.by("id")).stream()
                .map(BarbeariaResponse::from)
                .toList();
    }

    public BarbeariaResponse buscar(Long id) {
        return repository.findById(id)
                .map(BarbeariaResponse::from)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Barbearia não encontrada."));
    }
}
