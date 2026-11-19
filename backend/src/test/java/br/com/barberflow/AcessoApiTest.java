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
 @Autowired br.com.barberflow.gestao.GestaoService gestao;
 @Test void agendaObrigaHorarioFuturoSemImpedirConfirmacaoHistorica() throws Exception {
  var passado = br.com.barberflow.shared.HorarioLocal.agora().toLocalDate().minusDays(1).atTime(10, 0);
  as(1, get("/api/disponibilidade").param("barbeariaId", "1").param("barbeiroId", "1")
      .param("servicoId", "1").param("inicio", passado.toString()))
      .andExpect(status().isOk()).andExpect(jsonPath("$.disponivel").value(false));
  as(1, post("/api/agendamentos").contentType("application/json").content(json.writeValueAsString(Map.of(
      "barbeariaId", 1, "barbeiroId", 1, "servicoId", 1, "clienteId", 1, "inicio", passado, "status", "AGENDADO"))))
      .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Escolha um horário futuro."));

  long id = booking(1, passado);
  as(2, put("/api/portal/atendimentos/" + id).contentType("application/json")
      .content("{\"status\":\"CONFIRMADO\"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMADO"));
 }

 @Test void clienteVeNomeDoPlanoDaPropriaAssinatura() throws Exception {
  db.update("insert into plano(id,barbearia_id,nome,preco,status) values (1,1,'Corte mensal',60,'ATIVO')");
  db.update("insert into assinatura(cliente_id,plano_id,data_inicio,status) values (1,1,'2026-01-06','ATIVA'),(2,1,'2026-01-06','ATIVA')");
  as(3, get("/api/portal/painel").param("barbeariaId", "1").param("perfil", "CLIENTE"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.assinaturas.length()").value(1))
      .andExpect(jsonPath("$.assinaturas[0].planoNome").value("Corte mensal"))
      .andExpect(jsonPath("$.assinaturas[0].dataInicio").value("2026-01-06"));
 }

 @Test void nomeEmBrancoTemMensagemDeCadastroLegivel() throws Exception {
  mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json")
      .content("{\"nome\":\"   \",\"email\":\"nova@example.com\",\"senha\":\"Segredo!2026\"}"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Informe seu nome."));
 }

 @Test void dailySlotsMatchIndividualAvailabilityAcrossBreaksBlocksBookingsAndRescheduling()throws Exception {
  var dia=LocalDate.now().plusDays(2);
  db.update("delete from expediente where barbeiro_id=1");
  db.update("insert into expediente(barbeiro_id,dia_semana,inicio,fim) values (1,?,'09:00','12:00'),(1,?,'13:00','18:00')",dia.getDayOfWeek().getValue(),dia.getDayOfWeek().getValue());
  long own=booking(1,dia.atTime(10,0));
  long canceled=booking(2,dia.atTime(14,0));db.update("update agendamento set status='CANCELADO' where id=?",canceled);
  booking(2,dia.atTime(15,0));
  db.update("insert into bloqueio(barbeiro_id,inicio,fim,motivo) values (1,?,?,'Intervalo')",dia.atTime(11,0),dia.atTime(11,45));
  for(Long ignore:new Long[]{null,own}) {
   var expected=new ArrayList<Map<String,Object>>();
   for(int minute=0;minute<1440;minute+=15){var inicio=dia.atStartOfDay().plusMinutes(minute);var slot=gestao.disponibilidade(1L,1L,1L,inicio,ignore);if(Boolean.TRUE.equals(slot.get("disponivel")))expected.add(slot);}
   assertThat(gestao.horariosDisponiveis(1L,1L,1L,dia,ignore)).isEqualTo(expected);
  }
  as(3,get("/api/portal/horarios-disponiveis").param("barbeariaId","1").param("barbeiroId","1").param("servicoId","1").param("dia",dia.toString())).andExpect(status().isOk()).andExpect(jsonPath("$[0].inicio").value(dia+"T09:00:00"));
  assertThat(gestao.horariosDisponiveis(1L,1L,1L,dia,null)).noneMatch(slot->slot.get("inicio").equals(dia.atTime(10,0)));
  assertThat(gestao.horariosDisponiveis(1L,1L,1L,dia,own)).anyMatch(slot->slot.get("inicio").equals(dia.atTime(10,0)));
 }
 @Test void dailySlotsRejectOtherUnitsAndReturnEmptyForInactiveOrMissingWorkingHours()throws Exception {
  var dia=LocalDate.now().plusDays(2);
  as(3,get("/api/portal/horarios-disponiveis").param("barbeariaId","1").param("barbeiroId","2").param("servicoId","1").param("dia",dia.toString())).andExpect(status().isConflict());
  db.update("update servico set status='INATIVO' where id=1");assertThat(gestao.horariosDisponiveis(1L,1L,1L,dia,null)).isEmpty();
  db.update("update servico set status='ATIVO' where id=1");db.update("delete from expediente where barbeiro_id=1");assertThat(gestao.horariosDisponiveis(1L,1L,1L,dia,null)).isEmpty();
 }
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
 @Test void customerHomeIncludesOnlyOwnBookingsAcrossShopsEvenIfAClientIdIsForged()throws Exception{
  long own=booking(1,future());booking(2,future().plusHours(1));
  db.update("insert into cliente_barbearia(cliente_id,barbearia_id,status) values (1,2,'ATIVO')");
  db.update("insert into agendamento(barbearia_id,cliente_id,barbeiro_id,servico_id,inicio,fim,status,valor_acordado,valor_estimado) values (2,1,2,2,?,?,'AGENDADO',50,false)",future().plusDays(1),future().plusDays(1).plusMinutes(30));
  db.update("update barbearia set ativa=false where id=2");
  as(3,get("/api/portal/meus-agendamentos").param("clienteId","2")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].barbeariaNome").value("Outra")).andExpect(jsonPath("$[0].barbeariaAtiva").value(false)).andExpect(jsonPath("$[1].id").value(own)).andExpect(jsonPath("$[1].barbeiroNome").value("João")).andExpect(jsonPath("$[1].inicio").value(future().toString()+":00"));
  as(2,get("/api/portal/meus-agendamentos")).andExpect(status().isForbidden());
  as(5,get("/api/portal/meus-agendamentos")).andExpect(jsonPath("$.length()").value(1));
 }
 @Test void sessionIdentityContainsOnlyAuthorizedUnitsAndTheRealProfessionalName()throws Exception{
  as(2,get("/api/auth/me")).andExpect(jsonPath("unidades.length()").value(1)).andExpect(jsonPath("unidades[0].nome").value("Central")).andExpect(jsonPath("unidades[0].profissional_nome").value("João"));
  as(3,get("/api/auth/me")).andExpect(jsonPath("unidades.length()").value(0)).andExpect(jsonPath("nomeExibicao").value("Ana"));
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
 @Test void administratorCannotRemoveLastAdministrator()throws Exception{db.update("update usuario set admin_global=true where id=1");Long id=db.queryForObject("select id from permissao where usuario_id=1",Long.class);as(1,delete("/api/administracao/1/acessos/"+id)).andExpect(status().isConflict());}
 @Test void registrationCannotClaimAnExistingClientByEmail()throws Exception{
  mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content("{\"nome\":\"Impostor\",\"email\":\"ana@example.com\",\"senha\":\"Segredo!2026\"}")).andExpect(status().isConflict());
  mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content("{\"nome\":\"Novo\",\"email\":\"novo@example.com\",\"senha\":\"Segredo!2026\"}")).andExpect(status().isCreated());
  assertThat(db.queryForObject("select senha_hash from usuario where email='novo@example.com'",String.class)).startsWith("$2");
 }
 @Test void barbeariaRoleIsRestrictedAcrossListsIdsReportsAndManagement()throws Exception{
  db.update("update permissao set perfil='BARBEARIA' where usuario_id=1");
  as(1,get("/api/auth/me")).andExpect(jsonPath("papeis[0].perfil").value("BARBEARIA"));
  as(1,get("/api/barbearias")).andExpect(jsonPath("$.length()").value(1));
  as(1,get("/api/portal/barbearias")).andExpect(jsonPath("$.length()").value(1));
  for(String route:List.of("/api/barbearias/2","/api/barbeiros/2","/api/servicos/2","/api/administracao/2/acessos","/api/relatorios/dashboard?barbeariaId=2"))as(1,get(route)).andExpect(status().isForbidden());
  as(1,post("/api/barbearias").contentType("application/json").content("{\"nome\":\"Intrusa\",\"ativa\":true}")).andExpect(status().isForbidden());
  as(1,post("/api/administracao/1/acessos").contentType("application/json").content("{\"nome\":\"Gestor\",\"email\":\"gestor@example.com\",\"senha\":\"Segredo!2026\",\"perfil\":\"BARBEARIA\"}")).andExpect(status().isForbidden());
  as(1,put("/api/servicos/1").contentType("application/json").content("{\"barbeariaId\":1,\"nome\":\"Corte novo\",\"preco\":60,\"duracaoMin\":30,\"status\":\"ATIVO\"}")).andExpect(status().isOk());
 }
 @Test void globalAdministratorSeesAllShopsAndCreatesOnlyLocalManagementThroughTheForm()throws Exception{
  db.update("update usuario set admin_global=true where id=1");
  as(1,get("/api/auth/me")).andExpect(jsonPath("papeis[0].perfil").value("ADMIN"));
  as(1,get("/api/barbearias")).andExpect(jsonPath("$.length()").value(2));
  as(1,get("/api/servicos/2")).andExpect(status().isOk());
  var payload="{\"nome\":\"Gestor\",\"email\":\"gestor@example.com\",\"senha\":\"Segredo!2026\",\"perfil\":\"BARBEARIA\"}";
  as(1,post("/api/administracao/1/acessos").contentType("application/json").content(payload)).andExpect(status().isOk());
  as(1,post("/api/administracao/2/acessos").contentType("application/json").content(payload)).andExpect(status().isConflict());
  as(1,post("/api/administracao/1/acessos").contentType("application/json").content(payload.replace("BARBEARIA","ADMIN"))).andExpect(status().isConflict());
  assertThat(db.queryForObject("select admin_global from usuario where email='gestor@example.com'",Boolean.class)).isFalse();
 }
 @Test void strategicDashboardFiltersHistoricalAmountsAndComparesPeriods()throws Exception{
  var now=LocalDate.now();long done=booking(1,now.minusDays(2).atTime(10,0));
  db.update("update agendamento set status='CONCLUIDO',concluido_em=? where id=?",now.minusDays(1).atTime(11,0),done);
  long cancelled=booking(2,now.minusDays(3).atTime(10,0));db.update("update agendamento set status='CANCELADO' where id=?",cancelled);
  booking(1,now.plusDays(1).atTime(10,0));
  long old=booking(1,now.minusYears(1).atTime(10,0));db.update("update agendamento set status='CONCLUIDO',concluido_em=? where id=?",now.minusYears(1).atTime(11,0),old);
  db.update("update servico set preco=999 where id=1");
  var result=as(1,get("/api/relatorios/dashboard").param("barbeariaId","1").param("barbeiroId","1").param("servicoId","1")).andExpect(status().isOk()).andExpect(jsonPath("indicadores.agendamentos").value(3)).andExpect(jsonPath("indicadores.concluidos").value(1)).andExpect(jsonPath("indicadores.faturamento").value(50)).andExpect(jsonPath("indicadores.ticketMedio").value(50)).andExpect(jsonPath("indicadores.cancelamentoPercentual").value(33.33)).andExpect(jsonPath("indicadores.valorEmAberto").value(50)).andExpect(jsonPath("anterior.faturamento").value(50)).andReturn();
  var report=json.readTree(result.getResponse().getContentAsString());assertThat(report.get("serie").size()).isEqualTo(12);
  as(1,get("/api/relatorios/dashboard").param("barbeariaId","1").param("barbeiroId","2")).andExpect(status().isForbidden());
  as(1,get("/api/relatorios/dashboard").param("barbeariaId","1").param("servicoId","2")).andExpect(status().isForbidden());
  as(1,get("/api/relatorios/dashboard").param("barbeariaId","1").param("de","2026-12-01").param("ate","2026-01-01")).andExpect(status().isConflict());
  as(2,get("/api/relatorios/dashboard").param("barbeariaId","1")).andExpect(status().isForbidden());
  as(3,get("/api/relatorios/dashboard").param("barbeariaId","1")).andExpect(status().isForbidden());
 }

}
