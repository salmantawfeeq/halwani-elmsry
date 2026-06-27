import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  endBefore,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firestore collections
const PRODUCTS_COL = "products";
const OFFERS_COL = "offers";
const REVIEWS_COL = "reviews";
const SETTINGS_COL = "settings";

// =========================
// Runtime state
// =========================
let products = [];
let productsCache = {
  // pageKey: { items: [], lastDoc: doc, firstDoc: doc }
};
let lastVisibleDoc = null;
let offers = [];
let settings = null;

const cartKey = "almasry-cart";
let cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
}
function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("ar-EG")} ج.م`;
}

// =========================
// Helpers
// =========================
function normalizeProduct(p) {
  return {
    ...p,
    id: String(p.id),

    price: Number(p.price || 0),
    oldPrice: Number(p.oldPrice || p.price || 0),
    rating: Number(p.rating || 4.8),
    badge: p.badge || "مميز",
    images:
      Array.isArray(p.images) && p.images.length
        ? p.images
        : [
            "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
          ],
    description: p.description || "منتج فاخر من متجر المصري.",
    ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
    weight: p.weight || "1 كغ",
    featured: Boolean(p.featured),
    bestSeller: Boolean(p.bestSeller),
  };
}

function normalizeOffer(o) {
  return {
    ...o,
    id: Number(o.id),
    title: o.title || "عرض مميز",
    description: o.description || "عرض خاص من متجر المصري.",
    discount: Number(o.discount || 0),
    price: Number(o.price || 0),
    showOnHome: Boolean(o.showOnHome),
    homeTitle: o.homeTitle || o.title || "عرض مميز",
    homeDescription:
      o.homeDescription || o.description || "عرض خاص من متجر المصري.",
    buttonText: o.buttonText || "عرض المزيد",
    buttonLink: o.buttonLink || "offers.html",
    images: Array.isArray(o.images) ? o.images : [],
  };
}

function getCartItems() {
  return cart
    .map((item) => ({
      type: item.type,
      item: item, // The full item is now stored in the cart
      qty: item.qty,
    }))
    .filter(Boolean);
}

function getProductById(id) {
  return products.find((product) => String(product.id) === String(id));
}

// =========================
// Firestore loading
// =========================
async function loadCollectionAsArray(colName) {
  const snap = await getDocs(collection(db, colName));
  const items = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    items.push({ docId: d.id, id: d.id, ...data });
  });
  return items;
}

async function loadSettings() {
  const settingsCol = collection(db, SETTINGS_COL);
  const snap = await getDocs(settingsCol);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...first.data() };
}

async function loadOffers() {
  const items = await loadCollectionAsArray(OFFERS_COL);
  return items.map((o) => {
    const numericId = Number(o.docId ?? o.id);
    return normalizeOffer({ ...o, id: numericId });
  });
}

async function loadApprovedReviews() {
  const q = query(collection(db, REVIEWS_COL), where("approved", "==", true));
  const snap = await getDocs(q);
  const items = [];
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }));

  items.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return items;
}

async function syncFirestore() {
  // We no longer load all products upfront.
  const [o, s, r] = await Promise.all([
    loadOffers().catch(() => []),
    loadSettings().catch(() => null),
    loadApprovedReviews().catch(() => []),
  ]);

  offers = o;
  settings = s;

  // Page-specific initializations
  if (document.getElementById("featured-products")) initHomePage(r);
  if (document.getElementById("homepage-offers")) renderHomeOffers();
  // renderHomeReviews is called from initHomePage

  if (document.getElementById("offers-grid")) initOffersPage();
  if (document.getElementById("products-grid")) initProductsPage();

  if (
    document.getElementById("reviews-grid") &&
    !document.getElementById("home-reviews-grid")
  ) initReviewsPage();

  if (
    document.getElementById("cart-items") &&
    document.getElementById("cart-summary")
  ) {
    initCartPage();
  }

  if (document.getElementById("product-detail")) initProductDetail();
}

function updateCartBadge() {
  const cartLink = document.querySelector('.cart-link');
  if (!cartLink) return;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  let badge = cartLink.querySelector('.cart-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'cart-badge';
    cartLink.appendChild(badge);
  }
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// =========================
// Cart actions
// =========================
async function addToCart(productId, qty = 1) {
  const normalizedId = String(productId);
  if (!normalizedId || normalizedId === "undefined" || normalizedId === "null") {
    if (typeof Swal !== "undefined") {
      Swal.fire({ title: "حدث خطأ", text: "معرّف المنتج غير صالح", icon: "error", confirmButtonText: "حسناً" });
    }
    return;
  }

  const existingCartItem = cart.find((entry) => String(entry.id) === normalizedId && entry.type === "product");

  if (existingCartItem) {
    existingCartItem.qty += qty;
  } else {
    // Product not in cart, we need its details.
    // First, check the local `products` array (from homepage, etc.)
    let productDetails = getProductById(normalizedId);

    // If not found locally, fetch from Firestore
    if (!productDetails) {
      const docRef = doc(db, PRODUCTS_COL, normalizedId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        productDetails = normalizeProduct({ id: docSnap.id, ...docSnap.data() });
      }
    }

    if (!productDetails) {
      Swal.fire({ title: "خطأ", text: "لم يتم العثور على المنتج.", icon: "error" });
      return;
    }

    // Add the full product details to the cart
    cart.push({ ...productDetails, type: "product", qty });
  }

  saveCart();
  updateCartBadge();
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "تمت الإضافة!",
      text: "تمت إضافة المنتج إلى السلة بنجاح",
      icon: "success",
      confirmButtonText: "حسناً",
    });
  }
}

async function addOfferToCart(offerId, qty = 1) {
  const offerDetails = offers.find((entry) => entry.id === Number(offerId));
  if (!offerDetails) return;

  const cartId = `offer-${offerDetails.id}`;
  const existingCartItem = cart.find((entry) => entry.id === cartId && entry.type === "offer");

  if (existingCartItem) {
    existingCartItem.qty += qty;
  } else {
    cart.push({ ...offerDetails, id: cartId, type: "offer", qty });
  }

  saveCart();
  updateCartBadge();
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "تمت الإضافة!",
      text: `تمت إضافة العرض "${offerDetails.title}" إلى السلة`,
      icon: "success",
      confirmButtonText: "حسناً",
    });
  }

  initCartPage();
}

function changeQty(cartItemId, delta) {
  cart = cart
    .map((entry) => (entry.id === cartItemId ? { ...entry, qty: Math.max(1, entry.qty + delta) } : entry))
    .filter((entry) => entry.qty > 0);

  saveCart();
  updateCartBadge();
  initCartPage();
}

function removeFromCart(productId) {
  Swal.fire({
    title: 'هل أنت متأكد؟',
    text: "سيتم حذف هذا المنتج من السلة!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#A7C796',
    cancelButtonColor: '#d33',
    confirmButtonText: 'نعم، احذفه!',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      cart = cart.filter((entry) => String(entry.id) !== String(productId));
      saveCart();
      updateCartBadge();
      initCartPage();
      Swal.fire('تم الحذف!', 'تم حذف المنتج من السلة.', 'success');
    }
  });
}

function submitOrder() {
  const items = getCartItems();
  const total = items.reduce(
    (sum, entry) => sum + (entry.type === "offer" ? 0 : entry.item.price * entry.qty),
    0,
  );

  const orderRef = `MASRY-${Date.now()}`;
  const order = {
    orderRef,
    items: items.map((entry) => ({
      type: entry.item.type,
      id: entry.item.id,
      title: entry.type === "offer" ? entry.item.title : entry.item.name,
      qty: entry.qty,
      productId: entry.type === "product" ? entry.item.id : null,
    })),
    total,
    createdAt: new Date().toISOString(),
    reviewed: false,
  };

  try {
    const pendingKey = "almasry-orders-pending";
    const pending = JSON.parse(localStorage.getItem(pendingKey) || "[]");
    pending.push(order);
    localStorage.setItem(pendingKey, JSON.stringify(pending));
  } catch (e) {
    console.warn("Unable to save pending orders", e);
  }

  const message = `مرحباً، أريد طلباً من متجر المصري (مرجع الطلب: ${orderRef}):\n${items
    .map((entry) =>
      entry.type === "offer"
        ? `- العرض: ${entry.item.title} × ${entry.qty} (خصم ${entry.item.discount}%)`
        : `- ${entry.item.name} × ${entry.qty}`,
    )
    .join("\n")}\nالإجمالي: ${formatPrice(total)}`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/201011001128?text=${encoded}`, "_blank");

  // Clear cart after submitting
  cart = [];
  saveCart();
  updateCartBadge();
  initCartPage();
}

// =========================
// Render pages
// =========================
async function renderFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) return;

  const q = query(
    collection(db, PRODUCTS_COL),
    where("featured", "==", true),
    limit(3)
  );
  const snap = await getDocs(q);
  const featuredProducts = [];
  snap.forEach((d) => {
    featuredProducts.push(normalizeProduct({ id: d.id, ...d.data() }));
  });

  // Store in global products array to help cart lookups
  products = [...products, ...featuredProducts];

  container.innerHTML = featuredProducts
    .map(
      (product) => `
    <div class="col-lg-4 col-md-6 mb-4">
      <div class="product-card h-100">
        <img src="${product.images[0]}" alt="${product.name}" class="w-100">
        <div class="p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge ${product.badge.includes("عرض") || product.badge.includes("تخفيض") ? "badge-gold" : "badge-green"}">${product.badge}</span>
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
            <button class="btn btn-primary-custom btn-sm flex-grow-1" onclick="addToCart('${product.id}')">إضافة للسلة</button>
          </div>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

async function renderBestSellers() {
  const container = document.getElementById("best-sellers");
  if (!container) return;

  const q = query(
    collection(db, PRODUCTS_COL),
    where("bestSeller", "==", true),
    limit(3)
  );
  const snap = await getDocs(q);
  const bestSellers = [];
  snap.forEach((d) => {
    bestSellers.push(normalizeProduct({ id: d.id, ...d.data() }));
  });

  // Store in global products array to help cart lookups
  products = [...products, ...bestSellers];

  if (!bestSellers.length) {
    container.innerHTML =
      '<div class="col-12 text-center py-4"><p class="text-muted">سيظهر هنا أكثر المنتجات مبيعًا عند اختيارها من لوحة الإدارة.</p></div>';
    return;
  }
  container.innerHTML = bestSellers
    .map(
      (product) => `
    <div class="col-lg-4">
      <div class="product-card p-4 h-100">
        <img src="${product.images?.[0]}" alt="${product.name}" class="w-100 mb-3" style="height:200px; object-fit:cover;" loading="lazy" decoding="async" />
        <h5 class="fw-bold">${product.name}</h5>
        <p class="text-muted">${product.description}</p>
        <span class="price-current">${formatPrice(product.price)}</span>
        <div class="mt-3">
          <a href="product-details.html?id=${product.id}" class="btn btn-outline-custom btn-sm">التفاصيل</a>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

async function initHomePage(reviews) {
  await Promise.all([
    renderFeaturedProducts(),
    renderBestSellers(),
    renderHomeOffers(),
    renderHomeReviews(reviews),
  ]);
}

function renderHomeOffers() {
  const container = document.getElementById("homepage-offers");
  if (!container) return;

  const homeOffers = offers.filter((offer) => offer.showOnHome).slice(0, 2);
  if (!homeOffers.length) {
    container.innerHTML =
      '<div class="col-12 text-center py-4"><p class="text-muted">لن تظهر أي بطاقات حتى تضيف عرضًا من لوحة الإدارة.</p></div>';
    return;
  }

  container.innerHTML = homeOffers
    .map((offer) => {
      const mainImg = offer?.images?.[0];
      return `
      <div class="col-lg-6" data-aos="fade-up">
        <div class="offer-card p-4 h-100 d-flex flex-column">
          ${mainImg ? `<img src="${mainImg}" alt="${offer.homeTitle || offer.title}" class="offer-image" />` : ""}
          <h4 class="fw-bold ${mainImg ? "mt-2" : ""}">${offer.homeTitle || offer.title}</h4>
          <p>${offer.homeDescription || offer.description}</p>
          <div class="d-flex flex-wrap gap-2 mt-3">
            ${offer.price ? `<div class="w-100 fw-bold text-gold">${formatPrice(offer.price)}</div>` : ""}
            <a href="${offer.buttonLink || "offers.html"}" class="btn btn-outline-custom">${offer.buttonText || "عرض المزيد"}</a>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderHomeReviews(reviews = []) {
  const container = document.getElementById("home-reviews-grid");
  if (!container) return;

  const approved = Array.isArray(reviews) ? reviews.filter((r) => r.approved) : [];
  if (!approved.length) {
    container.innerHTML =
      '<div class="col-12 text-center py-4"><p class="text-muted">لا توجد آراء معتمدة حالياً.</p></div>';
    return;
  }

  const homeReviews = approved.slice(0, 3);
  container.innerHTML = homeReviews
    .map((review, index) => {
      const productLabel = review.productName
        ? `عن المنتج: ${review.productName}`
        : "عن المنتج";
      const orderLabel = review.orderRef ? `مرجع الطلب: ${review.orderRef}` : "";
      const dateLabel = review.createdAt
        ? `تاريخ التقييم: ${new Date(review.createdAt).toLocaleDateString("ar-EG")}`
        : "";

      return `
      <div class="col-lg-4" data-aos="fade-up"${
        index === 1
          ? ' data-aos-delay="100"'
          : index === 2
            ? ' data-aos-delay="200"'
            : ""
      }>
        <div class="review-card p-4">
          <div class="text-warning mb-3">★★★★★</div>
          <p>“${(review.text || "").replaceAll('"', '"')}”</p>
          <strong>— ${(review.name || "").replaceAll('"', '"')}</strong>
          <div class="mt-2 small text-muted">${productLabel}</div>
          ${orderLabel ? `<div class="small text-muted">${orderLabel}</div>` : ""}
          ${dateLabel ? `<div class="small text-muted">${dateLabel}</div>` : ""}
        </div>
      </div>
    `;
    })
    .join("");
}

function initOffersPage() {
  const container = document.getElementById("offers-grid");
  if (!container) return;

  container.innerHTML = offers
    .map((offer) => {
      const mainImg = offer?.images?.[0];
      return `
      <div class="col-lg-4" data-aos="fade-up">
        <div class="offer-card p-4 h-100 d-flex flex-column">
          ${mainImg ? `<img src="${mainImg}" alt="${offer.title}" class="offer-image" />` : ""}
          <h4 class="mt-2">${offer.title}</h4>
          <p>${offer.description}</p>
          <div class="fw-bold text-gold">خصم ${offer.discount}%</div>
          ${offer.price ? `<div class="fw-bold mt-2">${formatPrice(offer.price)}</div>` : ""}
          <button class="btn btn-primary-custom mt-3" onclick="addOfferToCart(${offer.id})">إضافة إلى السلة</button>
        </div>
      </div>
    `;
    })
    .join("");
}

async function initProductsPage() {
  const grid = document.getElementById("products-grid");
  const filterBar = document.querySelector(".filter-bar");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const pagination = document.getElementById("pagination");
  if (!grid) return;

  let currentCategory = "الكل";
  let currentPage = 1;
  const perPage = 9;

  // Fetch categories dynamically
  const productsRef = collection(db, PRODUCTS_COL);
  const catSnap = await getDocs(productsRef);
  const categories = ["الكل", ...Array.from(new Set(catSnap.docs.map(doc => doc.data().category).filter(Boolean)))];
  
  // Reset cache on page load
  productsCache = {};
  
  if (filterBar) {
    filterBar.innerHTML = categories
      .map(
        (category) => `
      <button class="${category === "الكل" ? "active" : ""}" data-category="${category}">${category}</button>
    `,
      )
      .join("");
  }

  const filterButtons = document.querySelectorAll("[data-category]");

  function renderSkeleton() {
    if (!grid) return;
    grid.innerHTML = Array.from({ length: perPage }, () => `
      <div class="col-lg-4 col-md-6 mb-4 skeleton-card">
        <div class="product-card h-100">
          <div class="skeleton skeleton-img"></div>
          <div class="p-4">
            <div class="skeleton skeleton-text w-50"></div>
            <div class="skeleton skeleton-text mt-3"></div>
            <div class="skeleton skeleton-text w-75"></div>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <div class="skeleton skeleton-text w-25"></div>
              <div class="skeleton skeleton-text w-25"></div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function applyFilters(page = 1, direction = 'next') {
    currentPage = page;
    const cacheKey = `${currentCategory}-${sortSelect?.value || 'default'}-${searchInput?.value || ''}-${page}`;

    if (productsCache[cacheKey]) {
      renderProductPage(productsCache[cacheKey].items);
      lastVisibleDoc = productsCache[cacheKey].lastDoc;
      updatePagination(page, true); // Assuming there's a next page from cache
      return;
    }

    renderSkeleton();

    let q = query(collection(db, PRODUCTS_COL));

    // Filtering
    if (currentCategory !== "الكل") {
      q = query(q, where("category", "==", currentCategory));
    }
    const searchTerm = searchInput?.value.trim();
    if (searchTerm) {
      q = query(q, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
    }

    // Sorting
    if (sortSelect?.value === "price") {
      q = query(q, orderBy("price", "asc"));
    } else if (sortSelect?.value === "rating") {
      q = query(q, orderBy("rating", "desc"));
    } else {
      q = query(q, orderBy("name", "asc")); // Default sort for consistent pagination
    }

    // Pagination
    if (page > 1 && lastVisibleDoc && direction === 'next') {
      q = query(q, startAfter(lastVisibleDoc));
    }
    
    q = query(q, limit(perPage));

    const snap = await getDocs(q);
    const pageItems = [];
    snap.forEach(doc => pageItems.push(normalizeProduct({ id: doc.id, ...doc.data() })));

    lastVisibleDoc = snap.docs[snap.docs.length - 1];

    productsCache[cacheKey] = { items: pageItems, lastDoc: lastVisibleDoc };

    renderProductPage(pageItems);
    updatePagination(page, pageItems.length === perPage);
  }

  function renderProductPage(items) {
    if (!items.length) {
      grid.innerHTML =
        '<div class="col-12 text-center py-5"><h5>لا توجد منتجات تطابق التصفية الحالية</h5></div>';
    } else {
      grid.innerHTML = items
        .map(
          (product) => `
        <div class="col-lg-4 col-md-6 mb-4">
          <div class="product-card h-100">
            <img src="${product.images[0]}" alt="${product.name}" class="w-100" loading="lazy" decoding="async" fetchpriority="low">
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
                <button class="btn btn-primary-custom btn-sm flex-grow-1" onclick="addToCart('${product.id}')">إضافة للسلة</button>
              </div>
            </div>
          </div>
        </div>
      `,
        )
        .join("");
    }
  }

  function updatePagination(currentPage, hasMore) {
    if (pagination) {
      const prevDisabled = currentPage === 1 ? 'disabled' : '';
      const nextDisabled = !hasMore ? 'disabled' : '';
      pagination.innerHTML = `
        <li class="page-item ${prevDisabled}"><button class="page-link" data-page-nav="prev">السابق</button></li>
        <li class="page-item active"><span class="page-link">${currentPage}</span></li>
        <li class="page-item ${nextDisabled}"><button class="page-link" data-page-nav="next">التالي</button></li>
      `;

      pagination.querySelector('[data-page-nav="next"]')?.addEventListener('click', () => {
        if (hasMore) {
          applyFilters(currentPage + 1, 'next');
          smoothScrollToProducts();
        }
      });
      pagination.querySelector('[data-page-nav="prev"]')?.addEventListener('click', () => {
        // Note: True 'prev' with startAfter is complex. This is a simplified "go back to page 1"
        // For a real app, you'd need to manage cursors for both directions.
        window.location.reload(); // Simple way to go back
      });
    }
  }

  const productsAnchor = document.getElementById("products-grid");
  const focusTarget = productsAnchor || grid;

  function smoothScrollToProducts() {
    if (!focusTarget) return;
    // منع القفزات: استخدم scrollIntoView مع block-start وتفعيل behavior smooth فقط
    try {
      focusTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // fallback
      window.scrollTo({ top: focusTarget.offsetTop, behavior: "smooth" });
    }
  }

  // تحسين الاستجابة للـ input (debounce بسيط)
  let debounceTimer = null;
  function debouncedApplyFilters() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      productsCache = {}; // Invalidate cache on filter change
      lastVisibleDoc = null;
      applyFilters(1);
      smoothScrollToProducts();
      focusTarget?.focus?.({ preventScroll: true });
    }, 300);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;
      filterButtons.forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      debouncedApplyFilters();
    });
  });

  searchInput?.addEventListener("input", () => {
    debouncedApplyFilters();
  });

  sortSelect?.addEventListener("change", () => {
    debouncedApplyFilters();
  });

  // Initial load
  applyFilters(1);
}

async function initProductDetail() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const detail = document.getElementById("product-detail");
  if (!detail || !productId) return;

  // Try to find in cache first
  let product = getProductById(productId);

  if (!product) {
    // If not found, fetch from Firestore
    const docRef = doc(db, PRODUCTS_COL, productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      product = normalizeProduct({ id: docSnap.id, ...docSnap.data() });
    }
  }

  if (!product) {
    detail.innerHTML = '<div class="alert alert-danger">المنتج غير موجود</div>';
    return;
  }

  detail.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-6">
        <img src="${product.images[0]}" alt="${product.name}" class="w-100 mb-3" id="mainImage" loading="lazy" decoding="async">
        <div class="d-flex gap-2">
          ${product.images
            .map(
              (image) => `<img src="${image}" alt="${product.name}" class="thumb-image" onclick="changeMainImage('${image}')" style="width: 90px; height: 70px; object-fit: cover; cursor: pointer;" loading="lazy" decoding="async">`,
            )
            .join("")}
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
        <div class="mb-3"><strong>المكونات:</strong> ${product.ingredients.join(" • ")}</div>
        <div class="mb-3"><strong>الوزن:</strong> ${product.weight}</div>
        <button class="btn btn-primary-custom" onclick="addToCart('${product.id}')">إضافة للسلة</button>
      </div>
    </div>
  `;
}

function changeMainImage(src) {
  const el = document.getElementById("mainImage");
  if (el) el.src = src;
}

async function initReviewsPage() {
  const container = document.getElementById("reviews-grid");
  if (!container) return;

  try {
    const reviews = await loadApprovedReviews();

    if (!reviews.length) {
      container.innerHTML =
        '<div class="col-12 text-center py-5"><p class="text-muted">لا توجد آراء معتمدة حالياً.</p></div>';
      return;
    }

    container.innerHTML = reviews
      .map((review, index) => {
        const productLabel = review.productName
          ? `عن المنتج: ${review.productName}`
          : "عن المنتج";
        const orderLabel = review.orderRef
          ? `مرجع الطلب: ${review.orderRef}`
          : "";
        const dateLabel = review.createdAt
          ? `تاريخ التقييم: ${new Date(review.createdAt).toLocaleDateString(
              "ar-EG",
            )}`
          : "";

        return `
            <div class="col-lg-4" data-aos="fade-up" ${index === 1 ? 'data-aos-delay="100"' : index === 2 ? 'data-aos-delay="200"' : ""}>
              <div class="review-card p-4">
                <div class="text-warning mb-3">★★★★★</div>
                <p>“${(review.text || "").replaceAll('"', '"')}”</p>
                <strong>— ${(review.name || "").replaceAll('"', '"')}</strong>
                <div class="mt-2 small text-muted">${productLabel}</div>
                ${orderLabel ? `<div class="small text-muted">${orderLabel}</div>` : ""}
                ${dateLabel ? `<div class="small text-muted">${dateLabel}</div>` : ""}
              </div>
            </div>
          `;
      })
      .join("");
  } catch (e) {
    console.warn("Unable to render reviews", e);
    container.innerHTML =
      '<div class="col-12 text-center py-5"><p class="text-muted">تعذر تحميل الآراء.</p></div>';
  }
}

function initCartPage() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartSummary = document.getElementById("cart-summary");
  if (!cartItemsContainer || !cartSummary) return;

  const items = getCartItems();
  if (!items.length) {
    cartItemsContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">السلة فارغة حالياً</div></div>';
    cartSummary.innerHTML = '<div class="summary-box"><h5>الإجمالي</h5><p class="mb-0">0 ج.م</p></div>';
    return;
  }

  cartItemsContainer.innerHTML = items
    .map(({ type, item, qty }) => {
      if (type === "offer") {
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
      <div class="cart-item mb-3 p-3" data-id="${item.id}">
        <div class="row align-items-center">
          <div class="col-md-3"><img src="${item.images[0]}" alt="${item.name}" loading="lazy" decoding="async"></div>
          <div class="col-md-5">
            <h6 class="fw-bold">${item.name}</h6>
            <p class="small text-muted mb-0">${item.description}</p>
          </div>
          <div class="col-md-2">
            <div class="quantity-control">
              <button onclick="changeQty('${item.id}', -1)">−</button>
              <span>${qty}</span>
              <button onclick="changeQty('${item.id}', 1)">+</button>
            </div>
          </div>
          <div class="col-md-2 text-end">
            <div class="fw-bold">${formatPrice(item.price * qty)}</div>
            <button class="btn btn-link text-danger p-0" onclick="removeFromCart('${item.id}')">حذف</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  const subtotal = items.reduce(
    (sum, entry) => sum + (entry.type === "offer" ? 0 : entry.item.price * entry.qty),
    0
  );

  let discount = 0;
  const offerDiscountRateSum = items.reduce((sum, entry) => {
    if (entry.type !== "offer") return sum;
    return sum + Number(entry.item.discount || 0);
  }, 0);

  discount += subtotal * (offerDiscountRateSum / 100);

  discount += items.reduce((sum, entry) => {
    if (entry.type !== "product") return sum;
    const p = entry.item;
    const perUnitDiscount = Math.max(
      0,
      Number(p.oldPrice || p.price) - Number(p.price || 0)
    );
    return sum + perUnitDiscount * entry.qty;
  }, 0);

  discount = Math.min(discount, subtotal);
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

function createHiddenAdminButton() {
  if (window.location.pathname.includes("admin-panel-secure")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Admin access");
  button.style.position = "fixed";
  button.style.bottom = "16px";
  button.style.left = "16px";
  button.style.width = "24px";
  button.style.height = "24px";
  button.style.opacity = "0.03";
  button.style.border = "none";
  button.style.background = "transparent";
  button.style.cursor = "pointer";
  button.style.zIndex = "99999";
  button.addEventListener("click", () => {
    window.location.href = "admin-panel-secure.html";
  });

  document.body.appendChild(button);
}

// =========================
// Start
// =========================
window.addEventListener("storage", () => {
  if (
    document.getElementById("cart-items") &&
    document.getElementById("cart-summary")
  ) {
    initCartPage();
  }
});

window.addEventListener("admin-data-updated", () => {
  if (
    document.getElementById("featured-products") ||
    document.getElementById("offers-grid") ||
    document.getElementById("products-grid")
  ) {
    syncFirestore();
  }
});


// bind to window so inline onclick works even if errors before DOMContentLoaded
window.addToCart = addToCart;
window.addOfferToCart = addOfferToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.submitOrder = submitOrder;
window.changeMainImage = changeMainImage;

document.addEventListener("DOMContentLoaded", () => {
  createHiddenAdminButton();
  updateCartBadge(); // Update badge on initial load

  syncFirestore()
    .catch((e) => {
      console.warn("Firestore sync failed", e);
    })
    .finally(() => {
      if (document.querySelector(".heroSwiper") && typeof Swiper !== "undefined") {
        new Swiper(".heroSwiper", {
          loop: true,
          autoplay: { delay: 3000 },
          pagination: { el: ".swiper-pagination", clickable: true },
          navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          },
        });
      }
      if (typeof AOS !== "undefined") {
        AOS.init({ duration: 800, once: true });
      }
      if (typeof gsap !== "undefined") {
        gsap.from(".hero h1, .hero p, .hero .btn", {
          y: 40,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
        });
      }
    });
});
