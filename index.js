const axios = require("axios");
const { app } = require("./firebase");
const fs = require("fs");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} = require("firebase/firestore");
const moment = require("moment-timezone");

// init firestore
const db = getFirestore(app);

// ===== CONFIG TELEGRAM =====
const TELEGRAM_TOKEN = "TELEGRAM_BOT_TOKEN"; // ganti dengan token bot kamu
const CHAT_ID = "TELEGRAM_CHAT_ID"; // ganti dengan chat_id tujuan

// format WIB
function formatDay(date_time) {
  const isoTime = new Date(date_time);
  return moment(isoTime)
    .tz("Asia/Jakarta")
    .format("ddd MMM DD HH:mm:ss [WIB] YYYY");
}

// fungsi kirim pesan via Telegram
const sendMessages = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML",
    });
    console.log("✅ Pesan berhasil dikirim ke Telegram!");
  } catch (err) {
    console.error("❌ Gagal kirim Telegram:", err.message);
  }
};

// ambil data gempa BMKG
const getData = async () => {
  try {
    // Ambil data BMKG
    const res = await axios.get(
      "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
      { headers: { "Content-Type": "application/json" }, family: 4 }
    );

    const data = res.data.Infogempa.gempa;
    const gempaTerbaru = data.reduce((latest, current) => {
      return new Date(current.DateTime) > new Date(latest.DateTime) ? current : latest;
    });

    // Ambil data terakhir dari Firestore
    const docRef = doc(db, "gempa", "latest");
    const docSnap = await getDoc(docRef);

    let message = '';

    if (!docSnap.exists()) {
      // Data pertama kali
      await setDoc(docRef, gempaTerbaru);
      console.log("🆕 Data pertama kali disimpan ke Firebase:", gempaTerbaru.DateTime);

      message = `⚠️ 
=== BMKG Earthquake Report ${formatDay(gempaTerbaru.DateTime)} ===
Tanggal : ${gempaTerbaru.Tanggal}
Jam : ${gempaTerbaru.Jam}
Magnitudo : ${gempaTerbaru.Magnitude}
Lokasi : ${gempaTerbaru.Dirasakan}
Koordinat : https://www.google.com/maps?q=${gempaTerbaru.Coordinates}
Kedalaman : ${gempaTerbaru.Kedalaman}
Dirasakan : ${gempaTerbaru.Dirasakan}`;

      console.log(message);
      await sendMessages(message);

    } else {
      const lastDateTime = docSnap.data().DateTime;

      if (gempaTerbaru.DateTime > lastDateTime) {
        await setDoc(docRef, gempaTerbaru);
        console.log("🆕 Data terbaru disimpan ke Firebase:", gempaTerbaru.DateTime);

        message = `⚠️ 
=== BMKG Earthquake Report ${formatDay(gempaTerbaru.DateTime)} ===
Tanggal : ${gempaTerbaru.Tanggal}
Jam : ${gempaTerbaru.Jam}
Magnitudo : ${gempaTerbaru.Magnitude}
Lokasi : ${gempaTerbaru.Dirasakan}
Koordinat : https://www.google.com/maps?q=${gempaTerbaru.Coordinates}
Kedalaman : ${gempaTerbaru.Kedalaman}
Dirasakan : ${gempaTerbaru.Dirasakan}`;

        console.log(message);
        await sendMessages(message);

      } else {
        message = `ℹ️ Tidak ada data gempa baru.
=== BMKG Earthquake Report ${formatDay(gempaTerbaru.DateTime)} ===
Tanggal : ${gempaTerbaru.Tanggal}
Jam : ${gempaTerbaru.Jam}
Magnitudo : ${gempaTerbaru.Magnitude}
Lokasi : ${gempaTerbaru.Dirasakan}
Koordinat : https://www.google.com/maps?q=${gempaTerbaru.Coordinates}
Kedalaman : ${gempaTerbaru.Kedalaman}
Dirasakan : ${gempaTerbaru.Dirasakan}`;

        await sendMessages(message);
        console.log(message);
      }
    }

    // Simpan di file log
    const file_name = 'earthquake.log';
    if (!fs.existsSync(file_name)) {
      fs.writeFileSync(file_name, message + '\n', { encoding: 'utf-8' });
    } else {
      fs.appendFileSync(file_name, message + '\n', { encoding: 'utf-8' });
    }

  } catch (err) {
    console.error("❌ Gagal ambil data BMKG:", err.message);
  }
};

// Jalankan program
getData().then(() => {
  console.log("✅ Program selesai.");
  process.exit(0);
});
