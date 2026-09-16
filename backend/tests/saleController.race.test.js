// اختبار لمنطق حجز السيارة الذرّي (race condition fix) ورجوع السيارة "available" لو صار
// خطأ بعد الحجز (compensating transaction) — controllers/saleController.js.
//
// هون منعمل mock لدوال الموديلات (Car, Lead, TradeInRequest) بدل الاتصال بقاعدة بيانات
// حقيقية — هيك منقدر نتحقق من "مسار الكود" (السيناريوهات المنطقية) بسرعة وبدون أي
// بنية تحتية إضافية. **هاد مش بديل لاختبار تزامن حقيقي (concurrency test) ضد MongoDB
// فعلية** — هيك اختبار لازم يشغّل طلبين حقيقيين بنفس اللحظة تمامًا ضد نفس الداتابيس
// (بـmongodb-memory-server مثلاً) عشان يثبت الذرّية (atomicity) على مستوى قاعدة
// البيانات نفسها. الهدف هون أضيق: التأكد إنه كود الكونترولر بيتصرف صح فرضًا إنه
// findOneAndUpdate رجعت النتيجة المتوقعة بكل سيناريو.
const test = require("node:test");
const assert = require("node:assert/strict");

// saleController.js بيعمل require("../utils/stripe") يلي بدوره بيعمل require("stripe") —
// حزمة stripe لسا مش مثبّتة بهالبيئة (بيئة sandbox بدون وصول لـnpm registry). لو نجح
// التحميل هون منكمل عادي، ولو فشل منتخطى الاختبارات بوضوح بدل ما نكسر باقي test suite.
let createSale;
let loadError = null;
try {
  ({ createSale } = require("../src/controllers/saleController"));
} catch (err) {
  loadError = err;
}

const Car = require("../src/models/Car");
const Lead = require("../src/models/Lead");
const TradeInRequest = require("../src/models/TradeInRequest");

const skipReason = loadError
  ? `تخطي: فشل تحميل saleController (${loadError.message}) — شغّل npm install بمجلد backend أول (يحتاج حزمة stripe)`
  : false;

const baseLead = {
  _id: "lead1",
  car: "car1",
  assignedTo: "agent1",
  branch: "branch1",
  customerName: "زبون تجريبي",
  customerPhone: "0790000000",
};

// asyncHandler (utils/errors.js) بيعمل Promise.resolve(fn(...)).catch(next) كـ"statement"
// بدون return — يعني الدالة الملفوفة (زي createSale) ما بترجع الـpromise نفسه، فـ
// "await createSale(...)" لحاله ما بيستنى الفعلية تخلص. لازم نستنى بشكل صريح لحد ما
// next() تنستدعى (مسار الخطأ) أو res.json() تنستدعى (مسار النجاح) — أيهم صار أول.
function invokeHandler(handler, req, res) {
  return new Promise((resolve) => {
    let settled = false;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (!settled) {
        settled = true;
        resolve({ error: null, body });
      }
      return originalJson(body);
    };

    handler(req, res, (err) => {
      if (!settled) {
        settled = true;
        resolve({ error: err, body: null });
      }
    });
  });
}

// كل اختبار بيعمل نسخة احتياطية من الدوال الأصلية ويرجّعها بالآخر — عشان الاختبارات
// ما تأثر ببعضها (test isolation).
function withMocks(mocks, fn) {
  const originals = {};
  for (const [obj, key] of mocks) {
    originals[key] = obj[key];
  }
  return async () => {
    try {
      await fn();
    } finally {
      for (const [obj, key] of mocks) {
        obj[key] = originals[key];
      }
    }
  };
}

test(
  "createSale بيرجع خطأ 409 لو السيارة مش متوفرة (findOneAndUpdate رجعت null — حجزها حد غيرو لتوّه)",
  { skip: skipReason },
  withMocks(
    [
      [Lead, "findById"],
      [Car, "findOneAndUpdate"],
      [Car, "exists"],
    ],
    async () => {
      Lead.findById = async () => ({ ...baseLead });
      // بيمثّل بالضبط الحالة يلي عالجناها: طلب تاني حجز نفس السيارة قبلنا بلحظة
      Car.findOneAndUpdate = async () => null;
      Car.exists = async () => true;

      const req = {
        body: { lead: "lead1", price: 10000 },
        user: { _id: "agent1", role: "salesAgent" },
      };
      const res = {
        status() {
          return this;
        },
        json() {},
      };

      const { error } = await invokeHandler(createSale, req, res);

      assert.ok(error, "لازم ينرمى خطأ لما السيارة مش متوفرة");
      assert.equal(error.statusCode, 409);
    }
  )
);

test(
  "createSale بيرجّع السيارة لـavailable (rollback) لو صار خطأ بعد الحجز الناجح",
  { skip: skipReason },
  withMocks(
    [
      [Lead, "findById"],
      [Car, "findOneAndUpdate"],
      [Car, "findByIdAndUpdate"],
      [TradeInRequest, "findById"],
    ],
    async () => {
      Lead.findById = async () => ({ ...baseLead, save: async () => {} });

      // أول نداء بـcreateSale هو الحجز الفعلي — نمثّله بنجاح (سيارة اترجعت "reserved")
      Car.findOneAndUpdate = async (filter, update) => {
        if (update?.$set?.status === "reserved") {
          return { _id: "car1", status: "reserved" };
        }
        return null;
      };

      let rollbackCalledWith = null;
      Car.findByIdAndUpdate = async (id, update) => {
        rollbackCalledWith = { id, update };
      };

      // نحاكي خطأ يصير *بعد* الحجز — طلب تقييم سيارة مستعملة (trade-in) غير موجود
      TradeInRequest.findById = async () => null;

      const req = {
        body: { lead: "lead1", price: 10000, tradeIn: "bad-trade-in-id" },
        user: { _id: "agent1", role: "salesAgent" },
      };
      const res = {
        status() {
          return this;
        },
        json() {},
      };

      const { error } = await invokeHandler(createSale, req, res);

      assert.ok(error, "لازم ينرمى خطأ التقييم غير الموجود");
      assert.ok(rollbackCalledWith, "لازم نستدعي rollback على السيارة لما يصير خطأ بعد الحجز");
      assert.equal(rollbackCalledWith.id, "car1");
      assert.equal(rollbackCalledWith.update.status, "available");
    }
  )
);
