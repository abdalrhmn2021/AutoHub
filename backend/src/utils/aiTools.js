const Car = require("../models/Car");
const { calculateFinancing } = require("./finance");
const { calculateTradeInValue } = require("./tradeIn");

const { FUEL_TYPES, TRANSMISSION_TYPES } = Car;

// أدوات (tools) يقدر المساعد الذكي ينادها بدل ما يخترع أرقام من عنده — كل وحدة
// بترجع بيانات حقيقية من قاعدة البيانات أو من نفس معادلات الحساب المستخدمة بباقي
// الموقع (finance.js وtradeIn.js)، عشان يضل جواب المساعد متسق مع باقي المنصة.

// بيرجع تعريف الأدوات بصيغة OpenAI function-calling (tools array)
const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_cars",
      description:
        "يبحث عن سيارات متوفرة فعليًا بمعرض AutoHub حسب فلاتر اختيارية. استخدمها دايمًا لما الزبون يسأل عن سيارات موجودة أو أسعار حقيقية — لا تخترع سيارات أو أسعار من عندك أبدًا.",
      parameters: {
        type: "object",
        properties: {
          make: { type: "string", description: "الماركة، مثال: تويوتا" },
          model: { type: "string", description: "الموديل، مثال: كامري" },
          minPrice: { type: "number", description: "أقل سعر بالدولار" },
          maxPrice: { type: "number", description: "أعلى سعر بالدولار" },
          fuelType: { type: "string", enum: FUEL_TYPES },
          transmission: { type: "string", enum: TRANSMISSION_TYPES },
          year: { type: "number", description: "سنة الصنع" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_financing",
      description:
        "يحسب القسط الشهري لتمويل/تقسيط سيارة. لازم يكون عندك سعر السيارة والدفعة الأولى وعدد الأشهر ونسبة الفائدة السنوية قبل ما تنادي هالأداة — لو أي رقم ناقص، اسأل الزبون عنه أول.",
      parameters: {
        type: "object",
        properties: {
          price: { type: "number", description: "سعر السيارة الكامل" },
          downPayment: { type: "number", description: "الدفعة الأولى" },
          months: { type: "number", description: "عدد أشهر التقسيط" },
          annualInterestRate: { type: "number", description: "نسبة الفائدة السنوية، مثال: 6 يعني 6%" },
        },
        required: ["price", "downPayment", "months", "annualInterestRate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_trade_in",
      description:
        "يعطي تقدير أولي لقيمة سيارة الزبون المستعملة كجزء من صفقة شراء سيارة جديدة. لازم سعر الشراء الأصلي وسنة الصنع والكيلومترات المقطوعة.",
      parameters: {
        type: "object",
        properties: {
          purchasePrice: { type: "number", description: "سعر شراء السيارة القديمة وقتها" },
          year: { type: "number", description: "سنة صنع السيارة القديمة" },
          mileage: { type: "number", description: "الكيلومترات المقطوعة حاليًا" },
        },
        required: ["purchasePrice", "year", "mileage"],
      },
    },
  },
];

async function runSearchCars(args) {
  const filter = { status: "available" };
  if (args.make) filter.make = new RegExp(args.make, "i");
  if (args.model) filter.model = new RegExp(args.model, "i");
  if (args.fuelType) filter.fuelType = args.fuelType;
  if (args.transmission) filter.transmission = args.transmission;
  if (args.year) filter.year = Number(args.year);
  if (args.minPrice || args.maxPrice) {
    filter.price = {};
    if (args.minPrice) filter.price.$gte = Number(args.minPrice);
    if (args.maxPrice) filter.price.$lte = Number(args.maxPrice);
  }

  const cars = await Car.find(filter)
    .select("make model year price mileage fuelType transmission color")
    .populate("branch", "name city")
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    count: cars.length,
    cars: cars.map((c) => ({
      id: c._id.toString(),
      make: c.make,
      model: c.model,
      year: c.year,
      price: c.price,
      mileage: c.mileage,
      fuelType: c.fuelType,
      transmission: c.transmission,
      color: c.color,
      branch: c.branch ? `${c.branch.name} - ${c.branch.city}` : null,
    })),
  };
}

function runCalculateFinancing(args) {
  return calculateFinancing(
    Number(args.price),
    Number(args.downPayment),
    Number(args.months),
    Number(args.annualInterestRate)
  );
}

function runCalculateTradeIn(args) {
  return calculateTradeInValue(Number(args.purchasePrice), Number(args.year), Number(args.mileage));
}

// نقطة دخول واحدة تنفذ أي tool call حسب اسمه — assistantController بينادي هاي بس
async function executeTool(name, args) {
  switch (name) {
    case "search_cars":
      return runSearchCars(args);
    case "calculate_financing":
      return runCalculateFinancing(args);
    case "calculate_trade_in":
      return runCalculateTradeIn(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

module.exports = { AI_TOOLS, executeTool };
