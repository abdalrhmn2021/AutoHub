const express = require("express");
const { getLeads, getLead, createLead, updateLeadStatus, addNote } = require("../controllers/leadController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const STAFF = ["superadmin", "branchManager", "salesAgent"];

router.use(protect, authorize(...STAFF));

router.get("/", getLeads);
router.get("/:id", getLead);
router.post("/", createLead);
router.patch("/:id", updateLeadStatus);
router.post("/:id/notes", addNote);

module.exports = router;
