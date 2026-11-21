"""Gera o HTML do widget do Elementor para doloteaobra.com.br/ebooks a partir de ebooks/index.html.

Uso: python3 ebooks/wordpress/build.py
Saída: ebooks/wordpress/widget-html.html (vai inteiro no widget HTML da página, igual à /planilhas)

- O WordPress já gera charset, viewport, title e canonical; esses saem daqui.
- Imagens e fonte continuam servidas pela Vercel (heliossites.vercel.app/ebooks/...).
- O bloco COMPAT desfaz estilos globais do tema Hello e do kit do Elementor (kit 8),
  que de outro modo mexem em svg, botões e links. O container usa a classe lp-dobra-root.
"""
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[1]
VERCEL = "https://heliossites.vercel.app/ebooks/"
ENDERECO = "https://doloteaobra.com.br/ebooks/"

COMPAT = """<style>
  /* Container do Elementor sem margens */
  .lp-dobra-root, .lp-dobra-root > .e-con-inner { padding: 0 !important; margin: 0 !important; max-width: none !important; gap: 0 !important; }
  .lp-dobra-root .elementor-widget-html, .lp-dobra-root .elementor-widget-container { width: 100%; margin: 0 !important; }
  /* Kit do site: .elementor-kit-8 svg { width: 20px } */
  .lp-dobra-root svg.rosa { width: auto; }
  .lp-dobra-root .selo .rosa { width: 24px; }
  .lp-dobra-root .garantia .rosa { width: 64px; }
  .lp-dobra-root .fecho .rosa { width: 100%; }
  .lp-dobra-root .dor svg { width: 28px; }
  .lp-dobra-root .rota__linha { width: 80%; }
  .lp-dobra-root .sprite { width: 0; height: 0; }
  @media (max-width: 600px) { .lp-dobra-root .garantia .rosa { width: 48px; } }
  /* Reset do tema Hello em links e botões */
  .lp-dobra-root a.btn, .lp-dobra-root a.btn:hover, .lp-dobra-root a.btn:focus { color: #fff; text-decoration: none; }
  .lp-dobra-root .amostra__abrir, .lp-dobra-root .amostra__abrir:hover, .lp-dobra-root .amostra__abrir:focus { padding: 0; border: 0; border-radius: 0; background: none; color: inherit; }
  .lp-dobra-root .zoom__fechar, .lp-dobra-root .zoom__fechar:hover, .lp-dobra-root .zoom__fechar:focus { padding: 0; border: 0; border-radius: 50%; background: var(--papel); color: var(--tinta); }
  .lp-dobra-root .avulso a:hover { color: var(--ouro-claro); }
  .lp-dobra-root figcaption { font-style: normal; }
  .lp-dobra-root h1, .lp-dobra-root h2 { font-family: Montserrat, sans-serif; }
  .lp-dobra-root h3 { font-family: Montserrat, sans-serif; }
</style>
"""


def main():
    h = (RAIZ / "index.html").read_text()
    head = h[h.index("<head>") + 6:h.index("</head>")]
    body = h[h.index("<body>") + 6:h.index("</body>")]
    head = re.sub(
        r'\s*<meta charset="utf-8">|\s*<meta name="viewport"[^>]*>|\s*<title>.*?</title>'
        r'|\s*<!-- Trocar pelo endereço final.*?-->|\s*<link rel="canonical"[^>]*>',
        "", head, flags=re.S)
    w = head.strip() + "\n" + COMPAT + body
    w = w.replace('https://heliossites.vercel.app/ebooks"', ENDERECO + '"')
    w = w.replace('content="https://heliossites.vercel.app/ebooks"', 'content="' + ENDERECO + '"')
    w = re.sub(r'(["( ])/ebooks/(img|fonts)/', lambda m: m.group(1) + VERCEL + m.group(2) + "/", w)
    w = w.replace('<svg width="0" height="0" style="position:absolute"', '<svg class="sprite" width="0" height="0" style="position:absolute"')
    assert '"/ebooks/' not in w, "sobrou caminho relativo"
    assert 'class="sprite"' in w
    saida = pathlib.Path(__file__).with_name("widget-html.html")
    saida.write_text(w.strip() + "\n")
    print(saida, len(w), "bytes")


if __name__ == "__main__":
    main()
