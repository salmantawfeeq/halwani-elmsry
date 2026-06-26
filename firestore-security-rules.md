# Firestore Security Rules (مقترح)

## المطلوب من المشروع
- العملاء يقدروا يقرأوا:
  - `products`
  - `offers`
  - `reviews` **المعتمدة فقط** (approved==true)
- الأدمن يقدر يكتب/يعدل/يحذف:
  - `products`, `offers`, `reviews`, `settings`

## طريقة تأمين الأدمن
أسهل طريقة صح مع Firebase هي Custom Claims في Admin SDK:
- claim: `admin: true` داخل `request.auth.token.admin`

## قواعد مقترحة (Firestore)
انسخها كما هي ثم عدّل أسماء الحقول/الكوليكشن حسب الحاجة:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // منتجات وعروض: قراءة عامة
    match /products/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /offers/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /settings/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // التقييمات: قراءة عامة فقط للأapproved
    match /reviews/{docId} {
      allow read: if resource.data.approved == true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

  }
}
```

## ملاحظة مهمة
لا يمكن عمل `allow read` على approved فقط إلا لو `resource.data.approved` موجودة وقت القراءة.

## Custom Claims
- اعمل سكربت/Cloud Function (أو Admin SDK) لإضافة custom claim للأدمن.


