// سكريبت تشغيل يدوي (مش جزء من الـAPI) بيحل مشكلة "البيضة والدجاجة":
// إنشاء حساب موظفين محصور بـsuperadmin/branchManager، وما في superadmin أصلاً أول مرة.
//
// الاستخدام:
//   node src/scripts/seedSuperadmin.js "الاسم" email@example.com password123
//
// لو الإيميل موجود مسبقًا (مثلاً سجّلت حساب عادي customer من صفحة /register)،
// السكريبت بيرفّعه لـsuperadmin بدل ما يعمل حساب جديد.

require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const User = require("../models/User");

const run = async () => {
  const [, , name, email, password] = process.argv;

  if (!email || !password) {
    console.error("الاستخدام: node src/scripts/seedSuperadmin.js \"الاسم\" email password");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email });

  if (user) {
    user.role = "superadmin";
    user.branch = null;
    if (password) {
      user.password = password; // بيتشفّر تلقائيًا (pre-save hook)
    }
    await user.save();
    console.log(`✅ تمت ترقية الحساب الموجود (${email}) لـ superadmin`);
  } else {
    user = await User.create({
      name: name || "Super Admin",
      email,
      password,
      role: "superadmin",
    });
    console.log(`✅ تم إنشاء حساب superadmin جديد (${email})`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ فشل السكريبت:", err.message);
  process.exit(1);
});
