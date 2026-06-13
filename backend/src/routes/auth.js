// routes/auth.js
const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  register,
  login,
  getAddress,
  getProfileContext,
  updateAddress,
  updateSkinType,
  verifyCode,
  deleteSkinType,
  checkWelcomeCode,
   updateProfile,
   updatePassword,
   updateGender,
} = require("../controllers/authController");

router.post  ("/register",       register);
router.post  ("/login",          login);
router.post  ("/verify-code", verifyCode),
router.get   ("/address",        authMiddleware, getAddress);
router.get   ("/profile-context", authMiddleware, getProfileContext);
router.patch ("/address",        authMiddleware, updateAddress);
router.patch ("/skin-type",      authMiddleware, updateSkinType);  
router.get   ("/confirm/:token", verifyCode);
router.delete("/skin-type", authMiddleware, deleteSkinType)
router.get("/check-welcome-code", authMiddleware, checkWelcomeCode)
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/update-password", authMiddleware, updatePassword)
router.patch("/gender", authMiddleware, updateGender)

module.exports = router;
