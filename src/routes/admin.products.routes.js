const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/admin.products.controller");

router.use(auth, role(["admin"]));
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;