- سيتم تطبيق نظام آراء مرتبط بمرجع الطلب (orderRef) ليكون “حقيقي” على صفحة الآراء.

1) app.js
   - تعديل submitOrder(): توليد orderRef + حفظ pending orders في localStorage (almasry-orders-pending) مع items وربط كل منتج ب productId.
   - تعديل renderHomeReviews() ليعرض نفس الحقول عند وجودها.

2) admin-panel-secure.html
   - إضافة قسم جديد داخل Admin Panel: “طلبات العملاء (Pending Orders)”.
   - يحتوي على: قائمة Pending Orders ثم فورم تقييم: اسم العميل، المنتج من الطلب، نص التقييم، نجوم (إن رغبت)، زر إرسال.

3) admin.js
   - إضافة Functions:
     - loadPendingOrders(): قراءة almasry-orders-pending.
     - saveReviewFromPending(): إنشاء review مرتبطة بـ {orderRef, productId, productName, createdAt} ثم يعتمد/يُحفظ.
   - تعديل renderReviews() لعرض productName وorderRef عند توفرها.

4) reviews.html
   - تحديث Render: استعراض reviews المعتمدة فقط مع عرض: المنتج + مرجع الطلب + التاريخ.
   - عدم عرض أي review غير مرتبطة بـ productId أو orderRef (حسب شرطنا).

5) TODO.md
   - تحديث حالة الخطوات بعد كل تعديل.

