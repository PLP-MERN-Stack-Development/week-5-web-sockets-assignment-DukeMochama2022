const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

router.get("/", messageController.getMessages);
router.get("/private", messageController.getPrivateMessages);

module.exports = router;
