# AfricaTravel — قاعدة بيانات Supabase جاهزة

## اللي اتعمل فعليًا (مش برومبت — ده اتنفذ بالفعل على حسابك)

✅ اتعمل مشروع Supabase جديد اسمه **`africatravel`** (منفصل عن مشروعك القديم `nour714's Project`)
- **Project ref:** `<YOUR_PROJECT_REF>`
- **Region:** `eu-west-1`
- **التكلفة:** $0/شهريًا (Free tier)
- **الحالة:** `ACTIVE_HEALTHY`

✅ اتطبقت الـ Prisma schema بالكامل كـ SQL migration — كل الجداول العشرة اتعملت:
`users, customers, customer_notes, tickets, payments, modifications, refunds, audit_logs, refresh_tokens, system_settings`
مع كل الـ indexes المهمة (على `customerId`, `status`, `departureDate`, إلخ)

✅ **Row Level Security (RLS) اتفعّلت وقفلت بالكامل** على كل الجداول (بناءً على طلبك) — دي طبقة حماية إضافية تمنع أي وصول عن طريق `anon key`/`supabase-js` حتى لو حصل استخدام خطأ ليهم بالغلط في المستقبل. الباك اند مش متأثر لأنه بيتصل بقاعدة البيانات مباشرة (direct Postgres connection عن طريق `DATABASE_URL`)، مش عن طريق REST API بتاع Supabase.

✅ اتعمل **الـ Private Storage Bucket** باسم **`customer-documents`** لتخزين جوازات السفر والمستندات بحد أقصى 5MB وأنواع الملفات المسموحة (`image/jpeg`, `image/png`, `application/pdf`).

✅ اتزرعوا **الـ 4 موظفين** (Users) بتوع المشروع من `mock-data.js` مشفرين بـ bcrypt (cost factor = 12):

| Email | Role |
|---|---|
| admin@africatravel.com | ADMIN |
| ahmed.r@africatravel.com | ADMIN |
| nour.w@africatravel.com | AGENT |
| hashem.a@africatravel.com | AGENT |

**تدوير وتعيين كلمات المرور:** استخدم سكريبت تدوير وتعيين كلمات المرور الآمن:
```bash
node scripts/reset-admin-passwords.js
# أو لتعيين كلمة مرور قوية محددة:
node scripts/reset-admin-passwords.js --new-password="YourStrongPassword2026!"
```

---

## اللي محتاج تعمله إنت (خطوة واحدة بس)

### 1. هات الباسورد الحقيقي بتاع قاعدة البيانات

Supabase لأسباب أمنية **مبيرجعش الباسورد عن طريق الـ API خالص** — لازم تجيبه إنت من الداشبورد:

1. افتح: https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/settings/database
2. تحت "Connection string" اختار "URI" و "Direct connection"
3. انسخ الباسورد (أو اعمل reset لو نسيته)

### 2. حدّث ملف `.env` عندك (مش `.env.example`)

```
DATABASE_URL="postgresql://postgres:[PASTE_PASSWORD_HERE]@db.<YOUR_PROJECT_REF>.supabase.co:5432/postgres?schema=public"
```

(الـ `.env.example` في الريبو اتحدّث بالفعل بنفس الـ host، بس فيه `[PASSWORD]` placeholder — انسخه لـ `.env` واستبدل الجزء ده بس)

### 3. شغّل باقي الـ seed (العملاء والتذاكر)

```bash
npx prisma generate
npm run prisma:seed
```

ده هيزرع باقي البيانات من `mock-data.js` (customers, tickets, payments, modifications, refunds, activity logs) على نفس القاعدة، من غير ما يكرر الموظفين (السكريبت بيستخدم `upsert`).

### 4. شغّل السيرفر

```bash
npm start
```

---

## ملحوظة

لو قررت في أي وقت إنك تستخدم `supabase-js` من الفرونت اند مباشرة (بدل ما يعدي كل حاجة عن طريق الباك اند بتاعك)، هتحتاج ترجع تكتب RLS policies فعلية (مش تسيبها فاضية) — النهارده هي مقفولة تمامًا لأن مفيش حد بيوصلها غير الباك اند.

---

## 🗄️ إعداد التخزين السحابي (Supabase Storage Bucket)

تم تضمين إنشاء الـ Bucket المخصص لمستندات وجوازات السفر (`customer-documents`) داخل سكريبت `prisma/supabase_setup.sql`:

- **اسم الـ Bucket:** `customer-documents` (خاص `public: false`).
- **تطابق المتغيرات:** يجب أن يتطابق اسم الـ Bucket تماماً مع المتغير `SUPABASE_STORAGE_BUCKET` في ملف `.env` (القيمة الافتراضية: `customer-documents` كما هو موضح في `.env.example`). إذا اختلف الاسم أو لم يتم إنشاء الـ Bucket، ستفشل عمليات رفع المستندات بخطأ `Storage upload failed: Bucket not found`.
- **الصلاحيات والأمان:** الباك إند هو الجهة الوحيدة التي تتعامل مع الـ Bucket عبر مفتاح `SUPABASE_SERVICE_ROLE_KEY` (`server/src/config/storage.js`) وتوليد الروابط الموقعة المؤقتة (Signed URLs)، وبالتالي يتجاوز الـ RLS تلقائياً ولا يلزم إضافة أي سياسات RLS على جدول `storage.objects`، مما يضمن بقاء الـ Bucket خاصاً بالكامل.
- **حدود الملفات:** الحد الأقصى لحجم الملف هو 5MB (`5242880` بايت) والأنواع المسموحة هي (`image/jpeg`, `image/png`, `application/pdf`) متوافقة تماماً مع ثوابت `server/src/middleware/upload.js`.
