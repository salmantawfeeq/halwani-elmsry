const adminStorageKey = 'almasry-admin-data';

const defaultAdminState = {
  products: [
    {
      id: 1,
      name: 'حلويات المصري الخاصة',
      category: 'شرقية',
      price: 180,
      oldPrice: 220,
      rating: 4.9,
      badge: 'الأكثر طلباً',
      description: 'مزيج فاخر من الحلاوة الشرقية واللوز والشوكولاتة.',
      ingredients: ['لوز', 'سكر', 'ماء ورد', 'شوكولاتة'],
      weight: '500 غ',
      featured: true,
      bestSeller: true,
      images: ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80']
    },
    {
      id: 2,
      name: 'تورتة الزهور الذهبية',
      category: 'تورتات',
      price: 650,
      oldPrice: 780,
      rating: 5,
      badge: 'حصري',
      description: 'تورتة أنيقة للاحتفالات مع طبقات من الكيك والكراميل.',
      ingredients: ['كيك فانيليا', 'كراميل', 'فواكه'],
      weight: '2.5 كغ',
      featured: true,
      bestSeller: true,
      images: ['https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80']
    }
  ],
  categories: ['شرقية', 'غربية', 'تورتات', 'جاتوه', 'كيك', 'هدايا', 'عروض'],
  offers: [
    {
      id: 1,
      title: 'عرض الصيف',
      description: 'خصم 15% على جميع الباقات والمنتجات المميزة في فصل الصيف.',
      discount: 15,
      price: 320,
      showOnHome: true,
      homeTitle: 'عرض الصيف',
      homeDescription: 'خصم 15% على جميع الباقات والمنتجات المميزة في فصل الصيف.',
      buttonText: 'استكشف العرض',
      buttonLink: 'offers.html',
      images: []
    },
    {
      id: 2,
      title: 'تورتات العيد',
      description: 'تصاميم مخصصة للعيد مع أسعار مميزة ومكونات فاخرة.',
      discount: 20,
      price: 450,
      showOnHome: true,
      homeTitle: 'تورتات العيد',
      homeDescription: 'تصاميم مخصصة للعيد مع أسعار مميزة ومكونات فاخرة.',
      buttonText: 'عرض المزيد',
      buttonLink: 'offers.html',
      images: []
    }
  ],
  reviews: [{ id: 1, name: 'سارة', text: 'خدمة ممتازة وتقديم رائع', approved: true }],
  settings: { whatsapp: '+201011001128', logo: 'المصري', banner: 'حلويات فاخرة لكل مناسبة' }
};

function normalizeAdminProduct(product) {
  return {
    ...product,
    id: Number(product.id || Date.now()),
    price: Number(product.price || 0),
    oldPrice: Number(product.oldPrice || product.price || 0),
    rating: Number(product.rating || 4.8),
    badge: product.badge || 'مميز',
    description: product.description || 'منتج فاخر من متجر المصري.',
    ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
    weight: product.weight || '1 كغ',
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller),
    images: Array.isArray(product.images) && product.images.length
      ? product.images
      : ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80']
  };
}

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
    buttonLink: offer.buttonLink || 'offers.html',
    images: Array.isArray(offer.images) ? offer.images : []
  };
}

function getAdminState() {
  try {
    const saved = JSON.parse(localStorage.getItem(adminStorageKey) || 'null');
    if (saved) {
      return {
        ...saved,
        products: (saved.products || []).map(normalizeAdminProduct),
        categories: Array.isArray(saved.categories) ? saved.categories : defaultAdminState.categories,
        offers: Array.isArray(saved.offers) ? saved.offers.map(normalizeOffer) : [],
        reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
        settings: saved.settings || defaultAdminState.settings
      };
    }
  } catch (error) {
    console.warn('Unable to read admin state', error);
  }
  return JSON.parse(JSON.stringify(defaultAdminState));
}

function saveAdminState(state) {
  const normalizedState = {
    ...state,
    products: (state.products || []).map(normalizeAdminProduct),
    categories: Array.isArray(state.categories) ? state.categories : defaultAdminState.categories,
    offers: Array.isArray(state.offers) ? state.offers.map(normalizeOffer) : [],
    reviews: Array.isArray(state.reviews) ? state.reviews : [],
    settings: state.settings || defaultAdminState.settings
  };
  localStorage.setItem(adminStorageKey, JSON.stringify(normalizedState));
  window.dispatchEvent(new Event('admin-data-updated'));
  return normalizedState;
}

function showToast(message, type = 'success') {
  Swal.fire({ title: message, icon: type, timer: 1800, showConfirmButton: false });
}

function renderDashboard() {
  const state = getAdminState();
  const approvedReviews = state.reviews.filter((review) => review.approved).length;
  const popularProduct =
    state.products.find((product) => product.bestSeller) ||
    state.products.reduce((best, product) => (product.rating > best.rating ? product : best), state.products[0] || { name: 'لا يوجد', rating: 0 });

  const productsCount = document.getElementById('stats-products');
  const categoriesCount = document.getElementById('stats-categories');
  const popularText = document.getElementById('stats-popular');
  const reviewsCount = document.getElementById('stats-reviews');

  if (productsCount) productsCount.textContent = state.products.length;
  if (categoriesCount) categoriesCount.textContent = state.categories.length;
  if (popularText) popularText.textContent = popularProduct?.name || 'لا يوجد';
  if (reviewsCount) reviewsCount.textContent = approvedReviews;
}

function populateCategorySelects() {
  const state = getAdminState();
  const selectElements = [document.getElementById('product-category-select'), document.getElementById('product-edit-category-select')];

  selectElements.forEach((select) => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = state.categories.map((category) => `<option value="${category}">${category}</option>`).join('');
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function renderProducts() {
  const state = getAdminState();
  const tbody = document.getElementById('products-table');
  if (!tbody) return;

  tbody.innerHTML = state.products
    .map(
      (product, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.price}</td>
      <td>${product.badge}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" onclick="editProduct(${product.id})">تعديل</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">حذف</button>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderCategories() {
  const state = getAdminState();
  const list = document.getElementById('categories-list');
  if (!list) return;

  list.innerHTML = state.categories
    .map(
      (category) => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      ${category}
      <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${category}')">حذف</button>
    </li>
  `
    )
    .join('');

  populateCategorySelects();
}

function renderOffers() {
  const state = getAdminState();
  const list = document.getElementById('offers-list');
  if (!list) return;

  list.innerHTML = state.offers
    .map(
      (offer) => `
    <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
      <div>
        <strong>${offer.title}</strong>
        <div class="small text-muted">${offer.discount}% • ${offer.showOnHome ? 'ظاهر في الصفحة الرئيسية' : 'مخفي من الرئيسية'}</div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" onclick="editOffer(${offer.id})">تعديل</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteOffer(${offer.id})">حذف</button>
      </div>
    </li>
  `
    )
    .join('');
}

function safeText(value) {
  return String(value ?? '').replaceAll('"', '"');
}

function renderReviews() {
  const state = getAdminState();
  const list = document.getElementById('reviews-list');
  if (!list) return;

  list.innerHTML = state.reviews
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
            <button class="btn btn-sm btn-outline-success" onclick="approveReview(${review.id})">قبول</button>
            <button class="btn btn-sm btn-outline-warning" onclick="rejectReview(${review.id})">رفض</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteReview(${review.id})">حذف</button>
          </div>
        </li>
      `;
    })
    .join('');
}


function renderSettings() {
  const state = getAdminState();
  const whatsapp = document.getElementById('whatsapp-number');
  const logo = document.getElementById('site-logo');
  const banner = document.getElementById('banner-text');

  if (whatsapp) whatsapp.value = state.settings.whatsapp;
  if (logo) logo.value = state.settings.logo;
  if (banner) banner.value = state.settings.banner;
}

function readImageFiles(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return Promise.resolve([]);

  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

async function addProduct(event) {
  event.preventDefault();
  const state = getAdminState();
  const form = event.target;
  const category = form.elements.category.value.trim();

  if (!category) {
    showToast('يرجى اختيار تصنيف', 'error');
    return;
  }

  if (!state.categories.includes(category)) {
    state.categories.push(category);
  }

  const images = await readImageFiles(form.elements.imageFiles);

  const product = {
    id: Date.now(),
    name: form.elements.name.value.trim(),
    category,
    price: Number(form.elements.price.value || 0),
    oldPrice: Number(form.elements.oldPrice.value || form.elements.price.value || 0),
    rating: Number(form.elements.rating.value || 4.8),
    badge: form.elements.badge.value.trim() || 'مميز',
    description: form.elements.description.value.trim() || 'منتج فاخر من متجر المصري.',
    ingredients: form.elements.ingredients.value.split(',').map((item) => item.trim()).filter(Boolean),
    weight: form.elements.weight.value.trim() || '1 كغ',
    featured: form.elements.featured.checked,
    bestSeller: form.elements.bestSeller.checked,
    images: images.length ? images : ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80']
  };

  state.products.push(product);
  saveAdminState(state);

  renderDashboard();
  renderProducts();
  renderCategories();

  form.reset();
  showToast('تمت إضافة المنتج');
}

function editProduct(id) {
  const state = getAdminState();
  const product = state.products.find((item) => item.id === id);
  if (!product) return;

  const form = document.getElementById('product-edit-form');
  if (!form) return;

  form.elements.name.value = product.name;
  form.elements.category.value = product.category;
  form.elements.price.value = product.price;
  form.elements.oldPrice.value = product.oldPrice;
  form.elements.rating.value = product.rating;
  form.elements.badge.value = product.badge;
  form.elements.weight.value = product.weight;
  form.elements.description.value = product.description;
  form.elements.ingredients.value = product.ingredients.join(', ');
  form.elements.featured.checked = product.featured;
  form.elements.bestSeller.checked = product.bestSeller;

  form.dataset.editId = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function updateProduct(event) {
  event.preventDefault();
  const state = getAdminState();
  const form = event.target;
  const id = Number(form.dataset.editId);

  const product = state.products.find((item) => item.id === id);
  if (!product) return;

  const category = form.elements.category.value.trim();
  if (!category) {
    showToast('يرجى اختيار تصنيف', 'error');
    return;
  }

  if (!state.categories.includes(category)) {
    state.categories.push(category);
  }

  const images = await readImageFiles(form.elements.imageFiles);

  state.products = state.products.map((item) =>
    item.id === id
      ? {
          ...item,
          name: form.elements.name.value.trim(),
          category,
          price: Number(form.elements.price.value || 0),
          oldPrice: Number(form.elements.oldPrice.value || form.elements.price.value || 0),
          rating: Number(form.elements.rating.value || 4.8),
          badge: form.elements.badge.value.trim() || 'مميز',
          description: form.elements.description.value.trim() || 'منتج فاخر من متجر المصري.',
          ingredients: form.elements.ingredients.value
            .split(',')
            .map((string) => string.trim())
            .filter(Boolean),
          weight: form.elements.weight.value.trim() || '1 كغ',
          featured: form.elements.featured.checked,
          bestSeller: form.elements.bestSeller.checked,
          images: images.length ? images : item.images
        }
      : item
  );

  saveAdminState(state);
  renderDashboard();
  renderProducts();
  renderCategories();

  form.reset();
  showToast('تم تحديث المنتج');
}

function deleteProduct(id) {
  const state = getAdminState();
  state.products = state.products.filter((product) => product.id !== id);
  saveAdminState(state);

  renderDashboard();
  renderProducts();
  showToast('تم حذف المنتج');
}

function addCategory(event) {
  event.preventDefault();
  const state = getAdminState();
  const input = document.getElementById('category-name');
  const category = input?.value?.trim();
  if (!category) return;

  if (!state.categories.includes(category)) {
    state.categories.push(category);
  }

  saveAdminState(state);
  renderCategories();
  if (input) input.value = '';
  showToast('تمت إضافة التصنيف');
}

function deleteCategory(name) {
  const state = getAdminState();
  state.categories = state.categories.filter((category) => category !== name);
  saveAdminState(state);
  renderCategories();
  showToast('تم حذف التصنيف');
}

function editOffer(id) {
  const state = getAdminState();
  const offer = state.offers.find((item) => item.id === id);
  if (!offer) return;

  const form = document.getElementById('offer-form');
  if (!form) return;

  form.elements.title.value = offer.title;
  form.elements.description.value = offer.description;
  form.elements.discount.value = offer.discount;
  form.elements.price.value = offer.price || '';
  form.elements.showOnHome.checked = offer.showOnHome;
  form.elements.homeTitle.value = offer.homeTitle || offer.title;
  form.elements.homeDescription.value = offer.homeDescription || offer.description;
  form.elements.buttonText.value = offer.buttonText || 'عرض المزيد';

  form.dataset.editId = id;
  form.querySelector('button') && (form.querySelector('button').textContent = 'تحديث العرض');

  // file input: لن نعبّيه (security)، سنحتفظ بالصور القديمة عند التحديث لو لم يتم رفع جديد.
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function addOffer(event) {
  event.preventDefault();
  const state = getAdminState();
  const form = event.target;

  const images = await readImageFiles(form.elements.offerImageFiles);

  const isEdit = Boolean(form.dataset.editId);
  const editId = Number(form.dataset.editId);

  const existing = isEdit ? state.offers.find((o) => o.id === editId) : null;
  const prevImages = Array.isArray(existing?.images) ? existing.images : [];

  const offerData = {
    id: editId || Date.now(),
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim(),
    discount: Number(form.elements.discount.value || 0),
    price: Number(form.elements.price.value || 0),
    showOnHome: form.elements.showOnHome.checked,
    homeTitle: form.elements.homeTitle.value.trim() || form.title.value.trim(),
    homeDescription: form.elements.homeDescription.value.trim() || form.description.value.trim(),
    buttonText: form.elements.buttonText.value.trim() || 'عرض المزيد',
    images: images.length ? images : prevImages
  };

  if (isEdit) {
    state.offers = state.offers.map((offer) => (offer.id === editId ? offerData : offer));
    showToast('تم تحديث العرض');
  } else {
    state.offers.push(offerData);
    showToast('تمت إضافة العرض');
  }

  saveAdminState(state);
  renderOffers();
  form.reset();
  delete form.dataset.editId;
  if (form.querySelector('button')) form.querySelector('button').textContent = 'إضافة عرض';
}

function deleteOffer(id) {
  const state = getAdminState();
  state.offers = state.offers.filter((offer) => offer.id !== id);
  saveAdminState(state);
  renderOffers();
  showToast('تم حذف العرض');
}

function approveReview(id) {
  const state = getAdminState();
  state.reviews = state.reviews.map((review) => (review.id === id ? { ...review, approved: true } : review));
  saveAdminState(state);
  renderReviews();
  showToast('تم قبول التقييم');
}

function rejectReview(id) {
  const state = getAdminState();
  state.reviews = state.reviews.map((review) => (review.id === id ? { ...review, approved: false } : review));
  saveAdminState(state);
  renderReviews();
  showToast('تم رفض التقييم');
}

function deleteReview(id) {
  const state = getAdminState();
  state.reviews = state.reviews.filter((review) => review.id !== id);
  saveAdminState(state);
  renderReviews();
  showToast('تم حذف التقييم');
}

function saveSettings(event) {
  event.preventDefault();
  const state = getAdminState();
  state.settings = {
    whatsapp: document.getElementById('whatsapp-number').value,
    logo: document.getElementById('site-logo').value,
    banner: document.getElementById('banner-text').value
  };
  saveAdminState(state);
  showToast('تم حفظ الإعدادات');
}

function initAdminLogin() {
  const loginForm = document.getElementById('admin-login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const email = emailInput?.value?.trim()?.toLowerCase();
    const password = passwordInput?.value?.trim();

    const validCredentials = [['admin@elmsry.com', '01011001128']];
    const isValid = validCredentials.some(([validEmail, validPassword]) => email === validEmail && password === validPassword);

    if (isValid) {
      localStorage.setItem('almasry-admin-auth', 'true');
      window.location.reload();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'بيانات غير صحيحة',
        text: `البريد: ${email || 'غير مدخل'} | كلمة المرور: ${password || 'غير مدخل'}`
      });
    }
  });
}

function initAdminPanel() {
  if (!localStorage.getItem('almasry-admin-auth')) {
    const panel = document.getElementById('admin-panel');
    const login = document.getElementById('admin-login');
    if (panel) panel.style.display = 'none';
    if (login) login.style.display = 'block';
    return;
  }

  const panel = document.getElementById('admin-panel');
  const login = document.getElementById('admin-login');
  if (panel) panel.style.display = 'block';
  if (login) login.style.display = 'none';

  renderDashboard();
  renderProducts();
  renderCategories();
  renderOffers();
  renderReviews();
  renderSettings();
}

function loadPendingOrders() {
  try {
    const key = 'almasry-orders-pending';
    const pending = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(pending) ? pending : [];
  } catch {
    return [];
  }
}

function getProductById(id) {
  const state = getAdminState();
  return state.products.find((p) => p.id === Number(id));
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

    productSelect.innerHTML = unique.length ? unique.map((p) => `<option value="${p.productId}">${p.label}</option>`).join('') : '<option value="">لا يوجد منتج قابل للتقييم</option>';
  }

  renderProductsForSelectedOrder();
  orderSelect.addEventListener('change', renderProductsForSelectedOrder);
}

function submitPendingReview() {
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

  const productId = productSelect.value;
  if (!productId) {
    showToast('اختر منتج من الطلب', 'error');
    return;
  }

  const product = getProductById(productId);
  const productName = product?.name || 'منتج';

  const state = getAdminState();
  const review = {
    id: Date.now(),
    name: (nameInput.value || '').trim() || 'عميلنا المميز',
    text: (textInput.value || '').trim() || '',
    approved: false,
    productId: Number(productId),
    productName,
    orderRef: order.orderRef,
    createdAt: new Date().toISOString(),
    rating: Number(ratingInput?.value || 4.8)
  };

  if (!review.text) {
    showToast('اكتب نص التقييم', 'error');
    return;
  }

  state.reviews = Array.isArray(state.reviews) ? state.reviews : [];
  state.reviews.push(review);
  saveAdminState(state);

  // تأكيد: لا نزيل pending order تلقائياً (للسلامة)، لكن يمكن وضع reviewed flag إن رغبت.
  showToast('تم إرسال التقييم للمراجعة');
  if (textInput) textInput.value = '';
  if (nameInput) nameInput.value = '';
  renderReviews();
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminLogin();
  initAdminPanel();

  document.getElementById('product-form')?.addEventListener('submit', addProduct);
  document.getElementById('product-edit-form')?.addEventListener('submit', updateProduct);
  document.getElementById('category-form')?.addEventListener('submit', addCategory);
  document.getElementById('offer-form')?.addEventListener('submit', addOffer);
  document.getElementById('settings-form')?.addEventListener('submit', saveSettings);

  // Pending Orders UI
  renderPendingOrdersUI();
  document.getElementById('submit-pending-review-btn')?.addEventListener('click', submitPendingReview);

  populateCategorySelects();

  if (typeof AOS !== 'undefined' && AOS.init) {
    AOS.init({ duration: 800, once: true });
  }
});


