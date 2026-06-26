مخطط كولكشنات Firestore المقترح (للمشروع الحالي)

1) products (collection)
- doc: { id, name, category, price, oldPrice, rating, badge, images[], description, ingredients[], weight, featured, bestSeller }

2) offers (collection)
- doc: { id, title, description, discount, price, showOnHome, homeTitle, homeDescription, buttonText, buttonLink, images[] }

3) reviews (collection)
- doc: { id, name, text, approved, productId, productName, productIds?, productNames?, orderRef, createdAt, rating }

4) settings (collection) أو doc ثابت
- doc: { whatsapp, logo, banner }

ملاحظة:
- public users: read فقط الموافق approved=true (لـ reviews)
- admin users: read/write لكل المنتجات/العروض/المراجعات/الإعدادات

التأمين للأدمن:
- بما أن اختيارك كان (2): collection في Firestore اسمها admins
- مثال: admins/{uid} => { role: 'admin' }
- Rules تتحقق من وجود admins/{request.auth.uid}.

