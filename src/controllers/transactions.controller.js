const pool = require("../config/db");
const { ok, bad } = require("../utils/response");
const { notifyAdmin } = require("../services/notif.service");

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

// PUT /api/transactions/:id/cancel
exports.cancelTransaction = async (req, res) => {
  const { id } = req.params;

  // cek transaksi milik user ini
  const [trx] = await pool.query(
    "SELECT * FROM transaksi WHERE id_transaksi=? AND id_user=?",
    [id, req.user.id_user]
  );
  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  // hanya bisa cancel kalau masih pending
  if (trx[0].status !== "pending") {
    return bad(res, "Hanya transaksi dengan status 'pending' yang bisa dibatalkan");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ubah status jadi cancelled
    await conn.query(
      "UPDATE transaksi SET status='cancelled' WHERE id_transaksi=?",
      [id]
    );

    // kembalikan stok produk
    const [items] = await conn.query(
      "SELECT id_produk, jumlah FROM detail_transaksi WHERE id_transaksi=?",
      [id]
    );

    for (const item of items) {
      await conn.query(
        "UPDATE produk SET stok = stok + ? WHERE id_produk=?",
        [item.jumlah, item.id_produk]
      );
    }

    await conn.commit();

    // notif admin: pesanan dibatalkan user
    await notifyAdmin(
      "error",
      "Gagal",
      `Pesanan #${id} dibatalkan oleh user. Stok telah dikembalikan.`
    );

    return ok(res, null, "Pesanan berhasil dibatalkan");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};