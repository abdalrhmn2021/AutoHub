// مثال Migration حقيقي على مشروع AutoHub
//
// المشكلة: حقل `owner` (بيانات المشتري) انضاف لموديل Car بعد ما كان فيه سيارات
// مسجّلة مسبقًا بقاعدة البيانات. السيارات القديمة هاي ما إلها owner أصلاً —
// الحقل مش موجود بالـ document خالص (مش null، غير موجود). هاد السكريبت
// بيعبّي كل سيارة قديمة بقيمة owner افتراضية فاضية عشان تتوافق مع الـ schema
// الحالي (Car.js) وما تنكسر أي كويري أو صفحة بتعتمد على وجود الحقل.
//
// الاستخدام:
//   node src/scripts/migrations/2026-08-08-backfill-car-owner.js up
//   node src/scripts/migrations/2026-08-08-backfill-car-owner.js down   (تراجع)

require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");

const up = async (db) => {
  const result = await db.collection("cars").updateMany(
    { owner: { $exists: false } },
    {
      $set: {
        owner: { name: null, phone: null, customer: null },
      },
    }
  );
  console.log(`✅ up: تم تعديل ${result.modifiedCount} سيارة`);
};

const down = async (db) => {
  const result = await db.collection("cars").updateMany(
    {},
    { $unset: { owner: "" } }
  );
  console.log(`↩️  down: تم التراجع عن ${result.modifiedCount} سيارة`);
};

const run = async () => {
  const direction = process.argv[2];

  if (!["up", "down"].includes(direction)) {
    console.error("الاستخدام: node 2026-08-08-backfill-car-owner.js <up|down>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  if (direction === "up") await up(db);
  else await down(db);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ فشل الـ migration:", err.message);
  process.exit(1);
});
