require("dotenv").config();
const pool = require("../src/config/db");
const bcrypt = require("bcryptjs");

(async () => {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    const nama = process.argv[4] || "Admin";

    if (!email || !password) {
      console.log("Cara pakai: npm run create-admin -- admin@mail.com passwordku \"Nama Admin\"");
      process.exit(1);
    }

    const [exists] = await pool.query("SELECT id_user FROM users WHERE email=?", [email]);
    if (exists.length) {
      console.log("Admin sudah ada dengan email itu.");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (nama, email, password, role) VALUES (?,?,?, 'admin')",
      [nama, email, hashed]
    );

    console.log("Admin berhasil dibuat:", email);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();