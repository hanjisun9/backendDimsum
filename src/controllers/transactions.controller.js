const pool = require("../config/db");
const { ok, bad } = require("../utils/response");
const { notifyAdmin, notifyUser } = require("../services/notif.service");
const { buildReceiptPDF } = require("../services/receipt.service");

exports.myTransactions = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM transaksi 
     WHERE id_user=? 
     AND deleted_by_user = 0
     ORDER BY tanggal DESC`,
    [req.user.id_user]
  );
  return ok(res, rows, "Riwayat transaksi");
};

exports.allTransactions = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM transaksi
     WHERE deleted_by_admin = 0
     ORDER BY tanggal DESC`
  );
  return ok(res, rows, "Semua transaksi");
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

// GET /api/transactions/:id/receipt (user)
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
    return bad(
      res,
      "Struk hanya bisa dicetak setelah pembayaran berhasil / pesanan diproses"
    );
  }

  const [items] = await pool.query(
    `SELECT dt.*, p.nama_produk, p.harga, dt.jumlah, dt.subtotal, dt.varian, dt.layanan
     FROM detail_transaksi dt
     JOIN produk p ON p.id_produk = dt.id_produk
     WHERE dt.id_transaksi=?`,
    [id]
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="struk-${id}.pdf"`);

  const doc = buildReceiptPDF(trx[0], items); // <-- ini pakai service
  doc.pipe(res);
  doc.end();
};

// PUT /api/transactions/:id/pay
// User menandai transaksi sudah dibayar (setelah bayar via Trakteer)
exports.markPaid = async (req, res) => {
  const { id } = req.params;

  // cek transaksi milik user
  const [trxRows] = await pool.query(
    "SELECT * FROM transaksi WHERE id_transaksi=? AND id_user=?",
    [id, req.user.id_user]
  );
  if (!trxRows.length) return bad(res, "Transaksi tidak ditemukan", 404);

  const trx = trxRows[0];

  // hanya boleh dari pending
  if (trx.status !== "pending") {
    return bad(
      res,
      "Hanya transaksi dengan status 'pending' yang bisa ditandai sudah dibayar"
    );
  }

  // ubah status jadi paid
  await pool.query(
    "UPDATE transaksi SET status='paid' WHERE id_transaksi=?",
    [id]
  );

  // notifikasi user
  await notifyUser(
    trx.id_user,
    "success",
    "Pembayaran tercatat",
    "Pembayaran Anda berhasil dicatat. Pesanan akan segera diproses oleh admin."
  );

  // notifikasi admin
  await notifyAdmin(
    "success",
    "Pembayaran baru",
    `User menandai transaksi #${id} sudah dibayar. Mohon lakukan pengecekan dan proses pesanan.`
  );

  return ok(res, { id_transaksi: id, status: "paid" }, "Transaksi ditandai sudah dibayar");
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

// DELETE oleh USER
exports.deleteTransactionUser = async (req, res) => {
  const { id } = req.params;

  await pool.query(
    `UPDATE transaksi 
     SET deleted_by_user = 1 
     WHERE id_transaksi=? AND id_user=?`,
    [id, req.user.id_user]
  );

  return ok(res, null, "Riwayat berhasil dihapus");
};

// DELETE oleh ADMIN
exports.deleteTransactionAdmin = async (req, res) => {
  const { id } = req.params;

  const [trx] = await pool.query(
    "SELECT * FROM transaksi WHERE id_transaksi=?",
    [id]
  );

  if (!trx.length) return bad(res, "Transaksi tidak ditemukan", 404);

  if (!["selesai", "cancelled"].includes(trx[0].status)) {
    return bad(res, "Hanya transaksi selesai atau dibatalkan yang bisa dihapus");
  }

  await pool.query(
    `UPDATE transaksi 
     SET deleted_by_admin = 1 
     WHERE id_transaksi=?`,
    [id]
  );

  return ok(res, null, "Transaksi berhasil dihapus dari admin panel");
};