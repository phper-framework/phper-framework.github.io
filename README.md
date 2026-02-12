# PHPER Framework — GitHub Pages

The official website for [PHPER (PHP Enjoy Rust)](https://github.com/phper-framework/phper), the framework that allows us to write PHP extensions using pure and safe Rust.

## Structure

```
├── index.html          # Landing / home page
├── docs.html           # Documentation viewer
├── css/
│   ├── style.css       # Global styles
│   └── docs.css        # Documentation page styles
├── js/
│   ├── main.js         # Site-wide JavaScript
│   └── docs.js         # Documentation navigation & rendering
├── docs/
│   └── docs-data.js    # Generated documentation data (from convert-docs.py)
├── tools/
│   └── convert-docs.py # Markdown → docs-data.js conversion tool
├── LICENSE             # MulanPSL-2.0
└── README.md
```

## Updating Documentation

The documentation content is sourced from the `phper/phper-doc/doc` directory. To update it:

```bash
# Install dependencies (first time only)
uv sync

# Convert phper-doc markdown to docs-data.js
uv run python tools/convert-docs.py [PHPER_DOC_DIR] [OUTPUT_FILE]

# With defaults (assumes phper repo is sibling directory):
uv run python tools/convert-docs.py
```

## Local Preview

Open `index.html` in a browser, or serve locally:

```bash
uv run python -m http.server 8000
# Then visit http://localhost:8000
```

## License

[MulanPSL-2.0](LICENSE)
