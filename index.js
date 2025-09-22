const axios = require("axios");
const qrcode = require("qrcode-terminal");
const { app } = require("./firebase");
const path = require('path')
const fs = require('fs')
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} = require("firebase/firestore");
const { Client, LocalAuth } = require("whatsapp-web.js");
const moment = require("moment-timezone");

// init firestore
const db = getFirestore(app);

// Inisialisasi WhatsApp client dengan LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "bmkg-bot" }), // folder .wwebjs_auth
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// QR hanya muncul jika session belum ada
client.on("qr", (qr) => {
  console.log("🔑 Scan QR berikut (hanya 1x, setelah itu auto login):");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("✅ WhatsApp client siap!");
  await getData();
  console.log("✅ Program selesai.");
  await client.destroy(); 
  process.exit(0); // biar script berhenti, Jenkins bisa panggil lagi
});

client.initialize();

// format WIB
function formatDay(date_time) {
  const isoTime = new Date(date_time);
  return moment(isoTime)
    .tz("Asia/Jakarta")
    .format("ddd MMM DD HH:mm:ss [WIB] YYYY");
}


// fungsi kirim pesan
const sendMessage = (message, no) => {
  const nomor = `${no}@c.us`; // format internasional
  return client.sendMessage(nomor, message);
};

// ambil data gempa BMKG
const getData = async () => {
  try {
    // Ambil data BMKG
    const res = await axios.get(
      "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
      { headers: { "Content-Type": "application/json" } }
    );

    const data = res.data.Infogempa.gempa;
    const gempaTerbaru = data.reduce((latest, current) => {
      return new Date(current.DateTime) > new Date(latest.DateTime) ? current : latest;
    }); // data terbaru ada di index 0

    // Ambil data terakhir dari Firestore
    const docRef = doc(db, "gempa", "latest");
    const docSnap = await getDoc(docRef);
    let message = ''
    if (!docSnap.exists()) {
      // Jika belum ada data di Firestore → simpan data terbaru dari BMKG
      await setDoc(docRef, gempaTerbaru);

      console.log("🆕 Data pertama kali disimpan ke Firebase:", gempaTerbaru.DateTime);

      // Kirim pesan juga
      message = `⚠️ 
    === BMKG Earthquake Report ${formatDay(gempaTerbaru.DateTime)} ===
    Tanggal : ${gempaTerbaru.Tanggal}
    Jam : ${gempaTerbaru.Jam}
    Magnitudo : ${gempaTerbaru.Magnitude}
    Lokasi : ${gempaTerbaru.Dirasakan}
    Koordinat : https://www.google.com/maps?q=${gempaTerbaru.Coordinates}
    Kedalaman : ${gempaTerbaru.Kedalaman}
    Dirasakan : ${gempaTerbaru.Dirasakan}`;

      console.log(message)
      await sendMessage(message, "6282187199940");
      console.log("✅ Pesan pertama kali dikirim ke WhatsApp");
    } else {
      // Jika sudah ada data → bandingkan DateTime
      const lastDateTime = docSnap.data().DateTime;

      if (gempaTerbaru.DateTime > lastDateTime) {
        await setDoc(docRef, gempaTerbaru);

        console.log("🆕 Data terbaru disimpan ke Firebase:", gempaTerbaru.DateTime);

        message = `
    === BMKG Earthquake Report ${formatDay(gempaTerbaru.DateTime)} ===
    Tanggal : ${gempaTerbaru.Tanggal}
    Jam : ${gempaTerbaru.Jam}
    Magnitudo : ${gempaTerbaru.Magnitude}
    Lokasi : ${gempaTerbaru.Dirasakan}
    Koordinat : https://www.google.com/maps?q=${gempaTerbaru.Coordinates}
    Kedalaman : ${gempaTerbaru.Kedalaman}
    Dirasakan : ${gempaTerbaru.Dirasakan}`;

        console.log(message)

        await sendMessage(message, "6282187199940");
        console.log("✅ Pesan update dikirim ke WhatsApp");
      } else {
        message = `
=== BMKG Earthquake Report ${formatDay(gempaTerbaru.DateTime)} ===
Tanggal : ${gempaTerbaru.Tanggal}
Jam : ${gempaTerbaru.Jam}
Magnitudo : ${gempaTerbaru.Magnitude}
Lokasi : ${gempaTerbaru.Dirasakan}
Koordinat : https://www.google.com/maps?q=${gempaTerbaru.Coordinates}
Kedalaman : ${gempaTerbaru.Kedalaman}
Dirasakan : ${gempaTerbaru.Dirasakan} 

`;
        console.log("ℹ️ Tidak ada data gempa baru. Tidak kirim pesan.");
        console.log(message)
      }
    }

    // Simpan di file
    let file_name = 'earthquake.log'
    if(!fs.existsSync(file_name)){
      console.log('belum ada');
      fs.writeFileSync(file_name, message + '\n', {
        encoding: 'utf-8'
      })
    }else {
      fs.appendFileSync(file_name, message + '\n', {
        encoding: 'utf-8'
      })
    }

  } catch (err) {
    console.error("❌ Gagal ambil data BMKG:", err.message);
  }
};
