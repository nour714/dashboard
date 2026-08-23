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

✅ اتزرعوا **الـ 4 موظفين** (Users) بتوع المشروع من `mock-data.js`، بباسورد `password123` مشفر بـ bcrypt (10 rounds) — ده يخليك تقدر تسجل دخول فورًا:

| Email | Role |
|---|---|
| admin@africatravel.com | ADMIN |
| ahmed.r@africatravel.com | ADMIN |
| nour.w@africatravel.com | AGENT |
| hashem.a@africatravel.com | AGENT |

**الباسورد لكل الحسابات:** `password123` (غيّره فور أول تسجيل دخول في بيئة حقيقية)

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

أنا زرعت الموظفين بس مباشرة عن طريق SQL. باقي البيانات (العملاء، التذاكر، المدفوعات...) لازم تتزرع من عندك بعد ما تحط الباسورد الصح، لأن الـ sandbox بتاعي معندهوش صلاحية الوصول لـ `supabase.co` مباشرة (شبكة مقيدة):

```bash
npx prisma generate
npm run prisma:seed
```

ده هيزرع باقي البيانات من `mock-data.js` (customers, tickets, payments, modifications, refunds, activity logs) على نفس القاعدة، من غير ما يكرر الموظفين (السكريبت بيستخدم `upsert`).

### 4. شغّل السيرفر

```bash
npm start
```

وجرّب تسجل دخول بـ `admin@africatravel.com` / `password123` من الموقع مباشرة.

---

## ملحوظة

لو قررت في أي وقت إنك تستخدم `supabase-js` من الفرونت اند مباشرة (بدل ما يعدي كل حاجة عن طريق الباك اند بتاعك)، هتحتاج ترجع تكتب RLS policies فعلية (مش تسيبها فاضية) — النهارده هي مقفولة تمامًا لأن مفيش حد بيوصلها غير الباك اند.
