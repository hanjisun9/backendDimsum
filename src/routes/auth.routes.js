const router = require("express").Router();
const auth = require("../middlewares/auth");
const c = require("../controllers/auth.controller");

router.post("/register", c.register);
router.post("/login", c.login);
router.get("/me", auth, c.me);
router.put("/me", auth, c.updateMe);

module.exports = router;