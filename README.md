# Pseudo-Formalization project page

Built site for [Pseudo-Formalization for Automatic Proof
Verification](https://arxiv.org/abs/2605.20531), served by GitHub Pages from
the root of `main`.

Static: no build step, no external CSS or JS. The one external dependency is
MathJax, loaded from a CDN to typeset the proofs in the Data section.

```
index.html         all markup, CSS and JS
static/data.js     Data section payload (generated)
static/fig1_web.png  teaser figure (generated)
.nojekyll          stop Pages running the content through Jekyll
```

## Updating

Do not edit `static/data.js` or `static/fig1_web.png` by hand. They are
generated in the research repo at `experiments/08_16_websites` by
`build_data.py` (reads the two released datasets) and `build_figure.py`
(rasterises and crops the teaser PDF). Regenerate there, then copy
`index.html` and `static/` here.
