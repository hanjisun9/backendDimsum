const PDFDocument = require("pdfkit");

function rupiah(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n || 0);
}

function buildReceiptPDF(trx, items) {
  const doc = new PDFDocument({ margin: 40 });

  doc.fontSize(16).text("STRUK PEMBAYARAN", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Status: PEMBAYARAN BERHASIL`);
  doc.text(`ID Transaksi: #${trx.id_transaksi}`);
  doc.text(`Nama: ${trx.nama}`);
  doc.text(`Email: ${trx.email}`);
  doc.text(`Metode: ${trx.metode_pembayaran}`);
  doc.text(`Tanggal: ${new Date(trx.tanggal).toLocaleString("id-ID")}`);
  doc.moveDown();

  doc.fontSize(12).text("Items:");
  doc.moveDown(0.3);

  items.forEach((it) => {
    doc.fontSize(10).text(
      `${it.nama_produk}  x${it.jumlah}  @${rupiah(it.harga)}   = ${rupiah(it.subtotal)}`
    );
  });

  doc.moveDown();
  doc.fontSize(12).text(`TOTAL: ${rupiah(trx.total_harga)}`, { align: "right" });

  doc.moveDown(2);
  doc.fontSize(10).text("Terima kasih. Pembayaran berhasil.", { align: "center" });

  return doc;
}

module.exports = { buildReceiptPDF };