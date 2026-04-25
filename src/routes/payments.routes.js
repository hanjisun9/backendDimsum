const router = require("express").Router();
const c = require("../controllers/payments.controller");

// endpoint webhook trakteer
router.post("/trakteer/webhook", c.trakteerWebhook);

module.exports = router;