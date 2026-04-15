const pool = require("../config/db");
const { ok, bad } = require("../utils/response");
const { notifyAdmin } = require("../services/notif.service");
const { buildReceiptPDF } = require("../services/receipt.service");

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

exports.receipt = async (req, res) => {
  const { id } = req.params;
  const [trx] = await pool.query(
    `SELECT t.*, u.nama, u.email
     FROM transaksi t
     JOIN users u ON u.id_user = t.id_user
     WHERE t.id_transaksi=? AND t.id_user=?`,
    [id, req.user.id_user]
  );
  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  if (!["paid", "dikirim", "selesai"].includes(trx[0].status)) {
    return bad(res, "Struk hanya bisa dicetak setelah pembayaran berhasil / pesanan diproses");
  }

  const [items] = await pool.query(
    `SELECT dt.*, p.nama_produk, p.harga
     FROM detail_transaksi dt
     JOIN produk p ON p.id_produk = dt.id_produk
     WHERE dt.id_transaksi=?`,
    [id]
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="struk-${id}.pdf"`);

  const doc = buildReceiptPDF(trx[0], items);
  doc.pipe(res);
  doc.end();
};

exports.cancelTransaction = async (req, res) => {
  const { id } = req.params;
  const [trx] = await pool.query(
    "SELECT * FROM transaksi WHERE id_transaksi=? AND id_user=?",
    [id, req.user.id_user]
  );
  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  if (trx[0].status !== "pending") {
    return bad(res, "Hanya transaksi dengan status 'pending' yang bisa dibatalkan");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE transaksi SET status='cancelled' WHERE id_transaksi=?",
      [id]
    );

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