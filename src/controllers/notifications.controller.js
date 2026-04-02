const pool = require("../config/db");
const { ok, bad } = require("../utils/response");

exports.list = async (req, res) => {
  let rows;
  if (req.user.role === "admin") {
    [rows] = await pool.query(
      `SELECT * FROM notifikasi
       WHERE role_target='admin'
       ORDER BY created_at DESC
       LIMIT 50`
    );
  } else {
    [rows] = await pool.query(
      `SELECT * FROM notifikasi
       WHERE role_target='user' AND id_user=?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id_user]
    );
  }
  return ok(res, rows, "Notifikasi");
};

exports.markRead = async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query("SELECT * FROM notifikasi WHERE id_notifikasi=?", [id]);
  if (!rows.length) return bad(res, "Notifikasi tidak ditemukan", 404);

  const notif = rows[0];
  if (req.user.role === "user" && notif.id_user !== req.user.id_user) {
    return bad(res, "Forbidden", 403);
  }
  if (req.user.role === "admin" && notif.role_target !== "admin") {
    return bad(res, "Forbidden", 403);
  }

  await pool.query("UPDATE notifikasi SET is_read=1 WHERE id_notifikasi=?", [id]);
  return ok(res, null, "Notifikasi dibaca");
};