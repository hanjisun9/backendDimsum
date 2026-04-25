const PDFDocument = require("pdfkit");

// helper format rupiah
function rupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

/**
 * trx  : objek transaksi (id_transaksi, tanggal, metode_pembayaran, total_harga, status, nama, email)
 * items: array item (nama_produk, harga, jumlah, subtotal, varian?, layanan?)
 */
function buildReceiptPDF(trx, items) {
  const doc = new PDFDocument({ size: "A6", margin: 18 });

  // ===== HEADER =====
  doc.fontSize(14).font("Helvetica-Bold").text("FEAST DIMSUM", {
    align: "center",
  });

  doc
    .moveDown(0.2)
    .fontSize(9)
    .font("Helvetica")
    .text("Kemasan Dimsum Kreatif & Premium", { align: "center" });

  doc.moveDown(0.6);

  const garisTebal = "==============================";
  const garisTipis = "------------------------------";

  doc.fontSize(9).text(garisTebal, { align: "center" });
  doc.font("Helvetica-Bold").fontSize(10).text("STRUK PEMESANAN", {
    align: "center",
  });
  doc.font("Helvetica").fontSize(9).text(garisTebal, { align: "center" });
  doc.moveDown(0.5);

  // ===== INFO TRANSAKSI =====
  const noTransaksi = String(trx.id_transaksi).padStart(6, "0");
  const tanggal = trx.tanggal
    ? new Date(trx.tanggal).toLocaleString("id-ID")
    : "-";

  doc.fontSize(9).text(`No. Transaksi : ${noTransaksi}`);
  doc.text(`Tanggal      : ${tanggal}`);
  doc.text(`Metode Bayar : ${trx.metode_pembayaran || "-"}`);
  doc.text(`Atas Nama    : ${trx.nama || "-"}`);
  doc.text(`Email        : ${trx.email || "-"}`);

  doc.moveDown(0.5);
  doc.fontSize(9).text(garisTipis, { align: "center" });

  // ===== DETAIL PRODUK =====
  doc.moveDown(0.3).font("Helvetica-Bold").fontSize(10).text("DETAIL PESANAN", {
    align: "center",
  });

  doc.font("Helvetica").fontSize(9).moveDown(0.3);

  if (!items || !items.length) {
    doc.text("Tidak ada item.", { align: "center" });
  } else {
    items.forEach((it, idx) => {
      doc.text(`${idx + 1}. ${it.nama_produk || "Produk"}`);
      if (it.varian) doc.text(`   Varian  : ${it.varian}`);
      if (it.layanan) doc.text(`   Layanan : ${it.layanan}`);
      doc.text(
        `   ${it.jumlah} x ${rupiah(it.harga)} = ${rupiah(it.subtotal)}`
      );
      doc.moveDown(0.2);
    });
  }

  doc.moveDown(0.3);
  doc.fontSize(9).text(garisTipis, { align: "center" });

  // ===== TOTAL =====
  const total = rupiah(trx.total_harga);

  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(11).text(`TOTAL BAYAR : ${total}`, {
    align: "center",
  });

  let statusText = "STATUS : PEMBAYARAN BERHASIL";
  if (trx.status === "selesai") statusText = "STATUS : PESANAN SELESAI";
  else if (trx.status === "dikirim") statusText = "STATUS : PESANAN DIKIRIM";
  else if (trx.status === "paid") statusText = "STATUS : PEMBAYARAN DITERIMA";

  doc
    .moveDown(0.2)
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .text(statusText, { align: "center" });

  doc.font("Helvetica").fontSize(9).text(garisTebal, { align: "center" });
  doc.moveDown(0.5);

  // ===== FOOTER =====
  doc.font("Helvetica").fontSize(9).text("Terima kasih telah memesan di", {
    align: "center",
  });
  doc.font("Helvetica-Bold").text("FEAST DIMSUM", { align: "center" });

  doc
    .moveDown(0.2)
    .font("Helvetica")
    .fontSize(8)
    .text("Simpan struk ini sebagai bukti pemesanan.", {
      align: "center",
    });

  doc.moveDown(0.5);
  const printedAt = new Date().toLocaleString("id-ID");
  doc.fontSize(8).text(`Dicetak: ${printedAt}`, { align: "center" });

  return doc;
}

module.exports = { buildReceiptPDF };