# 07. Requisitos do sistema

## Proposta do Sistema

### O que é o BarberFlow?

O BarberFlow será uma plataforma de gestão para pequenas e médias barbearias, desenvolvida para centralizar informações operacionais e facilitar o gerenciamento dos estabelecimentos.

A plataforma permitirá administrar:

* Barbearias;
* Clientes;
* Barbeiros;
* Serviços;
* Agendamentos;
* Planos;
* Assinaturas.

### Conceito de plataforma

O BarberFlow será projetado para atender diferentes barbearias.

Cada estabelecimento terá seus próprios profissionais, serviços, planos e agendamentos.

Ao mesmo tempo, um cliente poderá estar vinculado a mais de uma barbearia, permitindo que seu cadastro seja reutilizado dentro da plataforma sem a necessidade de duplicação.

### Proposta de valor

> Centralizar os dados operacionais das barbearias em uma plataforma integrada, utilizando um banco de dados relacional para organizar os relacionamentos entre clientes, profissionais, serviços, agendamentos e assinaturas.

### Necessidade do Banco de Dados

O banco de dados é fundamental para o projeto porque as informações possuem relacionamentos entre si.

Por exemplo, um agendamento relaciona:

* uma barbearia;
* um cliente;
* um barbeiro;
* um serviço;
* uma data e horário.

Da mesma forma, uma assinatura relaciona um cliente a um plano oferecido por uma barbearia.

Portanto, o sistema necessita armazenar, relacionar, consultar, alterar e validar essas informações de forma consistente.
