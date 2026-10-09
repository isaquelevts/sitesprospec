# Páginas de prospecção

Este repositório reúne páginas independentes de apresentação e prospecção. A página inicial lista as campanhas existentes; cada nova campanha fica em uma pasta própria, com seus estilos, scripts e imagens.

## Estrutura

```text
.
├── index.html              # índice de campanhas
├── vercel.json             # rotas curtas de cada campanha
├── granpara/
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/              # imagens e logo da Gran Pará
├── dranayane/               # Dra. Nayane de Paula — versão premium (animações GSAP + Lenis)
│   ├── index.html           # HTML + CSS
│   ├── js/                  # animacoes.js, reel.js (carrossel do espaço), deck.js (cards no mobile)
│   └── img/                 # imagens usadas pelas 3 versões
├── dranayane-intermediario/ # mesma copy e layout, sem nenhum movimento (imagens de /dranayane/img)
│   └── index.html
├── dranayane-basico/        # mesma copy em layout simples com Tailwind (imagens de /dranayane/img)
│   └── index.html
├── bigbang/                 # Curso Big Bang · Sérgio Sacani (GSAP + Lenis, loader de foguete, transições de rolagem)
    ├── index.html
    ├── styles.css · finale.css · tokens.css
    ├── loader.js · main.js · programa.js · finale.js
    └── assets/              # imagens (a fonte licenciada Articulat CF não está no repositório — veja bigbang/README.md)
└── potencialize/            # Potencialize · Clínica de Psicologia no Leblon (HTML único, efeitos de entrada sem bibliotecas)
    ├── index.html           # HTML + CSS + JS
    └── assets/              # logo, símbolo e fotos (.webp)
```

As três páginas da Dra. Nayane servem para comparação: as versões intermediária e básica usam `noindex` para não competir com a premium no Google.

## Publicar na Vercel

Importe o repositório do GitHub na Vercel usando a pasta raiz como Root Directory. Não é necessário comando de build nem instalação de dependências; o projeto é estático. Após o deploy, a campanha estará em `/granpara` e também em `/granpara/`.

Para adicionar outra empresa, crie uma pasta com o slug em minúsculas (por exemplo, `outra-empresa/`), coloque ali o HTML, CSS, JavaScript e assets daquela página e adicione um link no `index.html` da raiz. Se a rota curta sem barra for necessária, inclua uma rewrite correspondente em `vercel.json`.

## Visualização local

Abra `index.html` para ver o índice. Para visualizar a campanha Gran Pará com seus caminhos de publicação, rode um servidor estático na raiz deste diretório e acesse `/granpara/`.
