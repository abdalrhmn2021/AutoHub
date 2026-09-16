// اختبارات وحدة لمعادلة تقييم السيارة المستعملة (trade-in) — utils/tradeIn.js.
// نفس مبدأ finance.test.js: دالة رياضية بحتة بدون قاعدة بيانات.
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateTradeInValue } = require("../src/utils/tradeIn");

test("سيارة بعمر صفر (سنة الصنع = السنة الحالية) وكيلومترات صفر — القيمة تساوي سعر الشراء بالضبط", () => {
  const currentYear = new Date().getFullYear();
  const result = calculateTradeInValue(20000, currentYear, 0);
  assert.equal(result.ageYears, 0);
  assert.equal(result.estimatedValue, 20000);
});

test("كل سنة عمر إضافية بتنقّص القيمة (declining balance)", () => {
  const currentYear = new Date().getFullYear();
  const oneYear = calculateTradeInValue(20000, currentYear - 1, 20000);
  const threeYears = calculateTradeInValue(20000, currentYear - 3, 60000);
  assert.ok(threeYears.estimatedValue < oneYear.estimatedValue);
});

test("القيمة ما بتنزل تحت 10% من سعر الشراء الأصلي مهما كانت السيارة قديمة", () => {
  const result = calculateTradeInValue(20000, 1990, 800000);
  assert.ok(result.estimatedValue >= 20000 * 0.1);
});

test("كيلومترات أعلى من المتوقّع لعمر السيارة بتنزل القيمة أكتر من نفس العمر بكيلومترات طبيعية", () => {
  const currentYear = new Date().getFullYear();
  const expectedMileage = calculateTradeInValue(20000, currentYear - 3, 60000); // 20,000كم/سنة تقريبًا
  const highMileage = calculateTradeInValue(20000, currentYear - 3, 150000);
  assert.ok(highMileage.estimatedValue < expectedMileage.estimatedValue);
});

test("excessMileage بيرجع صفر لو الكيلومترات أقل من أو تساوي المتوقّع لعمر السيارة", () => {
  const currentYear = new Date().getFullYear();
  const result = calculateTradeInValue(20000, currentYear - 5, 1000); // بعيد كتير عن 100,000 المتوقعة
  assert.equal(result.excessMileage, 0);
});

test("excessMileage بيحسب صح الفرق لما الكيلومترات أعلى من المتوقّع", () => {
  const currentYear = new Date().getFullYear();
  const result = calculateTradeInValue(20000, currentYear - 2, 50000); // متوقّع 40,000
  assert.equal(result.excessMileage, 10000);
});
