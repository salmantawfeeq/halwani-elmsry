# شرح مشروع متجر الحلويات المصري (El Masry)

> هذا الملف يشرح المشروع بالكامل: الفكرة، صفحات الموقع، لوحة الإدارة، طريقة الربط مع Firebase (Auth + Firestore + Storage)، وكيف يتم بناء صفحات المنتجات والسلة والطلبات.

---

## 1) نظرة عامة على المشروع

المشروع عبارة عن متجر حلويات عربي (RTL) يُعرض فيه:
- منتجات (حلويات/تورتات/هدايا…)
- عروض مميزة تظهر على الصفحة الرئيسية وبصفحة العروض
- تقييمات العملاء (تظهر فقط بعد الموافقة)
- صفحة المعرض (صور)
- صفحات معلومات: من نحن، الأسئلة الشائعة، تواصل معنا…
- سلة طلبات وخروج عبر واتساب

كما يحتوي المشروع على **لوحة إدارة** لإدارة البيانات داخل Firebase:
- إضافة/تعديل/حذف المنتجات
- إضافة/تعديل/حذف العروض
- إدارة تقييمات العملاء (قبول/رفض/حذف)
- إعدادات عامة مثل رقم واتساب، الشعار، ونص الشريط العلوي

---

## 2) هيكل المشروع (الملفات الأساسية)

ضمن مجلد المشروع ستجد ملفات HTML لصفحات الزوار، وملفات JS لإدارة منطق التطبيق.

### 2.1 صفحات الموقع (للزوار)
- `index.html` : الصفحة الرئيسية (Hero + منتجات مميزة + الأكثر مبيعًا + العروض + آراء + معرض + دعوة للتواصل)
- `products.html` : صفحة المنتجات (بحث/فلترة/فرز + Pagination)
- `product-details.html` : تفاصيل المنتج (صور متعددة + مكونات + إضافة للسلة)
- `offers.html` : صفحة العروض (بطاقات عروض + إضافة للسلة)
- `gallery.html` : صفحة المعرض (Swiper بصور داخل مجلد `صور المعرض/`)
- `reviews.html` : صفحة آراء العملاء (تظهر تقييمات فقط الموافقة)
- `faq.html` : الأسئلة الشائعة
- `about.html` : من نحن
- `contact.html` : تواصل معنا
- `cart.html` : صفحة السلة (حساب إجمالي/خصومات + إرسال واتساب)

### 2.2 لوحة الإدارة
- `admin-panel-secure.html` : واجهة لوحة الإدارة (تسجيل دخول ثم Dashboard)
- `admin.js` : منطق لوحة الإدارة (Auth gate + CRUD + Render)

### 2.3 منطق المستخدم العام
- `app.js` : منطق الموقع للزوار (تحميل Firestore جزئيًا، Render للصفحات، إدارة السلة، إرسال الطلب)

### 2.4 إعدادات Firebase
- `firebase-config.js` : إعدادات Firebase SDK
- `firebase-init.js` : استخراج `db` و `auth` و `storage`

### 2.5 مكتبة/Helpers خاصة بالإدارة
- `admin-firestore-client.js` : دوال CRUD للمنتجات/العروض/التقييمات/الإعدادات

### 2.6 ملاحظات إضافية
- `TODO.md` : قائمة تحسينات/مهام
- `styles.css` : التصميم العام
- `offer-image.css` : (ملف تصميم خاص بالعروض إن وُجد)

---

## 3) منطق التطبيق للمستخدم (app.js)

ملف `app.js` يتحكم في:
1. تحميل البيانات المطلوبة من Firestore
2. حقن الإعدادات العامة في صفحات الزوار
3. بناء محتوى الصفحات (Home / Products / Offers / Reviews / Product Details)
4. إدارة السلة (Cart) في LocalStorage
5. حساب الإجمالي والخصومات ثم إرسال الطلب عبر واتساب

### 3.1 مصادر البيانات في Firestore
يستخدم `app.js` مجموعات (Collections) التالية:
- `products`
- `offers`
- `reviews`
- `settings`

كما يوجد قواعد افتراضية لعرض المنتجات/العروض في حال كانت البيانات ناقصة.

### 3.2 نقطة الدخول: syncFirestore()

`syncFirestore()` هي الدالة المركزية داخل `app.js`.
- تجلب:
  - العروض `offers`
  - الإعدادات `settings`
  - التقييمات المقبولة فقط `reviews` حيث `approved == true`

- ثم تطبق الإعدادات على الواجهات (شعار/Top Banner/روابط واتساب)
- ثم تستدعي دوال بناء صفحات حسب وجود عناصر DOM في الصفحة:
  - Home:
    - `initHomePage(reviews)`
  - Offers:
    - `initOffersPage()`
  - Products:
    - `initProductsPage()`
  - Reviews:
    - `initReviewsPage()`
  - Cart:
    - `initCartPage()` (محمي بـ try/catch)
  - Product Details:
    - `initProductDetail()`

> مهم: الكود مصمم بحيث لو فشل Firestore في التحميل، لا ينهار rendering السلة.

### 3.3 applyGlobalSettings(settings)
تقوم بـ:
- استبدال شعار `navbar-brand` إذا `settings.logo`
- إنشاء شريط علوي (Top Banner) إذا `settings.banner`
  - يوجد “تحسين نهائي” لضبط إزاحة الـ navbar و Body padding حتى لا يختفي تحت الـ banner
- تعديل جميع روابط `wa.me` لتستخدم رقم واتساب القادم من settings

### 3.4 Normalization (تهيئة البيانات)

- `normalizeProduct(p)`
  - يحول أنواع الحقول إلى أرقام/Boolean
  - يضمن `images` تكون array (ولو ناقص يضع صورة افتراضية)
  - يحدد defaults مثل badge و description و ingredients و featured/bestSeller

- `normalizeOffer(o)`
  - يحول `id` إلى Number
  - يضمن قيم title/description/discount/price
  - يضمن images كـ array

### 3.5 السلة (Cart) وإدارة الحالة

السلة مخزنة في LocalStorage باسم:
- `almasry-cart`

وتُستخدم بنية عناصر مثل:
- للمنتجات:
  - `{ type: 'product', id: <productId>, qty: <number>, ...productDetails }`
- للعروض:
  - `{ type: 'offer', id: 'offer-<offerId>', qty: <number>, ...offerDetails }`

الدوال الأساسية:
- `addToCart(productId, qty)`
  - إن لم تكن التفاصيل موجودة محليًا في `products` يجلبها من Firestore
  - يضيف المنتج للسلة ثم يحفظ LocalStorage ويحدث Badge

- `addOfferToCart(offerId, qty)`
  - تضيف العرض بناءً على بيانات `offers`

- `changeQty(cartItemId, delta)`
  - تعديل الكمية مع حد أدنى 1

- `removeFromCart(productId)`
  - حذف مع تأكيد SweetAlert2

- `submitOrder()`
  - يبني رسالة نصية تحتوي عناصر الطلب
  - يحسب Total عبر سعر المنتجات مع خصومات العروض والخصومات الناتجة من oldPrice
  - يفتح واتساب برابط query:
    - `https://wa.me/<whatsappNumber>?text=<encodedMessage>`
  - ثم يصفّر السلة

### 3.6 render الصفحات

#### 3.6.1 الصفحة الرئيسية
- `renderFeaturedProducts()`
  - query على `products` حيث `featured == true` limit=3
  - تبني HTML cards + زر “إضافة للسلة”

- `renderBestSellers()`
  - query على `products` حيث `bestSeller == true` limit=3

- `renderHomeOffers()`
  - يعرض أول عرضين فقط من `offers` بشرط `showOnHome`

- `renderHomeReviews(reviews)`
  - تستقبل قائمة reviews المقبولة (من syncFirestore)
  - تعرض أول 3

#### 3.6.2 صفحة المنتجات (Products)

`initProductsPage()` تدير:
- Filter Bar (تصنيفات): يتم جلب قائمة التصنيفات من Firestore ديناميكيًا
- Search input: باستخدام where على name بمدى Unicode trick
- Sorting: default / price / rating
- Pagination: بالاعتماد على cursors عبر startAfter

> يوجد cache `productsCache` لمنع إعادة جلب نفس الصفحة بنفس الإعدادات.

#### 3.6.3 Product Details

`initProductDetail()`:
- يستخرج `id` من query string: `product-details.html?id=...`
- يحاول يجيب المنتج من local `products` أولاً
- إن لم يجده في `products` يطلب من Firestore
- يعرض:
  - صور متعددة (thumbnails) + تغيير الصورة الرئيسية عبر `changeMainImage`
  - badge / name / description / rating / ingredients / weight
  - زر إضافة للسلة

#### 3.6.4 Reviews page

`initReviewsPage()`:
- يجلب مراجعات مقبولة فقط من Firestore
- ثم يبني Grid.

#### 3.6.5 Offers page

`initOffersPage()`:
- يعرض جميع offers كما هي (معظم من syncFirestore)
- كل بطاقة فيها صورة/عنوان/وصف/خصم/سعر (إن موجود)

---

## 4) منطق لوحة الإدارة (admin.js)

`admin.js` يعمل على:
- تسجيل دخول الإدارة عبر Firebase Auth
- بوابة auth (Auth Gate) لعرض لوحة الإدارة فقط للمسجل
- CRUD للمنتجات والعروض والتقييمات والإعدادات
- Render للطاولات والقوائم داخل admin-panel

### 4.1 واجهة لوحة الإدارة
ملف `admin-panel-secure.html` يحتوي:
- قسم تسجيل الدخول `admin-login`
- قسم اللوحة `admin-panel` مخفي افتراضيًا
- عناصر UI:
  - إحصائيات المنتجات/التصنيفات/الأكثر طلبًا/التقييمات
  - نموذج إضافة منتج + نموذج تعديل منتج + جدول products
  - نموذج إضافة/تعديل العروض + قائمة offers
  - قائمة reviews + workflow لتقييم pending orders
  - نموذج إعدادات (واتساب/شعار/Banner)

### 4.2 Firebase Auth Gate

في admin.js يتم استخدام:
- `onAuthStateChanged(auth, (user)=>{...})`
- عند نجاح تسجيل الدخول:
  - يتم إظهار panel
  - يتم استدعاء `fetchAll()` لتحميل كل بيانات الإدارة

### 4.3 CRUD عبر admin-firestore-client.js

admin.js يستدعي helpers من `admin-firestore-client.js` مثل:
- `adminListProducts()`, `adminCreateProduct()`, `adminUpdateProduct()`, `adminDeleteProduct()`
- `adminListOffers()`, `adminCreateOffer()`, ...
- `adminListReviews()`, `adminUpdateReview()`, ...
- `adminUpsertSettings(payload)`

> ملاحظة أمنية: في المشاريع Client-side لازم إعداد Firebase Security Rules تمنع أي كتابة غير مصرح بها.

### 4.4 إدارة المنتجات

- `addProduct(event)`
  - يقرأ الحقول من form
  - يقرأ images من input file(s)
  - يحوّل الصور (Resize) إلى DataURL (في admin.js)
  - ينفذ `adminCreateProduct(payload)` ثم يحدّث state المحلي
  - إذا category جديد:
    - يضيفه للقائمة
    - ويحفظه في `settings` عبر `adminUpsertSettings({ categories })`

- `editProduct(id)`
  - يملأ form التعديل بقيم المنتج من array المحلي `products`

- `updateProduct(event)`
  - يجلب payload ثم `adminUpdateProduct(id, payload)`
  - يحدّث المنتجات داخل state المحلي ثم يعيد render

- `deleteProduct(id)`
  - يحذف من Firestore ثم يفلتر state المحلي

### 4.5 إدارة التصنيفات

- يتم عرض قائمة `categories` في UI
- الحذف يتم على مستوى settings (فقط UI) ثم يتم التحديث

> تصميم حالي: حذف التصنيف من واجهة الإدارة لا يُحذف تلقائيًا من المنتجات الموجودة.

### 4.6 إدارة العروض

- `addOffer(event)`
  - يدعم إضافة أو تعديل حسب وجود `form.dataset.editId`
  - images تتحول أيضًا إلى DataURL
  - في حالة إضافة جديدة: يتم `fetchAll()` لأنه لا يوجد new ID في current state

- `editOffer(id)`, `deleteOffer(id)`

### 4.7 إدارة التقييمات (Reviews)

- `approveReview(id)`
  - يحدّث `approved: true` عبر `adminUpdateReview`

- `rejectReview(id)`
  - يحدّث `approved: false`

- `deleteReview(id)`

### 4.8 “Pending Orders” وتقديم التقييم

يوجد جزء في admin-panel لإرسال “تقييم pending” بناءً على بيانات محلية في LocalStorage:
- key: `almasry-orders-pending`

السير العام في التصميم:
1. `cart.html` عند إرسال الطلب: تخزين order في LocalStorage كـ pending
2. لوحة الإدارة تعرض pending orders من LocalStorage
3. المدير يختار منتجات من الطلب ثم يرسل تقييم غير معتمد (approved=false)
4. التقييم يُضاف إلى Firestore في `reviews`

> طريقة إنشاء review هنا تتم عبر `addDoc(collection(db, REVIEWS_COL), payload)` داخل admin.js (لا يوجد helper مخصص).

### 4.9 الإعدادات (Settings)

- `renderSettings()`
  - تقرأ أول doc في collection `settings`
  - تعبئة inputs: whatsapp/logo/banner

- `saveSettings(event)`
  - تقرأ whatsapp وبانر
  - الشعار: يتم قراءته كـ file ثم تحويله إلى DataURL (بدون Firebase Storage في هذا التصميم)
  - يحفظ عبر `adminUpsertSettings(payload)`

---

## 5) بنية Firebase Collections المتوقعة

### 5.1 products
حقول مقترحة (حسب normalizeProduct):
- `name` (string)
- `category` (string)
- `price` (number)
- `oldPrice` (number)
- `rating` (number)
- `badge` (string)
- `weight` (string)
- `description` (string)
- `ingredients` (array of string)
- `images` (array of string urls / dataURLs)
- `featured` (boolean)
- `bestSeller` (boolean)

### 5.2 offers
حقول مقترحة (حسب normalizeOffer):
- `title`
- `description`
- `discount` (number)
- `price` (number)
- `showOnHome` (boolean)
- `homeTitle`
- `homeDescription`
- `buttonText`
- `buttonLink`
- `images` (array)

### 5.3 reviews
حقول مقترحة:
- `name`
- `text`
- `productId` (number) و/أو `productName`
- `productIds` و `productNames` (في pending workflow)
- `orderRef` (string)
- `createdAt` (ISO string)
- `approved` (boolean)

### 5.4 settings
يوجد غالبًا doc واحد (باستخدام adminUpsertSettings):
- `whatsapp` (string)
- `logo` (dataURL أو URL)
- `banner` (string)
- `categories` (array)

---

## 6) تشغيل المشروع محليًا وكيف يعمل الوصول

هذه الصفحة HTML + JS تعمل مباشرة (Static hosting) مع الاعتماد على:
- تحميل Firebase SDK من CDN
- جلب البيانات من Firestore
- إرسال الطلب إلى واتساب عبر link

لا يوجد build-step مطلوب.

---

## 7) نقاط مهمة لتحسين الأداء والموثوقية

1. **Cache** في صفحة المنتجات (`productsCache`) يقلل عدد الاستعلامات.
2. **Debounce** على search/filter/Sort لتقليل الضغط.
3. **Fallbacks** في normalizeProduct/normalizeOffer لتجنب أعطال بسبب نقص بيانات.
4. **Try/Catch** حول initCartPage في syncFirestore حتى لا تتوقف السلة.

---

## 8) ملاحظات أمنية (مهم)

لأن `admin.js` يعمل على العميل:
- يلزم إعداد **Firebase Security Rules** بشكل صارم:
  - السماح بعمليات القراءة/الكتابة فقط لحسابات admin.
  - منع التلاعب في collections: products/offers/reviews/settings.

---

## 9) ما الذي يجب معرفته لتعديل المشروع؟

- تعديل محتوى الموقع:
  - HTML pages + CSS
  - وأهم منطق موجود في `app.js`

- تعديل سلوك المنتجات/العروض:
  - في Firestore + normalization في app.js

- تعديل لوحة الإدارة:
  - في admin-panel-secure.html (DOM)
  - وفي admin.js (CRUD + render)

---

## 10) TODO (حسب TODO.md الموجود)

يحتوي TODO.md حاليًا على مهام مثل:
- التأكد أن `setPanelVisible(true)` و `fetchAll()` لا يتم استدعاؤهما إلا بعد نجاح تسجيل الدخول
- اختبار تسجيل الدخول داخل `admin-panel-secure.html`

---

## خاتمة

المشروع مصمم كـ “متجر Front-End” يعتمد على Firebase لتخزين وإدارة المحتوى.
الواجهات (للزوار) مبنية على Render من Firestore، بينما لوحة الإدارة توفر CRUD مع بوابة Auth.

إذا أردت تطوير المشروع أكثر، أول خطوة تكون مراجعة Firebase Security Rules لأن المشروع الحالي يستخدم client-side writes.

