class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// يلف async controller عشان ما نضطر نكتب try/catch بكل مكان
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// middleware نهائي لمعالجة كل الأخطاء
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "خطأ داخلي بالسيرفر";

  // Mongoose: بيانات غير صالحة
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose: تكرار قيمة unique (زي VIN أو email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `القيمة موجودة مسبقًا للحقل: ${field}`;
  }

  // Mongoose: ObjectId غير صالح
  if (err.name === "CastError") {
    statusCode = 400;
    message = "معرّف غير صالح";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { AppError, asyncHandler, errorHandler };
