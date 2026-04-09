const router = require("express").Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const c = require("../controllers/admin.products.controller");
const { uploadProductImage } = require("../middlewares/uploadProduct");

router.use(auth, role(["admin"]));

// field name "gambar" harus sama dengan yang dikirim frontend
router.post("/", uploadProductImage.single("gambar"), c.create);
router.put("/:id", uploadProductImage.single("gambar"), c.update);

router.delete("/:id", c.remove);

module.exports = router;