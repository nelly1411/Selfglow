const express = require("express");
const { register, login, updateAddress, } = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.patch("/address", authMiddleware, updateAddress);

module.exports = router;