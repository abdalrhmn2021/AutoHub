// اختبارات وحدة (unit tests) لمعادلة القسط الشهري (Amortization) — utils/finance.js.
// دالة رياضية بحتة، بدون قاعدة بيانات، فمنقدر نتأكد من صحتها مباشرة بدون أي mocking.
// شغّلها: npm test (أو مباشرة: node --test tests/finance.test.js)
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateFinancing } = require("../src/utils/finance");

test("سعر - دفعة أولى = المبلغ الأساسي (principal) الصحيح", () => {
  const result = calculateFinancing(20000, 5000, 36, 6);
  assert.equal(result.principal, 15000);
});

test("لو الدفعة الأولى غطّت السعر بالكامل (principal <= 0)، القسط الشهري = 0", () => {
  const result = calculateFinancing(20000, 20000, 36, 6);
  assert.equal(result.principal, 0);
  assert.equal(result.monthlyPayment, 0);
  assert.equal(result.totalInterest, 0);
});

test("لو الدفعة الأولى أكبر من السعر، برضو ما بترجع قيم سلبية", () => {
  const result = calculateFinancing(20000, 25000, 36, 6);
  assert.equal(result.monthlyPayment, 0);
  assert.equal(result.totalPayable, 25000);
});

test("بدون فايدة (0%) — القسط الشهري = principal / months بالضبط، بدون معادلة الفائدة المركبة", () => {
  const result = calculateFinancing(20000, 5000, 36, 0);
  const expected = Math.round((15000 / 36) * 100) / 100;
  assert.equal(result.monthlyPayment, expected);
  assert.equal(result.totalInterest, 0);
});

test("مع فايدة موجبة — القسط الشهري أكبر من التقسيط البسيط بدون فايدة", () => {
  const withInterest = calculateFinancing(20000, 5000, 36, 6);
  const withoutInterest = calculateFinancing(20000, 5000, 36, 0);
  assert.ok(withInterest.monthlyPayment > withoutInterest.monthlyPayment);
});

test("totalInterest = totalPayable - price دايمًا", () => {
  const result = calculateFinancing(20000, 5000, 36, 6);
  const expectedInterest = Math.round((result.totalPayable - 20000) * 100) / 100;
  assert.equal(result.totalInterest, expectedInterest);
});

test("دفعة أولى أكبر (مبلغ أساسي أقل) لازم تعطي فايدة كلية أقل", () => {
  const lowDown = calculateFinancing(20000, 2000, 36, 6);
  const highDown = calculateFinancing(20000, 10000, 36, 6);
  assert.ok(highDown.totalInterest < lowDown.totalInterest);
});

test("عدد أشهر أطول بنفس المبلغ والفايدة بيرفع الفايدة الكلية (مع إنه بيخفض القسط الشهري)", () => {
  const shortTerm = calculateFinancing(20000, 5000, 24, 6);
  const longTerm = calculateFinancing(20000, 5000, 60, 6);
  assert.ok(longTerm.monthlyPayment < shortTerm.monthlyPayment);
  assert.ok(longTerm.totalInterest > shortTerm.totalInterest);
});
