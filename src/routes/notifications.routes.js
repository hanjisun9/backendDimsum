const router = require("express").Router();
const auth = require("../middlewares/auth");
const c = require("../controllers/notifications.controller");

router.use(auth);
router.get("/", c.list);
router.put("/:id/read", c.markRead);

module.exports = router;