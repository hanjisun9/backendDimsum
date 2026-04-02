const pool = require("../config/db");
const { ok, created, bad } = require("../utils/response");
const { notifyAdmin } = require("../services/notif.service");

exports.getCart = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT k.*, p.nama_produk, p.harga, p.gambar_produk
     FROM keranjang k
     JOIN produk p ON p.id_produk = k.id_produk
     WHERE k.id_user=?
     ORDER BY k.created_at DESC`,
    [req.user.id_user]
  );
  return ok(res, rows, "Keranjang");
};

exports.addToCart = async (req, res) => {
  const { id_produk, jumlah } = req.body;
  if (!id_produk || !jumlah) return bad(res, "id_produk & jumlah wajib");

  const [prod] = await pool.query("SELECT id_produk, harga, stok FROM produk WHERE id_produk=?", [id_produk]);
  if (!prod.length) return bad(res, "Produk tidak ditemukan", 404);
  if (prod[0].stok < jumlah) return bad(res, "Stok tidak mencukupi");

  const [exists] = await pool.query(
    "SELECT id_keranjang, jumlah FROM keranjang WHERE id_user=? AND id_produk=?",
    [req.user.id_user, id_produk]
  );

  const harga = prod[0].harga;

  if (exists.length) {
    const newJumlah = exists[0].jumlah + jumlah;
    if (prod[0].stok < newJumlah) return bad(res, "Stok tidak mencukupi");
    const subtotal = harga * newJumlah;
    await pool.query(
      "UPDATE keranjang SET jumlah=?, subtotal_keranjang=? WHERE id_keranjang=?",
      [newJumlah, subtotal, exists[0].id_keranjang]
    );
    return ok(res, null, "Keranjang diperbarui");
  }

  const subtotal = harga * jumlah;
  await pool.query(
    "INSERT INTO keranjang (id_user, id_produk, jumlah, subtotal_keranjang) VALUES (?,?,?,?)",
    [req.user.id_user, id_produk, jumlah, subtotal]
  );

  return created(res, null, "Produk masuk keranjang");
};

exports.updateItem = async (req, res) => {
  const { id } = req.params; // id_keranjang
  const { jumlah } = req.body;
  if (!jumlah) return bad(res, "jumlah wajib");

  const [item] = await pool.query(
    "SELECT * FROM keranjang WHERE id_keranjang=? AND id_user=?",
    [id, req.user.id_user]
  );
  if (!item.length) return bad(res, "Item keranjang tidak ditemukan", 404);

  const [prod] = await pool.query("SELECT harga, stok FROM produk WHERE id_produk=?", [item[0].id_produk]);
  if (!prod.length) return bad(res, "Produk tidak ditemukan", 404);
  if (prod[0].stok < jumlah) return bad(res, "Stok tidak mencukupi");

  const subtotal = prod[0].harga * jumlah;
  await pool.query(
    "UPDATE keranjang SET jumlah=?, subtotal_keranjang=? WHERE id_keranjang=?",
    [jumlah, subtotal, id]
  );

  return ok(res, null, "Item keranjang diperbarui");
};

exports.removeItem = async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM keranjang WHERE id_keranjang=? AND id_user=?", [id, req.user.id_user]);
  return ok(res, null, "Item keranjang dihapus");
};

exports.checkout = async (req, res) => {
  const { email_penerima, alamat, metode_pembayaran } = req.body;
  if (!email_penerima || !alamat || !metode_pembayaran) {
    return bad(res, "email_penerima, alamat, metode_pembayaran wajib");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [cart] = await conn.query(
      `SELECT k.*, p.harga, p.stok
       FROM keranjang k
       JOIN produk p ON p.id_produk=k.id_produk
       WHERE k.id_user=?`,
      [req.user.id_user]
    );
    if (!cart.length) throw Object.assign(new Error("Keranjang kosong"), { status: 400 });

    // cek stok
    for (const item of cart) {
      if (item.stok < item.jumlah) {
        throw Object.assign(new Error(`Stok tidak cukup untuk produk id ${item.id_produk}`), { status: 400 });
      }
    }

    const total_harga = cart.reduce((sum, it) => sum + (it.harga * it.jumlah), 0);

    const [trxRes] = await conn.query(
      `INSERT INTO transaksi (id_user, email_penerima, alamat, total_harga, status, metode_pembayaran)
       VALUES (?,?,?,?, 'pending', ?)`,
      [req.user.id_user, email_penerima, alamat, total_harga, metode_pembayaran]
    );
    const id_transaksi = trxRes.insertId;

    for (const item of cart) {
      const subtotal = item.harga * item.jumlah;
      await conn.query(
        `INSERT INTO detail_transaksi (id_transaksi, id_produk, jumlah, subtotal)
         VALUES (?,?,?,?)`,
        [id_transaksi, item.id_produk, item.jumlah, subtotal]
      );

      await conn.query(
        `UPDATE produk SET stok = stok - ? WHERE id_produk=?`,
        [item.jumlah, item.id_produk]
      );
    }

    await conn.query("DELETE FROM keranjang WHERE id_user=?", [req.user.id_user]);

    await conn.commit();

    // notif admin: pesanan baru
    await notifyAdmin("success", "Berhasil", `Pesanan baru telah dibuat (ID Transaksi #${id_transaksi}).`);

    return created(res, { id_transaksi }, "Checkout berhasil, menunggu pembayaran");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};