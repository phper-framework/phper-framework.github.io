// PHPER Docs — Documentation viewer with sidebar navigation
// Reads DOCS_DATA from docs/docs-data.js and renders documentation pages

document.addEventListener('DOMContentLoaded', () => {
  const sidebarNav = document.getElementById('sidebarNav');
  const docsContent = document.getElementById('docsContent');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('docsSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!window.DOCS_DATA || !DOCS_DATA.length) {
    docsContent.innerHTML =
      '<h1>Documentation</h1><p>No documentation data found. Run the conversion tool first:</p>' +
      '<pre><code>python3 tools/convert-docs.py ../phper/phper-doc/doc</code></pre>';
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
