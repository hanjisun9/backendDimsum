const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/admin.transactions.controller");

router.use(auth, role(["admin"]));
router.get("/", c.allTransactions);
router.get("/:id", c.transactionDetail);
router.put("/:id/status", c.updateStatus);
router.get("/:id/receipt", c.receipt);

module.exports = router;