const pool = require("../config/db");
const { ok } = require("../utils/response");

exports.list = async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM produk ORDER BY created_at DESC"
  );
  return ok(res, rows, "Daftar produk");
};

exports.detail = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM produk WHERE id_produk=?", [id]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
  return ok(res, rows[0], "Detail produk");
};