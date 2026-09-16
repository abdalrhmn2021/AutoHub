require("dotenv").config();

// بعض مزودي الإنترنت (متل Paltel) بيحجبوا DNS SRV lookups، وهاد بيكسّر
// الاتصال بـmongodb+srv://. هون بنجبر Node يستخدم DNS عام (Google/Cloudflare)
// بدل الـDNS الافتراضي تبع الشبكة، بس لطلبات قاعدة البيانات.
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/socket");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  // منستخدم http.createServer بدل app.listen مباشرة عشان Socket.io
  // يقدر يتشارك نفس المنفذ مع Express (كلاهما بيسمعوا على نفس الـhttpServer).
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚗 AutoHub API شغّالة على المنفذ ${PORT}`);
  });
};

start();
