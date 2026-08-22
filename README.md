# AfricaTravel — Frontend/Backend Integration (Work in Progress)

هذا zip فيه الملفات اللي اتعدّلت/اتضافت لغاية دلوقتي في مهمة توصيل الفرونت اند بالباك اند.
مش كل حاجة خلصت — التفاصيل تحت.

## طريقة التطبيق

انسخ الملفات دي فوق نفس المسارات في الريبو بتاعك (`dashboard/`)، مع الحفاظ على نفس البنية:

```
js/app.js
js/pages/ticket-create.js
js/pages/ticket-details/ticket-actions.js
js/services/auth-service.js
js/services/customer-service.js
js/services/ticket-service.js
js/state/store.js
js/services/api-client.js   ← ملف جديد بالكامل
```

أو استخدم `frontend-backend-integration.patch` مع:
```
git apply frontend-backend-integration.patch
```
(لازم تكون واقف في نفس نقطة الـ commit اللي اشتغلنا عليها، وإلا الـ patch ممكن يفشل)

## اللي اتعمل ✅

1. **`js/services/api-client.js`** (جديد) — fetch wrapper مركزي بيرفق JWT، بيعمل auto-refresh للـ access token، وبيدير الـ session (access/refresh token + current user) في localStorage.

2. **`js/state/store.js`** — اتحول بالكامل من localStorage/mock-data لـ **API-backed cache**:
   - القراءة (`getState()`) sync زي الأول، من كاش في الميموري
   - الكتابة (mutations) بقت async وبتنادي الـ backend الأول، وبعدين تحدّث الكاش المحلي بس لو السيرفر رجّع نجاح
   - فيه `ensureHydrated()` بيجيب tickets/customers/employees/activity من الـ API مرة واحدة عند بداية الجلسة

3. **`js/services/auth-service.js`** — login/logout حقيقيين على `/api/auth/*` بدل الـ mock القديم.

4. **`js/services/ticket-service.js`** + **`customer-service.js`** — الـ reads فضلت sync (بتقرا من كاش الـ store)، والـ writes (createTicket, addPayment, addModification, addRefund, updateTicket, createCustomer, updateCustomer, addNote) بقت async.

5. **`js/app.js`** — `setupShellForCurrentPath()` بقت async وبتستنى `store.ensureHydrated()` قبل ما تبني شل التطبيق، عشان الصفحات تلاقي بيانات حقيقية جاهزة وقت الـ render.

6. **`js/pages/ticket-details/ticket-actions.js`** — الأربع submit handlers (Add Payment, Modify Flight, Process Refund, Edit Ticket) اتحولوا لـ `async` مع `await` على نداءات الـ service، وبقى فيه تعطيل مؤقت لزرار الـ submit أثناء الطلب (منع الضغط المتكرر).

7. **`js/pages/ticket-create.js`** — نفس المعاملة: submit handler بقى async وبينتظر `TicketService.createTicket(...)`.

كل الملفات دي اتعملها `node --check` وعدت من غير أخطاء syntax.

## اللي لسه ناقص ⏳

- **`js/pages/customers.js`** و **`js/pages/customer-details.js`** — أي مكان بينادي `CustomerService.createCustomer` / `updateCustomer` / `addNote` لسه محتاج يتحول لـ `async/await` بنفس الأسلوب اللي اتعمل في `ticket-actions.js`.
- **`js/pages/employees.js`** — لو فيه UI بينادي `store.addEmployee`، يحتاج نفس المعاملة (وهو endpoint ADMIN-only في الباك اند).
- **مفيش تجربة حقيقية على سيرفر شغال** — التعديلات دي اتعملها syntax-check بس (`node --check`)، لسه محتاجة تجربة في متصفح حقيقي بعد:
  1. `npx prisma migrate dev` على قاعدة PostgreSQL شغالة
  2. `npm run prisma:seed` (لو موجود سكريبت seed)
  3. `npm start` وتجربة تسجيل الدخول والعمليات فعليًا
- **صفحة الـ Settings/Profile**: `AuthService.updateProfile()` لسه بتحدّث محليًا بس، لأن مفيش endpoint في الباك اند لتحديث بروفايل المستخدم الحالي (`/api/employees/:id` مقصور على ADMIN فقط حسب الراوتس الحالية).

## ملاحظة أمان مهمة

كل عمليات الكتابة (payments, refunds, modifications) بتعتمد دلوقتي بالكامل على الـ validation اللي في الباك اند (`validatePayment`, `validateRefund`, `validateModification`) — مفيش تكرار للـ validation في الفرونت اند، ده مقصود عشان السيرفر يفضل هو مصدر الحقيقة الوحيد ومفيش فرصة لـ bypass زي المرة اللي فاتت.
