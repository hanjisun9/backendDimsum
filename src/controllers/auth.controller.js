const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ok, created, bad } = require("../utils/response");

function signToken(user) {
  return jwt.sign(
    { id_user: user.id_user, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

exports.register = async (req, res) => {
  const { nama, email, password } = req.body;
  if (!nama || !email || !password) return bad(res, "nama, email, password wajib diisi");

  const [exists] = await pool.query("SELECT id_user FROM users WHERE email=?", [email]);
  if (exists.length) return bad(res, "Email sudah terdaftar");

  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    "INSERT INTO users (nama, email, password, role) VALUES (?,?,?, 'user')",
    [nama, email, hashed]
  );

  const [rows] = await pool.query(
    "SELECT id_user, nama, email, no_hp, alamat, role, gambar_profile FROM users WHERE id_user=?",
    [result.insertId]
  );

  const token = signToken(rows[0]);
  return created(res, { token, user: rows[0] }, "Register berhasil");
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return bad(res, "email & password wajib");

  const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
  if (!rows.length) return bad(res, "Email atau password salah", 401);

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return bad(res, "Email atau password salah", 401);

  const token = signToken(user);
  return ok(res, {
    token,
    user: {
      id_user: user.id_user,
      nama: user.nama,
      email: user.email,
      role: user.role,
      gambar_profile: user.gambar_profile
    }
  }, "Login berhasil");
};

exports.me = async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id_user, nama, email, no_hp, alamat, role, gambar_profile FROM users WHERE id_user=?",
    [req.user.id_user]
  );
  return ok(res, rows[0], "Profile");
};

exports.updateMe = async (req, res) => {
  const { nama, email, password, gambar_profile, no_hp, alamat } = req.body;
  if (req.user.role === "admin") {
    if (!password)
      return bad(res, "Admin hanya boleh mengubah password (field password wajib)");
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password=? WHERE id_user=?", [
      hashed,
      req.user.id_user,
    ]);
    return ok(res, null, "Password admin berhasil diubah");
  }
  if (email) {
    const [exists] = await pool.query(
      "SELECT id_user FROM users WHERE email=? AND id_user<>?",
      [email, req.user.id_user]
    );
    if (exists.length) return bad(res, "Email sudah digunakan");
  }

  let hashed = null;
  if (password) hashed = await bcrypt.hash(password, 10);

  let gambarProfileValue = null;
  if (req.file) {
    gambarProfileValue = `/uploads/profiles/${req.file.filename}`;
  } else if (gambar_profile) {
    gambarProfileValue = gambar_profile;
  }

  await pool.query(
    `UPDATE users SET
      nama = COALESCE(?, nama),
      email = COALESCE(?, email),
      password = COALESCE(?, password),
      gambar_profile = COALESCE(?, gambar_profile),
      no_hp = COALESCE(?, no_hp),
      alamat = COALESCE(?, alamat)
     WHERE id_user=?`,
    [
      nama || null,
      email || null,
      hashed || null,
      gambarProfileValue || null,
      no_hp || null,
      alamat || null,
      req.user.id_user,
    ]
  );

  const [rows] = await pool.query(
    "SELECT id_user, nama, email, no_hp, alamat, role, gambar_profile FROM users WHERE id_user=?",
    [req.user.id_user]
  );

  return ok(res, rows[0], "Profile user berhasil diubah");
};