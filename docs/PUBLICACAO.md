# Antes de publicar

## Conteúdo comercial

Confirme o escopo realmente disponível por R$ 297, as páginas, os recursos, as revisões, o prazo e os custos de domínio, hospedagem e manutenção. O texto trata esse valor como investimento inicial de criação, não uma mensalidade. Não promete primeira posição no Google, vendas garantidas ou recursos ilimitados.

“Desde 2019” e “Mais de 1.000 clientes atendidos” foram fornecidos pelo proprietário e mantidos da versão anterior. Não foram verificados externamente. O certificado enviado informa abertura do CNPJ em 17/11/2025. Caso 2019 se refira à experiência profissional ou a outra operação, atribua isso explicitamente antes de publicar. Não apresente como a data de abertura desse CNPJ.

O rodapé apresenta a marca Kapi Digital e o CNPJ. A identificação empresarial original permanece no aviso de privacidade. O arquivo original, CPF e endereço completo não estão no projeto. Askora aparece apenas como projeto do portfólio, sem indicação de produto próprio ou vínculo empresarial com a Kapi.

## Atendimento e portfólio

Confirme o WhatsApp `https://wa.me/message/3DBMZ5ZZHD4NC1`, preservado da versão anterior e originalmente usado pela ByAskora. Confira perfil, mensagem e responsável pelo atendimento.

Teste os quatro projetos: Askora abre seu endereço externo; Osler, AML e Gear SEO abrem as cópias locais. As capas são as capturas usadas no portfólio ByAskora. Preserve a pasta `projetos/` e seus recursos na publicação.

## Domínio, busca e privacidade

Domínio e HTTPS ativos em `https://kapi.digital/`. A página principal tem canonical, imagem de compartilhamento, dados estruturados e indexação permitida. `robots.txt` informa o sitemap público em `https://kapi.digital/sitemap.xml`. As demonstrações e a página de privacidade continuam fora do sitemap e com `noindex`. O envio do sitemap e a inspeção da URL no Google Search Console dependem de acesso a uma propriedade verificada; não foram executados nesta revisão. A posição nas buscas depende do rastreamento, do conteúdo, da concorrência e da reputação do domínio.

Ao instalar ferramentas de medição, anúncios ou coleta de dados, revise o aviso de privacidade e os controles aplicáveis. Os eventos atuais ficam apenas na memória, sem envio a servidores de análise.

No Railway, use `npm start`: o servidor escuta em `0.0.0.0` na porta fornecida por `PORT`. No serviço `kapi`, ambiente `kapi` do projeto `caring-harmony`, a verificação HTTP está configurada em `/`, com timeout de 60 segundos. O servidor disponibiliza apenas as páginas públicas, `assets/`, `projetos/`, `robots.txt` e `sitemap.xml`; arquivos internos do repositório não são servidos.

Execute `npm run build` para atualizar `assets/build/` antes de publicar. A fonte Inter está em `assets/fonts/`, com sua licença. Ative gzip ou Brotli e a revalidação/cache de arquivos na hospedagem.
