# Pseudo-Formalization project page

Built site for [Pseudo-Formalization for Automatic Proof
Verification](https://arxiv.org/abs/2605.20531), served by GitHub Pages from
the root of `main`.

Static: no build step, no external CSS or JS. The one external dependency is
MathJax, loaded from a CDN to typeset the proofs.

```
index.html           the page, one tab per section: Summary, Example, OpenAI
                     Manuscripts (searchable PFs of openai/math), Released Data;
                     #example, #data, #oai, #oai/<paper> link to a tab
static/site.css      styles
static/pfgraph.js    the PF block-graph viewer used by both tabs
static/data.js       Data section + example PF payload (generated)
static/oai/          index.js + one p/<paper>.js per manuscript (generated)
static/fig1_web.png  teaser figure (generated)
.nojekyll            stop Pages running the content through Jekyll
```

## Updating

Do not edit `static/data.js`, `static/oai/` or `static/fig1_web.png` by hand.
They are generated in the research repo at `experiments/08_16_websites` by
`build_data.py` (reads the two released datasets), `build_oai.py` (reads every
finished PF under `experiments/10_19_oai_pfs/pf_outputs/`) and
`build_figure.py` (rasterises and crops the teaser PDF). Regenerate there, then
copy `index.html` and `static/` here.

To pick up newly finished OpenAI PFs:

```bash
cd experiments/08_16_websites && ../../.venv/bin/python build_oai.py
rm -rf <site>/static/oai && cp -R static/oai <site>/static/oai
```
