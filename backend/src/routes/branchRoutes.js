const express = require("express");
const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getBranches);
router.get("/:id", protect, getBranch);
router.post("/", protect, authorize("superadmin"), createBranch);
router.patch("/:id", protect, authorize("superadmin"), updateBranch);
router.delete("/:id", protect, authorize("superadmin"), deleteBranch);

module.exports = router;
