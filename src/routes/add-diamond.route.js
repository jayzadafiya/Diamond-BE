const express = require("express");
const authController = require("../controllers/auth.controller");
const addDiamondController = require("../controllers/add-diamond.controller");

const router = express.Router();
router.use(authController.protect);

router
  .route("/")
  .get(addDiamondController.getAllDiamond)
  .post(addDiamondController.addDiamond);

module.exports = router;
