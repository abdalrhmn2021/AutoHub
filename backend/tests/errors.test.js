// اختبارات وحدة لـutils/errors.js — AppError, asyncHandler, errorHandler.
// asyncHandler وerrorHandler بنختبرهم بـmock بسيط لـ(req, res, next) بدل سيرفر Express حقيقي.
const test = require("node:test");
const assert = require("node:assert/strict");
const { AppError, asyncHandler, errorHandler } = require("../src/utils/errors");

const mockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
    },
  };
  return res;
};

test("AppError بيحمل statusCode والرسالة و isOperational=true", () => {
  const err = new AppError("مش موجود", 404);
  assert.equal(err.message, "مش موجود");
  assert.equal(err.statusCode, 404);
  assert.equal(err.isOperational, true);
  assert.ok(err instanceof Error);
});

test("asyncHandler بيمرر أي خطأ صار جوا الدالة async لـnext بدل ما يرمي exception غير معالج", async () => {
  const handler = asyncHandler(async () => {
    throw new AppError("خطأ تجريبي", 400);
  });

  let capturedError = null;
  await handler({}, {}, (err) => {
    capturedError = err;
  });

  assert.ok(capturedError instanceof AppError);
  assert.equal(capturedError.statusCode, 400);
});

test("asyncHandler ما بيستدعي next() إطلاقًا لو الدالة نجحت بدون خطأ", async () => {
  const handler = asyncHandler(async (req, res) => {
    res.json({ ok: true });
  });

  let nextCalled = false;
  const res = mockRes();
  await handler({}, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.deepEqual(res.body, { ok: true });
});

test("errorHandler بيرجع statusCode 500 افتراضيًا لخطأ عادي بدون statusCode", () => {
  const res = mockRes();
  errorHandler(new Error("عطل غير متوقع"), {}, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
});

test("errorHandler بيستخدم statusCode الخاص بـ AppError لو موجود", () => {
  const res = mockRes();
  errorHandler(new AppError("ممنوع", 403), {}, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "ممنوع");
});

test("errorHandler بيتعامل مع تكرار قيمة unique (code 11000) كـ409 مع اسم الحقل بالرسالة", () => {
  const res = mockRes();
  const dupErr = new Error("duplicate");
  dupErr.code = 11000;
  dupErr.keyValue = { vin: "ABC123" };

  errorHandler(dupErr, {}, res, () => {});

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /vin/);
});

test("errorHandler بيتعامل مع CastError (معرّف Mongo غير صالح) كـ400", () => {
  const res = mockRes();
  const castErr = new Error("Cast to ObjectId failed");
  castErr.name = "CastError";

  errorHandler(castErr, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "معرّف غير صالح");
});

test("errorHandler بيجمع كل رسائل ValidationError من Mongoose بفاصلة", () => {
  const res = mockRes();
  const validationErr = new Error("validation failed");
  validationErr.name = "ValidationError";
  validationErr.errors = {
    name: { message: "الاسم مطلوب" },
    email: { message: "البريد الإلكتروني غير صالح" },
  };

  errorHandler(validationErr, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "الاسم مطلوب, البريد الإلكتروني غير صالح");
});
