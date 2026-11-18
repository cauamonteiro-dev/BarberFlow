// Conteúdo editorial apenas para as unidades fictícias da demonstração.
const models = [
  [
    "Barbearia Central",
    "O clássico encontra o seu estilo.",
    "Um espaço acolhedor para renovar o visual com calma. Cortes clássicos, acabamentos cuidadosos e atenção a cada detalhe fazem parte da experiência da Central.",
    "Rua das Acácias",
    120,
  ],
  [
    "Dom Barber",
    "Tradição no corte. Personalidade no visual.",
    "Madeira, conforto e uma boa conversa. A Dom Barber combina a tradição da barbearia com um atendimento próximo para encontrar o corte que combina com você.",
    "Avenida dos Ipês",
    245,
  ],
  [
    "Corte & Estilo",
    "Seu próximo visual começa aqui.",
    "Uma barbearia contemporânea para quem gosta de experimentar e se sentir bem. Do corte discreto ao degradê, o cuidado é pensado para o seu dia a dia.",
    "Rua das Palmeiras",
    380,
  ],
  [
    "Barber House",
    "Sinta-se em casa. Saia renovado.",
    "Um ambiente descontraído, cadeiras confortáveis e dedicação ao seu estilo. Na Barber House, cada atendimento é uma pausa para cuidar de você.",
    "Avenida dos Cedros",
    510,
  ],
  [
    "Nova Barbearia",
    "Uma nova experiência de cuidado.",
    "Um espaço pensado para unir praticidade e atenção pessoal, com serviços de corte e barba em um ambiente acolhedor.",
    "Rua das Oliveiras",
    75,
  ],
];

export function shopPresentation(shop) {
  const baseName = shop.nome
    .replace(/ \(inativa\)$/, "")
    .replace(/ (Norte|Sul)$/, "");
  const model = models.find(([name]) => name === baseName);
  const zone = / Norte(?: \(inativa\))?$/.test(shop.nome)
    ? "Jardim Norte"
    : / Sul(?: \(inativa\))?$/.test(shop.nome)
      ? "Vila Sul"
      : "Centro";
  return {
    image: "/shops/interior-padrao.jpg",
    gallery: "/brand/barbershop-login.jpg",
    tagline: model?.[1] || "Um espaço para cuidar do seu estilo.",
    description:
      model?.[2] ||
      "Conheça os serviços e profissionais desta barbearia e escolha um horário para cuidar do seu visual.",
    address: model
      ? `${model[3]}, ${model[4]} — ${zone}`
      : "Endereço ainda não informado",
    city: model
      ? "Cidade Modelo • localização fictícia"
      : "Consulte a unidade para saber a localização.",
    demo: Boolean(model),
  };
}

export function ShopImage({ shop, className = "", ...props }) {
  return (
    <img
      className={className}
      src={shopPresentation(shop).image}
      alt={`Ambiente ilustrativo de ${shop.nome}`}
      width="1536"
      height="1024"
      {...props}
      onError={(e) => {
        if (!e.currentTarget.dataset.fallback) {
          e.currentTarget.dataset.fallback = "true";
          e.currentTarget.src = "/brand/barbershop-login.jpg";
        }
      }}
    />
  );
}
