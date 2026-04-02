const pool = require("../config/db");

async function notifyAdmin(tipe, judul, pesan) {
  await pool.query(
    `INSERT INTO notifikasi (role_target, id_user, tipe, judul, pesan)
     VALUES ('admin', NULL, ?, ?, ?)`,
    [tipe, judul, pesan]
  );
}

async function notifyUser(id_user, tipe, judul, pesan) {
  await pool.query(
    `INSERT INTO notifikasi (role_target, id_user, tipe, judul, pesan)
     VALUES ('user', ?, ?, ?, ?)`,
    [id_user, tipe, judul, pesan]
  );
}

module.exports = { notifyAdmin, notifyUser };