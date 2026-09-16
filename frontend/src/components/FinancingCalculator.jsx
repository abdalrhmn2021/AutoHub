"use client";

import { useState } from "react";
import * as saleService from "@/services/saleService";

const formatMoney = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export default function FinancingCalculator({ price, onQuoteChange }) {
  const [downPayment, setDownPayment] = useState(Math.round(price * 0.2));
  const [months, setMonths] = useState(36);
  const [annualInterestRate, setAnnualInterestRate] = useState(6);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await saleService.getFinancingQuote({
        price,
        downPayment: Number(downPayment),
        months: Number(months),
        annualInterestRate: Number(annualInterestRate),
      });
      setQuote(data.quote);
      onQuoteChange?.({ downPayment: Number(downPayment), months: Number(months), annualInterestRate: Number(annualInterestRate), ...data.quote });
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بحساب التمويل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-bold mb-3">حاسبة التمويل والتقسيط</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <label className="text-sm">
          الدفعة الأولى ($)
          <input
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
          />
        </label>
        <label className="text-sm">
          عدد الأشهر
          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
          />
        </label>
        <label className="text-sm">
          الفائدة السنوية (%)
          <input
            type="number"
            step="0.1"
            value={annualInterestRate}
            onChange={(e) => setAnnualInterestRate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
          />
        </label>
      </div>

      <button
        onClick={calculate}
        disabled={loading}
        className="w-full bg-[var(--color-primary)] text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "جارِ الحساب..." : "احسب القسط الشهري"}
      </button>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {quote && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-gray-500 text-xs mb-1">القسط الشهري</div>
            <div className="font-bold text-[var(--color-primary)]">${formatMoney(quote.monthlyPayment)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-gray-500 text-xs mb-1">المبلغ الكلي</div>
            <div className="font-bold">${formatMoney(quote.totalPayable)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-gray-500 text-xs mb-1">إجمالي الفائدة</div>
            <div className="font-bold">${formatMoney(quote.totalInterest)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
