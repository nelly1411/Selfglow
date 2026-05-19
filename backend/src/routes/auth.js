// routes/auth.js
const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  register,
  login,
  getAddress,
  updateAddress,
  confirmEmail
} = require("../controllers/authController");

router.get("/confirm/:token", confirmEmail);


router.post("/register", register);
router.post("/login",    login);
router.get ("/address",  authMiddleware, getAddress);    // ← lädt Adresse aus DB
router.patch("/address", authMiddleware, updateAddress); // ← speichert Adresse


module.exports = router;
