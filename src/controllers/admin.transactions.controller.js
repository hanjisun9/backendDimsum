const pool = require("../config/db");
const { ok, bad } = require("../utils/response");

/**
 * GET /api/admin/transactions
 * List semua transaksi
 */
exports.allTransactions = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         id_transaksi,
         nama,
         tanggal,
         status,
         layanan,
         metode_pembayaran
       FROM transaksi
       ORDER BY tanggal DESC`
    );

    return ok(res, rows, "Berhasil ambil transaksi");
  } catch (err) {
    console.error(err);
    return bad(res, "Gagal ambil transaksi");
  }
};

/**
 * GET /api/admin/transactions/:id
 * Detail transaksi + items
 */
exports.transactionDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const [trxRows] = await pool.query(
      `SELECT 
         id_transaksi,
         nama,
         email,
         tanggal,
         status,
         layanan,
         metode_pembayaran
       FROM transaksi
       WHERE id_transaksi=?`,
      [id]
    );

    if (!trxRows.length) {
      return bad(res, "Transaksi tidak ditemukan", 404);
    }

    const [items] = await pool.query(
      `SELECT 
         dt.*,
         p.nama_produk,
         p.gambar_produk
       FROM detail_transaksi dt
       LEFT JOIN produk p ON p.id_produk = dt.id_produk
       WHERE dt.id_transaksi=?`,
      [id]
    );

    return ok(
      res,
      { transaksi: trxRows[0], items },
      "Berhasil ambil detail transaksi"
    );
  } catch (err) {
    console.error(err);
    return bad(res, "Gagal ambil detail transaksi");
  }
};

/**
 * PUT /api/admin/transactions/:id/status
 * Update status transaksi
 */
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["paid", "dikirim", "selesai", "cancelled"];
  if (!allowed.includes(status)) {
    return bad(res, "Status tidak valid", 400);
  }

  try {
    const [trx] = await pool.query(
      "SELECT id_transaksi FROM transaksi WHERE id_transaksi=?",
      [id]
    );

    if (!trx.length) {
      return bad(res, "Transaksi tidak ditemukan", 404);
    }

    await pool.query("UPDATE transaksi SET status=? WHERE id_transaksi=?", [
      status,
      id,
    ]);

    return ok(res, { id_transaksi: id, status }, "Status berhasil diupdate");
  } catch (err) {
    console.error(err);
    return bad(res, "Gagal update status");
  }
};

/**
 * GET /api/admin/transactions/:id/receipt
 * (placeholder) kalau kamu memang punya fitur receipt.
 * Silakan sesuaikan dengan kebutuhanmu.
 */
exports.receipt = async (req, res) => {
  const { id } = req.params;

  try {
    const [trxRows] = await pool.query(
      `SELECT id_transaksi, nama, email, tanggal, status, layanan, metode_pembayaran
       FROM transaksi
       WHERE id_transaksi=?`,
      [id]
    );

    if (!trxRows.length) return bad(res, "Transaksi tidak ditemukan", 404);

    const [items] = await pool.query(
      `SELECT dt.*, p.nama_produk, p.gambar_produk
       FROM detail_transaksi dt
       LEFT JOIN produk p ON p.id_produk = dt.id_produk
       WHERE dt.id_transaksi=?`,
      [id]
    );

    return ok(res, { transaksi: trxRows[0], items }, "Berhasil ambil receipt");
  } catch (err) {
    console.error(err);
    return bad(res, "Gagal ambil receipt");
  }
};

/**
 * DELETE /api/admin/transactions/:id
 * Hapus transaksi (hanya jika cancelled / selesai)
 * + hapus detail_transaksi dulu
 */
exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    const [trx] = await pool.query(
      "SELECT * FROM transaksi WHERE id_transaksi=?",
      [id]
    );

    if (!trx.length) {
      return bad(res, "Transaksi tidak ditemukan", 404);
    }

    // hanya boleh hapus jika status cancelled atau selesai
   // boleh hapus cancelled & selesai
if (!["cancelled", "selesai"].includes(trx[0].status)) {
  return bad(
    res,
    "Hanya transaksi dengan status 'cancelled' atau 'selesai' yang bisa dihapus",
    400
  );
}

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.query("DELETE FROM detail_transaksi WHERE id_transaksi=?", [
        id,
      ]);

      await conn.query("DELETE FROM transaksi WHERE id_transaksi=?", [id]);

      await conn.commit();
      return ok(res, null, "Transaksi berhasil dihapus");
    } catch (err) {
      await conn.rollback();
      console.error(err);
      return bad(res, "Gagal menghapus transaksi");
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return bad(res, "Gagal menghapus transaksi");
  }
};