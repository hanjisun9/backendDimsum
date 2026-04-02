const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
router.use("/products", require("./products.routes"));
router.use("/cart", require("./cart.routes"));
router.use("/transactions", require("./transactions.routes"));
router.use("/notifications", require("./notifications.routes"));

// admin
router.use("/admin/products", require("./admin.products.routes"));
router.use("/admin/transactions", require("./admin.transactions.routes"));

module.exports = router;