const express = require("express");
const chatController = require("../controllers/chat.controller");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

router.post("/", optionalAuthMiddleware, chatController.createChatResponse);
router.post("/stream", optionalAuthMiddleware, chatController.createChatResponseStream);
router.post("/explain", chatController.explainProducts);

module.exports = router;
