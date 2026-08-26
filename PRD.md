# 📋 وثيقة متطلبات المنتج الشاملة (Product Requirements Document - PRD)
# مشروع منصة AfricaTravel — نظام إدارة وحجز عمليات الطيران والعمليات المالية

---

## 1. نظرة عامة ورؤية المنتج (Executive Summary & Product Vision)

**AfricaTravel** هي منصة ويب مؤسسية متكاملة (Enterprise Travel ERP & Operations Terminal) مخصصة لوكالات السفر وشركات حجز الطيران. تهدف المنصة إلى أتمتة دورة حياة التذكرة بالكامل — بدءاً من إصدار التذاكر الفردية ورحلات الذهاب والعودة، وإدارة حسابات العملاء وجوازات السفر، وصولاً إلى التسويات المالية الدقيقة وحساب صافي الأرباح، مع نظام صارم للصلاحيات والأمان (RBAC & Audit Trails).

### الأهداف الاستراتيجية:
1. **التحكم المالي الكامل:** تتبع سعر بيع التذكرة للعميل وسعر التكلفة من شركة الطيران وحساب صافي الأرباح آلياً مع إدارة الدفعات المجزأة والاسترجاعات.
2. **عزل الصلاحيات وحماية البيانات التجارية:** منع غير المدراء (الوكلاء وموظفي التذاكر) من الاطلاع على أسعار التكلفة أو هوامش الربح.
3. **أتمتة العمليات اليومية:** إصدار التذاكر، جدولة رحلات الذهاب والعودة، التنبيه باقتراب مواعيد السفر وانتهاء صلاحية الجوازات.
4. **الأمان والأداء العالي:** بنية أمنية قوية ضد ثغرات XSS و IDOR مع تحميل استباقي للبيانات (Proactive Refresh) دون أخطاء 401.

---

## 2. أدوار المستخدمين ومصفوفة الصلاحيات (User Roles & RBAC Matrix)

تعتمد المنصة 3 أدوار رئيسية مع تطبيق صارم لمبدأ الحد الأدنى من الامتيازات (Principle of Least Privilege):

| الوظيفة / الصلاحية | مدير النظام (`ADMIN`) | وكيل الحجز (`AGENT`) | موظف إصدار فقط (`TICKET_ONLY`) |
| :--- | :---: | :---: | :---: |
| **تسجيل الدخول وإدارة الجلسة** | ✅ | ✅ | ✅ |
| **إصدار التذاكر (One-Way & Round-Trip)** | ✅ | ✅ | ✅ |
| **عرض قائمة وتفاصيل التذاكر** | ✅ (جميع التذاكر) | ✅ (جميع التذاكر) | ✅ (تذاكره الصادرة فقط - IDOR Protected) |
| **الاطلاع على سعر التكلفة وصافي الربح (`costPrice` & `netProfit`)** | ✅ | ❌ (محجوب بالكامل في الـ API والواجهة) | ❌ (محجوب بالكامل في الـ API والواجهة) |
| **تعديل بيانات التذاكر** | ✅ | ✅ | ❌ (403 Forbidden) |
| **تسجيل مدفوعات إضافية للتذكرة** | ✅ | ✅ | ❌ (403 Forbidden) |
| **طلب استرجاع التذكرة (Full / Partial Refund)** | ✅ | ❌ (403 Forbidden) | ❌ (403 Forbidden) |
| **الحذف المبدئي للتذكرة (Soft Delete)** | ✅ | ❌ (403 Forbidden) | ❌ (403 Forbidden) |
| **الحذف النهائي للتذكرة (Purge Action)** | ✅ (بشروط مالية صارمة) | ❌ | ❌ |
| **إدارة العملاء وتعديل بياناتهم** | ✅ | ✅ | ❌ (403 Forbidden) |
| **حذف العملاء (Soft / Purge)** | ✅ (بشرط خلو السجل المالي) | ❌ | ❌ |
| **إدارة الموظفين وتغيير الصلاحيات** | ✅ | ❌ | ❌ |
| **التقارير التنفيذية ومؤشرات الأداء (KPIs & Net Profit)** | ✅ | ✅ (باستثناء أرباح التكلفة) | ❌ (403 Forbidden) |
| **سجل التدقيق والنشاطات (Audit Logs)** | ✅ | ✅ (عرض فقط) | ❌ (403 Forbidden) |

---

## 3. المعمارية التقنية للمشروع (Architecture & Tech Stack)

```
[ Frontend: Vanilla JS Modular ES6 SPA ]
       │ (JWT in-memory + Proactive Token Refresh + httpOnly Cookie)
       ▼
[ Security & Middleware: Helmet, CSP, CORS, Rate Limiters, Zod Schemas ]
       │
       ▼
[ Backend API: Node.js 20+ / Express.js Modular Architecture ]
       │
       ▼
[ Service Layer & Domain Rules: Ticket Ledger, Financial Calculations, RBAC Sanitizer ]
       │
       ▼
[ ORM: Prisma Client ]
       │
       ▼
[ Database: PostgreSQL / Supabase with Automated Migrations ]
```

- **Frontend:** Single Page Application (SPA) بدون مكتبات خارجية ثقيلة، باستخدام ES6 Modules، ونظام إدارة حالة مركزي (`store.js`)، ونظام توجيه مسارات (`router.js`)، وتصميم معتمد على Design Tokens، ونظام ترجمة فوري ثنائي اللغة (عربي RTL وإنجليزي LTR).
- **Backend:** Node.js v20+ مع Express.js مبني بنمط الطبقات (Controllers -> Services -> Domain -> Schemas).
- **قاعدة البيانات:** PostgreSQL عبر Prisma ORM.
- **إدارة التوثيق والجلسات:** Dual-Token Architecture:
  - `inMemoryAccessToken`: يُحفظ فقط في ذاكرة الجافاسكربت لمنع سرقته عبر ثغرات XSS.
  - `refreshToken`: يُحفظ في كوكي `httpOnly, Secure, SameSite=Lax`.
  - **Proactive Refresh:** تجديد استباقي للتوكن عند بدء تشغيل التطبيق لمنع طلبات 401 المتوازية.
- **الحاويات والنشر:** Dockerfile متعدد المراحل + `docker-compose.yml` جاهز للنشر السحابي على Railway أو أي منصة سحابية.

---

## 4. الموديولات والوظائف التفصيلية (Functional Modules)

### 4.1. موديول التذاكر والعمليات المالية (Tickets & Financial Ledger)
- **أنواع الرحلات:**
  - رحلات اتجاه واحد (`ONE_WAY`).
  - رحلات ذهاب وعودة (`ROUND_TRIP`) مع إنشاء شرائح الرحلة (`FlightSegment`) تلقائياً.
- **الحسابات المالية الدقيقة:**
  - `ticketPrice`: سعر البيع النهائي للعميل (Gross Revenue).
  - `costPrice`: سعر التكلفة من شركة الطيران (Airline Cost Price - إلزامي عند الإنشاء، اختياري في التحديث للتذاكر القديمة).
  - `netProfit`: يُحسب تلقائياً عبر معادلة `ticketPrice - costPrice`.
- **نظام الدفع المجزأ:**
  - حالات الدفع: `PAID` (مدفوع بالكامل)، `PARTIALLY_PAID` (مدفوع جزئياً)، `UNPAID` (غير مدفوع).
  - تسجيل دفعات متعددة على نفس التذكرة (`Payment`) مع تحديث الرصيد المتبقي آلياً.
  - دعم وسائل الدفع: كاش (`CASH`)، تحويل بنكي (`BANK_TRANSFER`)، بطاقة ائتمان (`CREDIT_CARD`).
- **الاسترجاع والتعديل (Refund & Modification):**
  - استرجاع كلي أو جزئي مع خصم رسوم الاسترجاع وحساب صافي المبلغ المسترد.
  - تسجيل رسوم تعديل المواعيد والمسارات وتحديث التذكرة.

### 4.2. موديول إدارة العملاء (Customer Relationship Management - CRM)
- ملف تعريفي شامل لكل عميل (الاسم، الهاتف، البريد، الرقم القومي، رقم جواز السفر وتاريخ انتهائه).
- احتساب إجمالي الإنفاق والرصيد المعلق لكل عميل بصورة ديناميكية.
- شارة كبار العملاء (`VIP Badge`).
- نظام الملاحظات (`Customer Notes`) لمتابعة تفضيلات العميل وسجل التواصل.
- تنبيهات انتهاء صلاحية جواز السفر.

### 4.3. موديول الموظفين والصلاحيات (Staff & User Management)
- إنشاء حسابات الموظفين بمعرفات مشفرة آمنة (`EMP-XXXXXXXX` باستخدام Crypto UUID).
- ترقية وتخفيض صلاحيات الموظفين وتعطيل الحسابات غير النشطة.
- حماية ضد تخمين الحسابات (Account Enumeration Protection).

### 4.4. موديول التقارير والذكاء التنفيذي (Executive Analytics & Reporting)
- **المؤشرات الرئيسية (Executive KPIs):** إجمالي الإيرادات، إجمالي صافي الأرباح (`totalNetProfit`)، التذاكر الصادرة، المبالغ المعلقة، والاسترجاعات.
- **تحليلات شركات الطيران:** حجم المبيعات وصافي الأرباح ومعدل الإلغاء لكل شركة طيران (Badr, Tarco, EgyptAir, Saudia, إلخ).
- **الاتجاهات الأسبوعية:** مراقبة الأداء الأسبوعي مع سياسة صارمة للبيانات الحقيقية (Zero-Mock Fallback).

### 4.5. نظام التنبيهات وإدارة الرحلات (Flight Reminders & Notifications)
- تنبيهات ذكية باقتراب مواعيد إقلاع رحلات الذهاب أو العودة تظهر في الـ Topbar Modal.

### 4.6. موديول الحذف النهائي الآمن (Purge Actions)
- قواعد صارمة لمنع التلاعب المالي:
  - التذكرة لا تُحذف نهائياً إذا كانت تحتوي على سجلات مالية أو لم تكن محذوفة مبدئياً (`Soft-deleted`).
  - العميل لا يُحذف نهائياً إذا كان لديه أي تاريخ حجز تذاكر سابق.
  - حفظ نسخة كاملة من البيانات المحذوفة في سجل التدقيق (`ActivityLog`) قبل الإزالة.

---

## 5. مخطط قاعدة البيانات (Data Schema Summary)

```prisma
model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  fullName     String
  role         Role          @default(AGENT) // ADMIN | AGENT | TICKET_ONLY
  status       AccountStatus @default(ACTIVE)
  createdTickets Ticket[]
  activityLogs   ActivityLog[]
}

model Customer {
  id             String         @id @default(uuid())
  name           String
  phone          String?
  email          String?
  passportNumber String?
  passportExpiry DateTime?
  isVip          Boolean        @default(false)
  isDeleted      Boolean        @default(false)
  tickets        Ticket[]
  notes          CustomerNote[]
}

model Ticket {
  id             String          @id @default(uuid())
  ticketNumber   String          @unique
  pnr            String
  passengerName  String
  airline        String
  tripType       TripType        @default(ONE_WAY) // ONE_WAY | ROUND_TRIP
  ticketPrice    Decimal         @db.Decimal(12, 2)
  costPrice      Decimal?        @db.Decimal(12, 2)
  paidAmount     Decimal         @default(0) @db.Decimal(12, 2)
  status         TicketStatus    @default(CONFIRMED)
  customerId     String?
  createdById    String?
  isDeleted      Boolean         @default(false)
  segments       FlightSegment[]
  payments       Payment[]
  refunds        Refund[]
}
```

---

## 6. متطلبات الأمان والتوافق (Security & Non-Functional Requirements)

1. **حماية التوكن والـ XSS:** التوكن القصير في الذاكرة فقط، وتوكن التجديد مشفر في كوكي `httpOnly`.
2. **حماية الصلاحيات (IDOR & RBAC Sanitization):** تصفية استجابات الـ API ومنع موظفي `TICKET_ONLY` من رؤية تذاكر غيرهم، وحجب أرباح التكلفة عن غير المدراء.
3. **أمان الـ HTTP:** تطبيق سياسة Content Security Policy (CSP)، و Helmet، و CORS مقيد.
4. **التحقق من المدخلات:** استخدام مكتبة Zod لجميع الـ Endpoints لمنع حقن البيانات غير الصالحة.
5. **التصميم والتجاوب:** ثيم عمليات الطيران الفاخر (Flight Operations Theme & Africa Logo Watermark)، متجاوب مع الهواتف ويدعم `prefers-reduced-motion`.
6. **جودة البرمجيات:** 13 جناح اختبار آلي متكامل يغطي كافة جوانب النظام بنسبة نجاح 100%.
