const pool = require("../config/db");
const { ok, bad } = require("../utils/response");
const { notifyAdmin, notifyUser } = require("../services/notif.service");
const { buildReceiptPDF } = require("../services/receipt.service");

exports.allTransactions = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, u.nama
     FROM transaksi t
     JOIN users u ON u.id_user=t.id_user
     ORDER BY t.tanggal DESC`
  );
  return ok(res, rows, "Semua transaksi");
};

exports.transactionDetail = async (req, res) => {
  const { id } = req.params;

  const [trx] = await pool.query(
    `SELECT t.*, u.nama, u.email
     FROM transaksi t
     JOIN users u ON u.id_user=t.id_user
     WHERE t.id_transaksi=?`,
    [id]
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

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "paid", "dikirim", "selesai", "cancelled"];
  if (!allowed.includes(status)) return bad(res, "Status tidak valid");

  const [trxRows] = await pool.query("SELECT * FROM transaksi WHERE id_transaksi=?", [id]);
  if (!trxRows.length) return bad(res, "Transaksi tidak ditemukan", 404);

  const trx = trxRows[0];

  await pool.query("UPDATE transaksi SET status=? WHERE id_transaksi=?", [status, id]);

  if (status === "paid") {
    await notifyUser(trx.id_user, "success", "Berhasil", "Pembayaran berhasil. Pesanan Anda akan segera diproses.");
    await notifyAdmin("success", "Berhasil", `Pembayaran berhasil diterima untuk transaksi #${id}.`);
  } else if (status === "cancelled") {
    await notifyUser(trx.id_user, "error", "Gagal", "Pesanan dibatalkan. Silakan lakukan pemesanan ulang.");
    await notifyAdmin("error", "Gagal", `Pesanan transaksi #${id} telah dibatalkan.`);
  } else {
    await notifyUser(trx.id_user, "info", "Pemberitahuan", "Status pesanan Anda telah diperbarui. Cek detail transaksi.");
  }

  return ok(res, { id_transaksi: id, status }, "Status transaksi diperbarui");
};

exports.receipt = async (req, res) => {
  const { id } = req.params;

  const [trx] = await pool.query(
    `SELECT t.*, u.nama, u.email
     FROM transaksi t
     JOIN users u ON u.id_user=t.id_user
     WHERE t.id_transaksi=?`,
    [id]
  );
  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  if (trx[0].status !== "paid" && trx[0].status !== "selesai" && trx[0].status !== "dikirim") {
    return bad(res, "Struk hanya bisa dicetak setelah dibayar/diproses");
  }

  const [items] = await pool.query(
    `SELECT dt.*, p.nama_produk, p.harga
     FROM detail_transaksi dt
     JOIN produk p ON p.id_produk=dt.id_produk
     WHERE dt.id_transaksi=?`,
    [id]
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="struk-${id}.pdf"`);

  const doc = buildReceiptPDF(trx[0], items);
  doc.pipe(res);
  doc.end();
};

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;

  const [trx] = await pool.query(
    "SELECT * FROM transaksi WHERE id_transaksi=?",
    [id]
  );
  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  if (trx[0].status !== "cancelled") {
    return bad(res, "Hanya transaksi dengan status 'cancelled' yang bisa dihapus");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "DELETE FROM detail_transaksi WHERE id_transaksi=?",
      [id]
    );

    await conn.query(
      "DELETE FROM transaksi WHERE id_transaksi=?",
      [id]
    );

    await conn.commit();

    return ok(res, null, "Transaksi berhasil dihapus dari sistem");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};