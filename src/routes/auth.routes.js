const router = require("express").Router();
const auth = require("../middlewares/auth");
const c = require("../controllers/auth.controller");
const { uploadProfileImage } = require("../middlewares/uploadProfile");

router.post("/register", c.register);
router.post("/login", c.login);
router.get("/me", auth, c.me);

router.put(
  "/me",
  auth,
  uploadProfileImage.single("gambar_profile"), 
  c.updateMe
);
