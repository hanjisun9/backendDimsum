const pool = require("../config/db");
const { ok, created, bad } = require("../utils/response");
const { notifyAdmin } = require("../services/notif.service");
const ALLOWED_VARIAN = ["hexagon", "custom"];
const ALLOWED_LAYANAN = ["Desain Packaging", "Cetak Desain"];

// GET /api/cart
exports.getCart = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT 
        k.id_keranjang, k.id_user, k.id_produk, k.jumlah,
        k.varian, k.layanan, k.metode_pembayaran,
        k.subtotal_keranjang AS subtotal,
        k.created_at,
        p.nama_produk, p.harga, p.gambar_produk
     FROM keranjang k
     JOIN produk p ON p.id_produk = k.id_produk
     WHERE k.id_user=?
     ORDER BY k.created_at DESC`,
    [req.user.id_user]
  );
  return ok(res, rows, "Keranjang");
};

// POST /api/cart/add
// Body: { id_produk, jumlah, varian, layanan, metode_pembayaran }
exports.addToCart = async (req, res) => {
  const { id_produk, jumlah, varian, layanan, metode_pembayaran } = req.body;

  if (!id_produk || !jumlah) return bad(res, "id_produk & jumlah wajib");

  // validasi varian & layanan agar cocok dengan ENUM di DB
  if (!varian || !ALLOWED_VARIAN.includes(varian)) {
    return bad(res, "varian tidak valid (harus salah satu: " + ALLOWED_VARIAN.join(", ") + ")");
  }

  if (!layanan || !ALLOWED_LAYANAN.includes(layanan)) {
    return bad(res, "layanan tidak valid (harus salah satu: " + ALLOWED_LAYANAN.join(", ") + ")");
  }

  if (metode_pembayaran && !["Debit Bank", "E-Wallet", "COD"].includes(metode_pembayaran)) {
    return bad(res, "metode_pembayaran tidak valid");
  }

  const [prod] = await pool.query(
    "SELECT id_produk, harga, stok FROM produk WHERE id_produk=?",
    [id_produk]
  );
  if (!prod.length) return bad(res, "Produk tidak ditemukan", 404);
  if (prod[0].stok < jumlah) return bad(res, "Stok tidak mencukupi");

  const harga = prod[0].harga;

  // Anggap item "sama" jika id_produk + varian + layanan + metode_pembayaran sama
  const [exists] = await pool.query(
    `SELECT id_keranjang, jumlah
     FROM keranjang
     WHERE id_user=? AND id_produk=?
       AND (varian <=> ?) AND (layanan <=> ?) AND (metode_pembayaran <=> ?)`,
    [req.user.id_user, id_produk, varian, layanan, metode_pembayaran || null]
  );

  if (exists.length) {
    const newJumlah = exists[0].jumlah + Number(jumlah);
    if (prod[0].stok < newJumlah) return bad(res, "Stok tidak mencukupi");

    const subtotal = harga * newJumlah;

    await pool.query(
      `UPDATE keranjang 
       SET jumlah=?, subtotal_keranjang=?
       WHERE id_keranjang=?`,
      [newJumlah, subtotal, exists[0].id_keranjang]
    );

    return ok(res, null, "Keranjang diperbarui");
  }

  const subtotal = harga * Number(jumlah);

  await pool.query(
    `INSERT INTO keranjang 
      (id_user, id_produk, jumlah, subtotal_keranjang, varian, layanan, metode_pembayaran)
     VALUES (?,?,?,?,?,?,?)`,
    [req.user.id_user, id_produk, jumlah, subtotal, varian, layanan, metode_pembayaran || null]
  );

  return created(res, null, "Produk masuk keranjang");
};

// PUT /api/cart/item/:id
exports.updateItem = async (req, res) => {
  const { id } = req.params;
  const { jumlah } = req.body;
  if (!jumlah) return bad(res, "jumlah wajib");

  const [item] = await pool.query(
    "SELECT * FROM keranjang WHERE id_keranjang=? AND id_user=?",
    [id, req.user.id_user]
  );
  if (!item.length) return bad(res, "Item keranjang tidak ditemukan", 404);

  const [prod] = await pool.query(
    "SELECT harga, stok FROM produk WHERE id_produk=?",
    [item[0].id_produk]
  );
  if (!prod.length) return bad(res, "Produk tidak ditemukan", 404);
  if (prod[0].stok < jumlah) return bad(res, "Stok tidak mencukupi");

  const subtotal = prod[0].harga * Number(jumlah);

  await pool.query(
    "UPDATE keranjang SET jumlah=?, subtotal_keranjang=? WHERE id_keranjang=?",
    [jumlah, subtotal, id]
  );

  return ok(res, null, "Item keranjang diperbarui");
};

// DELETE /api/cart/item/:id
exports.removeItem = async (req, res) => {
  const { id } = req.params;
  await pool.query(
    "DELETE FROM keranjang WHERE id_keranjang=? AND id_user=?",
    [id, req.user.id_user]
  );
  return ok(res, null, "Item keranjang dihapus");
};

// POST /api/cart/checkout
// Body: { email_penerima, alamat, metode_pembayaran? }
// metode_pembayaran boleh dikirim dari checkout, atau ambil dari item keranjang (kalau semua sama)
exports.checkout = async (req, res) => {
  let { email_penerima, alamat, metode_pembayaran } = req.body;

  if (!email_penerima || !alamat) {
    return bad(res, "email_penerima dan alamat wajib");
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

    // jika metode_pembayaran tidak dikirim saat checkout, coba ambil dari cart
    if (!metode_pembayaran) {
      const methods = [...new Set(cart.map(i => i.metode_pembayaran).filter(Boolean))];
      if (methods.length === 1) metode_pembayaran = methods[0];
    }

    if (!metode_pembayaran) {
      throw Object.assign(new Error("metode_pembayaran wajib (pilih di cart atau saat checkout)"), { status: 400 });
    }

    if (!["Debit Bank", "E-Wallet", "COD"].includes(metode_pembayaran)) {
      throw Object.assign(new Error("metode_pembayaran tidak valid"), { status: 400 });
    }

    // validasi: kalau cart item punya metode berbeda-beda, tolak (karena transaksi hanya 1 metode)
    const uniq = [...new Set(cart.map(i => i.metode_pembayaran).filter(Boolean))];
    if (uniq.length > 1) {
      throw Object.assign(new Error("Metode pembayaran di keranjang harus sama untuk checkout"), { status: 400 });
    }

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

      // kalau kamu sudah ALTER TABLE detail_transaksi tambah varian+layanan:
      await conn.query(
        `INSERT INTO detail_transaksi (id_transaksi, id_produk, jumlah, subtotal, varian, layanan)
         VALUES (?,?,?,?,?,?)`,
        [id_transaksi, item.id_produk, item.jumlah, subtotal, item.varian || null, item.layanan || null]
      );

      await conn.query(
        `UPDATE produk SET stok = stok - ? WHERE id_produk=?`,
        [item.jumlah, item.id_produk]
      );
    }

    await conn.query("DELETE FROM keranjang WHERE id_user=?", [req.user.id_user]);

    await conn.commit();

    await notifyAdmin("success", "Berhasil", `Pesanan baru telah dibuat (ID Transaksi #${id_transaksi}).`);

    return created(res, { id_transaksi }, "Checkout berhasil, menunggu pembayaran");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};