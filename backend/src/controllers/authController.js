const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError, asyncHandler } = require("../utils/errors");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// بيحوّل صيغة زي "7d"/"24h"/"30m" لعدد ميلي ثانية — عشان maxAge تبع الكوكي يطابق
// نفس مدة صلاحية الـJWT (JWT_EXPIRES_IN) بدون ما نكتب الرقم مرتين بمكانين مختلفين.
const parseDurationToMs = (str) => {
  const match = /^(\d+)([smhd])$/.exec(str || "7d");
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return Number(match[1]) * multipliers[match[2]];
};

// بيحط الـJWT بكوكي httpOnly بدل ما يرجّعه بجسم الاستجابة — هيك جافاسكريبت بالفرونت
// اند ما بيقدر يقرأه إطلاقًا (حتى لو صار XSS)، والمتصفح هو يلي بيرفقه تلقائيًا بكل
// طلب لاحق. secure:true بالإنتاج فقط (يحتاج HTTPS)، sameSite:"lax" كحماية أساسية من CSRF.
const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN),
  });
};

// POST /api/auth/register
// تسجيل حساب جديد — عام (customer) بس، الأدوار التانية (موظفين) بينضاف بس عن طريق superadmin/branchManager لاحقًا
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    throw new AppError("الاسم والبريد الإلكتروني وكلمة المرور مطلوبين", 400);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("في حساب مسجل بهذا البريد الإلكتروني مسبقًا", 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "customer",
  });

  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res.status(201).json({
    success: true,
    user: user.toSafeObject(),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("البريد الإلكتروني وكلمة المرور مطلوبين", 400);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("بريد إلكتروني أو كلمة مرور غير صحيحة", 401);
  }

  if (!user.isActive) {
    throw new AppError("هذا الحساب معطّل، تواصل مع الإدارة", 403);
  }

  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res.status(200).json({
    success: true,
    user: user.toSafeObject(),
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
  });
});

// POST /api/auth/logout — بيمسح كوكي الـJWT. لازم نفس خيارات الكوكي بالضبط (عدا maxAge)
// وإلا clearCookie ما بيلاقي الكوكي المطابقة ويفشل يمسحها بمتصفحات معيّنة.
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ success: true, message: "تم تسجيل الخروج" });
});

// POST /api/auth/staff  — إنشاء حساب موظف (مندوب مبيعات/فني)، مقيّد لـ superadmin أو branchManager
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, branch } = req.body;
  const allowedRoles =
    req.user.role === "superadmin"
      ? ["branchManager", "salesAgent", "technician"]
      : ["salesAgent", "technician"];

  if (!allowedRoles.includes(role)) {
    throw new AppError("دور غير صالح لإنشاء حساب موظف", 400);
  }

  // branchManager بس يقدر يضيف موظفين لفرعه هو
  const targetBranch =
    req.user.role === "branchManager" ? req.user.branch : branch;
  if (!targetBranch) {
    throw new AppError("الفرع مطلوب لإنشاء حساب موظف", 400);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("في حساب مسجل بهذا البريد الإلكتروني مسبقًا", 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    branch: targetBranch,
  });

  res.status(201).json({
    success: true,
    user: user.toSafeObject(),
  });
});

// GET /api/auth/technicians — قائمة الفنيين (لتعيينهم على مواعيد صيانة)، مقيّد لـ superadmin/branchManager
const getTechnicians = asyncHandler(async (req, res) => {
  const filter = { role: "technician", isActive: true };
  filter.branch =
    req.user.role === "superadmin"
      ? req.query.branch || undefined
      : req.user.branch;
  if (!filter.branch) delete filter.branch;

  const technicians = await User.find(filter).select("name email branch");
  res.status(200).json({ success: true, technicians });
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  createStaff,
  getTechnicians,
};
