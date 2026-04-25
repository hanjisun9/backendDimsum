const cron = require("node-cron");
const pool = require("../config/db");
const { notifyAdmin, notifyUser } = require("../services/notif.service");

async function autoCancel() {
  // cancel transaksi pending yang lebih dari 24 jam
  const [rows] = await pool.query(
    `SELECT * FROM transaksi
     WHERE status='pending'
       AND tanggal < (NOW() - INTERVAL 24 HOUR)`
  );

  for (const trx of rows) {
    await pool.query("UPDATE transaksi SET status='cancelled' WHERE id_transaksi=?", [trx.id_transaksi]);

    await notifyUser(
      trx.id_user,
      "warning",
      "Peringatan",
      "Silakan lakukan pembayaran dalam waktu 24 jam. Pesanan Anda telah dibatalkan otomatis."
    );

    await notifyAdmin(
      "error",
      "Gagal",
      `Pesanan transaksi #${trx.id_transaksi} dibatalkan otomatis (tidak dibayar 24 jam).`
    );
  }
}

function startAutoCancelJob() {
  // setiap 1 menit cek
  cron.schedule("* * * * *", async () => {
    try {
      await autoCancel();
    } catch (e) {
      console.error("AutoCancel job error:", e.message);
    }
  });
  console.log("AutoCancel job started (runs every minute).");
}

module.exports = { startAutoCancelJob };