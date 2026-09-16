const jwt = require("jsonwebtoken");
const { AppError, asyncHandler } = require("../utils/errors");
const User = require("../models/User");

// protect: يتأكد إن في مستخدم مسجل دخول. المصدر الأساسي للتوكن كوكي httpOnly
// (اسمها "token"، بتنحط تلقائيًا من login/register) — جافاسكريبت بالفرونت اند ما بيقدر
// يقرأها إطلاقًا حتى لو صار XSS، بعكس تخزين التوكن بـlocalStorage. نضل نقبل كمان
// Authorization: Bearer كـfallback لعملاء غير المتصفح (Postman، سكريبتات، عملاء موبايل مستقبلية).
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    throw new AppError("غير مصرّح — لازم تسجّل دخول", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError("جلسة غير صالحة أو منتهية", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError("المستخدم غير موجود أو غير مفعّل", 401);
  }

  req.user = user;
  next();
});

// authorize: يقيّد الوصول لأدوار محددة، مثال: authorize("superadmin", "branchManager")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("ما عندك صلاحية تنفّذ هالعملية", 403);
    }
    next();
  };
};

// نفس الفرع بس: مدير الفرع يتحكم بفرعه فقط (superadmin معفى)
const sameBranchOnly = (req, res, next) => {
  if (req.user.role === "superadmin") return next();

  const targetBranch = req.body.branch || req.params.branchId || req.query.branch;
  if (targetBranch && req.user.branch?.toString() !== targetBranch.toString()) {
    throw new AppError("ما إلك صلاحية على هذا الفرع", 403);
  }
  next();
};

module.exports = { protect, authorize, sameBranchOnly };
