const router = require("express").Router();
const c = require("../controllers/products.controller");

router.get("/", c.list);
router.get("/:id", c.detail);

module.exports = router;