const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/admin.transactions.controller");

// semua route di bawah ini hanya untuk admin
router.use(auth, role(["admin"]));

router.get("/", c.allTransactions);
router.get("/:id", c.transactionDetail);
router.put("/:id/status", c.updateStatus);
router.get("/:id/receipt", c.receipt);
router.delete("/:id", c.deleteTransaction);

module.exports = router;