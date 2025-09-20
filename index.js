const axios = require("axios");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

// Inisialisasi WhatsApp client dengan LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "bmkg-bot" }) // folder .wwebjs_auth
});

// QR hanya muncul sekali saat pertama kali login
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("✅ WhatsApp client siap!");

  await getData();

  console.log("✅ Selesai kirim pesan, keluar program.");
  process.exit(0); // biar script berhenti, Jenkins bisa panggil lagi
});

client.initialize();

// fungsi bantu cek apakah hari ini
function isToday(dateStr) {
  const d = new Date(dateStr);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return d >= start && d <= end;
}

// fungsi kirim pesan
const sendMessage = (message, no) => {
  const nomor = `${no}@c.us`; // format internasional
  return client.sendMessage(nomor, message);
};

// ambil data gempa BMKG
const getData = async () => {
  try {
    const res = await axios.get(
      "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
      { headers: { "Content-Type": "application/json" } }
    );

    const data = res.data.Infogempa.gempa;
    const hasil = data.slice(0, 5);

    for (const gempa of hasil) {
      let message = "";

      if (isToday(gempa.DateTime)) {
        message = `⚠️ Hari ini ada gempa!
1. Lokasi: ${gempa.Dirasakan}
2. Tanggal: ${gempa.Tanggal}
3. Jam: ${gempa.Jam}
4. Magnitudo: ${gempa.Magnitude}
5. Koordinat: https://www.google.com/maps?q=${gempa.Coordinates}`;
      } else {
        message = `📅 Gempa terdeteksi:
1. Lokasi: ${gempa.Dirasakan}
2. Tanggal: ${gempa.Tanggal}
3. Jam: ${gempa.Jam}
4. Magnitudo: ${gempa.Magnitude}
5. Koordinat: https://www.google.com/maps?q=${gempa.Coordinates}`;
      }

      await sendMessage(message, "6282187199940"); // ganti nomor WA
    }
  } catch (err) {
    console.error("❌ Gagal ambil data BMKG:", err.message);
  }
};
