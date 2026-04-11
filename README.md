# Backend API untuk aplikasi DimsumWrap digunakan untuk mengelola autentikasi, produk, keranjang, transaksi, dan notifikasi.

- Base URL: https://dimsumwrap3d.berkahost.biz.id/
- Authentication
  Semua endpoint protected menggunakan JWT (JSON Web Token). Yang dimana wajib menggunakan header berikut:
  Authorization : Bearer <token>
- Login Admin menggunakan
  ``` bash
  {
    "email": "dimsumadmin@gmail.com",
    "password": "dimcumenak"
  }

---

## 1. AUTH (Admin & User)
- Register (User)
  ``` bash
     POST /api/auth/register
     {
      "nama": "User",
      "email": "user@mail.com",
      "password": "123456"
     }

- Login (Admin & User)
  ``` bash
     POST /api/auth/login
     {
      "email": "abc@gmail.com"
      "password": "123456"
     }
     
 - Get Profile
   ``` bash
     GET /api/auth/me (Protected)
     Header:
     Authorization: Bearer <token>
     
  - Update Profile
    ``` bash
     PUT /api/auth/me (Protected)
     User: nama, email, password, gambar_profile, no_hp, alamat
     Admin: password saja
---

## 2. PRODUCTS
   - Get All Products
     ``` bash
     GET /api/products

   - Get Detail Product
     ``` bash
     GET /api/products/{id}

---

## 3. ADMIN PRODUCTS (CRUD)
   ### Role: Admin
   - Create Product
     ``` bash
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
     ``` bash
     PUT /api/admin/products/{id}

   - Delete Product
     ``` bash
     DELETE /api/admin/products/{id}

## 4. CART
   ### Role: User
   - Get Cart
     ``` bash
     GET /api/cart

   - Add to Cart
     ``` bash
     POST /api/cart/add
     {
      "id_produk": 2,
      "jumlah": 1,
      "varian": "Hexagon",
      "layanan": "Desain Packaging",
      "metode_pembayaran": "E-Wallet"
     }

   - Update Cart Item
     ``` bash
     PUT /api/cart/item/{idKeranjang}

   - Delete Cart Item
     ``` bash
     DELETE /api/cart/item/{idKeranjang}

   - Checkout
     ``` bash
     POST /api/cart/checkout
     {
      "email_penerima": "penerima@mail.com",
      "alamat": "alamat lengkap",
      "metode_pembayaran": "E-Wallet"
     }

## 5. TRANSACTIONS
   ### Role: User
   - Get Transactions
     ``` bash
     GET /api/transactions

   - Get Transactions Detail
     ``` bash
     GET /api/transactions/{id}

## 6. ADMIN TRANSACTIONS
   ### Role: Admin
   - Get All Transactions
     ``` bash
     GET /api/admin/transactions

   - Get Detail Transactions
     ``` bash
     GET /api/admin/transactions/{id}

   - Update Status
     ``` bash
     PUT /api/admin/transactions/{id}/status
     {
       "status": "pending"
     }
     
     status yang tersedia: pending, paid, dikirim, selesai, cancelled

## 7. NOTIFICATIONS
   - Get Notifications
     ``` bash
     GET /api/notifications

   - Mark as Read
     ``` bash
     PUT /api/notifications/{id}/read
