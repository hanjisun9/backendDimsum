const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/transactions.controller");

router.use(auth, role(["user"]));
router.get("/", c.myTransactions);
router.get("/:id", c.myTransactionDetail);

module.exports = router;