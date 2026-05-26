const express = require("express");
const chatController = require("../controllers/chat.controller");

const router = express.Router();

router.post("/", chatController.createChatResponse);
router.post("/stream", chatController.createChatResponseStream);
router.post("/explain", chatController.explainProducts);

module.exports = router;
