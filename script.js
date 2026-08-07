// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
if (navbar && !navbar.classList.contains('scrolled')) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}

// ===== HAMBURGER NAV =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(l => l.addEventListener('click', () => navLinks.classList.remove('open')));
}

// ===== MENU PAGE: SIDEBAR + SEARCH =====
const sidebar        = document.getElementById('menu-sidebar');
const sidebarToggle  = document.getElementById('sidebar-toggle');
const sidebarClose   = document.getElementById('sidebar-close');
const searchInput    = document.getElementById('menu-search');
const searchClear    = document.getElementById('search-clear');
const noResults      = document.getElementById('no-results');

if (!sidebar) {
  // Homepage scroll reveal only
  setupReveal();
} else {
  // ---- Sidebar overlay (mobile) ----
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  sidebarToggle.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click',  closeSidebar);
  overlay.addEventListener('click',       closeSidebar);

  // ---- Category filter ----
  const sidebarBtns  = document.querySelectorAll('.sidebar-btn');
  const allCategories = document.querySelectorAll('.menu-category');
  let activeFilter = 'all';

  function applyFilter(filter) {
    activeFilter = filter;
    sidebarBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));

    allCategories.forEach(section => {
      const cat = section.querySelector('.menu-list');
      if (!cat) return;
      const rows = cat.querySelectorAll('.menu-row');
      const sectionCat = rows[0] ? rows[0].dataset.category : '';

      if (filter === 'all' || sectionCat === filter) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });

    // Re-apply any existing search on top of the filter
    if (searchInput.value.trim()) applySearch(searchInput.value.trim());
    else checkNoResults();

    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  // ---- Search ----
  function applySearch(query) {
    const q = query.toLowerCase();
    let anyVisible = false;

    allCategories.forEach(section => {
      if (section.classList.contains('hidden')) return; // respect category filter
      const rows = section.querySelectorAll('.menu-row');
      let sectionHasMatch = false;

      rows.forEach(row => {
        const name = row.dataset.name || '';
        const desc = row.dataset.desc || '';
        const match = name.includes(q) || desc.includes(q);
        row.classList.toggle('hidden', !match);
        if (match) sectionHasMatch = true;
      });

      section.classList.toggle('hidden', !sectionHasMatch);
      if (sectionHasMatch) anyVisible = true;
    });

    noResults.classList.toggle('visible', !anyVisible);
    searchClear.classList.toggle('visible', q.length > 0);
  }

  function clearSearch() {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    // Reset rows, then re-apply category filter
    document.querySelectorAll('.menu-row').forEach(r => r.classList.remove('hidden'));
    applyFilter(activeFilter);
  }

  function checkNoResults() {
    const anyVisible = [...allCategories].some(s => !s.classList.contains('hidden'));
    noResults.classList.toggle('visible', !anyVisible);
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (!q) {
      clearSearch();
    } else {
      // Reset hidden rows before filtering so previous search doesn't persist
      document.querySelectorAll('.menu-row').forEach(r => r.classList.remove('hidden'));
      // Restore category visibility before searching within it
      allCategories.forEach(s => {
        if (activeFilter === 'all') s.classList.remove('hidden');
        else {
          const rows = s.querySelectorAll('.menu-row');
          const cat  = rows[0] ? rows[0].dataset.category : '';
          s.classList.toggle('hidden', cat !== activeFilter);
        }
      });
      applySearch(q);
    }
  });

  searchClear.addEventListener('click', clearSearch);

  // ---- Handle deep-link anchors from homepage category cards ----
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const matchingBtn = [...sidebarBtns].find(b => b.dataset.filter === hash);
    if (matchingBtn) applyFilter(hash);
  }
}

// ===== ONLINE ORDERING CART =====
(function () {
  if (!document.body.classList.contains('menu-page')) return;

  const LABEL_MAP = { Pt: 'Pint', Qt: 'Quart', S: 'Small', L: 'Large' };
  let cart = [];

  // Parse ".price" text into selectable options
  function parseOptions(text) {
    text = text.trim();
    if (text.includes(' / ')) {
      return text.split(' / ').map(part => {
        const m = part.trim().match(/^([A-Za-z&]+)\s*\$([0-9.]+)$/);
        if (!m) return null;
        const raw = m[1].trim();
        return { label: LABEL_MAP[raw] || raw, price: parseFloat(m[2]) };
      }).filter(Boolean);
    }
    const m = text.match(/\$([0-9.]+)/);
    if (m) return [{ label: '', price: parseFloat(m[1]) }];
    return [];
  }

  // ---- Inject cart drawer, float button, order modal into DOM ----
  function buildCartUI() {
    // Floating button
    const floatBtn = document.createElement('button');
    floatBtn.id = 'cart-float';
    floatBtn.className = 'cart-float hidden';
    floatBtn.innerHTML = '&#128722; My Order&nbsp;<span class="cart-badge" id="cart-badge">0</span>';
    floatBtn.addEventListener('click', openCartDrawer);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'cart-overlay';
    overlay.className = 'cart-overlay';
    overlay.addEventListener('click', closeCartDrawer);

    // Drawer
    const drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-header">
        <h2>&#128722; My Order</h2>
        <button class="cart-close-btn" id="cart-close-btn">&#10005;</button>
      </div>
      <div class="cart-items" id="cart-items">
        <p class="cart-empty"><span>&#128722;</span>No items yet.<br>Tap any menu item to add it!</p>
      </div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <strong>Subtotal</strong>
          <span class="cart-total-price" id="cart-total">$0.00</span>
        </div>
        <button class="cart-order-btn" id="cart-order-btn">&#128222; Place Order</button>
        <button class="cart-clear-btn" id="cart-clear-btn">Clear Order</button>
      </div>`;

    // Order modal
    const modal = document.createElement('div');
    modal.id = 'order-modal';
    modal.className = 'order-modal';
    modal.innerHTML = `
      <div class="order-modal-content">
        <button class="order-modal-close" id="order-modal-close">&#10005;</button>
        <div class="order-modal-icon">&#128222;</div>
        <h3>Call to Place Your Order</h3>
        <p class="order-modal-hint">Read your order to our staff over the phone:</p>
        <a href="tel:8506755551" class="order-phone-btn">850-675-5551</a>
        <div class="order-modal-summary" id="order-modal-summary"></div>
        <p class="order-modal-hours">Mon&#8211;Fri: 10 AM &#8211; 8:30 PM &nbsp;|&nbsp; Sunday: 11 AM &#8211; 8:30 PM</p>
      </div>`;

    document.body.appendChild(floatBtn);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.body.appendChild(modal);

    document.getElementById('cart-close-btn').addEventListener('click', closeCartDrawer);
    document.getElementById('cart-order-btn').addEventListener('click', openOrderModal);
    document.getElementById('cart-clear-btn').addEventListener('click', () => { cart = []; renderCart(); closeCartDrawer(); });
    document.getElementById('order-modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  }

  function openCartDrawer() {
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('cart-overlay').classList.add('visible');
  }
  function closeCartDrawer() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('visible');
  }

  function openOrderModal() {
    if (!cart.length) return;
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById('order-modal-summary').innerHTML =
      cart.map(item =>
        `<div class="order-summary-item">
          <span>${item.qty}&times; ${item.name}${item.size ? ' (' + item.size + ')' : ''}</span>
          <span>$${(item.price * item.qty).toFixed(2)}</span>
        </div>`
      ).join('') +
      `<div class="order-summary-total">
        <strong>Total</strong>
        <strong>$${total.toFixed(2)}</strong>
      </div>`;
    document.getElementById('order-modal').classList.add('open');
  }

  // ---- Cart state ----
  function addToCart(name, size, price) {
    const key = name + '|' + (size || '');
    const existing = cart.find(i => i.key === key);
    if (existing) { existing.qty++; } else { cart.push({ key, name, size, price, qty: 1 }); }
    renderCart();
    openCartDrawer();
  }

  function renderCart() {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const floatBtn = document.getElementById('cart-float');
    document.getElementById('cart-badge').textContent = count;
    floatBtn.classList.toggle('hidden', count === 0);

    const itemsEl = document.getElementById('cart-items');
    document.getElementById('cart-total').textContent = '$' + total.toFixed(2);

    if (!cart.length) {
      itemsEl.innerHTML = '<p class="cart-empty"><span>&#128722;</span>No items yet.<br>Tap any menu item to add it!</p>';
      return;
    }

    itemsEl.innerHTML = cart.map((item, i) =>
      `<div class="cart-item">
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          ${item.size ? `<span class="cart-item-size">(${item.size})</span>` : ''}
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-action="dec" data-idx="${i}">&#8722;</button>
          <span class="cart-item-qty">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-idx="${i}">+</button>
          <span class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</span>
          <button class="remove-btn" data-action="remove" data-idx="${i}">&#10005;</button>
        </div>
      </div>`
    ).join('');

    itemsEl.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        if (btn.dataset.action === 'inc') { cart[idx].qty++; }
        else if (btn.dataset.action === 'dec') { cart[idx].qty--; if (cart[idx].qty <= 0) cart.splice(idx, 1); }
        else if (btn.dataset.action === 'remove') { cart.splice(idx, 1); }
        renderCart();
      });
    });
  }

  // ---- Attach add panels to each menu row ----
  function setupMenuRows() {
    document.querySelectorAll('.menu-row').forEach(row => {
      const priceEl = row.querySelector('.price');
      if (!priceEl) return;
      const options = parseOptions(priceEl.textContent);
      if (!options.length) return;

      const h3 = row.querySelector('h3');
      const itemName = h3
        ? h3.childNodes[0].textContent.trim()   // text before .qty span
        : (row.dataset.name || '');

      // Build add panel
      const panel = document.createElement('div');
      panel.className = 'item-add-panel';

      if (options.length === 1 && !options[0].label) {
        const btn = document.createElement('button');
        btn.className = 'add-size-btn single';
        btn.textContent = 'Add Item  —  $' + options[0].price.toFixed(2);
        btn.addEventListener('click', e => {
          e.stopPropagation();
          addToCart(itemName, '', options[0].price);
          closePanel(row, panel);
        });
        panel.appendChild(btn);
      } else if (row.dataset.category === 'lunch-combo') {
        // Lunch button — adds directly
        const lunchOpt = options.find(o => o.label === 'Lunch');
        const comboOpt = options.find(o => o.label === 'Combo');

        // --- Main buttons row ---
        const mainRow = document.createElement('div');
        mainRow.className = 'panel-main-row';

        if (lunchOpt) {
          const lBtn = document.createElement('button');
          lBtn.className = 'add-size-btn';
          lBtn.textContent = 'Add Lunch  —  $' + lunchOpt.price.toFixed(2);
          lBtn.addEventListener('click', e => {
            e.stopPropagation();
            addToCart(itemName, 'Lunch', lunchOpt.price);
            closePanel(row, panel);
          });
          mainRow.appendChild(lBtn);
        }

        if (comboOpt) {
          const cBtn = document.createElement('button');
          cBtn.className = 'add-size-btn';
          cBtn.textContent = 'Add Combo  —  $' + comboOpt.price.toFixed(2);
          cBtn.addEventListener('click', e => {
            e.stopPropagation();
            mainRow.style.display = 'none';
            sideRow.style.display = 'flex';
          });
          mainRow.appendChild(cBtn);
        }

        // --- Side picker row (hidden until Combo clicked) ---
        const sideRow = document.createElement('div');
        sideRow.className = 'panel-side-row';
        sideRow.style.display = 'none';

        const sideLabel = document.createElement('p');
        sideLabel.className = 'side-picker-label';
        sideLabel.innerHTML = '&#127834; Choose your side:';
        sideRow.appendChild(sideLabel);

        const sideBtnsWrap = document.createElement('div');
        sideBtnsWrap.className = 'panel-main-row';

        const SIDES = [
          { label: 'Pork Fried Rice', extra: 0 },
          { label: 'White Rice',      extra: 0 },
          { label: 'Lo Mein',         extra: 1.00 },
        ];

        SIDES.forEach(side => {
          const sBtn = document.createElement('button');
          sBtn.className = 'add-size-btn';
          const extraTag = side.extra > 0
            ? ' <span class="side-extra">+$' + side.extra.toFixed(2) + '</span>'
            : '';
          sBtn.innerHTML = side.label + extraTag;
          const finalPrice = comboOpt.price + side.extra;
          sBtn.addEventListener('click', e => {
            e.stopPropagation();
            addToCart(itemName, 'Combo · ' + side.label, finalPrice);
            sideRow.style.display = 'none';
            mainRow.style.display = 'flex';
            closePanel(row, panel);
          });
          sideBtnsWrap.appendChild(sBtn);
        });

        const backBtn = document.createElement('button');
        backBtn.className = 'add-size-btn side-back-btn';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', e => {
          e.stopPropagation();
          sideRow.style.display = 'none';
          mainRow.style.display = 'flex';
        });

        sideRow.appendChild(sideBtnsWrap);
        sideRow.appendChild(backBtn);
        panel.appendChild(mainRow);
        panel.appendChild(sideRow);
      } else {
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'add-size-btn';
          btn.textContent = 'Add ' + opt.label + '  —  $' + opt.price.toFixed(2);
          btn.addEventListener('click', e => {
            e.stopPropagation();
            addToCart(itemName, opt.label, opt.price);
            closePanel(row, panel);
          });
          panel.appendChild(btn);
        });
      }

      row.appendChild(panel);

      row.addEventListener('click', () => {
        const isOpen = row.classList.contains('active');
        // Close any other open rows
        document.querySelectorAll('.menu-row.active').forEach(r => {
          r.classList.remove('active');
          r.querySelector('.item-add-panel')?.classList.remove('visible');
        });
        if (!isOpen) {
          row.classList.add('active');
          panel.classList.add('visible');
        }
      });
    });
  }

  function closePanel(row, panel) {
    row.classList.remove('active');
    panel.classList.remove('visible');
  }

  buildCartUI();
  setupMenuRows();
})();

// ===== REVIEWS =====
(function () {
  if (document.body.classList.contains('menu-page')) return;

  const STORAGE_KEY = 'jay-garden-reviews';

  // Pre-seeded reviews shown to everyone
  const SEED = [
    { name: 'Sarah M.',  rating: 5, date: '2026-07-28', text: 'Best Chinese food in the area! The General Tso\'s Chicken is amazing — crispy and perfectly saucy. We order at least twice a week.' },
    { name: 'Mike T.',   rating: 5, date: '2026-07-15', text: 'Huge portions and great prices. The Beef with Broccoli is my go-to every time. Always hot and ready on time for pick-up!' },
    { name: 'Lisa R.',   rating: 4, date: '2026-06-30', text: 'Friendly staff and super quick service. The Lo Mein is delicious. Only wish they were open on Saturdays!' },
    { name: 'James D.',  rating: 5, date: '2026-06-12', text: 'Sesame Chicken is out of this world. The family meals are a great deal — feeds four of us easily. Highly recommend!' },
    { name: 'Angela K.', rating: 4, date: '2026-05-20', text: 'Love the Crab Rangoon and Egg Drop Soup. Very authentic flavors and fair prices. A hidden gem in Jay, FL!' },
  ];

  function loadUserReviews() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveUserReviews(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function starsHTML(n) {
    return '<span style="color:var(--gold)">★</span>'.repeat(n) +
           '<span style="color:#ddd">★</span>'.repeat(5 - n);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function renderAll() {
    const grid = document.getElementById('reviews-grid');
    if (!grid) return;

    const userReviews = loadUserReviews();
    const all = [...userReviews, ...SEED];

    // Update average rating
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    const rounded = Math.round(avg * 10) / 10;
    const starsEl = document.getElementById('avg-stars');
    const scoreEl = document.getElementById('avg-score');
    const countEl = document.getElementById('avg-count');
    if (starsEl) starsEl.innerHTML = starsHTML(Math.round(avg));
    if (scoreEl) scoreEl.textContent = rounded.toFixed(1);
    if (countEl) countEl.textContent = `(${all.length} review${all.length !== 1 ? 's' : ''})`;

    // Render cards
    grid.innerHTML = all.map((r, i) => `
      <div class="review-card${i < userReviews.length ? ' new-card' : ''}" style="animation-delay:${Math.min(i * 0.07, 0.4)}s">
        <div class="review-stars">${starsHTML(r.rating)}</div>
        <p class="review-text">${r.text.replace(/</g, '&lt;')}</p>
        <div class="review-meta">
          <span class="review-name">${r.name.replace(/</g, '&lt;')}</span>
          <span class="review-date">${formatDate(r.date)}</span>
        </div>
      </div>`
    ).join('');
  }

  // ---- Star picker ----
  let selectedRating = 0;
  const starBtns = document.querySelectorAll('.star-pick');

  function highlightStars(n) {
    starBtns.forEach(b => b.classList.toggle('on', +b.dataset.val <= n));
  }

  starBtns.forEach(btn => {
    btn.addEventListener('mouseover', () => highlightStars(+btn.dataset.val));
    btn.addEventListener('mouseout',  () => highlightStars(selectedRating));
    btn.addEventListener('click', () => {
      selectedRating = +btn.dataset.val;
      highlightStars(selectedRating);
    });
  });

  // ---- Form submission ----
  const form       = document.getElementById('review-form');
  const successMsg = document.getElementById('review-success');
  const errorMsg   = document.getElementById('review-error');

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('reviewer-name').value.trim();
      const text = document.getElementById('reviewer-text').value.trim();

      // Validation
      if (!name || !text || !selectedRating) {
        errorMsg.classList.add('visible');
        setTimeout(() => errorMsg.classList.remove('visible'), 3000);
        return;
      }

      // Save
      const userReviews = loadUserReviews();
      userReviews.unshift({
        name,
        rating: selectedRating,
        date: new Date().toISOString().split('T')[0],
        text,
      });
      saveUserReviews(userReviews);

      // Reset form
      form.reset();
      selectedRating = 0;
      highlightStars(0);

      // Show success
      errorMsg.classList.remove('visible');
      successMsg.classList.add('visible');
      setTimeout(() => successMsg.classList.remove('visible'), 4000);

      // Re-render with new review at top
      renderAll();

      // Scroll to reviews grid
      document.getElementById('reviews-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  renderAll();
})();

// ===== SCROLL REVEAL (homepage) =====
function setupReveal() {
  const els = document.querySelectorAll('.category-card, .contact-info-centered, .review-card');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animation = 'fadeUp 0.5s ease both';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => { el.style.opacity = '0'; obs.observe(el); });
}
