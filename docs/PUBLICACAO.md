# Antes de publicar

## Conteúdo comercial

Confirme o escopo realmente disponível por R$ 297, as páginas, os recursos, as revisões, o prazo e os custos de domínio, hospedagem e manutenção. O texto trata esse valor como investimento inicial de criação, não uma mensalidade. Não promete primeira posição no Google, vendas garantidas ou recursos ilimitados.

“Desde 2019” e “Mais de 1.000 clientes atendidos” foram fornecidos pelo proprietário e mantidos da versão anterior. Não foram verificados externamente. O certificado enviado informa abertura do CNPJ em 17/11/2025. Caso 2019 se refira à experiência profissional ou a outra operação, atribua isso explicitamente antes de publicar. Não apresente como a data de abertura desse CNPJ.

O rodapé apresenta a marca Kapi Digital e o CNPJ. A identificação empresarial original permanece no aviso de privacidade. O arquivo original, CPF e endereço completo não estão no projeto. Askora aparece apenas como projeto do portfólio, sem indicação de produto próprio ou vínculo empresarial com a Kapi.

## Atendimento e portfólio

Todos os CTAs usam o WhatsApp Kapi `5511982252058`, com a mensagem “Olá! Falo com a Kapi Digital? Gostaria de solicitar um orçamento.”. A fonte é `assets/js/config.mjs`; execute o build após alterá-la para sincronizar também os links HTML.

Teste os quatro projetos: Askora abre seu endereço externo; Osler, AML e Gear SEO abrem as cópias locais. As capas são as capturas usadas no portfólio ByAskora. Preserve a pasta `projetos/` e seus recursos na publicação.

## Domínio, busca e privacidade

Domínio e HTTPS ativos em `https://kapi.digital/`. A página principal tem canonical, imagem de compartilhamento, dados estruturados e indexação permitida. `robots.txt` informa o sitemap público em `https://kapi.digital/sitemap.xml`. As demonstrações e a página de privacidade continuam fora do sitemap e com `noindex`. O envio do sitemap e a inspeção da URL no Google Search Console dependem de acesso a uma propriedade verificada; não foram executados nesta revisão. A posição nas buscas depende do rastreamento, do conteúdo, da concorrência e da reputação do domínio.

O Pixel Kapi `3531138630396964` só carrega após consentimento em `kapi.digital`. A escolha aparece no lugar da oferta na primeira visita e pode ser alterada em Privacidade. O aceite registra `PageView`, e cada clique válido de WhatsApp registra `Contact` com a origem do botão. O clique não comprova mensagem ou venda. Consulte o README para validar nos Eventos de teste da Meta. Não há integração de anúncios do Askora.

No Railway, use `npm start`: o servidor escuta em `0.0.0.0` na porta fornecida por `PORT`. No serviço `kapi`, ambiente `kapi` do projeto `caring-harmony`, a verificação HTTP está configurada em `/`, com timeout de 60 segundos. O servidor disponibiliza apenas as páginas públicas, `assets/`, `projetos/`, `robots.txt` e `sitemap.xml`; arquivos internos do repositório não são servidos.

Execute `npm run build` para atualizar `assets/build/` antes de publicar. A fonte Inter está em `assets/fonts/`, com sua licença. Ative gzip ou Brotli e a revalidação/cache de arquivos na hospedagem.
