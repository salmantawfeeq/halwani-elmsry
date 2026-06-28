// ADMIN PANEL - Firebase Auth + Firestore CRUD

import { auth, db } from './firebase-init.js';

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  adminListProducts,
  adminListOffers,
  adminListReviews,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminCreateOffer,
  adminUpdateOffer,
  adminDeleteOffer,
  adminUpdateReview,
  adminDeleteReview,
  adminUpsertSettings
} from './admin-firestore-client.js';

const DEFAULT_CATEGORIES = ['شرقية', 'غربية', 'تورتات', 'جاتوه', 'كيك', 'هدايا', 'عروض'];

const PRODUCTS_COL = 'products';
const OFFERS_COL = 'offers';
const REVIEWS_COL = 'reviews';
const SETTINGS_COL = 'settings';

// =========================
// UI helpers
// =========================
function showToast(message, type = 'success') {
  Swal.fire({ title: message, icon: type, timer: 1800, showConfirmButton: false });
}

function safeText(value) {
  return String(value ?? '').replaceAll('"', '"');
}

function setPanelVisible(visible) {
  const panel = document.getElementById('admin-panel');
  const loginWrap = document.getElementById('admin-login');
  if (panel) panel.style.display = visible ? 'block' : 'none';
  if (loginWrap) loginWrap.style.display = visible ? 'none' : 'block';
}

// =========================
// State
// =========================
let categories = [...DEFAULT_CATEGORIES];
let products = [];
let offers = [];
let reviews = [];

// سيتم استبدال هذا لاحقًا بنظام صلاحيات من الباك إند
let currentUser = null;

// =========================
// Fetch
// =========================
async function fetchAll() {
  // Products/Offers/Reviews are full lists; we filter in render.
  products = await adminListProducts().catch(() => []);
  offers = await adminListOffers().catch(() => []);
  reviews = await adminListReviews().catch(() => []);

  const catsFromProducts = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...catsFromProducts]));

  renderDashboard();
  renderProducts();
  renderCategories();
  renderOffers();
  renderReviews();
  await renderSettings();
}

async function renderSettings() {
  // We use read from Firestore directly (client rules must allow read if needed)
  try {
    const snap = await getDocs(collection(db, SETTINGS_COL));
    if (!snap.empty) {
      const first = snap.docs[0];
      const s = first.data() || {};
      const whatsapp = document.getElementById('whatsapp-number');
      const logo = document.getElementById('site-logo');
      const banner = document.getElementById('banner-text');
      if (whatsapp) whatsapp.value = s.whatsapp || '';
      if (logo) logo.value = s.logo || '';
      if (banner) banner.value = s.banner || '';
    }
  } catch (e) {
    console.warn('Unable to render settings', e);
  }
}

// =========================
// Render
// =========================
function renderDashboard() {
  const statsProducts = document.getElementById('stats-products');
  const statsCategories = document.getElementById('stats-categories');
  const statsPopular = document.getElementById('stats-popular');
  const statsReviews = document.getElementById('stats-reviews');

  const approvedReviews = reviews.filter((r) => r.approved).length;
  const popularProduct =
    products.find((p) => p.bestSeller) ||
    products.reduce((best, p) => (p.rating > (best.rating || 0) ? p : best), products[0] || { name: 'لا يوجد', rating: 0 });

  if (statsProducts) statsProducts.textContent = products.length;
  if (statsCategories) statsCategories.textContent = categories.length;
  if (statsPopular) statsPopular.textContent = popularProduct?.name || 'لا يوجد';
  if (statsReviews) statsReviews.textContent = approvedReviews;
}

function populateCategorySelects() {
  const selectElements = [
    document.getElementById('product-category-select'),
    document.getElementById('product-edit-category-select')
  ];

  selectElements.forEach((select) => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join('');
    if (currentValue) select.value = currentValue;
  });
}

function renderProducts() {
  const tbody = document.getElementById('products-table');
  if (!tbody) return;

  tbody.innerHTML = products
    .map(
      (product, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${safeText(product.name)}</td>
      <td>${safeText(product.category)}</td>
      <td>${product.price ?? ''}</td>
      <td>${safeText(product.badge)}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" onclick="editProduct('${product.id}')">تعديل</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product.id}')">حذف</button>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderCategories() {
  const list = document.getElementById('categories-list');
  if (!list) return;

  // ملاحظة: حذف التصنيف من الواجهة لن يزيل من Firestore تلقائيًا (لتجنب تعقيد). فقط نحافظ على UI.
  list.innerHTML = categories
    .map(
      (category) => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      ${safeText(category)}
      <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${category}')">حذف</button>
    </li>
  `
    )
    .join('');

  populateCategorySelects();
}

function renderOffers() {
  const list = document.getElementById('offers-list');
  if (!list) return;

  list.innerHTML = offers
    .map(
      (offer) => `
    <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
      <div>
        <strong>${safeText(offer.title)}</strong>
        <div class="small text-muted">${offer.discount ?? 0}% • ${offer.showOnHome ? 'ظاهر في الصفحة الرئيسية' : 'مخفي من الرئيسية'}</div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" onclick="editOffer('${offer.id}')">تعديل</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteOffer('${offer.id}')">حذف</button>
      </div>
    </li>
  `
    )
    .join('');
}

function renderReviews() {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  list.innerHTML = reviews
    .map((review) => {
      const productLine = review.productName ? `<div class="small text-muted mt-2">${safeText(review.productName)}</div>` : '';
      const orderLine = review.orderRef ? `<div class="small text-muted">مرجع الطلب: ${safeText(review.orderRef)}</div>` : '';
      const dateLine = review.createdAt ? `<div class="small text-muted">${new Date(review.createdAt).toLocaleDateString('ar-EG')}</div>` : '';

      return `
        <li class="list-group-item">
          <div class="d-flex justify-content-between">
            <strong>${safeText(review.name)}</strong>
            <span>${review.approved ? 'مقبول' : 'مرفوض'}</span>
          </div>
          <p class="small mb-2">${safeText(review.text)}</p>
          ${productLine}
          ${orderLine}
          ${dateLine}
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-success" onclick="approveReview('${review.id}')">قبول</button>
            <button class="btn btn-sm btn-outline-warning" onclick="rejectReview('${review.id}')">رفض</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${review.id}')">حذف</button>
          </div>
        </li>
      `;
    })
    .join('');
}

// =========================
// CRUD - Products
// =========================
async function addProduct(event) {
  event.preventDefault();
  const form = event.target;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'جاري المعالجة...';
  }

  const category = form.elements.category.value.trim();
  const name = form.elements.name.value.trim();

  if (!category) return showToast('يرجى اختيار تصنيف', 'error');
  if (!name) return showToast('يرجى إدخال اسم المنتج', 'error');

  const files = form.elements.imageFiles?.files;
  const images = await readImageFiles(files);

  const payload = {
    name,
    category,
    price: Number(form.elements.price.value || 0),
    oldPrice: Number(form.elements.oldPrice.value || form.elements.price.value || 0),
    rating: Number(form.elements.rating.value || 4.8),
    badge: form.elements.badge.value.trim() || 'مميز',
    weight: form.elements.weight.value.trim() || '1 كغ',
    description: form.elements.description.value.trim() || 'منتج فاخر من متجر المصري.',
    ingredients: form.elements.ingredients.value.split(',').map((x) => x.trim()).filter(Boolean),
    featured: !!form.elements.featured.checked,
    bestSeller: !!form.elements.bestSeller.checked,
    images: images.length ? images : ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80']
  };

  await adminCreateProduct(payload);

  if (!categories.includes(category)) categories.push(category);
  await fetchAll();

  form.reset();
  showToast('تمت إضافة المنتج');

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = 'إضافة منتج';
  }
}

function editProduct(id) {
  const product = products.find((p) => p.id === id || String(p.id) === String(id));
  if (!product) return;

  const form = document.getElementById('product-edit-form');
  if (!form) return;

  form.elements.name.value = product.name || '';
  form.elements.category.value = product.category || '';
  form.elements.price.value = product.price ?? '';
  form.elements.oldPrice.value = product.oldPrice ?? '';
  form.elements.rating.value = product.rating ?? '';
  form.elements.badge.value = product.badge ?? '';
  form.elements.weight.value = product.weight ?? '';
  form.elements.description.value = product.description ?? '';
  form.elements.ingredients.value = Array.isArray(product.ingredients) ? product.ingredients.join(', ') : '';
  form.elements.featured.checked = !!product.featured;
  form.elements.bestSeller.checked = !!product.bestSeller;

  form.dataset.editId = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function updateProduct(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.editId;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'جاري التحديث...';
  }

  if (!id) return;

  const images = await readImageFiles(form.elements.imageFiles?.files);

  const category = form.elements.category.value.trim();
  if (!category) return showToast('يرجى اختيار تصنيف', 'error');

  const payload = {
    name: form.elements.name.value.trim(),
    category,
    price: Number(form.elements.price.value || 0),
    oldPrice: Number(form.elements.oldPrice.value || form.elements.price.value || 0),
    rating: Number(form.elements.rating.value || 4.8),
    badge: form.elements.badge.value.trim() || 'مميز',
    weight: form.elements.weight.value.trim() || '1 كغ',
    description: form.elements.description.value.trim() || 'منتج فاخر من متجر المصري.',
    ingredients: form.elements.ingredients.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    featured: !!form.elements.featured.checked,
    bestSeller: !!form.elements.bestSeller.checked,
    images: images.length ? images : (products.find((p) => p.id === id)?.images || [])
  };

  await adminUpdateProduct(id, payload);

  if (!categories.includes(category)) categories.push(category);
  await fetchAll();

  form.reset();
  delete form.dataset.editId;
  showToast('تم تحديث المنتج');

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = 'تحديث المنتج';
  }
}

async function deleteProduct(id) {
  await adminDeleteProduct(id);
  await fetchAll();
  showToast('تم حذف المنتج');
}

// =========================
// CRUD - Categories (UI only)
// =========================
function deleteCategory(name) {
  categories = categories.filter((c) => c !== name);
  renderCategories();
  showToast('تم حذف التصنيف من القائمة', 'warning');
}

// =========================
// CRUD - Offers
// =========================
function editOffer(id) {
  const offer = offers.find((o) => o.id === id);
  if (!offer) return;

  const form = document.getElementById('offer-form');
  if (!form) return;

  form.elements.title.value = offer.title || '';
  form.elements.description.value = offer.description || '';
  form.elements.discount.value = offer.discount ?? 0;
  form.elements.price.value = offer.price ?? '';
  form.elements.showOnHome.checked = !!offer.showOnHome;
  form.elements.homeTitle.value = offer.homeTitle || offer.title || '';
  form.elements.homeDescription.value = offer.homeDescription || offer.description || '';
  form.elements.buttonText.value = offer.buttonText || '';

  form.dataset.editId = id;
  form.querySelector('button') && (form.querySelector('button').textContent = 'تحديث العرض');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function addOffer(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'جاري المعالجة...';
  }

  const images = await readImageFiles(form.elements.offerImageFiles?.files);

  const isEdit = Boolean(form.dataset.editId);
  const editId = form.dataset.editId;

  const prev = isEdit ? offers.find((o) => o.id === editId) : null;

  const payload = {
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim(),
    discount: Number(form.elements.discount.value || 0),
    price: Number(form.elements.price.value || 0),
    showOnHome: !!form.elements.showOnHome.checked,
    homeTitle: form.elements.homeTitle.value.trim() || form.title.value.trim(),
    homeDescription: form.elements.homeDescription.value.trim() || form.description.value.trim(),
    buttonText: form.elements.buttonText.value.trim() || 'عرض المزيد',
    images: images.length ? images : (prev?.images || [])
  };

  if (isEdit) {
    await adminUpdateOffer(editId, payload);
    showToast('تم تحديث العرض');
  } else {
    await adminCreateOffer(payload);
    showToast('تمت إضافة العرض');
  }

  await fetchAll();

  form.reset();
  delete form.dataset.editId;
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = 'إضافة عرض';
  }
}

async function deleteOffer(id) {
  await adminDeleteOffer(id);
  await fetchAll();
  showToast('تم حذف العرض');
}

// =========================
// Reviews approved workflow
// =========================
async function approveReview(id) {
  await adminUpdateReview(id, { approved: true });
  await fetchAll();
  showToast('تم قبول التقييم');
}

async function rejectReview(id) {
  await adminUpdateReview(id, { approved: false });
  await fetchAll();
  showToast('تم رفض التقييم');
}

async function deleteReview(id) {
  await adminDeleteReview(id);
  await fetchAll();
  showToast('تم حذف التقييم');
}

// =========================
// Settings
// =========================
async function saveSettings(event) {
  event.preventDefault();

  const payload = {
    whatsapp: document.getElementById('whatsapp-number').value,
    logo: document.getElementById('site-logo').value,
    banner: document.getElementById('banner-text').value
  };

  await adminUpsertSettings(payload);
  await fetchAll();
  showToast('تم حفظ الإعدادات');
}

// =========================
// Login via Firebase Auth
// =========================
function initAdminLogin() {
  const loginForm = document.getElementById('admin-login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector('button');
    submitButton.disabled = true;
    submitButton.textContent = 'جارٍ التحقق...';

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    try {
      // استبدل هذا الرابط برابط الـ API الفعلي الخاص بك
      const response = await fetch('https://your-api-url.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'فشل تسجيل الدخول' }));
        throw new Error(errorData.message || 'تحقق من البريد/كلمة المرور');
      }

      const result = await response.json();

      // تخزين التوكن (Token) لاستخدامه في الطلبات القادمة
      localStorage.setItem('authToken', result.token);

      // محاكاة جلسة المستخدم
      currentUser = { email: result.email };
      setPanelVisible(true);
      await fetchAll(); // تحميل البيانات بعد تسجيل الدخول

      showToast('تم تسجيل الدخول بنجاح');

    } catch (e) {
      console.warn(e);
      Swal.fire({ icon: 'error', title: 'فشل تسجيل الدخول', text: e.message });
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'دخول';
    }
  });
}

function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    currentUser = null;
    window.location.reload();
  });
  }
}

function initAuthGate() {
  // عند تحميل الصفحة، تحقق من وجود التوكن
  const token = localStorage.getItem('authToken');
  if (token) {
    // يمكنك هنا إضافة طلب للتحقق من صلاحية التوكن من الباك إند
    // للتبسيط، سنفترض أن التوكن صالح
    currentUser = { token }; // قيمة وهمية للمستخدم
    setPanelVisible(true);
    fetchAll();
  } else {
    setPanelVisible(false);
  }
}

// =========================
// Pending Orders (still local)
// =========================
function loadPendingOrders() {
  try {
    const key = 'almasry-orders-pending';
    const pending = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(pending) ? pending : [];
  } catch {
    return [];
  }
}

function renderPendingOrdersUI() {
  const orderSelect = document.getElementById('pending-order-select');
  const productSelect = document.getElementById('pending-order-product-select');
  if (!orderSelect || !productSelect) return;

  const pendingOrders = loadPendingOrders();
  orderSelect.innerHTML = pendingOrders.length
    ? pendingOrders.map((o, idx) => `<option value="${idx}">${o.orderRef} (${new Date(o.createdAt || Date.now()).toLocaleDateString('ar-EG')})</option>`).join('')
    : '<option value="">لا توجد طلبات pending</option>';

  function renderProductsForSelectedOrder() {
    const idx = Number(orderSelect.value);
    productSelect.innerHTML = '';
    const order = pendingOrders[idx];
    if (!order) {
      productSelect.innerHTML = '<option value="">—</option>';
      return;
    }

    const productLines = (order.items || [])
      .filter((it) => it.type === 'product' && it.productId)
      .map((it) => ({ productId: it.productId, label: it.title || String(it.productId) }));

    const unique = Array.from(new Map(productLines.map((p) => [String(p.productId), p])).values());
    productSelect.innerHTML = unique.length
      ? unique.map((p) => `<option value="${p.productId}">${p.label}</option>`).join('')
      : '<option value="">لا يوجد منتج قابل للتقييم</option>';
  }

  renderProductsForSelectedOrder();
  orderSelect.addEventListener('change', renderProductsForSelectedOrder);
}

async function submitPendingReview() {
  const orderSelect = document.getElementById('pending-order-select');
  const productSelect = document.getElementById('pending-order-product-select');
  const nameInput = document.getElementById('pending-reviewer-name');
  const textInput = document.getElementById('pending-review-text');
  const ratingInput = document.getElementById('pending-review-rating');

  if (!orderSelect || !productSelect || !nameInput || !textInput) return;

  const pendingOrders = loadPendingOrders();
  const orderIdx = Number(orderSelect.value);
  const order = pendingOrders[orderIdx];
  if (!order) {
    showToast('اختر طلباً أولاً', 'error');
    return;
  }

  const selectedProductIds = Array.from(productSelect.selectedOptions || []).map((opt) => opt.value).filter(Boolean);
  if (!selectedProductIds.length) {
    showToast('اختر منتج من الطلب', 'error');
    return;
  }

  const productLines = selectedProductIds.map((productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    return { productId: Number(productId), productName: product?.name || 'منتج' };
  });

  const joinedProductNames = productLines.map((l) => l.productName).join('، ');

  const reviewText = (textInput.value || '').trim();
  if (!reviewText) {
    showToast('اكتب نص التقييم', 'error');
    return;
  }

  // Create review docs for each selected product (as in your earlier design it stores one doc).
  // We'll store one review doc with productIds arrays like before.
  const firstLine = productLines[0];

  const payload = {
    name: (nameInput.value || '').trim() || 'عميلنا المميز',
    text: `${reviewText}${joinedProductNames ? `\n\n(منتجات التقييم: ${joinedProductNames})` : ''}`,
    approved: false,
    productId: Number(firstLine.productId),
    productName: firstLine.productName,
    productIds: productLines.map((l) => Number(l.productId)),
    productNames: productLines.map((l) => l.productName),
    orderRef: order.orderRef,
    createdAt: new Date().toISOString(),
    rating: Number(ratingInput?.value || 4.8)
  };

  // Create in Firestore
  // We don't have adminCreateReview helper; re-use adminCreateProduct?? not.
  // Use addDoc directly.
  const { addDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
  await addDoc(collection(db, REVIEWS_COL), payload);

  showToast('تم إرسال التقييم للمراجعة');

  textInput.value = '';
  nameInput.value = '';

  await fetchAll();
  // Keep pending order data local for now
}

// =========================
// File inputs
// =========================
function resizeImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readImageFiles(filesList) {
  const files = Array.from(filesList || []);
  if (!files.length) return Promise.resolve([]);

  return Promise.all(
    // Resize each image
    files.map((file) => resizeImage(file).catch(e => {
      console.error("Error resizing image:", file.name, e);
      return null; // Return null if resizing fails for a specific image
    }))
  );
}

// =========================
// Wiring + exports for inline onclick
// =========================
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.addToCart = undefined;
window.editOffer = editOffer;
window.deleteOffer = deleteOffer;
window.approveReview = approveReview;
window.rejectReview = rejectReview;
window.deleteReview = deleteReview;
window.deleteCategory = deleteCategory;

window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.addOffer = addOffer;
window.saveSettings = saveSettings;
window.submitPendingReview = submitPendingReview;

// Pending review button handler uses function reference above

document.addEventListener('DOMContentLoaded', () => {
  initAdminLogin();
  initLogout();
  initAuthGate();

  document.getElementById('product-form')?.addEventListener('submit', addProduct);
  document.getElementById('product-edit-form')?.addEventListener('submit', updateProduct);
  document.getElementById('category-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('category-name');
    const category = input?.value?.trim();
    if (!category || categories.includes(category)) return;
    if (!categories.includes(category)) categories.push(category);
    renderCategories();
    input.value = '';
    showToast('تمت إضافة التصنيف');
  });
  document.getElementById('offer-form')?.addEventListener('submit', addOffer);
  document.getElementById('settings-form')?.addEventListener('submit', saveSettings);

  renderPendingOrdersUI();
  document.getElementById('submit-pending-review-btn')?.addEventListener('click', submitPendingReview);

  if (typeof AOS !== 'undefined' && AOS.init) {
    AOS.init({ duration: 800, once: true });
  }
});
