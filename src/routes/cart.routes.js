const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/cart.controller");

router.use(auth, role(["user"]));
router.get("/", c.getCart);
router.post("/add", c.addToCart);
router.put("/item/:id", c.updateItem);
router.delete("/item/:id", c.removeItem);
router.post("/checkout", c.checkout);

module.exports = router;