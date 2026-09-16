const express = require("express");
const { getOverview, getByBranch, getTopModels } = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const ANALYTICS_ROLES = ["superadmin", "branchManager"];

router.use(protect, authorize(...ANALYTICS_ROLES));

router.get("/overview", getOverview);
router.get("/by-branch", authorize("superadmin"), getByBranch); // مقارنة بين الفروع — superadmin بس
router.get("/top-models", getTopModels);

module.exports = router;
