Backend API untuk aplikasi DimsumWrap digunakan untuk mengelola autentikasi, produk, keranjang, transaksi, dan notifikasi.

- Base URL: https://dimsumwrap3d.berkahost.biz.id/
- Authentication
  Semua endpoint protected menggunakan JWT (JSON Web Token). Yang dimana wajib menggunakan header berikut:
  Authorization : Bearer <token>

1. AUTH (Admin & User)
   - Register (User)
     POST /api/auth/register
     {
      "nama": "User",
      "email": "user@mail.com",
      "password": "123456"
     }
     
   - Login (Admin & User)
     POST /api/auth/login
     {
      "email": "abc@gmail.com"
      "password": "123456"
     }
     
   - Get Profile
     GET /api/auth/me (Protected)
     Header:
     Authorization: Bearer <token>
     
   - Update Profile
     PUT /api/auth/me (Protected)
     User: nama, email, password, gambar_profile, no_hp, alamat
     Admin: password saja

2. PRODUCTS
   - Get All Products
     GET /api/products

   - Get Detail Product
     GET /api/products/{id}

3. ADMIN PRODUCTS (CRUD)
   Role: Admin
   - Create Product
     POST /api/admin/products
     {
      "nama_produk": "Dimsum Ayam",
      "subjudul": "Enak",
      "deskripsi": "Desc",
      "harga": 15000,
      "stok": 10,
      "label": "new",
      "rating": 5,
      "satuan": "Box",
      "gambar_produk": "text/url"
     }
     gambar_produk ambil dari file explorer langsung
     
   - Update Product
     PUT /api/admin/products/{id}

   - Delete Product
     DELETE /api/admin/products/{id}

4. CART
   Role: User
   - Get Cart
     GET /api/cart

   - Add to Cart
     POST /api/cart/add
     {
      "id_produk": 2,
      "jumlah": 1,
      "varian": "Hexagon",
      "layanan": "Desain Packaging",
      "metode_pembayaran": "E-Wallet"
     }

   - Update Cart Item
     PUT /api/cart/item/{idKeranjang}

   - Delete Cart Item
     DELETE /api/cart/item/{idKeranjang}

   - Checkout
     POST /api/cart/checkout
     {
      "email_penerima": "penerima@mail.com",
      "alamat": "alamat lengkap",
      "metode_pembayaran": "E-Wallet"
     }

5. TRANSACTIONS
   Role: User
   - Get Transactions
     GET /api/transactions

   - Get Transactions Detail
     GET /api/transactions/{id}

6. ADMIN TRANSACTIONS
   Role: Admin
   - Get All Transactions
     GET /api/admin/transactions

   - Get Detail Transactions
     GET /api/admin/transactions/{id}

   - Update Status
     PUT /api/admin/transactions/{id}/status
     {
       "status": "pending"
     }
     status yang tersedia: pending, paid, dikirim, selesai, cancelled

7. NOTIFICATIONS
   - Get Notifications
     GET /api/notifications

   - Mark as Read
     PUT /api/notifications/{id}/read
