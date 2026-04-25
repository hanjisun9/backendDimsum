const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/transactions.controller");

router.use(auth, role(["user"]));

router.get("/", c.myTransactions);
router.get("/:id", c.myTransactionDetail);
router.get("/:id/receipt", c.receipt);
router.put("/:id/pay", c.markPaid);
router.put("/:id/cancel", c.cancelTransaction);

router.delete("/:id", c.deleteTransactionUser);

module.exports = router;