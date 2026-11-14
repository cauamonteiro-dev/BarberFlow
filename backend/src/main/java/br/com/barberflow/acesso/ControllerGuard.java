package br.com.barberflow.acesso;
import java.util.*;
import org.aspectj.lang.*;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.context.request.*;
import org.springframework.web.servlet.HandlerMapping;

/** Applies shop ownership checks to the administrative API, including direct ID routes. */
@Aspect @Component
public class ControllerGuard {
 private final Acesso acesso;private final JdbcTemplate db;
 public ControllerGuard(Acesso acesso,JdbcTemplate db){this.acesso=acesso;this.db=db;}
 @Around("execution(public * br.com.barberflow.gestao.GestaoController.*(..)) || execution(public * br.com.barberflow.gestao.RelatorioController.*(..)) || execution(public * br.com.barberflow.barbearia.BarbeariaController.*(..))")
 public Object guard(ProceedingJoinPoint point)throws Throwable{
   var req=((ServletRequestAttributes)RequestContextHolder.currentRequestAttributes()).getRequest();
   String path=req.getRequestURI();String method=req.getMethod();
   if(!acesso.algumAdmin())acesso.negar();
   @SuppressWarnings("unchecked") var vars=(Map<String,String>)req.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
   Long shop=req.getParameter("barbeariaId")==null?null:Long.valueOf(req.getParameter("barbeariaId"));
   if(path.startsWith("/api/barbearias/") && vars.get("id")!=null) shop=Long.valueOf(vars.get("id"));
   for(Object arg:point.getArgs())if(arg!=null && arg.getClass().isRecord()){
     try{shop=(Long)arg.getClass().getMethod("barbeariaId").invoke(arg);}catch(NoSuchMethodException ignored){}
   }
   if(shop!=null)acesso.exigirAdmin(shop);
   for(Object arg:point.getArgs())if(arg instanceof br.com.barberflow.gestao.Entradas.VinculoInput v)
     if(db.queryForObject("select count(*) from cliente_barbearia c join permissao p on p.barbearia_id=c.barbearia_id where c.cliente_id=? and p.usuario_id=? and p.perfil='ADMIN'",Long.class,v.clienteId(),acesso.conta().id())==0)acesso.negar();
   String resource=path.split("/")[2];
   Map<String,String> tables=Map.of("barbeiros","barbeiro","servicos","servico","planos","plano","agendamentos","agendamento");
   if(vars.get("id")!=null && tables.containsKey(resource))checkResource(tables.get(resource),Long.valueOf(vars.get("id")));
   if(resource.equals("assinaturas")){
     Long plano=null;
     if(vars.get("id")!=null)plano=db.query("select plano_id from assinatura where id=?",(rs,n)->rs.getLong(1),Long.valueOf(vars.get("id"))).stream().findFirst().orElse(null);
     if(plano!=null)checkResource("plano",plano);
     for(Object arg:point.getArgs())if(arg instanceof br.com.barberflow.gestao.Entradas.AssinaturaInput a)checkResource("plano",a.planoId());
   }
   if(resource.equals("clientes") && vars.get("id")!=null){
     Long id=Long.valueOf(vars.get("id"));
     if(db.queryForObject("select count(*) from cliente_barbearia cb join permissao p on p.barbearia_id=cb.barbearia_id where cb.cliente_id=? and p.usuario_id=? and p.perfil='ADMIN'",Long.class,id,acesso.conta().id())==0)acesso.negar();
   }
   Object out=point.proceed();
   if(path.equals("/api/barbearias") && out instanceof List<?> list)return list.stream().filter(v->acesso.admin(((br.com.barberflow.barbearia.BarbeariaResponse)v).id())).toList();
   if(path.equals("/api/clientes") && shop==null && out instanceof List<?> list)return list.stream().filter(v->db.queryForObject("select count(*) from cliente_barbearia c join permissao p on p.barbearia_id=c.barbearia_id where c.cliente_id=? and p.usuario_id=? and p.perfil='ADMIN'",Long.class,((br.com.barberflow.dominio.Cliente)v).getId(),acesso.conta().id())>0).toList();
   if(path.equals("/api/barbearias") && method.equals("POST") && out instanceof org.springframework.http.ResponseEntity<?> response){var b=(br.com.barberflow.barbearia.BarbeariaResponse)response.getBody();db.update("insert into permissao(usuario_id,barbearia_id,perfil) values (?,?,'ADMIN')",acesso.conta().id(),b.id());}
   return out;
 }
 private void checkResource(String table,Long id){var shop=db.query("select barbearia_id from "+table+" where id=?",(rs,n)->rs.getLong(1),id).stream().findFirst().orElse(null);if(shop!=null)acesso.exigirAdmin(shop);}
}
