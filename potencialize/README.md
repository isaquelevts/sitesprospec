# Landing page — Potencialize

Página estática (`index.html`) mais a página interna `sobre/index.html` (história da clínica, fundadora e equipe), sem build. Basta abrir no navegador ou publicar a pasta `potencialize/` em qualquer hospedagem.

## Antes de publicar
1. **WhatsApp:** já configurado como `5521974502172` (fim do `index.html`) (DDI + DDD + número, só dígitos).
2. **Fotos:** em `assets/fotos/` (enquanto não existirem, aparece um fundo na cor da marca):
   - `equipe.webp` — topo no desktop (equipe à direita, espaço livre à esquerda para o texto)
   - `equipe-mobile.webp` — topo no celular (foto vertical)
   - `casal.jpg`, `adultos.jpg`, `infantil.jpg`, `emergencial.jpg` — cards de atendimento (banco gratuito Unsplash, provisórias)
   - `espaco-1.jpg` … `espaco-4.jpg` — fotos reais do espaço da clínica
   - `capacitacao-1.jpg` … `capacitacao-4.jpg` — fotos reais de palestras e eventos (seção Para empresas)

## Visual
- Fontes: Playfair Display nos títulos, Josefin Sans no restante.
- Cores: tons de bege (sem fundo branco) e o marrom da marca; cantos retos.
## Pendências
- **Equipe (Giovana, Izabele, Kauana):** a seção "Nossa equipe" fica na página `sobre/index.html` e está com nome, texto *lorem ipsum* e um cartão vazio no lugar da foto. Falta trocar o texto pela apresentação de cada uma, incluir o CRP e colocar a foto: salve em `assets/fotos/` e, no `index.html`, troque o cartão vazio por `style="--img:url('assets/fotos/NOME.jpg')"` (tirando a classe `empty`).
- **Foto da Letícia (`assets/fotos/leticia.jpg`):** provisória, recortada da foto do topo. Trocar por um retrato próprio (3:4).
- **Vídeo de depoimento:** YouTube Shorts `mFfelZfuhdw`, na seção Depoimentos (o player só carrega ao clicar).
