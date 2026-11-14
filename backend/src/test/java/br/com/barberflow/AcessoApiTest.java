package br.com.barberflow;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest @AutoConfigureMockMvc
class AcessoApiTest {
 static final EmbeddedPostgres PG=start();static String hash;
 static EmbeddedPostgres start(){try{var pg=EmbeddedPostgres.builder().setServerConfig("unix_socket_directories","").setLocaleConfig("locale","C").start();Runtime.getRuntime().addShutdownHook(new Thread(()->{try{pg.close();}catch(Exception e){throw new RuntimeException(e);}}));return pg;}catch(Exception e){throw new RuntimeException(e);}}
 @DynamicPropertySource static void props(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->PG.getJdbcUrl("postgres","postgres"));r.add("spring.datasource.username",()->"postgres");r.add("spring.datasource.password",()->"postgres");r.add("spring.flyway.locations",()->"classpath:db/migration");}
 @Autowired MockMvc mvc;@Autowired JdbcTemplate db;@Autowired PasswordEncoder encoder;@Autowired ObjectMapper json;
 @BeforeEach void seed(){
  db.execute("truncate usuario,barbearia,cliente restart identity cascade");
  db.update("insert into barbearia(id,nome,ativa) values (1,'Central',true),(2,'Outra',true)");
  db.update("insert into cliente(id,nome,email) values (1,'Ana','ana@example.com'),(2,'Bia','bia@example.com')");
  db.update("insert into cliente_barbearia(cliente_id,barbearia_id,status) values (1,1,'ATIVO'),(2,1,'ATIVO')");
  db.update("insert into barbeiro(id,barbearia_id,nome,status) values (1,1,'João','ATIVO'),(2,2,'Pedro','ATIVO')");
  db.update("insert into servico(id,barbearia_id,nome,preco,duracao_min,status) values (1,1,'Corte',50,30,'ATIVO'),(2,2,'Barba',25,30,'ATIVO')");
  db.update("insert into expediente(barbeiro_id,dia_semana,inicio,fim) select b.id,d,'08:00'::time,'18:00'::time from barbeiro b cross join generate_series(1,7) d");
  if(hash==null)hash=encoder.encode("Segredo!2026");
  for(int i=1;i<=5;i++){Object clientId=null;if(i==3)clientId=1;if(i==5)clientId=2;db.update("insert into usuario(id,nome,email,senha_hash,cliente_id) values (?,?,?,?,?)",i,"Pessoa "+i,"u"+i+"@example.com",hash,clientId);}
  db.update("insert into permissao(usuario_id,barbearia_id,perfil,barbeiro_id) values (1,1,'ADMIN',null),(2,1,'BARBEIRO',1),(4,2,'ADMIN',null)");
  db.execute("select setval(pg_get_serial_sequence('cliente','id'),2,true)");db.execute("select setval(pg_get_serial_sequence('usuario','id'),5,true)");
 }
 MockHttpSession login(int user)throws Exception{return (MockHttpSession)mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("email","u"+user+"@example.com","senha","Segredo!2026")))).andExpect(status().isOk()).andReturn().getRequest().getSession(false);}
 ResultActions as(int u,MockHttpServletRequestBuilder b)throws Exception{return mvc.perform(b.session(login(u)).with(csrf()));}
 String reserva(LocalDateTime t){return "{\"barbeariaId\":1,\"barbeiroId\":1,\"servicoId\":1,\"inicio\":\""+t+"\",\"status\":\"AGENDADO\",\"valorEsperado\":50}";}
 LocalDateTime future(){return LocalDate.now().plusDays(1).atTime(10,0);}
 long booking(int cliente,LocalDateTime inicio){return db.queryForObject("insert into agendamento(barbearia_id,cliente_id,barbeiro_id,servico_id,inicio,fim,status,valor_acordado,valor_estimado) values (1,?,1,1,?,?,'AGENDADO',50,false) returning id",Long.class,cliente,inicio,inicio.plusMinutes(30));}
 @Test void priceMustMatchTheCustomersDisplayedQuote()throws Exception {
  as(3,post("/api/portal/agendamentos").contentType("application/json").content(reserva(future()).replace("\"valorEsperado\":50","\"valorEsperado\":40"))).andExpect(status().isConflict());
  assertThat(db.queryForObject("select count(*) from agendamento",Long.class)).isZero();
 }
 @Test void validatesScheduleOwnershipAndIntervals()throws Exception {
  as(1,put("/api/administracao/barbeiros/2/horarios").contentType("application/json").content("{\"faixas\":[]}")).andExpect(status().isForbidden());
  as(3,get("/api/administracao/barbeiros/1/horarios")).andExpect(status().isForbidden());
  as(1,put("/api/administracao/barbeiros/1/horarios").contentType("application/json").content("{\"faixas\":[{\"diaSemana\":0,\"inicio\":\"09:00\",\"fim\":\"18:00\"}]}")).andExpect(status().isBadRequest());
 }
 @Test void requiresAuthenticationAndCsrf()throws Exception{
  mvc.perform(get("/api/barbearias")).andExpect(status().isUnauthorized());
  mvc.perform(post("/api/auth/login").contentType("application/json").content("{\"email\":\"u1@example.com\",\"senha\":\"Segredo!2026\"}")).andExpect(status().isForbidden());
  mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"u1@example.com\",\"senha\":\"errada\"}")).andExpect(status().isUnauthorized());
 }
 @Test void logoutInvalidatesSession()throws Exception{var s=login(1);mvc.perform(post("/api/auth/logout").session(s).with(csrf())).andExpect(status().isNoContent());assertThat(s.isInvalid()).isTrue();}
 @Test void administratorCannotAccessAnotherShopOrDirectResource()throws Exception{
  as(1,get("/api/barbearias")).andExpect(jsonPath("$.length()").value(1));
  as(1,get("/api/barbearias/2")).andExpect(status().isForbidden());
  as(1,get("/api/barbeiros/2")).andExpect(status().isForbidden());
  as(1,put("/api/servicos/2").contentType("application/json").content("{\"barbeariaId\":1,\"nome\":\"Ataque\",\"preco\":1,\"duracaoMin\":30,\"status\":\"ATIVO\"}")).andExpect(status().isForbidden());
  as(1,get("/api/relatorios").param("barbeariaId","2")).andExpect(status().isForbidden());
 }
 @Test void customerCannotUseAdministrativeRoutesOrOtherCustomers()throws Exception{
  as(3,get("/api/clientes")).andExpect(status().isForbidden());long id=booking(2,future());
  as(3,put("/api/portal/agendamentos/"+id).contentType("application/json").content(reserva(future()))).andExpect(status().isForbidden());
  as(3,get("/api/portal/painel").param("barbeariaId","1").param("perfil","CLIENTE")).andExpect(status().isOk()).andExpect(jsonPath("agendamentos.length()").value(0)).andExpect(jsonPath("clientes[0].nome").value("Ana"));
 }
 @Test void customerBooksReschedulesAndCancelsOwnFutureBooking()throws Exception{
  var body=as(3,post("/api/portal/agendamentos").contentType("application/json").content(reserva(future()))).andExpect(status().isOk()).andExpect(jsonPath("clienteId").value(1)).andReturn().getResponse().getContentAsString();long id=json.readTree(body).get("id").asLong();
  as(3,put("/api/portal/agendamentos/"+id).contentType("application/json").content(reserva(future().plusHours(1)))).andExpect(status().isOk());
  as(3,put("/api/portal/agendamentos/"+id).contentType("application/json").content(reserva(future().plusHours(1)).replace("AGENDADO","CANCELADO"))).andExpect(status().isOk());
  as(3,put("/api/portal/agendamentos/"+id).contentType("application/json").content(reserva(future()))).andExpect(status().isConflict());
 }
 @Test void customerCannotCompleteOrEditPastBookings()throws Exception{
  as(3,post("/api/portal/agendamentos").contentType("application/json").content(reserva(future()).replace("AGENDADO","CONCLUIDO"))).andExpect(status().isForbidden());long id=booking(1,LocalDate.now().minusDays(1).atTime(10,0));
  as(3,put("/api/portal/agendamentos/"+id).contentType("application/json").content(reserva(future()))).andExpect(status().isConflict());
 }
 @Test void barberOnlySeesAndUpdatesAssignedAppointments()throws Exception{
  long id=booking(1,LocalDate.now().minusDays(1).atTime(10,0));
  as(2,get("/api/portal/painel").param("barbeariaId","1").param("perfil","BARBEIRO")).andExpect(status().isOk()).andExpect(jsonPath("agendamentos.length()").value(1)).andExpect(jsonPath("clientes.length()").value(1));
  as(2,get("/api/portal/painel").param("barbeariaId","2").param("perfil","BARBEIRO")).andExpect(status().isForbidden());
  as(2,get("/api/relatorios").param("barbeariaId","1")).andExpect(status().isForbidden());
  as(2,put("/api/portal/atendimentos/"+id).contentType("application/json").content("{\"status\":\"CONCLUIDO\"}")).andExpect(status().isOk());
 }
 @Test void scheduleAndBlocksPreserveExistingReservations()throws Exception{
  var day=future();long id=booking(1,day);
  as(1,post("/api/administracao/barbeiros/1/bloqueios").contentType("application/json").content(json.writeValueAsString(Map.of("inicio",day,"fim",day.plusHours(1),"motivo","Ausência")))).andExpect(status().isConflict());
  as(1,put("/api/administracao/barbeiros/1/horarios").contentType("application/json").content("{\"faixas\":[]}")).andExpect(status().isConflict());
  as(3,post("/api/portal/agendamentos").contentType("application/json").content(reserva(day.withHour(23)))).andExpect(status().isConflict());
  db.update("update agendamento set status='CANCELADO' where id=?",id);
  as(1,post("/api/administracao/barbeiros/1/bloqueios").contentType("application/json").content(json.writeValueAsString(Map.of("inicio",day,"fim",day.plusHours(1),"motivo","Ausência")))).andExpect(status().isOk());
  as(3,post("/api/portal/agendamentos").contentType("application/json").content(reserva(day))).andExpect(status().isConflict());
 }
 @Test void recordedRevenueDoesNotChangeWithCatalogPrices()throws Exception{
  long id=booking(1,LocalDate.now().minusDays(1).atTime(10,0));
  as(2,put("/api/portal/atendimentos/"+id).contentType("application/json").content("{\"status\":\"CONCLUIDO\"}")).andExpect(status().isOk());db.update("update servico set preco=999 where id=1");
  as(1,get("/api/relatorios").param("barbeariaId","1").param("de",LocalDate.now().toString()).param("ate",LocalDate.now().toString())).andExpect(status().isOk()).andExpect(jsonPath("resumo.valorServicosConcluidos").value(50)).andExpect(jsonPath("resumo.atendimentosEstimados").value(0));
 }
 @Test void administratorCannotRemoveLastAdministrator()throws Exception{Long id=db.queryForObject("select id from permissao where usuario_id=1",Long.class);as(1,delete("/api/administracao/1/acessos/"+id)).andExpect(status().isConflict());}
 @Test void registrationCannotClaimAnExistingClientByEmail()throws Exception{
  mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content("{\"nome\":\"Impostor\",\"email\":\"ana@example.com\",\"senha\":\"Segredo!2026\"}")).andExpect(status().isConflict());
  mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content("{\"nome\":\"Novo\",\"email\":\"novo@example.com\",\"senha\":\"Segredo!2026\"}")).andExpect(status().isCreated());
  assertThat(db.queryForObject("select senha_hash from usuario where email='novo@example.com'",String.class)).startsWith("$2");
 }
}
