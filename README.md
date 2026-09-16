# AutoHub — منصة إدارة معارض وخدمات سيارات

مشروع Full-Stack لإدارة شركة سيارات متعددة الفروع: معرض إلكتروني، مبيعات، وخدمات ما بعد البيع.

## الحالة الحالية

### ✅ الخطوة 1: تصميم قاعدة البيانات + الباك اند الأساسي

- **User**: 5 أدوار (`superadmin`, `branchManager`, `salesAgent`, `technician`, `customer`)، كلمة مرور مشفّرة (bcrypt)، مرتبط بفرع (ما عدا superadmin وcustomer).
- **Branch**: الفروع، كل فرع له مدير (`manager`) ومدينة.
- **Car**: السيارات، مرتبطة بفرع، برقم شاصي (VIN) فريد، حالة (`available`/`reserved`/`sold`)، فلترة كاملة.
- **مصادقة JWT**: تسجيل حساب زبون، دخول، إنشاء حسابات موظفين (مقيّد حسب الدور).
- **صلاحيات حسب الدور**: مدير الفرع والمندوب ما بيقدروا يلمسوا سيارات فرع تاني.
- **معالجة أخطاء موحّدة**: validation، تكرار قيم unique (زي VIN)، معرّفات غير صالحة.

### ✅ الخطوة 2: الفرونت اند الأساسي (Next.js)

- **معرض السيارات** (`/`): تصفّح مع فلترة (ماركة، موديل، نطاق سعر، وقود، ناقل حركة).
- **صفحة تفاصيل سيارة** (`/cars/[id]`).
- **تسجيل دخول / إنشاء حساب** (`/login`, `/register`) مربوطين بـ`AuthContext`. **تحديث لاحق**: التوكن صار يترّجن بكوكي `httpOnly` من الباك اند مباشرة، مش مخزّن بـlocalStorage — راجع قسم "تحسين أمني" تحت لتفاصيل ليش وكيف.
- **لوحة تحكم أساسية** (`/dashboard`): محتوى مختلف حسب الدور — للموظفين (superadmin/branchManager/salesAgent) فورم إضافة سيارة جديدة مربوط مباشرة بالباك اند.

كل ملفات الفرونت اند (JS وJSX) اتفحصت بـ`node --check` بدون أخطاء syntax.

### ✅ الخطوة 3: نظام المبيعات (Leads + Sales)

- **Lead**: زبون مهتم بسيارة، بيتسجّل يدويًا من مندوب المبيعات (أو مدير الفرع)، مع اسم/هاتف الزبون، السيارة المهتم فيها، والمندوب المسؤول. حالته: `new` → `contacted` → `negotiating` → `won`/`lost`. فيه سجل ملاحظات متابعة (`notes`) بتاريخ ومين ضافها.
- **Sale**: تحويل Lead لصفقة بيع فعلية. لما يتسجّل، السيارة بتصير `reserved` تلقائيًا (منع بيعها مرتين). الصفقة بتضل `pending_approval` لحد ما **مدير الفرع أو superadmin يوافق أو يرفض يدويًا**:
  - عند الموافقة: السيارة تصير `sold`، والـLead يصير `won`.
  - عند الرفض: السيارة ترجع `available`، والـLead يرجع `negotiating` (المندوب يقدر يحاول يعدّل السعر أو الشروط ويعيد المحاولة).
- **حاسبة تمويل/تقسيط**: معادلة القسط الثابت القياسية (Amortization) — تاخد السعر والدفعة الأولى وعدد الأشهر ونسبة الفائدة السنوية، وترجّع القسط الشهري والمبلغ الكلي والفايدة الكلية. متاحة كنقطة API عامة (بدون تسجيل دخول) عشان تُستخدم بصفحة تفاصيل السيارة، وأيضًا بتنحسب تلقائيًا عند إنشاء صفقة بيع بالتقسيط.

### ✅ الخطوة 4: ربط نظام المبيعات بالفرونت اند

- **`/dashboard/leads`**: قائمة Leads (مفلترة حسب دور المستخدم)، فورم تسجيل Lead جديد (اختيار سيارة من قائمة السيارات المتوفرة).
- **`/dashboard/leads/[id]`**: تفاصيل الـLead، تغيير الحالة، إضافة ملاحظات متابعة، وزر "تحويل لصفقة بيع" (بيفتح فورم السعر النهائي وطريقة الدفع).
- **`/dashboard/sales`**: قائمة الصفقات بحالتها، وأزرار موافقة/رفض تظهر بس لـbranchManager وsuperadmin على الصفقات المعلّقة.
- **`FinancingCalculator`**: مكوّن تفاعلي واحد مستخدم بمكانين — بصفحة تفاصيل السيارة العامة (لأي زائر)، وجوا فورم تحويل الـLead لصفقة تقسيط (بيرسل نفس نتيجة الحساب مع الصفقة).

### ✅ الخطوة 5: خدمة ما بعد البيع (صيانة + مخزون قطع)

- **ملكية السيارة**: أضفنا حقل `owner` على موديل `Car` (اسم/هاتف/معرّف الزبون)، بيتعبّى تلقائيًا لما مدير الفرع يوافق على صفقة بيع — هيك بنعرف مين مالك أي سيارة عشان نربطها بسجل الصيانة.
- **ServiceAppointment**: موعد صيانة، بيسجّله الموظف (مدير الفرع أو superadmin) لزبون واصل للمعرض — سيارة، اسم/هاتف الزبون، نوع الخدمة (`routine_maintenance`/`repair`/`inspection`/`other`)، تاريخ مفضّل (بدون فحص تعارض بهالمرحلة). حالته: `requested` → `confirmed` (لما يتعيّن فني) → `in_progress` → `completed`/`cancelled`.
  - الفني المسؤول (أو مدير الفرع/superadmin) هو يلي بيقدر يحدّث الحالة ويضيف ملاحظات إنجاز.
  - نقطة `GET /api/service/car/:carId` بترجع سجل الصيانة الكامل لسيارة معيّنة (تاريخ VIN).
- **InventoryItem**: مخزون قطع غيار بسيط لكل فرع — اسم القطعة (فريد جوا نفس الفرع)، رقم القطعة، كمية، وحدة. تعديل الكمية بيصير يدويًا عبر `adjust` (بإضافة أو خصم)، بدون ربط تلقائي بمواعيد الصيانة بهالمرحلة.
- **صلاحيات**: الموديولين مقيّدين لـ`superadmin`/`branchManager`/`technician` بس، وكل عملية محصورة بفرع المستخدم (ما عدا superadmin).
- **`GET /api/auth/technicians`**: نقطة مساعدة (superadmin/branchManager) بترجع فنيي الفرع، مستخدمة بصفحة تعيين الفني على موعد صيانة.

### ✅ الخطوة 5 (تكملة): فرونت اند خدمة ما بعد البيع

- **`/dashboard/service`**: قائمة مواعيد الصيانة (مفلترة حسب الفرع أو الفني المسؤول)، فورم تسجيل موعد جديد (اختيار سيارة من القائمة بيعبّي اسم/هاتف الزبون تلقائيًا لو السيارة إلها مالك مسجّل)، وأزرار تعيين فني / بدء تنفيذ / إنهاء / إلغاء تظهر حسب دور المستخدم وحالة الموعد.
- **`/dashboard/inventory`**: جدول مخزون قطع الغيار بفرع المستخدم، فورم إضافة صنف جديد (مدير الفرع/superadmin)، وأزرار إضافة/خصم كمية متاحة لكل الموظفين المخوّلين (بما فيهم الفني).
- **لوحة التحكم والـNavbar**: انضافت روابط "الصيانة" و"المخزون" لكل مين دوره ضمن `superadmin`/`branchManager`/`technician` — الفني (technician) صار أول مرة إله وصول لقسم بلوحة التحكم (سابقًا كان بس يتصفّح المعرض).

### ✅ الخطوة 6: تحديثات لحظية (Socket.io) — حالة الصفقة

- **الباك اند** (`src/socket.js`): سيرفر Socket.io شغّال على نفس منفذ الـExpress (`http.createServer` بدل `app.listen` مباشرة). مصادقة الاتصال بنفس الـJWT — أي عميل بيتصل بدون توكن صالح بينرفض. كل مستخدم بينضم تلقائيًا لغرفة خاصة فيه (`user:<id>`).
- **الحدث**: لما مدير الفرع/superadmin يوافق أو يرفض صفقة (`approveSale`/`rejectSale`)، بنبعت `sale:statusChanged` لغرفة مندوب المبيعات صاحب الصفقة بس — مش بث عام لكل المتصلين.
- **الفرونت اند** (`NotificationProvider`): بيتصل بالسوكيت تلقائيًا لما المستخدم يسجّل دخول، وبيقطع الاتصال عند الخروج. لما يوصل حدث `sale:statusChanged`، بيطلع toast مؤقت (بيختفي بعد 5 ثواني) — "تمت الموافقة على صفقتك ✅" أو "تم رفض صفقتك ❌".
- لو Socket.io مش شغّال لأي سبب، `getIO()` بترجع `null` والكونترولر بيتجاهل الإشعار بهدوء — مش بيكسر عملية الموافقة/الرفض نفسها.

### ✅ الخطوة 7: أداة تقييم سيارة مستعملة (Trade-in)

- **معادلة التقييم** (`utils/tradeIn.js` — نفس فكرة `finance.js`: مصدر حساب واحد تستخدمه نقطة المعاينة العامة ونقطة الحفظ الرسمية): انخفاض سنوي 15% بطريقة declining balance حسب عمر السيارة، بالإضافة لخصم إضافي لو الكيلومترات أعلى من المتوقّع لعمرها (متوسط 20,000 كم/سنة، خصم 0.5% لكل 1000 كم زيادة)، مع حد أدنى 10% من سعر الشراء الأصلي مهما قدمت السيارة.
- **`TradeInRequest`**: الزبون (لازم يكون مسجّل دخول) بيقدّم بيانات سيارته القديمة (ماركة، موديل، سنة، كيلومترات، سعر الشراء الأصلي) وبتنحسب القيمة تلقائيًا وقت التسجيل. حالته: `pending` → `applied` (لما تُستخدم بصفقة بيع) أو ترجع `pending` لو الصفقة انرفضت.
- **الربط بالبيع**: `createSale` بيقبل `tradeIn` (معرّف الطلب) اختياريًا. لو موجود: بيتحقق إنه `pending` وإنه لنفس زبون الـLead، وبيحسب `netPrice = price - tradeInValue` (السعر الفعلي يلي التمويل بيتحسب عليه)، وبيحجز الطلب فورًا (`status: applied`) — **نفس منطق حجز السيارة تمامًا**: منع استخدام نفس التقييم بصفقتين بنفس الوقت. لو الصفقة انرفضت، الطلب يرجع `pending` تلقائيًا.
- **`price` مقابل `netPrice`** على موديل Sale: `price` هو سعر السيارة الجديدة الأصلي (زي ما كان قبل)، و`netPrice` هو المبلغ الفعلي بعد خصم التقييم — لو ما في تقييم، بيكونوا متساويين.
- **الفرونت اند** (`/trade-in`): صفحة عامة — أي زائر (حتى بدون تسجيل دخول) يقدر يجرّب حاسبة تقييم فورية. لو مسجّل دخول كـcustomer، بيظهر زر "سجّل هالتقييم رسميًا" وقائمة طلباته السابقة بحالتها. جوا `/dashboard/leads/[id]`، لو الـLead مرتبط بحساب زبون فعلي، بيظهر اختيار "استخدام تقييم سيارة مستعملة" وقت تحويله لصفقة — بيحسب `netPrice` مباشرة وبيمرّره لحاسبة التمويل بدل السعر الكامل.

### ✅ الخطوة 8: لوحة تحكم تحليلية

- **`controllers/analyticsController.js`**: 3 نقاط قائمة على MongoDB aggregation pipelines فوق موديل `Sale` (مفلترة دايمًا بـ`status: "approved"` — الأرقام مبنية بس على صفقات مكتملة فعليًا، مش pending أو rejected):
  - `getOverview`: إجمالي الإيرادات (`$sum: "$netPrice"`)، عدد الصفقات، متوسط قيمة الصفقة، عدد الصفقات بانتظار الموافقة، وعدد السيارات حسب حالتها (متوفرة/محجوزة/مباعة).
  - `getByBranch`: إيرادات وعدد صفقات كل فرع (`$group` بـ`branch` ثم `$lookup` على `branches`) — **superadmin بس**، لأن مقارنة فروع مالها معنى لمدير فرع واحد يشوف فرعه بس أصلاً.
  - `getTopModels`: أكثر 10 موديلات مبيعًا (`$lookup` على `cars` لجلب make/model، `$group` وعدّ الوحدات والإيرادات).
- **نفس نمط التصفية حسب الدور المستخدم بباقي الكونترولرز**: دالة مساعدة `branchScope(req)` بترجع `{branch: req.user.branch}` لو `branchManager`، أو كائن فاضي (بدون فلترة) لو `superadmin` — نفس فكرة `sameBranchOnly` بس مطبّقة داخل الـaggregation مباشرة.
- **الفرونت اند** (`/dashboard/analytics`): بطاقات KPI، جدول أكثر الموديلات مبيعًا، وجدول إيرادات كل فرع (بشريط تقدّم CSS بسيط بدل مكتبة رسوم بيانية خارجية — نفس فلسفة المشروع بتقليل الـdependencies). محصورة بـ`superadmin`/`branchManager` بس (مافيها بيانات مالية حساسة لأدوار تانية).

### ✅ الخطوة 9: دفع إلكتروني (Stripe) — عربون حجز + فواتير صيانة

- **الفكرة**: صفقة البيع ما عاد تنوافق إلا بعد ما الزبون يدفع عربون حجز فعلي (مبلغ ثابت $200)، وفاتورة الصيانة (لو الموظف حدّد مبلغ عند إنهاء الموعد) بتتدفع أونلاين بنفس الطريقة — عبر Stripe Checkout، مش بطاقة مخزّنة عندنا.
- **موديل `Sale.deposit`**: `{amount (افتراضي 200), status: pending|paid|forfeited, stripeSessionId, paidAt}`. **موديل `ServiceAppointment.invoice`**: `{amount, status: not_issued|unpaid|paid, stripeSessionId, paidAt}`.
- **`POST /api/sales/:id/deposit-checkout`**: بينشئ Stripe Checkout Session بمبلغ العربون ويرجّع رابط الدفع. **`approveSale` صار يرفض الموافقة (`400`) لو `deposit.status !== "paid"`** — هيك ما في صفقة تتأكد بدون التزام مالي حقيقي من الزبون.
  - **سياسة العربون**: لو الصفقة انوافق عليها، العربون **بينخصم من السعر الصافي المتبقي** (`netPrice -= deposit.amount`). لو الصفقة انرفضت وكان العربون مدفوع، بيصير `forfeited` (مصادر لصالح المعرض) — ما بيرجع تلقائيًا.
- **`POST /api/service/:id/invoice-checkout`**: نفس الفكرة لفاتورة الصيانة. `PATCH /api/service/:id/status` صار يقبل `invoiceAmount` اختياري — لو الحالة صارت `completed` ومرّرنا مبلغ، الفاتورة تصير `unpaid` (جاهزة للدفع)؛ لو ما مرّرنا شي (صيانة تحت الضمان مثلاً)، تضل `not_issued`.
- **`POST /api/stripe/webhook`**: نقطة وحيدة بتستقبل حدث `checkout.session.completed` من Stripe مباشرة (مش من الفرونت اند)، وبتحدّث حالة العربون أو الفاتورة لـ`paid` حسب `metadata.type` (`sale_deposit`/`service_invoice`). **لازم تنركّب بـ`app.js` قبل `express.json()` العام** وتستخدم `express.raw()` — لأن `stripe.webhooks.constructEvent` محتاج الجسم الخام (raw bytes) عشان يتحقق من التوقيع، وأي تحويل JSON قبلها بيكسر التحقق دايمًا. فيها idempotency guard (لو نفس الحدث انبعت مرتين، ما بنعالجه مرتين).
- **اختبار الـwebhook محليًا بدون Stripe CLI ولا ngrok**: عادةً محتاج تعرّض `localhost` للإنترنت (عبر Stripe CLI أو tunnel زي ngrok) عشان Stripe يقدر يوصلّك حدث `checkout.session.completed` فعليًا. بديل أبسط لمرحلة التطوير: `src/scripts/testStripeWebhook.js` — سكريبت بيولّد نفس توقيع Stripe (HMAC-SHA256 على `timestamp.payload`، بنفس الخوارزمية الموثّقة رسميًا، منفّذة يدويًا بـ`crypto` المدمجة بـNode بدون أي مكتبة إضافية) ويبعت حدث تجريبي مباشرة لسيرفرك المحلي (`localhost` لـ`localhost`، بدون تعرّض فعلي للإنترنت). الاستخدام:
  ```
  npm run test:webhook -- sale <SALE_ID>
  npm run test:webhook -- service <SERVICE_APPOINTMENT_ID>
  ```
  بيحتاج بس `STRIPE_WEBHOOK_SECRET` معرّف بالـ`.env` (أي قيمة تختارها بنفسك محليًا، ما لازم تجي من Stripe الحقيقي). مفيد للتحقق من منطق تحديث الحالة (`deposit.status`/`invoice.status` → `paid`) بسرعة، بس **ما بيغني عن اختبار حقيقي** لتدفق الدفع الكامل (إنشاء Checkout Session فعلي، إدخال بطاقة تجريبية، والـredirect) — لهيك لازم Stripe CLI أو ngrok فعليًا.
- **بناء عميل Stripe بشكل lazy (`utils/stripe.js`)**: أول نسخة كانت تعمل `new Stripe(process.env.STRIPE_SECRET_KEY || "")` مباشرة وقت استيراد الملف — وطلع فعليًا (بعد `npm install` حقيقي) إنه إصدار مكتبة `stripe` الحالي بيرمي خطأ فورًا لو `apiKey` فاضي (`Neither apiKey nor config.authenticator provided`)، وهيك كان **السيرفر كامل بيكرش وقت الإقلاع** لو `STRIPE_SECRET_KEY` مش معرّف بـ`.env` — حتى لو المستخدم مش ناوي يستخدم الدفع أصلاً. الحل: `utils/stripe.js` صار يصدّر دالة `getStripe()` بتبني العميل *أول ما حد ينادي عليها فعليًا* (jauche lazy)، وترمي `AppError` واضح (503) بس وقت الاستخدام الحقيقي لو المفتاح ناقص — نفس فلسفة `OPENAI_API_KEY` بالمساعد الذكي بالضبط. اتحقق من هالتصليح فعليًا بمحاكاة السيناريو (مكتبة stripe وهمية بنفس سلوك الرمي، بدون مفتاح) وتأكدت إنه السيرفر بيقلع طبيعي وإنه الخطأ الواضح بيطلع بس وقت استخدام ميزة الدفع فعليًا.
- **الفرونت اند**: زر "ادفع عربون الحجز الآن" بصفحة `/dashboard/sales` (يظهر لحد ما ينسدد، وزر الموافقة معطّل قبلها)، وزر "دفع الفاتورة" بصفحة `/dashboard/service` (يظهر لما الفاتورة تصير `unpaid`). الاثنين بيوجّهوا المستخدم مباشرة لصفحة الدفع المستضافة من Stripe (Checkout)، مش فورم بطاقة مبني عندنا — هيك رقم البطاقة ما يمر أبدًا عبر سيرفرنا.

### ✅ الخطوة 10: مساعد ذكاء اصطناعي للزبون

- **`utils/aiTools.js`**: تعريف 3 أدوات (tools) بصيغة OpenAI function-calling — `search_cars` (بيبحث فعليًا بموديل `Car` بنفس فلاتر `/api/cars`، حد أقصى 5 نتائج)، `calculate_financing` و`calculate_trade_in` (بيلفّوا نفس `finance.js` و`tradeIn.js` المستخدمين بباقي الموقع). الهدف إن المساعد ما يخترع سيارات أو أرقام من عنده — أي معلومة ملموسة لازم تجي من استدعاء أداة حقيقية.
- **`controllers/assistantController.js`**: بيبعت المحادثة لـOpenAI (`gpt-4o-mini` افتراضيًا) مع تعريف الأدوات، وبيعمل حلقة (لحد 4 جولات): لو الموديل طلب استدعاء أداة، ننفذها محليًا ونرجّع نتيجتها له كـ`role: "tool"`، لحد ما يوصل لجواب نهائي بدون طلب أدوات. بدون `OPENAI_API_KEY` بالسيرفر، المسار بيرجع 503 برسالة واضحة بدل ما ينهار.
- **بدون تخزين محادثات**: كل الحالة (state) موجودة بالفرونت اند بس — كل طلب بيبعت كامل سجل الرسائل، والباك اند stateless بالكامل. ما في موديل `Conversation` بقاعدة البيانات بهالمرحلة.
- **`routes/assistantRoutes.js`**: `POST /api/assistant/chat` — عام (بدون تسجيل دخول، متل حاسبة التمويل)، بس بـrate limiter أشد بكثير من الـlimiter العام (20 رسالة/15 دقيقة بدل 300) لأن كل رسالة بتكلف فعليًا عبر OpenAI billing.
- **الفرونت اند** (`/assistant`): واجهة محادثة بسيطة (فقاعات رسائل، اقتراحات جاهزة أول ما تفتح الصفحة، مؤشر "جارِ الكتابة")، بدون أي حالة محفوظة بين الجلسات.

**ملاحظة مهمة تنطبق على الخطوات 1-9**: ما قدرت أشغّل `npm install` ولا اختبار تشغيلي حقيقي من عندي وقتها — بيئة التشغيل عندي كانت محجوب عنها الوصول لـ npm registry. كل الملفات (باك اند وفرونت اند) فحصتها بـ`node --check`/Babel بدون أخطاء، ومعادلة التمويل ومعادلة التقييم جرّبتهم بأرقام حقيقية وطلعوا منطقيين. **الخطوات 9 و10 (وتصليحات إضافية على منطق حجز السيارة وrate limiting) اتفحصت فعليًا**: `npm install` اشتغل هالمرة على كل من الباك اند والفرونت اند، وتحقق نجاح `node --check` على ملفات الباك اند وparse ناجح عبر Babel (بريست `next/babel`) لملفات الفرونت اند JSX. برضو لسا ما في تشغيل end-to-end حقيقي (يحتاج قاعدة بيانات، ومفتاح OpenAI، ومفاتيح Stripe test mode فعليين) — جرّبه محليًا قبل ما تعتمد عليه بالكامل. خصوصًا اختبار Stripe محليًا محتاج Stripe CLI (`stripe listen --forward-to localhost:5000/api/stripe/webhook`) عشان تحصل على `STRIPE_WEBHOOK_SECRET` وتقدر تجرّب الـwebhook فعليًا.

### 🔒 تحسين أمني: JWT بكوكي httpOnly بدل localStorage

- **المشكلة يلي كانت موجودة**: التوكن كان يترجع بجسم استجابة `/login`/`/register` (JSON)، والفرونت اند كان يخزّنه يدويًا بـ`localStorage` ويرفقه بكل طلب عبر `Authorization: Bearer <token>`. المشكلة: أي كود جافاسكريبت شغّال بالصفحة (بما فيه سكريبت مزروع عبر ثغرة XSS ناجحة) يقدر يقرأ `localStorage` مباشرة ويسرق التوكن.
- **الحل**: الباك اند صار يحط التوكن بكوكي `httpOnly` (`res.cookie("token", token, {...})`) بدل ما يرجّعه بالـJSON. كوكي الـ`httpOnly` **غير قابلة للقراءة من جافاسكريبت إطلاقًا** — حتى لو صار XSS ناجح، السكريبت الخبيث ما بيقدر يوصلها. المتصفح هو يلي بيرفقها تلقائيًا بكل طلب لاحق (`withCredentials: true` بالـaxios وبعميل Socket.io).
- **خيارات الكوكي**: `secure: true` بالإنتاج بس (يحتاج HTTPS)، `sameSite: "lax"` كحماية أساسية من CSRF (بيمنع المتصفح من إرفاق الكوكي بطلبات POST جايه من مواقع تانية)، و`maxAge` محسوبة تلقائيًا من `JWT_EXPIRES_IN` عشان تطابق مدة صلاحية التوكن نفسها.
- **`protect` middleware**: صار يقرأ التوكن من `req.cookies.token` أولًا، وبيرجع لـ`Authorization: Bearer` كـfallback (مفيد لعملاء غير المتصفح زي Postman أو تطبيق موبايل مستقبلي).
- **`POST /api/auth/logout`**: نقطة جديدة بس بتمسح الكوكي من طرف السيرفر (`res.clearCookie`) — الفرونت اند ما عاد عنده أي توكن يمسحه بنفسه أصلاً.
- **Socket.io**: بما إنه الفرونت اند ما عاد يقدر يقرأ التوكن، عميل Socket.io صار يتصل بـ`withCredentials: true` بدل ما يبعت التوكن يدويًا بـ`auth: {token}`. السيرفر بيقرأ الكوكي من رأس الـhandshake HTTP مباشرة (`socket.handshake.headers.cookie`) عبر مكتبة `cookie`.
- **حدود هالحل (بصراحة)**: `sameSite: "lax"` بيخفف من هجمات CSRF الشائعة بس مش حماية كاملة 100% — لمشروع أكبر أو حساسية أعلى، الخطوة التالية المنطقية إضافة CSRF token صريح لطلبات التغيير (POST/PATCH/DELETE). كمان الكوكي هون بتشتغل بسهولة لأنه الفرونت اند والباك اند "same-site" بالتطوير المحلي (نفس `localhost`، بورت مختلف بس) — لو انتشر الفرونت اند والباك اند على domain-ين مختلفين تمامًا بالإنتاج (مش subdomain لنفس الدومين)، لازم `sameSite: "none"` مع `secure: true` بدل `"lax"`.

### ✅ اختبارات آلية (Automated Tests)

- **`node --test` بدون أي مكتبة اختبار خارجية**: استخدمنا test runner المدمج بـNode.js (متوفر أصلاً من Node 18+، ومستقر بـNode 20+) بدل Jest/Mocha — صيغته (`test(name, fn)`, `assert.equal`, `{skip: ...}`) شبه مطابقة لـJest، فسهل تبدّله بـJest لاحقًا لو احتجت ميزات إضافية (snapshot testing، mocking متقدم)، بس لمشروع بالحجم هذا كفى تمامًا وبدون أي dependency جديدة.
- **`tests/finance.test.js` و`tests/tradeIn.test.js`** (22 اختبار): اختبارات وحدة (unit tests) حقيقية لمعادلتي التمويل والتقييم — دوال رياضية بحتة بدون قاعدة بيانات، بتغطي الحالات الطبيعية والحالات الحدّية (edge cases: دفعة أولى تغطي السعر بالكامل، فايدة صفر، كيلومترات أعلى من المتوقع، إلخ). **كل الـ22 اختبار شغّلتهم فعليًا وطلعوا ناجحين.**
- **`tests/errors.test.js`** (8 اختبارات): يغطي `AppError`، `asyncHandler` (بيتحقق فعليًا إنه الأخطاء بتنمرر لـ`next` بدل ما تنكسر السيرفر)، و`errorHandler` (تكرار قيمة unique، CastError، ValidationError). **شغّلتهم كمان وطلعوا ناجحين.**
- **`tests/saleController.race.test.js`** (اختباران): بيتحقق من نفس منطق حجز السيارة الذرّي (race condition fix) عبر محاكاة (mocking) لدوال الموديلات بدل قاعدة بيانات حقيقية — أول اختبار يتأكد إنه `createSale` بيرجع `409` لو السيارة محجوزة مسبقًا، والثاني يتأكد إنه السيارة بترجع `available` (rollback) لو صار خطأ بعد الحجز. **مهم أذكره بصراحة**: هالاختبارات بتعتمد على حزمة `stripe` (لأن `saleController.js` بيستوردها)، ومش مثبّتة ببيئة التطوير يلي كتبت فيها الكود (بدون وصول لـnpm registry) — فبتنتخطى تلقائيًا برسالة واضحة لو شغّلتها بدون `npm install` أول. تحققت من صحة منطقها بمحاكاة مؤقتة لحزمة `stripe` أثناء الكتابة، وحذفتها بعدين. بعد `npm install` عندك، لازم تشتغل عادي.
- **حدود صريحة لهالاختبارات**: هاي كلها unit/logic tests بمحاكاة (mocked) — مش integration tests حقيقية ضد MongoDB فعلية. لإثبات الذرّية (atomicity) الحقيقية لـ`findOneAndUpdate` تحت تزامن فعلي، الخطوة التالية المنطقية استخدام `mongodb-memory-server` (قاعدة بيانات مؤقتة بالذاكرة) وتشغيل طلبين حقيقيين بنفس اللحظة ضدها — ما نفذتها هون لأنها تحتاج تحميل ملف MongoDB ثنائي من الإنترنت، وما كان متوفر بالبيئة يلي شغلت فيها.
- **تشغيل الاختبارات**: `cd backend && npm test`.

## هيكلية المشروع

```
AutoHub/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── tests/               # node --test — finance, tradeIn, errors (unit)، saleController.race (mocked)
│   └── src/
│       ├── app.js              # إعداد Express (helmet, cors, rate limit, routes)
│       ├── socket.js           # تهيئة Socket.io + مصادقة JWT + غرف المستخدمين
│       ├── config/db.js
│       ├── models/             # User, Branch, Car, Lead, Sale (+deposit), ServiceAppointment (+invoice), InventoryItem, TradeInRequest
│       ├── controllers/        # authController, branchController, carController, leadController, saleController, serviceController, inventoryController, tradeInController, analyticsController, assistantController, stripeController
│       ├── middleware/auth.js  # protect, authorize, sameBranchOnly
│       ├── routes/             # authRoutes, branchRoutes, carRoutes, leadRoutes, saleRoutes, serviceRoutes, inventoryRoutes, tradeInRoutes, assistantRoutes, analyticsRoutes, stripeRoutes
│       ├── scripts/             # seedSuperadmin.js (أول حساب superadmin)، testStripeWebhook.js (اختبار webhook محلي بدون tunnel)
│       └── utils/              # errors.js (AppError/asyncHandler/errorHandler), finance.js (حاسبة التمويل), tradeIn.js (معادلة تقييم السيارة المستعملة), aiTools.js (أدوات المساعد الذكي), stripe.js (Stripe SDK instance)
└── frontend/
    ├── package.json
    ├── .env.local.example
    └── src/
        ├── app/                # / (معرض)، /cars/[id]، /login، /register
        │                       # /dashboard، /dashboard/leads(+[id])، /dashboard/sales
        │                       # /dashboard/service، /dashboard/inventory
        │                       # /trade-in، /assistant، /dashboard/analytics
        ├── components/         # Navbar, CarCard, CarFilters, FinancingCalculator
        ├── context/AuthContext.js
        ├── context/NotificationContext.js  # اتصال Socket.io + toast تحديثات لحظية
        └── services/           # api.js (axios + interceptor للتوكن)، socket.js (اتصال Socket.io)
                                 # authService, carService, branchService, leadService, saleService (+deposit checkout)
                                 # serviceService (+invoice checkout)، inventoryService، tradeInService، assistantService
```

## نقاط الـ API الحالية

| Method | المسار | الوصول | الوصف |
|---|---|---|---|
| GET | `/api/health` | عام | فحص إن السيرفر شغّال |
| POST | `/api/auth/register` | عام | تسجيل حساب زبون جديد |
| POST | `/api/auth/login` | عام | تسجيل دخول |
| GET | `/api/auth/me` | مسجّل دخول | بيانات المستخدم الحالي |
| POST | `/api/auth/logout` | عام | مسح كوكي الجلسة (httpOnly) |
| POST | `/api/auth/staff` | superadmin / branchManager | إنشاء حساب موظف |
| GET | `/api/auth/technicians` | superadmin / branchManager | قائمة فنيي الفرع (لتعيينهم على مواعيد صيانة) |
| GET | `/api/branches` | مسجّل دخول | عرض الفروع |
| POST | `/api/branches` | superadmin | إنشاء فرع |
| PATCH/DELETE | `/api/branches/:id` | superadmin | تعديل/تعطيل فرع |
| GET | `/api/cars` | عام | تصفح السيارات (فلاتر: make, model, minPrice, maxPrice, fuelType, transmission, branch, status, year, page, limit) |
| GET | `/api/cars/:id` | عام | تفاصيل سيارة |
| POST | `/api/cars` | superadmin / branchManager / salesAgent | إضافة سيارة |
| PATCH/DELETE | `/api/cars/:id` | superadmin / branchManager (+ salesAgent للتعديل) | تعديل/حذف سيارة (بفرعه بس) |
| GET | `/api/leads` | superadmin / branchManager / salesAgent | عرض الـLeads (مفلترة حسب الفرع أو المندوب) |
| GET | `/api/leads/:id` | نفس الفريق أعلاه | تفاصيل Lead |
| POST | `/api/leads` | superadmin / branchManager / salesAgent | تسجيل Lead جديد |
| PATCH | `/api/leads/:id` | نفس الفريق أعلاه | تحديث حالة الـLead |
| POST | `/api/leads/:id/notes` | نفس الفريق أعلاه | إضافة ملاحظة متابعة |
| GET | `/api/sales` | superadmin / branchManager / salesAgent | عرض الصفقات |
| GET | `/api/sales/:id` | نفس الفريق أعلاه | تفاصيل صفقة |
| POST | `/api/sales` | superadmin / branchManager / salesAgent | تحويل Lead لصفقة بيع (تحجز السيارة) |
| POST | `/api/sales/:id/deposit-checkout` | نفس الفريق أعلاه | إنشاء رابط دفع Stripe لعربون الحجز |
| PATCH | `/api/sales/:id/approve` | superadmin / branchManager | الموافقة على الصفقة (يتطلب عربون مدفوع، السيارة تصير مباعة) |
| PATCH | `/api/sales/:id/reject` | superadmin / branchManager | رفض الصفقة (السيارة ترجع متوفرة) |
| POST | `/api/sales/financing-quote` | عام | حاسبة تمويل/تقسيط (بدون حفظ) |
| POST | `/api/trade-ins/estimate` | عام | معاينة قيمة تقييم سيارة مستعملة (بدون حفظ) |
| POST | `/api/trade-ins` | customer | تسجيل طلب تقييم رسمي (بيتحسب ويتخزّن) |
| GET | `/api/trade-ins/mine` | customer | طلبات التقييم الخاصة بالزبون |
| GET | `/api/trade-ins` | superadmin / branchManager / salesAgent | البحث عن طلبات تقييم زبون معيّن (لتحويل Lead لصفقة) |
| GET | `/api/service` | superadmin / branchManager / technician | عرض مواعيد الصيانة (مفلترة حسب الفرع أو الفني) |
| GET | `/api/service/car/:carId` | نفس الفريق أعلاه | سجل الصيانة الكامل لسيارة معيّنة |
| GET | `/api/service/:id` | نفس الفريق أعلاه | تفاصيل موعد صيانة |
| POST | `/api/service` | superadmin / branchManager | تسجيل موعد صيانة جديد لزبون |
| PATCH | `/api/service/:id/assign` | superadmin / branchManager | تعيين فني للموعد |
| PATCH | `/api/service/:id/status` | الفني المسؤول / superadmin / branchManager | تحديث حالة الموعد + ملاحظات الإنجاز + مبلغ الفاتورة (اختياري) |
| POST | `/api/service/:id/invoice-checkout` | superadmin / branchManager / technician | إنشاء رابط دفع Stripe لفاتورة الصيانة |
| POST | `/api/stripe/webhook` | Stripe فقط (توقيع موثّق) | استقبال أحداث الدفع وتحديث حالة العربون/الفاتورة |
| GET | `/api/inventory` | superadmin / branchManager / technician | عرض مخزون قطع الغيار (حسب الفرع) |
| POST | `/api/inventory` | superadmin / branchManager | إضافة صنف جديد للمخزون |
| PATCH | `/api/inventory/:id/adjust` | superadmin / branchManager / technician | تعديل الكمية (إضافة أو خصم) |
| POST | `/api/assistant/chat` | عام (rate limit أشد: 20/15 دقيقة) | محادثة مع المساعد الذكي (بحث سيارات، تمويل، تقييم) |
| GET | `/api/analytics/overview` | superadmin / branchManager | إيرادات، عدد صفقات، متوسط صفقة، حالة السيارات |
| GET | `/api/analytics/by-branch` | superadmin | إيرادات وعدد صفقات كل فرع |
| GET | `/api/analytics/top-models` | superadmin / branchManager | أكثر 10 موديلات مبيعًا |

## التشغيل محليًا

### الباك اند

```bash
cd backend
npm install
cp .env.example .env   # وعبّي MONGO_URI (MongoDB Atlas مجاني كافي) وJWT_SECRET وOPENAI_API_KEY (للمساعد الذكي) ومفاتيح Stripe (للدفع الإلكتروني — اختياري بمرحلة التطوير، بدونها بس أزرار الدفع بترجع خطأ)
npm run dev
```

السيرفر رح يشتغل على `http://localhost:5000`. جرّب `GET /api/health` أول شي.

**أول تشغيل — لازم تعمل حساب superadmin يدويًا**: التسجيل العام (`/register`) بيعمل حسابات `customer` بس، وإنشاء حساب موظف (`/auth/staff`) محصور بـsuperadmin/branchManager أصلاً — يعني ما في طريقة توصل لأول superadmin من داخل الموقع. لهيك في سكريبت بيحل المشكلة:

```bash
cd backend
npm run seed:superadmin -- "اسمك" you@example.com yourPassword123
```

لو الإيميل هذا مسجّل عندك مسبقًا كـcustomer (من `/register`)، السكريبت بيرفّعه لـsuperadmin بدل ما يعمل حساب جديد. بعدها سجّل دخول بنفس الإيميل، وبتقدر تعمل فرع (`/api/branches`) وسيارات من لوحة التحكم.

### الفرونت اند

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

الفرونت اند رح يشتغل على `http://localhost:3000` — لازم الباك اند يكون شغّال بنفس الوقت.

## الخطوات الجاية (الروادماب)

1. ✅ قاعدة البيانات الأساسية + Auth + CRUD الفروع والسيارات
2. ✅ الفرونت اند الأساسي (معرض + تسجيل دخول/حساب + لوحة تحكم مبدئية)
3. ✅ نظام المبيعات: Lead، صفقات بيع بموافقة يدوية، حاسبة تمويل/تقسيط
4. ✅ ربط نظام المبيعات بالفرونت اند (لوحة تحكم كاملة للمندوب ومدير الفرع)
5. ✅ خدمة ما بعد البيع: حجز مواعيد صيانة، سجل صيانة لكل VIN، مخزون قطع غيار (باك اند + فرونت اند)
6. ✅ تحديثات لحظية (Socket.io): إشعار فوري لمندوب المبيعات لما تنوافق أو ترفض صفقته (موعد الصيانة/Lead لسا بانتظار خطوة لاحقة)
7. ✅ أداة تقييم سيارة مستعملة (trade-in): معادلة تلقائية + ربط بصفقة البيع لتخفيض السعر (باك اند + فرونت اند)
8. ✅ لوحة تحكم تحليلية: مبيعات كل فرع، أكثر الموديلات مبيعًا، تقارير إيرادات (باك اند + فرونت اند)
9. ✅ دفع إلكتروني (Stripe): عربون حجز، فواتير صيانة
10. ✅ مساعد ذكاء اصطناعي للزبون: محادثة بـOpenAI function-calling، بيبحث بالمخزون الفعلي ويحسب تمويل/تقييم حقيقي (باك اند + فرونت اند)
