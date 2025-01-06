const express = require("express");
const diamondFilterController = require("../controllers/diamond-filter.controller");
const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post(
  "/",
  authController.protect,
  authController.restrictTo("member"),
  diamondFilterController.addDiamondFilter
);
router
  .route("/:userId")
  .get(authController.protect, diamondFilterController.getAllDiamondFilter);

module.exports = router;
