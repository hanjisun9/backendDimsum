const pool = require("../config/db");
const { ok, bad } = require("../utils/response");

exports.myTransactions = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM transaksi WHERE id_user=? ORDER BY tanggal DESC`,
    [req.user.id_user]
  );
  return ok(res, rows, "Riwayat transaksi");
};

exports.myTransactionDetail = async (req, res) => {
  const { id } = req.params;

  const [trx] = await pool.query(
    "SELECT * FROM transaksi WHERE id_transaksi=? AND id_user=?",
    [id, req.user.id_user]
  );
  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  const [items] = await pool.query(
    `SELECT dt.*, p.nama_produk, p.harga, p.gambar_produk
     FROM detail_transaksi dt
     JOIN produk p ON p.id_produk=dt.id_produk
     WHERE dt.id_transaksi=?`,
    [id]
  );

  return ok(res, { transaksi: trx[0], items }, "Detail transaksi");
};