#!/usr/bin/env python3
"""
convert-docs.py — Convert phper-doc markdown files into docs-data.js for the
PHPER GitHub Pages site.

Usage:
    python3 tools/convert-docs.py [PHPER_DOC_DIR] [OUTPUT_FILE]

    PHPER_DOC_DIR  Path to phper/phper-doc/doc directory
                   (default: ../phper/phper-doc/doc)
    OUTPUT_FILE    Output JS file path
                   (default: docs/docs-data.js)

The tool scans the phper-doc directory structure, reads each index.md,
converts Markdown to HTML, and writes a single JS data file that the
docs page can consume.

Requirements:
    pip install markdown pygments
"""

import json
import os
import re
import sys
from pathlib import Path

try:
    import markdown
    from markdown.extensions.fenced_code import FencedCodeExtension
    from markdown.extensions.tables import TableExtension
    from markdown.extensions.codehilite import CodeHiliteExtension
except ImportError:
    print("Error: 'markdown' and 'pygments' packages are required.")
    print("Install them with:  pip install markdown pygments")
    sys.exit(1)


def strip_numeric_prefix(name: str) -> str:
    """Remove leading _01_ style prefixes to produce a readable title."""
    return re.sub(r"^_?\d+_", "", name)


def slug_from_path(rel_path: str) -> str:
    """Generate a URL-safe slug from a relative directory path."""
    parts = Path(rel_path).parts
    clean = [strip_numeric_prefix(p) for p in parts]
    return "-".join(clean).lower().replace(" ", "-")


def title_from_markdown(md_text: str, fallback: str) -> str:
    """Extract the first H1 heading from markdown, or use fallback."""
    match = re.search(r"^#\s+(.+)$", md_text, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return fallback.replace("_", " ").title()


def preprocess_code_blocks(md_text: str) -> str:
    """
    Preprocess markdown to normalize code blocks:
    1. Remove indentation from fenced code blocks (fixes rendering issues)
    2. Normalize language tags (rust,no_run -> rust)
    """
    lines = md_text.split('\n')
    result = []
    in_code_block = False
    code_block_indent = 0
    
    for line in lines:
        # Check if this is a code fence line
        stripped = line.lstrip()
        
        if stripped.startswith('```'):
            if not in_code_block:
                # Opening fence - detect indent and remove it
                code_block_indent = len(line) - len(stripped)
                in_code_block = True
                # Remove indent and normalize language tag
                fence_line = stripped
                # Remove language modifiers like ,no_run, ,ignore
                fence_line = re.sub(r'^```(\w+)(?:,[\w_-]+)+', r'```\1', fence_line)
                result.append(fence_line)
            else:
                # Closing fence - remove indent
                in_code_block = False
                code_block_indent = 0
                result.append('```')
        elif in_code_block:
            # Inside code block - remove the same indent
            if line.startswith(' ' * code_block_indent):
                result.append(line[code_block_indent:])
            else:
                result.append(line)
        else:
            # Outside code block - keep as is
            result.append(line)
    
    return '\n'.join(result)


def convert_md_to_html(md_text: str) -> str:
    """Convert Markdown text to HTML using python-markdown."""
    # Preprocess to clean up code block language tags
    md_text = preprocess_code_blocks(md_text)
    
    md = markdown.Markdown(
        extensions=[
            FencedCodeExtension(),
            TableExtension(),
            CodeHiliteExtension(
                css_class="highlight",
                linenums=False,
                guess_lang=False,
            ),
            "md_in_html",
        ],
        output_format="html",
    )
    return md.convert(md_text)


def scan_doc_dir(base_dir: str) -> list:
    """
    Recursively scan the phper-doc directory and build a tree of doc pages.

    Each entry looks like:
    {
        "slug": "introduction",
        "title": "Introduction",
        "html": "<h1>...</h1>...",
        "children": [...]
    }
    """
    base = Path(base_dir)
    if not base.is_dir():
        print(f"Error: '{base_dir}' is not a directory.")
        sys.exit(1)

    sections = []

    # Get sorted top-level directories
    top_dirs = sorted(
        [d for d in base.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )

    for section_dir in top_dirs:
        index_md = section_dir / "index.md"
        if not index_md.exists():
            continue

        md_text = index_md.read_text(encoding="utf-8")
        rel_path = section_dir.relative_to(base)
        slug = slug_from_path(str(rel_path))
        title = title_from_markdown(md_text, strip_numeric_prefix(section_dir.name))
        html = convert_md_to_html(md_text)

        section = {
            "slug": slug,
            "title": title,
            "html": html,
            "children": [],
        }

        # Check for child directories
        child_dirs = sorted(
            [d for d in section_dir.iterdir() if d.is_dir()],
            key=lambda d: d.name,
        )

        for child_dir in child_dirs:
            child_index = child_dir / "index.md"
            if not child_index.exists():
                continue

            child_md = child_index.read_text(encoding="utf-8")
            child_rel = child_dir.relative_to(base)
            child_slug = slug_from_path(str(child_rel))
            child_title = title_from_markdown(
                child_md, strip_numeric_prefix(child_dir.name)
            )
            child_html = convert_md_to_html(child_md)

            section["children"].append(
                {
                    "slug": child_slug,
                    "title": child_title,
                    "html": child_html,
                    "children": [],
                }
            )

        sections.append(section)

    return sections


def write_docs_data(sections: list, output_path: str) -> None:
    """Write the docs data as a JS file that sets window.DOCS_DATA."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    json_str = json.dumps(sections, ensure_ascii=False, indent=2)

    js_content = (
        "// Auto-generated by tools/convert-docs.py — DO NOT EDIT\n"
        "// Generated from phper/phper-doc/doc markdown files\n"
        f"window.DOCS_DATA = {json_str};\n"
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    page_count = sum(1 + len(s.get("children", [])) for s in sections)
    print(f"✓ Generated {output_path}")
    print(f"  {len(sections)} sections, {page_count} total pages")


def main():
    # Determine base directory of this script for default paths
    script_dir = Path(__file__).resolve().parent
    site_root = script_dir.parent

    # Default phper-doc path: assume phper repo is sibling
    default_doc_dir = site_root.parent / "phper" / "phper-doc" / "doc"
    default_output = site_root / "docs" / "docs-data.js"

    doc_dir = sys.argv[1] if len(sys.argv) > 1 else str(default_doc_dir)
    output = sys.argv[2] if len(sys.argv) > 2 else str(default_output)

    print(f"PHPER Documentation Converter")
    print(f"  Source:  {doc_dir}")
    print(f"  Output:  {output}")
    print()

    sections = scan_doc_dir(doc_dir)
    if not sections:
        print("Warning: No documentation sections found!")
        sys.exit(1)

    write_docs_data(sections, output)
    print("\nDone! Open docs.html to view the documentation.")


if __name__ == "__main__":
    main()
