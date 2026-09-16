const express = require("express");
const { getEstimate, createRequest, getMyRequests, getRequests } = require("../controllers/tradeInController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const STAFF = ["superadmin", "branchManager", "salesAgent"];

router.post("/estimate", getEstimate); // عام — بدون تسجيل دخول

router.post("/", protect, authorize("customer"), createRequest);
router.get("/mine", protect, authorize("customer"), getMyRequests);
router.get("/", protect, authorize(...STAFF), getRequests);

module.exports = router;
