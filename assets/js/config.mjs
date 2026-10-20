const whatsappNumber = "5511982252058";
const whatsappMessage = "Olá! Falo com a Kapi Digital? Gostaria de solicitar um orçamento.";
const encodedMessage = encodeURIComponent(whatsappMessage).replace(
  /[!'()*]/g,
  (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
);

export default Object.freeze({
  whatsappNumber,
  whatsappMessage,
  whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodedMessage}`,
  pageVersion: "kapi-meta-v1",
  tracking: Object.freeze({
    pixelId: "3531138630396964",
    productionHostname: "kapi.digital",
    scriptUrl: "https://connect.facebook.net/en_US/fbevents.js",
    consentKey: "kapi-marketing-consent-v1",
    consentVersion: 1,
    consentLifetimeMs: 180 * 24 * 60 * 60 * 1000,
    buttonLocations: Object.freeze({
      cabecalho: "header",
      "orcamento-menu-mobile": "header",
      "menu-mobile": "header",
      abertura: "hero",
      "apos-portfolio": "portfolio",
      investimento: "pricing",
      duvidas: "faq",
      fechamento: "closing",
      rodape: "footer",
      "barra-mobile": "floating_button",
      "portfolio-aml": "portfolio_demo",
    }),
  }),
  projects: {
    askora: {
      name: "Askora",
      url: "https://askora.com.br/",
    },
    osler: {
      name: "Osler Medicina",
      url: "projetos/osler/website/index.html",
    },
    aml: {
      name: "AML Reputacional",
      url: "projetos/aml/website/index.html",
    },
    gear: {
      name: "Gear SEO",
      url: "projetos/gear-seo/website/index.html",
    },
  },
});
