const adminStorageKey = 'almasry-admin-data';
const defaultProducts = [
  {
    id: 1,
    name: 'حلويات المصري الخاصة',
    category: 'شرقية',
    price: 180,
    oldPrice: 220,
    rating: 4.9,
    badge: 'الأكثر طلباً',
    images: ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80'],
    description: 'مزيج فاخر من الحلاوة الشرقية واللوز والكاكاو مع لمسة من الشوكولاتة.',
    ingredients: ['لوز', 'سكر', 'ماء ورد', 'شوكولاتة', 'مكسرات'],
    weight: '500 غ',
    featured: true,
    bestSeller: true
  },
  {
    id: 2,
    name: 'تورتة الزهور الذهبية',
    category: 'تورتات',
    price: 650,
    oldPrice: 780,
    rating: 5,
    badge: 'حصري',
    images: ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80'],
    description: 'تورتة أنيقة للاحتفالات مع طبقات من الكيك والكراميل والفاكهة.',
    ingredients: ['كيك فانيليا', 'كريمة زبدة', 'فواكه', 'كراميل'],
    weight: '2.5 كغ',
    featured: true,
    bestSeller: true
  },
  {
    id: 3,
    name: 'باقة الأعياد',
    category: 'هدايا',
    price: 420,
    oldPrice: 480,
    rating: 4.8,
    badge: 'عرض',
    images: ['https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'],
    description: 'باقة مميزة من الحلويات وكوبونات هدايا لاحتفالاتك.',
    ingredients: ['معجنات', 'بسكويت', 'شوكولاتة', 'تغليف فاخر'],
    weight: '1.2 كغ',
    featured: false
  },
  {
    id: 4,
    name: 'كيك الشوكولاتة الذهبي',
    category: 'كيك',
    price: 240,
    oldPrice: 290,
    rating: 4.7,
    badge: 'جديد',
    images: ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=900&q=80'],
    description: 'كيك أسفنجي دافئ مع طبقة من الشوكولاتة الغنية.',
    ingredients: ['دقيق', 'شوكولاتة', 'بيض', 'سكر', 'زبدة'],
    weight: '800 غ',
    featured: true,
    bestSeller: false
  },
  {
    id: 5,
    name: 'جاتوه الفراولة',
    category: 'جاتوه',
    price: 300,
    oldPrice: 350,
    rating: 4.9,
    badge: 'موسمي',
    images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80'],
    description: 'جاتوه خفيف بنكهة الفراولة وكريمة مخفوقة.',
    ingredients: ['فراولة', 'كريمة', 'ماء', 'سكر'],
    weight: '1 كغ',
    featured: false
  },
  {
    id: 6,
    name: 'عروض الورد واللوز',
    category: 'عروض',
    price: 360,
    oldPrice: 420,
    rating: 4.8,
    badge: 'تخفيض 15%',
    images: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=900&q=80'],
    description: 'باقة احتفالية من المعجنات، اللوز، والفواكه.',
    ingredients: ['لوز', 'ورد', 'معجنات', 'فواكه'],
    weight: '1.5 كغ',
    featured: false
  }
];

function normalizeProduct(product) {
  return {
    ...product,
    id: Number(product.id),
    price: Number(product.price || 0),
    oldPrice: Number(product.oldPrice || product.price || 0),
    rating: Number(product.rating || 4.8),
    badge: product.badge || 'مميز',
    images: Array.isArray(product.images) && product.images.length ? product.images : ["https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80"],
    description: product.description || 'منتج فاخر من متجر المصري.',
    ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
    weight: product.weight || '1 كغ',
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller)
  };
}

function loadProductsFromStorage() {
  try {
    const adminState = JSON.parse(localStorage.getItem(adminStorageKey) || 'null');
    if (adminState && Array.isArray(adminState.products)) {
      return adminState.products.map(normalizeProduct);
    }
  } catch (error) {
    console.warn('Unable to load products from storage', error);
  }
  return defaultProducts.map(normalizeProduct);
}

function syncProductsFromStorage() {
  products = loadProductsFromStorage();
  initPage();
}

const cartKey = 'almasry-cart';
let products = loadProductsFromStorage();
let offers = [];
let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

function saveCart() { localStorage.setItem(cartKey, JSON.stringify(cart)); }
function formatPrice(value) { return `${value.toLocaleString('ar-EG')} ج.م`; }

function normalizeOffer(offer) {
  return {
    ...offer,
    id: Number(offer.id || Date.now()),
    title: offer.title || 'عرض مميز',
    description: offer.description || 'عرض خاص من متجر المصري.',
    discount: Number(offer.discount || 0),
    price: Number(offer.price || 0),
    showOnHome: Boolean(offer.showOnHome),
    homeTitle: offer.homeTitle || offer.title || 'عرض مميز',
    homeDescription: offer.homeDescription || offer.description || 'عرض خاص من متجر المصري.',
    buttonText: offer.buttonText || 'عرض المزيد',
    buttonLink: offer.buttonLink || 'offers.html'
  };
}

function loadOffersFromStorage() {
  try {
    const adminState = JSON.parse(localStorage.getItem(adminStorageKey) || 'null');
    if (adminState && Array.isArray(adminState.offers)) {
      return adminState.offers.map(normalizeOffer);
    }
  } catch (error) {
    console.warn('Unable to load offers from storage', error);
  }

  return [
    { id: 1, title: 'عرض الصيف', description: 'خصم 15% على الباقات والمنتجات المختارة.', discount: 15, price: 320, showOnHome: true, homeTitle: 'عرض الصيف', homeDescription: 'خصم 15% على الباقات والمنتجات المختارة.', buttonText: 'استكشف العرض', buttonLink: 'offers.html' },
    { id: 2, title: 'عرض العيد', description: 'تورتات مخصصة مع باقات هدايا فاخرة.', discount: 20, price: 450, showOnHome: true, homeTitle: 'تورتات العيد', homeDescription: 'تورتات مخصصة مع باقات هدايا فاخرة.', buttonText: 'عرض المزيد', buttonLink: 'offers.html' },
    { id: 3, title: 'عرض الهدية', description: 'خصومات خاصة على البوكس والهدايا الاحتفالية.', discount: 10, price: 250, showOnHome: false, homeTitle: 'عرض الهدية', homeDescription: 'خصومات خاصة على البوكس والهدايا الاحتفالية.', buttonText: 'اقرأ المزيد', buttonLink: 'offers.html' }
  ].map(normalizeOffer);
}

function syncSiteData() {
  products = loadProductsFromStorage();
  offers = loadOffersFromStorage();
  initPage();
}

function addToCart(productId, qty = 1) {
  const item = cart.find((entry) => entry.id === productId && entry.type !== 'offer');
  if (item) item.qty += qty; else cart.push({ id: productId, type: 'product', qty });
  saveCart();
  Swal.fire({ title: 'تمت الإضافة!', text: 'تمت إضافة المنتج إلى السلة بنجاح', icon: 'success', confirmButtonText: 'حسناً' });
}

function addOfferToCart(offerId, qty = 1) {
  const offer = offers.find((entry) => entry.id === Number(offerId));
  if (!offer) return;

  const cartId = `offer-${offer.id}`;
  const item = cart.find((entry) => entry.id === cartId && entry.type === 'offer');
  if (item) item.qty += qty; else cart.push({ id: cartId, type: 'offer', qty, title: offer.title, description: offer.description, discount: Number(offer.discount || 0) });
  saveCart();
  Swal.fire({ title: 'تمت الإضافة!', text: `تمت إضافة العرض "${offer.title}" إلى السلة`, icon: 'success', confirmButtonText: 'حسناً' });
}

function getProductById(id) { return products.find((product) => product.id === Number(id)); }
function getCartItems() {
  return cart.map((entry) => {
    if (entry.type === 'offer') {
      return { type: 'offer', item: entry, qty: entry.qty };
    }

    const product = getProductById(entry.id);
    return product ? { type: 'product', item: product, qty: entry.qty } : null;
  }).filter(Boolean);
}

function renderProductCards(container, limit = null) {
  if (!container) return;
  const items = limit ? products.filter((p) => p.featured).slice(0, limit) : products;
  container.innerHTML = items.map((product) => `
    <div class="col-lg-4 col-md-6 mb-4">
      <div class="product-card h-100">
        <img src="${product.images[0]}" alt="${product.name}" class="w-100">
        <div class="p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge ${product.badge.includes('عرض') || product.badge.includes('تخفيض') ? 'badge-gold' : 'badge-green'}">${product.badge}</span>
            <span class="text-warning">★ ${product.rating}</span>
          </div>
          <h5 class="fw-bold">${product.name}</h5>
          <p class="text-muted small">${product.description}</p>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span class="price-current">${formatPrice(product.price)}</span>
              <div class="price-old small">${formatPrice(product.oldPrice)}</div>
            </div>
            <span class="text-muted small">${product.category}</span>
          </div>
          <div class="d-flex gap-2">
            <a href="product-details.html?id=${product.id}" class="btn btn-outline-custom btn-sm flex-grow-1">التفاصيل</a>
            <button class="btn btn-primary-custom btn-sm flex-grow-1" onclick="addToCart(${product.id})">إضافة للسلة</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderBestSellers() {
  const container = document.getElementById('best-sellers');
  if (!container) return;
  const bestSellers = products.filter((product) => product.bestSeller).slice(0, 3);

  if (!bestSellers.length) {
    container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted">سيظهر هنا أكثر المنتجات مبيعًا عند اختيارها من لوحة الإدارة.</p></div>';
    return;
  }

  container.innerHTML = bestSellers.map((product) => `
    <div class="col-lg-4">
      <div class="product-card p-4 h-100">
        <h5 class="fw-bold">${product.name}</h5>
        <p class="text-muted">${product.description}</p>
        <span class="price-current">${formatPrice(product.price)}</span>
        <div class="mt-3">
          <a href="product-details.html?id=${product.id}" class="btn btn-outline-custom btn-sm">التفاصيل</a>
        </div>
      </div>
    </div>
  `).join('');
}

function initOffersPage() {
  const container = document.getElementById('offers-grid');
  if (!container) return;

  container.innerHTML = offers.map((offer) => `
    <div class="col-lg-4" data-aos="fade-up">
      <div class="offer-card p-4 h-100">
        <h4>${offer.title}</h4>
        <p>${offer.description}</p>
        <div class="fw-bold text-gold">خصم ${offer.discount}%</div>
        ${offer.price ? `<div class="fw-bold mt-2">${formatPrice(offer.price)}</div>` : ''}
        <button class="btn btn-primary-custom mt-3" onclick="addOfferToCart(${offer.id})">إضافة إلى السلة</button>
      </div>
    </div>
  `).join('');
}

function renderHomeReviews() {
  const container = document.getElementById('home-reviews-grid');
  if (!container) return;

  let reviews = [];
  try {
    const adminState = JSON.parse(localStorage.getItem(adminStorageKey) || 'null');
    reviews = Array.isArray(adminState?.reviews) ? adminState.reviews : [];
  } catch (error) {
    reviews = [];
  }

  const approved = reviews.filter((r) => r.approved);

  if (!approved.length) {
    container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted">لا توجد آراء معتمدة حالياً.</p></div>';
    return;
  }

  const homeReviews = approved.slice(0, 3);

  container.innerHTML = homeReviews.map((review, index) => `
    <div class="col-lg-4" data-aos="fade-up"${index === 1 ? ' data-aos-delay="100"' : index === 2 ? ' data-aos-delay="200"' : ''}>
      <div class="review-card p-4">
        <div class="text-warning mb-3">★★★★★</div>
        <p>“${(review.text || '').replaceAll('"', '"')}”</p>
        <strong>— ${(review.name || '').replaceAll('"', '"')}</strong>
      </div>
    </div>
  `).join('');
}

function renderHomeOffers() {
  const container = document.getElementById('homepage-offers');
  if (!container) return;

  const homeOffers = offers.filter((offer) => offer.showOnHome).slice(0, 2);

  if (!homeOffers.length) {
    container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted">لن تظهر أي بطاقات حتى تضيف عرضًا من لوحة الإدارة.</p></div>';
    return;
  }

  container.innerHTML = homeOffers.map((offer) => `
    <div class="col-lg-6" data-aos="fade-up">
      <div class="offer-card p-4 h-100">
        <h4 class="fw-bold">${offer.homeTitle || offer.title}</h4>
        <p>${offer.homeDescription || offer.description}</p>
        <div class="d-flex flex-wrap gap-2 mt-3">
          ${offer.price ? `<div class="w-100 fw-bold text-gold">${formatPrice(offer.price)}</div>` : ''}
          <button class="btn btn-primary-custom" onclick="addOfferToCart(${offer.id})">إضافة إلى السلة</button>
          <a href="${offer.buttonLink || 'offers.html'}" class="btn btn-outline-custom">${offer.buttonText || 'عرض المزيد'}</a>
        </div>
      </div>
    </div>
  `).join('');
}

function initProductsPage() {
  const grid = document.getElementById('products-grid');
  const filterBar = document.querySelector('.filter-bar');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const pagination = document.getElementById('pagination');
  let currentCategory = 'الكل';
  let currentPage = 1;
  const perPage = 6;

  const categories = ['الكل', ...Array.from(new Set(products.map((product) => product.category)))];
  if (filterBar) {
    filterBar.innerHTML = categories.map((category) => `
      <button class="${category === 'الكل' ? 'active' : ''}" data-category="${category}">${category}</button>
    `).join('');
  }

  const filterButtons = document.querySelectorAll('[data-category]');

  function applyFilters() {
    const filtered = products.filter((product) => {
      const categoryMatch = currentCategory === 'الكل' || product.category === currentCategory;
      const searchMatch = product.name.includes(searchInput?.value || '') || product.description.includes(searchInput?.value || '');
      return categoryMatch && searchMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortSelect?.value === 'price') return a.price - b.price;
      if (sortSelect?.value === 'rating') return b.rating - a.rating;
      return 0;
    });

    const pages = Math.ceil(sorted.length / perPage);
    const start = (currentPage - 1) * perPage;
    const pageItems = sorted.slice(start, start + perPage);

    if (grid) {
      if (!pageItems.length) {
        grid.innerHTML = '<div class="col-12 text-center py-5"><h5>لا توجد منتجات تطابق التصفية الحالية</h5></div>';
      } else {
        grid.innerHTML = pageItems.map((product) => `
          <div class="col-lg-4 col-md-6 mb-4">
            <div class="product-card h-100">
              <img src="${product.images[0]}" alt="${product.name}" class="w-100">
              <div class="p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="badge badge-green">${product.badge}</span>
                  <span class="text-warning">★ ${product.rating}</span>
                </div>
                <h5 class="fw-bold">${product.name}</h5>
                <p class="text-muted small">${product.description}</p>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span class="price-current">${formatPrice(product.price)}</span>
                    <div class="price-old small">${formatPrice(product.oldPrice)}</div>
                  </div>
                  <span class="text-muted small">${product.category}</span>
                </div>
                <div class="d-flex gap-2">
                  <a href="product-details.html?id=${product.id}" class="btn btn-outline-custom btn-sm flex-grow-1">التفاصيل</a>
                  <button class="btn btn-primary-custom btn-sm flex-grow-1" onclick="addToCart(${product.id})">إضافة للسلة</button>
                </div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    if (pagination) {
      pagination.innerHTML = Array.from({ length: pages }, (_, i) => `
        <li class="page-item ${i + 1 === currentPage ? 'active' : ''}"><button class="page-link" data-page="${i + 1}">${i + 1}</button></li>
      `).join('');
      pagination.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', () => {
          currentPage = Number(button.dataset.page);
          applyFilters();
        });
      });
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentCategory = button.dataset.category;
      currentPage = 1;
      filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      applyFilters();
    });
  });

  searchInput?.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  sortSelect?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  applyFilters();
}

function initCartPage() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartSummary = document.getElementById('cart-summary');
  if (!cartItemsContainer || !cartSummary) return;

  function renderCart() {
    const items = getCartItems();
    if (!items.length) {
cartItemsContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">السلة فارغة حالياً</div></div>';
      cartSummary.innerHTML = '<div class="summary-box"><h5>الإجمالي</h5><p class="mb-0">0 ج.م</p></div>';
      return;
    }

    cartItemsContainer.innerHTML = items.map(({ type, item, qty }) => {
      if (type === 'offer') {
        return `
          <div class="cart-item mb-3 p-3">
            <div class="row align-items-center">
              <div class="col-md-7">
                <h6 class="fw-bold">العرض: ${item.title}</h6>
                <p class="small text-muted mb-0">${item.description}</p>
                <span class="badge badge-gold mt-2">خصم ${item.discount}%</span>
              </div>
              <div class="col-md-2">
                <div class="quantity-control">
                  <button onclick="changeQty('${item.id}', -1)">−</button>
                  <span>${qty}</span>
                  <button onclick="changeQty('${item.id}', 1)">+</button>
                </div>
              </div>
              <div class="col-md-3 text-end">
<div class="fw-bold">0 ج.م</div>
                <button class="btn btn-link text-danger p-0" onclick="removeFromCart('${item.id}')">حذف</button>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="cart-item mb-3 p-3">
          <div class="row align-items-center">
            <div class="col-md-3"><img src="${item.images[0]}" alt="${item.name}"></div>
            <div class="col-md-5">
              <h6 class="fw-bold">${item.name}</h6>
              <p class="small text-muted mb-0">${item.description}</p>
            </div>
            <div class="col-md-2">
              <div class="quantity-control">
                <button onclick="changeQty(${item.id}, -1)">−</button>
                <span>${qty}</span>
                <button onclick="changeQty(${item.id}, 1)">+</button>
              </div>
            </div>
            <div class="col-md-2 text-end">
              <div class="fw-bold">${formatPrice(item.price * qty)}</div>
              <button class="btn btn-link text-danger p-0" onclick="removeFromCart(${item.id})">حذف</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const subtotal = items.reduce((sum, entry) => sum + (entry.type === 'offer' ? 0 : entry.item.price * entry.qty), 0);
    const discount = subtotal > 500 ? 80 : 0;
    const total = subtotal - discount;
    cartSummary.innerHTML = `
      <div class="summary-box">
        <h5>ملخص الطلب</h5>
        <div class="d-flex justify-content-between mt-3"><span>المجموع الفرعي</span><span>${formatPrice(subtotal)}</span></div>
        <div class="d-flex justify-content-between"><span>الخصم</span><span>${formatPrice(discount)}</span></div>
        <hr>
        <div class="d-flex justify-content-between fw-bold"><span>الإجمالي</span><span>${formatPrice(total)}</span></div>
        <button class="btn btn-light w-100 mt-3" onclick="submitOrder()">إرسال الطلب عبر واتساب</button>
      </div>
    `;
  }

  renderCart();
}

function changeQty(productId, delta) {
  cart = cart.map((entry) => entry.id === productId ? { ...entry, qty: Math.max(1, entry.qty + delta) } : entry).filter((entry) => entry.qty > 0);
  saveCart();
  initCartPage();
}

function removeFromCart(productId) {
  cart = cart.filter((entry) => entry.id !== productId);
  saveCart();
  initCartPage();
}

function submitOrder() {
  const items = getCartItems();
  const total = items.reduce((sum, entry) => sum + (entry.type === 'offer' ? 0 : entry.item.price * entry.qty), 0);
  const message = `مرحباً، أريد طلباً من متجر المصري:\n${items.map((entry) => entry.type === 'offer' ? `- العرض: ${entry.item.title} × ${entry.qty} (خصم ${entry.item.discount}%)` : `- ${entry.item.name} × ${entry.qty}`).join('\n')}\nالإجمالي: ${formatPrice(total)}`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/201011001128?text=${encoded}`, '_blank');
}

function initProductDetail() {
  const productId = new URLSearchParams(window.location.search).get('id');
  const detail = document.getElementById('product-detail');
  if (!detail || !productId) return;
  const product = getProductById(productId);
  if (!product) { detail.innerHTML = '<div class="alert alert-danger">المنتج غير موجود</div>'; return; }
  detail.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-6">
        <img src="${product.images[0]}" alt="${product.name}" class="w-100 mb-3" id="mainImage">
        <div class="d-flex gap-2">
          ${product.images.map((image) => `<img src="${image}" alt="${product.name}" class="thumb-image" onclick="changeMainImage('${image}')" style="width: 90px; height: 70px; object-fit: cover; cursor: pointer;">`).join('')}
        </div>
      </div>
      <div class="col-lg-6">
        <span class="badge badge-green">${product.badge}</span>
        <h2 class="fw-bold mt-3">${product.name}</h2>
        <p class="text-muted">${product.description}</p>
        <div class="d-flex align-items-center gap-3 mb-3">
          <span class="price-current">${formatPrice(product.price)}</span>
          <span class="price-old">${formatPrice(product.oldPrice)}</span>
          <span class="text-warning">★ ${product.rating}</span>
        </div>
        <div class="mb-3"><strong>المكونات:</strong> ${product.ingredients.join(' • ')}</div>
        <div class="mb-3"><strong>الوزن:</strong> ${product.weight}</div>
        <button class="btn btn-primary-custom" onclick="addToCart(${product.id})">إضافة للسلة</button>
      </div>
    </div>
  `;
}

function changeMainImage(src) {
  document.getElementById('mainImage').src = src;
}

function initHomePage() {
  renderProductCards(document.getElementById('featured-products'), 3);
  renderBestSellers();
  renderHomeOffers();
  renderHomeReviews();
}

function initPage() {
  initHomePage();
  initOffersPage();
  initProductsPage();
  initCartPage();
  initProductDetail();
}

function createHiddenAdminButton() {
  if (window.location.pathname.includes('admin-panel-secure')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Admin access');
  button.style.position = 'fixed';
  button.style.bottom = '16px';
  button.style.left = '16px';
  button.style.width = '24px';
  button.style.height = '24px';
  button.style.opacity = '0.03';
  button.style.border = 'none';
  button.style.background = 'transparent';
  button.style.cursor = 'pointer';
  button.style.zIndex = '99999';
  button.addEventListener('click', () => {
    window.location.href = 'admin-panel-secure.html';
  });

  document.body.appendChild(button);
}

window.addEventListener('storage', syncSiteData);
window.addEventListener('admin-data-updated', syncSiteData);

document.addEventListener('DOMContentLoaded', () => {
  createHiddenAdminButton();
  syncSiteData();
  const heroSwiper = document.querySelector('.mySwiper');
  if (heroSwiper && typeof Swiper !== 'undefined') {
    new Swiper('.mySwiper', {
      loop: true,
      autoplay: { delay: 3000 },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
    });
  }
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, once: true });
  }
  if (typeof gsap !== 'undefined') {
    gsap.from('.hero h1, .hero p, .hero .btn', { y: 40, opacity: 0, duration: 1, stagger: 0.2 });
  }
});
