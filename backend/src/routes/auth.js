// routes/auth.js
const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  register,
  login,
  getAddress,
  updateAddress,
  updateSkinType,
  confirmEmail,
  deleteSkinType,
  checkWelcomeCode,
   updateProfile,
   updatePassword
} = require("../controllers/authController");

router.post  ("/register",       register);
router.post  ("/login",          login);
router.get   ("/address",        authMiddleware, getAddress);
router.patch ("/address",        authMiddleware, updateAddress);
router.patch ("/skin-type",      authMiddleware, updateSkinType);  
router.get   ("/confirm/:token", confirmEmail);
router.delete("/skin-type", authMiddleware, deleteSkinType)
router.get("/check-welcome-code", authMiddleware, checkWelcomeCode)
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/update-password", authMiddleware, updatePassword)

module.exports = router;