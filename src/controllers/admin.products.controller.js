const pool = require("../config/db");
const { ok, created, bad } = require("../utils/response");

exports.create = async (req, res) => {
  const { nama_produk, subjudul, deskripsi, harga, stok, label, rating, satuan, gambar_produk } = req.body;
  if (!nama_produk || !harga || stok == null) return bad(res, "nama_produk, harga, stok wajib");

  const [result] = await pool.query(
    `INSERT INTO produk (nama_produk, subjudul, deskripsi, harga, stok, label, rating, satuan, gambar_produk)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      nama_produk,
      subjudul || null,
      deskripsi || null,
      harga,
      stok,
      label || "none",
      rating || null,
      satuan || "desain",
      gambar_produk || null
    ]
  );

  const [rows] = await pool.query("SELECT * FROM produk WHERE id_produk=?", [result.insertId]);
  return created(res, rows[0], "Produk berhasil dibuat");
};

exports.update = async (req, res) => {
  const { id } = req.params;

  const [exists] = await pool.query("SELECT id_produk FROM produk WHERE id_produk=?", [id]);
  if (!exists.length) return bad(res, "Produk tidak ditemukan", 404);

  const fields = ["nama_produk","subjudul","deskripsi","harga","stok","label","rating","satuan","gambar_produk"];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f}=?`);
      values.push(req.body[f]);
    }
  }
  if (!updates.length) return bad(res, "Tidak ada data untuk diupdate");

  values.push(id);
  await pool.query(`UPDATE produk SET ${updates.join(", ")} WHERE id_produk=?`, values);

  const [rows] = await pool.query("SELECT * FROM produk WHERE id_produk=?", [id]);
  return ok(res, rows[0], "Produk berhasil diupdate");
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM produk WHERE id_produk=?", [id]);
  return ok(res, null, "Produk berhasil dihapus");
};