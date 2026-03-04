// PHPER Docs — Documentation viewer with sidebar navigation
// Supports versioned docs data: docs/{version}/docs-data.js
// Falls back to docs/docs-data.js when no version is specified

/** Return the currently selected version from URL query param, or first in DOCS_VERSIONS. */
function getVersion() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('version');
  if (v) return v;
  if (window.DOCS_VERSIONS && DOCS_VERSIONS.length > 0) return DOCS_VERSIONS[0];
  return null;
}

/** Dynamically append a <script> and resolve when loaded. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const sidebarNav = document.getElementById('sidebarNav');
  const docsContent = document.getElementById('docsContent');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('docsSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const versionSelect = document.getElementById('versionSelect');
  const versionWrapper = document.getElementById('versionWrapper');

  // ── Load versioned (or default) docs data ──────────────────────
  const version = getVersion();
  try {
    if (version) {
      await loadScript(`docs/${version}/docs-data.js`);
    } else {
      await loadScript('docs/docs-data.js');
    }
  } catch (_) {
    // Try fallback
    try { await loadScript('docs/docs-data.js'); } catch (e2) { /* ignore */ }
  }

  // ── Populate version selector ───────────────────────────────────
  if (versionSelect && window.DOCS_VERSIONS && DOCS_VERSIONS.length > 0) {
    versionWrapper.style.display = '';
    DOCS_VERSIONS.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      if (v === version) opt.selected = true;
      versionSelect.appendChild(opt);
    });
    versionSelect.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('version', versionSelect.value);
      window.location.href = url.toString();
    });
  }

  if (!window.DOCS_DATA || !DOCS_DATA.length) {
    docsContent.innerHTML =
      '<h1>Documentation</h1><p>No documentation data found. Run the conversion tool first:</p>' +
      '<pre><code>python3 tools/convert-docs.py --version 0.5.0 ../phper/phper-doc/doc</code></pre>';
    return;
  }

  // Build flat list of all pages for prev/next navigation
  const allPages = [];
  function collectPages(items) {
    items.forEach((item) => {
      allPages.push(item);
      if (item.children && item.children.length) {
        collectPages(item.children);
      }
    });
  }
  collectPages(DOCS_DATA);

  // Get current page slug from URL hash
  function currentSlug() {
    return window.location.hash.slice(1) || allPages[0].slug;
  }

  // Build sidebar HTML
  function buildSidebar() {
    sidebarNav.innerHTML = '';
    DOCS_DATA.forEach((section) => {
      const li = document.createElement('li');
      li.className = 'sidebar-section';

      if (section.children && section.children.length) {
        // Expandable section
        const btn = document.createElement('button');
        btn.className = 'sidebar-section-title';
        btn.innerHTML = `<span class="arrow">▶</span> ${section.title}`;
        btn.dataset.slug = section.slug;
        btn.addEventListener('click', () => {
          const isExpanded = btn.classList.contains('expanded');
          btn.classList.toggle('expanded');
          const childList = li.querySelector('.sidebar-children');
          if (childList) childList.classList.toggle('expanded');
          // Navigate to the section's own page
          if (!isExpanded) {
            navigateTo(section.slug);
          }
        });
        li.appendChild(btn);

        const ul = document.createElement('ul');
        ul.className = 'sidebar-children';
        section.children.forEach((child) => {
          const childLi = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#${child.slug}`;
          a.textContent = child.title;
          a.dataset.slug = child.slug;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(child.slug);
          });
          childLi.appendChild(a);
          ul.appendChild(childLi);
        });
        li.appendChild(ul);
      } else {
        // Simple link
        const a = document.createElement('a');
        a.href = `#${section.slug}`;
        a.className = 'sidebar-link';
        a.textContent = section.title;
        a.dataset.slug = section.slug;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigateTo(section.slug);
        });
        li.appendChild(a);
      }

      sidebarNav.appendChild(li);
    });
  }

  // Highlight active sidebar item
  function highlightSidebar(slug) {
    // Remove all active
    sidebarNav.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
    sidebarNav.querySelectorAll('.expanded').forEach((el) => el.classList.remove('expanded'));

    // Find and activate
    const target =
      sidebarNav.querySelector(`a[data-slug="${slug}"]`) ||
      sidebarNav.querySelector(`button[data-slug="${slug}"]`);
    if (target) {
      target.classList.add('active');
      // Expand parent if it's a child
      const parentSection = target.closest('.sidebar-section');
      if (parentSection) {
        const btn = parentSection.querySelector('.sidebar-section-title');
        const children = parentSection.querySelector('.sidebar-children');
        if (btn) btn.classList.add('expanded');
        if (children) children.classList.add('expanded');
      }
    }

    // Also check if slug is a section's own slug
    const sectionBtn = sidebarNav.querySelector(`button[data-slug="${slug}"]`);
    if (sectionBtn) {
      sectionBtn.classList.add('active', 'expanded');
      const children = sectionBtn.parentElement.querySelector('.sidebar-children');
      if (children) children.classList.add('expanded');
    }
  }

  // Render page content
  function renderPage(slug) {
    const page = allPages.find((p) => p.slug === slug);
    if (!page) {
      docsContent.innerHTML = '<h1>Page Not Found</h1><p>The requested documentation page was not found.</p>';
      return;
    }

    // Render markdown-like HTML content
    let html = page.html;

    // Add prev/next navigation
    const pageIndex = allPages.indexOf(page);
    let navHtml = '<div class="doc-nav">';
    if (pageIndex > 0) {
      const prev = allPages[pageIndex - 1];
      navHtml += `<a href="#${prev.slug}" onclick="event.preventDefault(); window.navigateDoc('${prev.slug}')">
        <span class="label">← Previous</span>
        <span class="title">${prev.title}</span>
      </a>`;
    } else {
      navHtml += '<span></span>';
    }
    if (pageIndex < allPages.length - 1) {
      const next = allPages[pageIndex + 1];
      navHtml += `<a href="#${next.slug}" onclick="event.preventDefault(); window.navigateDoc('${next.slug}')" style="text-align:right;margin-left:auto">
        <span class="label">Next →</span>
        <span class="title">${next.title}</span>
      </a>`;
    }
    navHtml += '</div>';

    docsContent.innerHTML = html + navHtml;

    // Scroll content to top
    docsContent.scrollTop = 0;
    window.scrollTo({ top: 0 });
  }

  // Navigate to a doc page
  function navigateTo(slug) {
    window.location.hash = slug;
    renderPage(slug);
    highlightSidebar(slug);
    closeSidebar();
  }

  // Expose for inline onclick handlers
  window.navigateDoc = navigateTo;

  // Mobile sidebar
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Handle hash change
  window.addEventListener('hashchange', () => {
    const slug = currentSlug();
    renderPage(slug);
    highlightSidebar(slug);
  });

  // Initialize
  buildSidebar();
  const slug = currentSlug();
  renderPage(slug);
  highlightSidebar(slug);
});
