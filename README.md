# kapi.digital

Site estático em HTML, CSS e JavaScript nativo. Não há dependências de execução, framework, backend ou biblioteca de animação no navegador.

## Desenvolvimento

Com Node.js 18 ou superior:

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000`. O comando recompila CSS e JavaScript quando os arquivos em `assets/css` ou `assets/js` mudam. Para usar o Live Server, execute `npm run build` depois de alterar esses arquivos. Alterações nos textos do HTML não exigem compilação.

Os arquivos compilados já estão em `assets/build`, portanto `npm start` ou um servidor estático também podem abrir a versão pronta.

## Estrutura

- `index.html` e `privacidade.html`: conteúdo e estrutura das páginas.
- `assets/css/tokens.css`: paleta, fonte local e espaçamentos.
- `assets/css/styles.css`: componentes da interface.
- `assets/css/responsive.css`: ajustes de layout, movimento reduzido e impressão.
- `assets/css/animations.css`: abertura de busca e demonstração de sites.
- `assets/js/config.js`: WhatsApp, versão e URLs do portfólio.
- `assets/js/main.js`: menu, privacidade, links e eventos em memória.
- `assets/js/motion.js`: entradas discretas ao rolar, com animações finitas.
- `assets/js/web-demo.js` e `web-viewport.js`: carrossel e transição Desktop/Mobile.
- `assets/build/`: arquivos minificados gerados por `npm run build`; não editar manualmente.
- `assets/fonts/`: Inter variável em WOFF2 e licença OFL.
- `assets/img/`: imagens locais, com variantes de 400, 640 e 800 px em WebP.
- `projetos/`: apresentações locais de Osler, AML e Gear SEO.
- `tools/server.mjs`: servidor local com compressão, revalidação e suporte a busca em vídeos.
- `tests/`: verificações de layout, interações, abertura, movimento reduzido e servidor.

## Validação

```bash
npx playwright install chromium
npm test
```

Os testes compilam os arquivos antes de abrir o navegador e usam a porta 3100. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite usar um Chromium já instalado. `docs/TESTES.json` registra a validação realizada; `docs/PERFORMANCE.json` registra as medições locais e suas condições.

## Identidade e comportamento

A interface usa preto, branco e verde `#c4ff91`, com neutros suaves em textos secundários e divisórias. O rodapé é preto. O portfólio tem quatro colunas a partir de 1000 px, duas de 600 a 999 px e uma abaixo de 600 px.

No mobile, o cabeçalho acompanha a rolagem, mantendo a altura de 58 px. No início, mostra logo e botão de menu; após os primeiros 32 px de rolagem, a barra inferior desaparece e o cabeçalho passa a mostrar também o botão Orçamento e o preço a partir de R$ 297. O WhatsApp continua disponível dentro do menu aberto.

A busca digita `kapi.digital` em uma abertura de aproximadamente 1,1 segundo, inclusive ao abrir `#inicio`; pode ser pulada e tem liberação automática caso o JavaScript principal falhe. Na saída da busca, o menu entra de cima, o título da esquerda, a oferta da direita e a ilustração de baixo, com fade e pequenos intervalos entre as entradas. Os estados iniciais são preparados enquanto a busca cobre a página para evitar piscadas. A demonstração conserva os três exemplos da ByAskora, adaptados à Kapi. Seu palco mantém a altura ao trocar Desktop/Mobile, sem apagar o conteúdo durante a troca. O carrossel pausa fora da tela, em abas ocultas e durante interação.

As seções entram ao rolar com fade e deslocamento de 24 px por 640 ms, uma única vez. `IntersectionObserver` prepara somente os blocos que ainda estão abaixo da tela; conteúdo já visível nunca é apagado para animar. As animações usam apenas `opacity` e `transform`. Movimento reduzido, impressão, foco por teclado e retorno pelo histórico liberam o conteúdo sem deixá-lo oculto.

A fonte é local. As imagens têm `srcset`, tamanhos reservados e carregamento adiado no portfólio. Os arquivos e regras das antigas prévias em iframe foram removidos. Os sites de portfólio só são abertos quando o visitante escolhe um projeto: Askora em `https://askora.com.br/`; os demais em cópias locais, em nova aba.

O favicon original, com “k” verde sobre preto, está em SVG e PNG em `assets/img/`. A versão reutilizável de 1024 × 1024 e o SVG estão em `assets/brand/kapi-simbolo-fundo-preto.*`.

## Publicação

Execute `npm run build` e publique `index.html`, `privacidade.html`, `robots.txt`, `assets/` e `projetos/`. Em hospedagem estática, não publique `node_modules`, `tools`, testes ou relatórios. No Railway, use `npm start`: o servidor usa `0.0.0.0` e a porta `PORT`, oferece compressão e revalidação, e restringe o acesso aos arquivos públicos. O serviço tem healthcheck em `/`, com timeout de 60 segundos, configurado no Railway.

A prévia mantém `noindex, nofollow` e o bloqueio em `robots.txt`. Consulte `docs/PUBLICACAO.md` antes de publicar. Não há analytics externo: `window.dataLayer` contém somente eventos em memória, e um clique no WhatsApp não comprova uma conversa ou venda.
