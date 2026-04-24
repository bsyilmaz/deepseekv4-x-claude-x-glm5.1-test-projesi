# Study Buddy — Sanal Devre Simülatörü

**XIAO ESP32-S3** tabanlı fiziksel bir Pomodoro + çalışma asistanı cihazının tarayıcıda çalışan interaktif simülasyonu. Donanım olmadan projeyi canlı biçimde gösterir: devre kartı, kabloların akışı, sensör değerleri, OLED ekran, sesli AI asistan, alarm ve Pomodoro zamanlayıcısı — hepsi bir sayfada.

**Takım:** Enes ÖZBEK · Bayram Selim YILMAZ · Mehmet Emin AKKAYA
**Ders:** ISU Embedded Systems — Spring 2026

---

## 📦 Özellikler

- **Şematik-doğru devre kartı**: Gerçek EasyEDA şemasıyla bire bir aynı pin-to-pin kablolama (zoom in/out, pan, tam ekran)
- **Pomodoro zamanlayıcı**: 4 döngü · 25 dk çalışma / 5 dk mola · ×10 hız demo modu
- **Canlı sensör simülasyonu**:
  - BME280 (sıcaklık + nem) — slider ile ayarlanır, otomatik dalgalanma opsiyonu
  - HX711 + Load Cell (telefon ağırlık algılama) — pedden çıkarınca alarm çalar
- **SSD1306 OLED (128×64)**: 4 otomatik dönen ekran — Pomodoro / Ortam / Telefon / AI
- **I2S ses**: Start/end/alarm/AI beep tonları (Web Audio API)
- **Gerçek AI asistan**: NVIDIA NIM üzerinden **Llama 3.3 70B** (ücretsiz tier) · tarayıcıda sesli giriş (Web Speech API) · TTS ile Türkçe cevap
- **Seri monitör**: Tüm GPIO/I2C/I2S olayları zaman damgalı olarak akar

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinim
- **Python 3.7+** (her Mac/Linux/Windows'ta hazır gelir)

Hiçbir `npm install`, `build` adımı gerekmez. Kütüphane yok.

### Adımlar

```bash
# 1. Projeyi klonla (veya ZIP olarak indirip aç)
git clone <repo-url>
cd zzzzzzzzzz

# 2. Dahili proxy sunucusunu başlat (port 8000)
python3 server.py

# Farklı port istiyorsan:
python3 server.py 8080
```

Tarayıcıdan aç: **http://localhost:8000**

> ⚠️ Doğrudan `python3 -m http.server` kullanma — AI asistanı CORS yüzünden çalışmaz. `server.py` hem dosyaları sunar hem de NVIDIA API'ye proxy yapar.

---

## 🔑 NVIDIA API Anahtarı (AI Asistan İçin)

AI asistanı gerçek cevaplar verebilmesi için bir API anahtarına ihtiyaç duyar. NVIDIA **ücretsiz kredi** veriyor:

1. https://build.nvidia.com adresine git ve kayıt ol
2. Herhangi bir modele tıkla (ör. Llama 3.3 70B Instruct)
3. Sağ üstte **"Get API Key"** → `nvapi-...` ile başlayan anahtarı kopyala
4. Simülasyondaki sağ üst köşedeki **🔑 API Key** butonuna bas
5. Anahtarı yapıştır, **Kaydet** de

Anahtar sadece tarayıcıda (`localStorage`) saklanır, dışarı gönderilmez. Yeni hesap başına ~1000 istek ücretsiz.

---

## 🧪 Nasıl Kullanılır

Sağ sütunda **🧪 TEST EYLEMLERİ** paneli var — sırayla denenebilir:

1. **Pomodoro'yu başlat** — "Başlat" butonuna bas, geri sayım OLED'e yansır, başlama tonu çalar
2. **Hızlandır** — `×10 hız` kutusunu işaretle → 2.5 dakikada çalışma biter, MOLA tonu duyulur
3. **Telefonu kaldır** — "Telefon pad'de" kutusunun işaretini kaldır → alarm çalar, kırmızı LED yanar, OLED uyarır, AI otomatik motive edici mesaj atar
4. **Ortamı değiştir** — Sıcaklık/nem slider'larını oynat → OLED ortam ekranı ve devre üstündeki BME280 okuması güncellenir
5. **Otomatik dalgalanma** — Kutuyu işaretle → sensör değerleri gerçekçi biçimde dalgalanır
6. **AI butonuna bas** — Kırmızı fiziksel butona veya devredeki U3 butonuna tıkla (ya da klavyeden `Space`) → mikrofon dinlemeye geçer
7. **AI'a sor** — Text input'a yaz veya 🎤 ile konuş → Llama 3.3 cevap verir, TTS sesli okur, OLED AI ekranında gösterir
8. **OLED ekranlarını dolaş** — OLED panelindeki → butonu ile Pomodoro / Ortam / Telefon / AI ekranları arasında geç
9. **Devre kartını incele** — Aktif olan kablolar yanıp söner. **Mouse wheel** ile yakınlaştır, **sürükleyerek gezin**, **⛶ Tam Ekran** butonu ile sadece devreyi büyük göster
10. **Seri monitörü oku** — Sayfanın altında tüm GPIO/I2C/I2S olayları zaman damgalı akar

### Klavye Kısayolları
| Tuş | Eylem |
|-----|-------|
| `Space` | AI butonuna basar (mikrofonu aç/kapat) |
| `Esc` | Tam ekrandan çıkar |
| `F11` | Tarayıcı tam ekran |

---

## 🔌 Donanım Referansı (Simüle Edilen)

| Bileşen | Görev | Bağlantı |
|---------|-------|----------|
| XIAO ESP32-S3 (U1) | Ana MCU, Wi-Fi, dual-core LX7 | — |
| SSD1306 0.96" OLED (U2) | 128×64 kullanıcı arayüzü | I2C · SDA=D4 · SCL=D5 |
| BME280 | Sıcaklık + nem sensörü | I2C · aynı bus |
| INMP441 | I2S dijital MEMS mikrofon | SCK=D2 · WS=D3 · SD=D6 |
| HX711 + Load Cell | 24-bit ADC + telefon ağırlığı | DT=D0 · SCK=D10 |
| MAX98357A | I2S sınıf-D amplifikatör | LRCLK=D7 · BCLK=D8 · DIN=D9 |
| 8Ω Hoparlör | Ses çıkışı | — |
| Button U3 | AI tetik butonu | GPIO D1 |

Tüm bu bağlantılar `js/board.js` içindeki `WIRES` dizisinde tanımlı ve `SCH_New-Project3_2026-04-24.json` EasyEDA şemasıyla bire bir eşleşir.

---

## 📁 Dosya Yapısı

```
├── index.html          # Ana sayfa (layout)
├── styles.css          # Tüm stil tanımları
├── server.py           # Python statik sunucu + NVIDIA API proxy
├── js/
│   ├── app.js          # Giriş noktası, olay bus'ı, seri monitör
│   ├── board.js        # SVG devre kartı, zoom/pan, kablo animasyonları
│   ├── oled.js         # 128×64 canvas OLED render
│   ├── pomodoro.js     # 25/5 dk state machine
│   ├── sensors.js      # BME280 + HX711 simülasyonu
│   ├── audio.js        # Web Audio tonları
│   ├── mic.js          # Web Speech API (tr-TR)
│   └── ai.js           # NVIDIA NIM istemcisi + TTS
└── README.md
```

---

## 🌐 Tarayıcı Uyumluluğu

- ✅ **Chrome / Edge** (önerilir — Web Speech en iyi)
- ✅ **Safari** (çalışır, TTS sesi macOS sistem sesini kullanır)
- ⚠️ **Firefox** (Web Speech Recognition desteklemez; text input her zaman çalışır)

---

## 📷 Ekran Görüntüsü Almak (Proje Raporu İçin)

1. Tarayıcıyı tam ekran yap (`F11`)
2. Üstteki **⛶ Tam Ekran** butonuyla sadece devreyi büyüt, ekran görüntüsü al
3. Pomodoro çalıştırırken, alarm veriirken, AI cevap verirken ayrı ayrı ekran görüntüleri
4. Seri monitör loglarını da dahil et — log satırları proje ilerleyişinin kanıtıdır

---

## ⚠️ Önemli Notlar

- Bu **sunum/demo** amaçlı bir simülasyondur. Gerçek donanım henüz kurulmadığı için cihazı tarayıcıda göstermek ve proje raporunda ekran görüntüsü olarak kullanmak için hazırlandı.
- AI asistanı için kullanılan API anahtarı **sadece senin tarayıcında** kalır, hiçbir yere gönderilmez. Üretim/public deployment için güvenli değildir (anahtar tarayıcıda tutulur).
- `server.py` proxy sadece geliştirme/demo içindir. Public internete açma.

---

## 📄 Lisans

Eğitim amaçlı, açık paylaşım. Referans göstermek serbest.
