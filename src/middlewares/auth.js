const jwt = require("jsonwebtoken");
const pool = require("../config/db");

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query(
      "SELECT id_user, nama, email, role, gambar_profile FROM users WHERE id_user=?",
      [decoded.id_user]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};