// نفس فكرة finance.js: مصدر واحد للحساب يستخدمه كل من:
// - نقطة المعاينة العامة (بدون حفظ، للزبون يجرّب بسرعة)
// - نقطة الحفظ الفعلية (تسجيل طلب تقييم رسمي)
// بحسب أي منهم استدعاه، بس المنطق موجود مرة وحدة.

const ANNUAL_DEPRECIATION_RATE = 0.15; // 15% انخفاض بالقيمة كل سنة (declining balance)
const EXPECTED_KM_PER_YEAR = 20000; // متوسط كيلومترات متوقّع بالسنة
const EXCESS_MILEAGE_PENALTY_PER_1000KM = 0.005; // 0.5% إضافية لكل 1000 كم زيادة عن المتوقّع
const MIN_VALUE_RATIO = 0.1; // القيمة ما بتنزل تحت 10% من سعر الشراء الأصلي مهما كانت السيارة قديمة

const calculateTradeInValue = (purchasePrice, year, mileage) => {
  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - Number(year));

  // انخفاض حسب العمر (declining balance): كل سنة بتاخد نسبة من القيمة المتبقية، مش من الأصل
  const valueAfterAge = purchasePrice * Math.pow(1 - ANNUAL_DEPRECIATION_RATE, ageYears);

  // انخفاض إضافي حسب الكيلومترات الزايدة عن المتوقّع لعمر السيارة
  const expectedMileage = ageYears * EXPECTED_KM_PER_YEAR;
  const excessMileage = Math.max(0, Number(mileage) - expectedMileage);
  const mileagePenalty = (excessMileage / 1000) * EXCESS_MILEAGE_PENALTY_PER_1000KM;
  const valueAfterMileage = valueAfterAge * Math.max(0, 1 - mileagePenalty);

  const minValue = purchasePrice * MIN_VALUE_RATIO;
  const estimatedValue = Math.round(Math.max(minValue, valueAfterMileage));

  return {
    estimatedValue,
    ageYears,
    excessMileage,
  };
};

module.exports = { calculateTradeInValue };
