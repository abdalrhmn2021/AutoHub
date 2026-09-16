/**
 * حساب القسط الشهري الثابت (Amortization) لتمويل سيارة.
 * @param {number} price - سعر السيارة الكامل
 * @param {number} downPayment - الدفعة الأولى
 * @param {number} months - عدد أشهر التقسيط
 * @param {number} annualInterestRate - نسبة الفائدة السنوية (مثال: 6 يعني 6%)
 * @returns {{ principal, monthlyPayment, totalPayable, totalInterest }}
 */
function calculateFinancing(price, downPayment, months, annualInterestRate) {
  const principal = price - downPayment;

  if (principal <= 0) {
    return {
      principal: 0,
      monthlyPayment: 0,
      totalPayable: downPayment,
      totalInterest: 0,
    };
  }

  const monthlyRate = annualInterestRate / 12 / 100; 

  let monthlyPayment;
  if (monthlyRate === 0) {
    // بدون فايدة — تقسيط بسيط
    monthlyPayment = principal / months;
  } else {
    // معادلة القسط الثابت (Amortization) القياسية
    monthlyPayment =
      (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  }

  const totalPayable = downPayment + monthlyPayment * months;
  const totalInterest = totalPayable - price;

  return {
    principal: Math.round(principal * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

module.exports = { calculateFinancing };
