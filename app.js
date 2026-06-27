import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
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
    .map((entry) => {
      if (entry.type === "offer") {
        return { type: "offer", item: entry, qty: entry.qty };
      }

      // products.id is String now
      const product = products.find((p) => String(p.id) === String(entry.id));
      return product
        ? { type: "product", item: product, qty: entry.qty }
        : null;
    })
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

async function loadProducts() {
  const items = await loadCollectionAsArray(PRODUCTS_COL);
  return items.map((p) => {
    const stringId = String(p.docId ?? p.id);
    return normalizeProduct({ ...p, id: stringId });
  });
}

async function loadOffers() {
  const items = await loadCollectionAsArray(OFFERS_COL);
  return items.map((o) => {
    const numericId = Number(o.docId ?? o.id);
    return normalizeOffer({ ...o, id: numericId });
  });
}

async function loadSettings() {
  const settingsCol = collection(db, SETTINGS_COL);
  const snap = await getDocs(settingsCol);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...first.data() };
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
  const [p, o, s, r] = await Promise.all([
    loadProducts().catch(() => []),
    loadOffers().catch(() => []),
    loadSettings().catch(() => null),
    loadApprovedReviews().catch(() => []),
  ]);

  products = p;
  offers = o;
  settings = s;

  if (document.getElementById("featured-products")) initHomePage();
  if (document.getElementById("homepage-offers")) renderHomeOffers();
  if (document.getElementById("home-reviews-grid")) renderHomeReviews(r);

  if (document.getElementById("offers-grid")) initOffersPage();
  if (document.getElementById("products-grid")) initProductsPage();

  if (
    document.getElementById("cart-items") &&
    document.getElementById("cart-summary")
  ) {
    initCartPage();
  }

  if (document.getElementById("product-detail")) initProductDetail();
}

// =========================
// Cart actions
// =========================
function addToCart(productId, qty = 1) {
  const normalizedId = String(productId);
  if (!normalizedId || normalizedId === "undefined" || normalizedId === "null") {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "حدث خطأ",
        text: "معرّف المنتج غير صالح",
        icon: "error",
        confirmButtonText: "حسناً",
      });
    }
    return;
  }

  const item = cart.find(
    (entry) => String(entry.id) === normalizedId && entry.type !== "offer",
  );

  if (item) item.qty += qty;
  else cart.push({ id: normalizedId, type: "product", qty });

  saveCart();
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "تمت الإضافة!",
      text: "تمت إضافة المنتج إلى السلة بنجاح",
      icon: "success",
      confirmButtonText: "حسناً",
    });
  }
}

function addOfferToCart(offerId, qty = 1) {
  const offer = offers.find((entry) => entry.id === Number(offerId));
  if (!offer) return;

  const cartId = `offer-${offer.id}`;
  const item = cart.find((entry) => entry.id === cartId && entry.type === "offer");

  if (item) item.qty += qty;
  else
    cart.push({
      id: cartId,
      type: "offer",
      qty,
      title: offer.title,
      description: offer.description,
      discount: Number(offer.discount || 0),
    });

  saveCart();
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "تمت الإضافة!",
      text: `تمت إضافة العرض "${offer.title}" إلى السلة`,
      icon: "success",
      confirmButtonText: "حسناً",
    });
  }

  initCartPage();
}

function changeQty(productId, delta) {
  cart = cart
    .map((entry) =>
      entry.id === productId
        ? { ...entry, qty: Math.max(1, entry.qty + delta) }
        : entry,
    )
    .filter((entry) => entry.qty > 0);

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
  const total = items.reduce(
    (sum, entry) => sum + (entry.type === "offer" ? 0 : entry.item.price * entry.qty),
    0,
  );

  const orderRef = `MASRY-${Date.now()}`;
  const order = {
    orderRef,
    items: items.map((entry) => ({
      type: entry.type,
      id: entry.type === "offer" ? `offer-${entry.item.id}` : entry.item.id,
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
}

// =========================
// Render pages
// =========================
function renderProductCards(container, limit = null) {
  if (!container) return;
  const items = limit ? products.filter((p) => p.featured).slice(0, limit) : products;

  container.innerHTML = items
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

function renderBestSellers() {
  const container = document.getElementById("best-sellers");
  if (!container) return;

  const bestSellers = products.filter((product) => product.bestSeller).slice(0, 3);

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
        <img src="${product.images?.[0]}" alt="${product.name}" class="w-100 mb-3" style="height:200px; object-fit:cover;" />
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

function initHomePage() {
  renderProductCards(document.getElementById("featured-products"), 3);
  renderBestSellers();
  renderHomeOffers();
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
        <div class="offer-card p-4 h-100">
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

  const approved = reviews.filter((r) => r.approved);
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
        <div class="offer-card p-4 h-100">
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

function initProductsPage() {
  const grid = document.getElementById("products-grid");
  const filterBar = document.querySelector(".filter-bar");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const pagination = document.getElementById("pagination");
  if (!grid) return;

  let currentCategory = "الكل";
  let currentPage = 1;
  const perPage = 6;

  const categories = ["الكل", ...Array.from(new Set(products.map((p) => p.category)))];

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

  function applyFilters() {
    const filtered = products.filter((product) => {
      const categoryMatch = currentCategory === "الكل" || product.category === currentCategory;
      const searchMatch =
        product.name.includes(searchInput?.value || "") ||
        product.description.includes(searchInput?.value || "");
      return categoryMatch && searchMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortSelect?.value === "price") return a.price - b.price;
      if (sortSelect?.value === "rating") return b.rating - a.rating;
      return 0;
    });

    const pages = Math.ceil(sorted.length / perPage);
    const start = (currentPage - 1) * perPage;
    const pageItems = sorted.slice(start, start + perPage);

    if (!pageItems.length) {
      grid.innerHTML =
        '<div class="col-12 text-center py-5"><h5>لا توجد منتجات تطابق التصفية الحالية</h5></div>';
    } else {
      grid.innerHTML = pageItems
        .map(
          (product) => `
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
                <button class="btn btn-primary-custom btn-sm flex-grow-1" onclick="addToCart('${product.id}')">إضافة للسلة</button>
              </div>
            </div>
          </div>
        </div>
      `,
        )
        .join("");
    }

    if (pagination) {
      pagination.innerHTML = Array.from({ length: pages }, (_, i) => `
        <li class="page-item ${i + 1 === currentPage ? "active" : ""}"><button class="page-link" data-page="${i + 1}">${i + 1}</button></li>
      `).join("");

      pagination.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
          currentPage = Number(button.dataset.page);
          applyFilters();
        });
      });
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;
      currentPage = 1;
      filterButtons.forEach((item) => item.classList.toggle("active", item === button));
      applyFilters();
    });
  });

  searchInput?.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });
  sortSelect?.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });

  applyFilters();
}

async function initProductDetail() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const detail = document.getElementById("product-detail");
  if (!detail || !productId) return;

  if (!Array.isArray(products) || products.length === 0) {
    await syncFirestore().catch((e) => console.warn("[ProductDetail] syncFirestore failed", e));
  }

  const product = getProductById(productId);
  if (!product) {
    detail.innerHTML = '<div class="alert alert-danger">المنتج غير موجود</div>';
    return;
  }

  detail.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-6">
        <img src="${product.images[0]}" alt="${product.name}" class="w-100 mb-3" id="mainImage">
        <div class="d-flex gap-2">
          ${product.images
            .map(
              (image) => `<img src="${image}" alt="${product.name}" class="thumb-image" onclick="changeMainImage('${image}')" style="width: 90px; height: 70px; object-fit: cover; cursor: pointer;">`,
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
      <div class="cart-item mb-3 p-3">
        <div class="row align-items-center">
          <div class="col-md-3"><img src="${item.images[0]}" alt="${item.name}"></div>
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
    0,
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
      Number(p.oldPrice || p.price) - Number(p.price || 0),
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

  syncFirestore()
    .catch((e) => {
      console.warn("Firestore sync failed", e);
    })
    .finally(() => {
      const heroSwiper = document.querySelector(".mySwiper");
      if (heroSwiper && typeof Swiper !== "undefined") {
        new Swiper(".mySwiper", {
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

