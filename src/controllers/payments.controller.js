const pool = require("../config/db");
const { notifyAdmin, notifyUser } = require("../services/notif.service");

// ambil ID transaksi dari teks pesan (contoh: ORDER#14)
function extractTransactionId(payload) {
  const text =
    payload?.supporter_message ||
    payload?.message ||
    payload?.notes ||
    payload?.data?.supporter_message ||
    payload?.data?.message ||
    "";

  const m = String(text).match(/ORDER#(\d+)/i);
  return m ? Number(m[1]) : null;
}

exports.trakteerWebhook = async (req, res) => {
  try {
    // 1) verifikasi token dari Trakteer
    // biasanya token dikirim lewat header atau query, paling gampang: pakai query
    // contoh URL: /api/payments/trakteer/webhook?token=xxxxx
    const token = req.query.token;
    if (!token || token !== process.env.TRAKTEER_WEBHOOK_TOKEN) {
      return res.status(401).json({ success: false, message: "Invalid webhook token" });
    }

    const payload = req.body;

    // 2) NOTE: struktur payload test Trakteer bisa beda.
    // sementara kita tidak ngeblok berdasarkan status dulu.
    // Nanti setelah kamu kirim payload aslinya, kita bikin validasi status sukses.

    // 3) cari transaksi id dari pesan
    const id_transaksi = extractTransactionId(payload);
    if (!id_transaksi) {
      // biar webhook tidak retry terus, balikin 200 tapi log
      console.log("[TrakteerWebhook] Tidak menemukan ORDER#ID. Payload:", payload);
      return res.status(200).json({ success: true, message: "No ORDER id found" });
    }

    // 4) update transaksi
    const [trxRows] = await pool.query(
      "SELECT * FROM transaksi WHERE id_transaksi=?",
      [id_transaksi]
    );
    if (!trxRows.length) {
      console.log("[TrakteerWebhook] Transaksi tidak ditemukan:", id_transaksi);
      return res.status(200).json({ success: true, message: "Transaction not found" });
    }

    const trx = trxRows[0];

    // hanya update jika masih pending
    if (trx.status !== "pending") {
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    await pool.query(
      "UPDATE transaksi SET status='paid' WHERE id_transaksi=?",
      [id_transaksi]
    );

    await notifyUser(
      trx.id_user,
      "success",
      "Pembayaran berhasil",
      `Pembayaran untuk transaksi #${id_transaksi} berhasil diverifikasi. Pesanan akan diproses admin.`
    );

    await notifyAdmin(
      "success",
      "Pembayaran masuk",
      `Webhook Trakteer: pembayaran masuk untuk transaksi #${id_transaksi}.`
    );

    return res.status(200).json({ success: true, message: "OK" });
  } catch (e) {
    console.error("[TrakteerWebhook] Error:", e);
    return res.status(500).json({ success: false, message: "Webhook error" });
  }
};