// Konten guidance "Roadmap 100 Juta" — F&B Korean Chicken Grill Surabaya.
// Sumber: plan pribadi roadmap_100_juta. Diservekan lewat /api/guidance/roadmap
// dan dirender di /guidance/roadmap.

export type RoadmapSku = {
  id: string;
  name: string;
  flavor: string;
  order: string;
};

export type IngredientItem = {
  id: string;
  name: string;
  qty?: string;
  note?: string;
};

export type IngredientGroup = {
  id: string;
  title: string;
  note?: string;
  items: IngredientItem[];
};

export type RecipeStepGroup = {
  id: string;
  title: string;
  note?: string;
  steps: string[];
};

export type SauceComponent = {
  role: string;
  ingredient: string;
  buyNote: string;
};

export type HalalSwap = {
  problem: string;
  why: string;
  swap: string;
};

export type TroubleshootItem = {
  symptom: string;
  fix: string;
};

export type RoadmapPhase = {
  id: string;
  name: string;
  period: string;
  goal: string;
  actions: string[];
  targets: string[];
  prohibitions?: string[];
};

export type NinetyDayBlock = {
  id: string;
  title: string;
  items: string[];
};

export type RoadmapGuidance = {
  meta: {
    title: string;
    subtitle: string;
    location: string;
    productLock: string;
    updatedAt: string;
  };
  numbers: {
    title: string;
    points: string[];
    timeline: { label: string; value: string }[];
  };
  strategy: {
    title: string;
    core: string;
    notThis: string;
    reasons: string[];
    salesModel: string;
    phase0Tools: string;
  };
  heroMenu: {
    title: string;
    workingName: string;
    principles: string[];
    plateContents: string[];
    skus: RoadmapSku[];
    priceAnchor: string;
    validation: string;
  };
  flavor: {
    title: string;
    surabayaProfile: string[];
    marketProof: string[];
    decisions: string[];
  };
  sauce: {
    title: string;
    anatomy: string;
    components: SauceComponent[];
    calibration: string[];
  };
  recipe: {
    title: string;
    info: { label: string; value: string }[];
    ingredientGroups: IngredientGroup[];
    avoid: string[];
    stepGroups: RecipeStepGroup[];
    troubleshooting: TroubleshootItem[];
    scaling: string[];
  };
  halal: {
    title: string;
    intro: string;
    swaps: HalalSwap[];
    flavorPrinciples: string[];
    mirinSubstitute: string[];
    shoppingChecklist: IngredientItem[];
    donts: string[];
  };
  practice: {
    title: string;
    days: string[];
  };
  phases: RoadmapPhase[];
  moneyRules: {
    title: string;
    allocation: string[];
    sandwichRules: string[];
    quitJobRule: string;
  };
  ninetyDays: {
    title: string;
    blocks: NinetyDayBlock[];
  };
  principles: {
    title: string;
    items: string[];
  };
  techRole: {
    title: string;
    items: string[];
  };
};

export const roadmapGuidance: RoadmapGuidance = {
  meta: {
    title: "Roadmap 100 Juta",
    subtitle:
      "F&B Surabaya — fokus tunggal Korean-style chicken grill: preorder dulu, lalu app delivery, scale bertahap. Soup + sayur hanya jika nanti dine-in.",
    location: "Surabaya",
    productLock: "Korean Chicken Grill (Soy + Spicy) — lock 12 bulan, satu side tetap, tanpa sup di Phase 1",
    updatedAt: "2026-08-08",
  },

  numbers: {
    title: "Realita angka",
    points: [
      "Target dekat: aset bersih Rp 100 juta.",
      "Target utama: net profit F&B Rp 100 juta/bulan.",
      "Net margin sehat F&B setelah sewa-gaji-bahan-iklan biasanya 10–20% — untuk net Rp 100 juta/bulan butuh omzet Rp 500 juta–1 miliar/bulan (skala multi-titik / central kitchen + B2B, bukan satu warung).",
      "Patokan aman: food cost bahan + kemasan ≤ 35% harga jual; harga jual harus cover gas, platform fee, packaging, dan waste.",
    ],
    timeline: [
      { label: "Validasi menu yang laku", value: "1–3 bulan" },
      { label: "Aset Rp 100 juta", value: "12–20 bulan" },
      { label: "Net Rp 10–20 juta/bulan", value: "18–30 bulan" },
      { label: "Net Rp 100 juta/bulan", value: "4–7 tahun" },
    ],
  },

  strategy: {
    title: "Strategi inti (keputusan tetap)",
    core: "Mesin utama: cloud kitchen / preorder dengan 1 hero menu → lalu catering B2B → lalu multi-titik / produk kemasan.",
    notThis:
      "Bukan buka cafe/resto dine-in dulu — sewa mahal, jam operasional bentrok WFH, makan modal keluarga.",
    reasons: [
      "Modal awal bisa Rp 3–15 juta (bahan, kemasan, foto, gas/listrik, tes iklan).",
      "Produksi batch di malam/weekend; weekday bisa diserahkan ke 1 helper setelah ada omzet.",
      "Bisa ukur food cost & repeat order dengan jelas.",
      "Jalur scale F&B yang terbukti: satu rasa yang orang ingat → sistem → cabang/titik.",
    ],
    salesModel:
      "Model jual Surabaya Phase 1: preorder H-1 via IG/WA. Setelah 4 minggu repeat sehat → 1 app delivery.",
    phase0Tools:
      "Alat Phase 0: grill pan atau air fryer + timbangan + wadah marinade + bumbu Korea dasar (bukan belanja 20 bumbu).",
  },

  heroMenu: {
    title: "Hero menu terkunci",
    workingName: "Korean Chicken Grill (bukan plate 3 pilar)",
    principles: [
      "Bintang hanya ayam grill rasa Korea.",
      "Pendamping minimal: nasi + 1 side tetap (pilih satu: kimchi sederhana atau salad cucumber atau corn cheese kecil — bukan 3 tumis sayur).",
      "Sup + sayur berkuah = fitur dine-in nanti saja, bukan menu preorder awal.",
      "Jangan jual balance penuh di hari pertama; balance datang dari 1 plate sederhana yang kenyang & rapi.",
    ],
    plateContents: [
      "Ayam grill Korea (paha boneless / thigh — lebih juicy, aman di air fryer/grill pan)",
      "Nasi putih / nasi bawang putih sederhana",
      "1 side tetap (sama setiap order)",
      "Saus/glaze Korea (maksimal 2 varian)",
    ],
    skus: [
      {
        id: "soy-garlic",
        name: "Korean Grill — Soy Garlic",
        flavor: "Gurih-asin + manis sedang + wijen/bawang putih — bukan manis kecap Jawa tebal",
        order: "Latih & jual pertama (paling aman mass market, cocok preorder nasi)",
      },
      {
        id: "yangnyeom",
        name: "Korean Grill — Yangnyeom/Spicy",
        flavor: "Pedas-manis gochujang — bukan pedas kering tanpa manis",
        order: "SKU kedua, setelah soy garlic konsisten",
      },
    ],
    priceAnchor:
      "Harga acuan Surabaya: Rp 35.000–48.000/porsi (Korean positioning sedikit di atas ayam rumahan biasa; validasi setelah food cost).",
    validation:
      "Validasi lapangan 30 porsi: catat order Soy vs Spicy. Yang ≥60% repeat → itu hero; yang kalah boleh di-drop sementara.",
  },

  flavor: {
    title: "Riset lidah Surabaya → keputusan rasa",
    surabayaProfile: [
      "Gurih/asin kuat (petis, tauco, kaldu, kluwek).",
      "Manis sebagai penyeimbang, bukan raja tunggal.",
      "Pedas sering hadir, biasanya dipadu manis/gurih.",
      "Sering ada sedikit asam (rujak, air asam, jeruk).",
    ],
    marketProof: [
      "Warung ayam bakar Surabaya biasa jual pilihan Bakar Manis / Bumbu Rujak / Pedas Manis / Extra Pedas — bumbu rujak sangat mewakili lidah setempat.",
      "Korean chicken Surabaya (Kkado, Cham Cham, Kochica, dll.): varian yang selalu laku = soy garlic / honey-soy (gurih manis) dan yangnyeom / fire / buldak (pedas manis).",
      "Harga resto Korean fried sering Rp 75–150rb sharing — peluang: grill plate single-serve lebih murah (35–48rb) dengan identitas Korea yang sama.",
    ],
    decisions: [
      "Latih & jual dulu Soy Garlic = gurih-asin + manis sedang.",
      "SKU kedua Yangnyeom = pedas-manis.",
      "Hindari: manis kecap Jawa berlebihan (jadi ayam bakar biasa) atau asin murni tanpa manis (kurang nagih di SBY).",
      "Kalibrasi lokal: sedikit lebih gurih dari resep Korea internet; manis jangan mendominasi; pedas di spicy boleh nendang tapi tetap ada manis.",
    ],
  },

  sauce: {
    title: "Anatomi saus Soy Garlic",
    anatomy:
      "Soy garlic Korea klasik = kecap asin + bawang putih banyak + pemanis + sedikit asam, dimasak jadi glaze mengilap. Tanpa gochujang (itu jalur yangnyeom). Jangan andalkan kecap manis sebagai rasa utama — itu jadi ayam kecap Indonesia.",
    components: [
      {
        role: "Asin-umami",
        ingredient: "Kecap asin",
        buyNote: "Kikkoman / Sempio / Ottogi — lebih baik dari kecap asin murah tipikal",
      },
      {
        role: "Manis + kilap",
        ingredient: "Madu dan/atau gula pasir; ideal: corn syrup/mulyeot",
        buyNote: "Madu supermarket OK; mulyeot di Korean mart",
      },
      {
        role: "Aroma utama",
        ingredient: "Bawang putih segar cincang",
        buyNote: "Banyak — ini jiwa \u201cgarlic\u201d",
      },
      {
        role: "Seimbang",
        ingredient: "Cuka beras / cuka putih sedikit",
        buyNote: "Biar tidak lembek manis",
      },
      {
        role: "Finishing",
        ingredient: "Minyak wijen + wijen sangrai",
        buyNote: "Masuk di akhir, api mati",
      },
      {
        role: "Opsional naik level",
        ingredient: "Jahe, saus tiram sedikit (hanya bersertifikat halal)",
        buyNote: "Mirin/cheongju di-skip untuk jalur halal — lihat tabel halal",
      },
    ],
    calibration: [
      "Terlalu manis → +1 sdt kecap asin atau +sedikit air, masak sebentar.",
      "Terlalu asin → +1 sdt madu.",
      "Kurang nendang → tambah bawang putih, bukan tambah gula.",
    ],
  },

  recipe: {
    title: "Resep lengkap: Korean Soy Garlic Grill Halal (2 porsi plate)",
    info: [
      { label: "Waktu", value: "Marinasi 30–60 menit + masak ±25 menit" },
      {
        label: "Alat",
        value: "Kompor, wajan kecil, pisau, mangkuk, air fryer ATAU grill pan/teflon, timbangan (disarankan)",
      },
      { label: "Hasil", value: "2 plate (nasi + ayam glaze + 1 side)" },
    ],
    ingredientGroups: [
      {
        id: "ayam",
        title: "Ayam",
        items: [
          {
            id: "ayam-paha",
            name: "Paha ayam boneless",
            qty: "500 g",
            note: "Kulit boleh dibuang; potong 2–3 cm seragam; dari supplier/pasar halal",
          },
          { id: "ayam-garam", name: "Garam", qty: "1/4 sdt" },
          { id: "ayam-lada", name: "Lada hitam", qty: "1/4 sdt" },
          {
            id: "ayam-puree-apel",
            name: "Puree apel",
            qty: "1 sdm",
            note: "Blender 2–3 potong apel + sedikit air — opsional tapi recommended (manis alami + tenderize)",
          },
          { id: "ayam-minyak", name: "Minyak goreng", qty: "1 sdt", note: "Supaya tidak lengket saat grill" },
        ],
      },
      {
        id: "glaze",
        title: "Saus Soy Garlic Halal (glaze)",
        note: "Untuk ±500 g ayam / 2–3 porsi plate",
        items: [
          {
            id: "glaze-kecap-asin",
            name: "Kecap asin berlogo halal",
            qty: "4 sdm (60 ml)",
            note: "Kikkoman Halal / ABC / Bango kecap asin / Sempio (cek label)",
          },
          { id: "glaze-madu", name: "Madu", qty: "2 sdm" },
          { id: "glaze-gula", name: "Gula pasir", qty: "1 sdm", note: "Kalau mau lebih sticky; boleh skip dulu" },
          { id: "glaze-air", name: "Air", qty: "3 sdm" },
          { id: "glaze-bawang", name: "Bawang putih cincang halus", qty: "6–8 siung", note: "Jiwa rasa garlic — jangan dikurangi" },
          { id: "glaze-cuka", name: "Cuka beras", qty: "1 sdt", note: "Bukan wine vinegar; idealnya berlogo halal" },
          { id: "glaze-minyak-tumis", name: "Minyak (untuk tumis bawang)", qty: "1 sdt" },
          { id: "glaze-minyak-wijen", name: "Minyak wijen", qty: "1 sdt", note: "Masuk setelah api mati" },
          { id: "glaze-wijen", name: "Wijen sangrai", qty: "1 sdt", note: "Taburan" },
          {
            id: "glaze-maizena",
            name: "Maizena + air (slurry)",
            qty: "1/2 sdt + 1 sdm",
            note: "Opsional — kalau mau kental cepat",
          },
        ],
      },
      {
        id: "marinasi",
        title: "Marinasi ringan (terpisah dari glaze kental)",
        items: [
          { id: "marinasi-kecap", name: "Kecap asin", qty: "1 sdm" },
          { id: "marinasi-madu", name: "Madu", qty: "1 sdm" },
          { id: "marinasi-bawang", name: "Bawang putih cincang", qty: "1 siung" },
          { id: "marinasi-puree", name: "Puree apel + garam + lada", note: "Dari bahan ayam di atas" },
        ],
      },
      {
        id: "plate",
        title: "1 plate (per porsi)",
        items: [
          { id: "plate-nasi", name: "Nasi putih hangat", qty: "150–180 g" },
          { id: "plate-ayam", name: "Ayam glaze", qty: "±200–220 g", note: "Dari 500 g untuk 2 porsi" },
          { id: "plate-timun", name: "Mentimun (side tetap)", qty: "1/2 buah", note: "Iris tipis" },
          {
            id: "plate-dressing",
            name: "Dressing timun: gula + cuka beras + garam + wijen",
            qty: "1/2 sdt + 1/2 sdt + sejumput + sedikit",
          },
        ],
      },
    ],
    avoid: [
      "Mirin, sake, cooking wine, wine vinegar.",
      "Kecap manis sebagai rasa utama.",
      "Oyster sauce non-halal (hanya jika bersertifikat MUI).",
    ],
    stepGroups: [
      {
        id: "prep-ayam",
        title: "1) Siapkan ayam (5 menit)",
        steps: [
          "Cuci ayam, keringkan dengan tisu dapur (penting biar bisa grill, tidak rebus).",
          "Potong seragam biar matang bareng.",
          "Campur di mangkuk: ayam + garam + lada + 1 sdm kecap asin + 1 sdm madu + 1 siung bawang + puree apel + 1 sdt minyak.",
          "Aduk rata, tutup, masuk kulkas 30–60 menit (boleh sampai 2 jam; jangan semalaman di marinade asin-manis kental).",
        ],
      },
      {
        id: "buat-glaze",
        title: "2) Buat saus glaze (8 menit) — bisa sambil marinasi",
        steps: [
          "Cincang 6–8 siung bawang putih.",
          "Panaskan wajan kecil, 1 sdt minyak, api kecil.",
          "Tumis bawang putih 30–60 detik sampai harum. Kalau mulai coklat tua → buang, ulangi (gosong = pahit).",
          "Masukkan: 4 sdm kecap asin + 2 sdm madu + 1 sdm gula + 3 sdm air + 1 sdt cuka beras. Aduk.",
          "Masak api sedang-kecil 2–4 menit sampai gelembung rapat, saus mengilap/mengental tipis.",
          "(Opsional) Masukkan slurry maizena, aduk 20–30 detik sampai coat sendok.",
          "Matikan api → aduk 1 sdt minyak wijen. Sisihkan. (Simpan jar kaca di kulkas tahan 3–4 hari.)",
        ],
      },
      {
        id: "masak-airfryer",
        title: "3A) Masak ayam — air fryer (paling mudah pemula)",
        steps: [
          "Preheat 180°C (kalau alatnya ada mode preheat).",
          "Susun ayam tidak saling tumpuk (kerja bertahap jika perlu).",
          "Air fry 180°C selama 12–16 menit, bolak-balik di menit ke-7–8.",
          "Cek: tidak pink di dalam, cairan jernih. Kalau masih mentahan +2–3 menit.",
        ],
      },
      {
        id: "masak-grillpan",
        title: "3B) Masak ayam — grill pan / teflon (tanpa air fryer)",
        steps: [
          "Panaskan pan api sedang. Oles tipis minyak.",
          "Masak ayam 4–6 menit per sisi sampai ada brown marks dan matang.",
          "Jangan sering dibolak-balik di awal; biarkan terbentuk warna dulu.",
          "Kalau banyak air keluar, naikkan api sebentar supaya tidak merebus.",
        ],
      },
      {
        id: "glaze-akhir",
        title: "4) Glaze (2 menit) — saat ayam baru matang",
        steps: [
          "Panaskan kembali saus di wajan (api kecil).",
          "Masukkan ayam panas. Toss/aduk 30–60 detik sampai semua kilap.",
          "Matikan api. Tabur wijen sangrai.",
          "Untuk jualan preorder: glaze tepat sebelum packing, jangan dari pagi (jadi lemas/lengket berlebih).",
        ],
      },
      {
        id: "side-timun",
        title: "5) Side mentimun (3 menit)",
        steps: [
          "Iris mentimun.",
          "Campur gula + cuka beras + garam. Aduk. Tabur sedikit wijen.",
          "Simpan terpisah dari ayam saat packing (biar tidak basahi nasi).",
        ],
      },
      {
        id: "plating",
        title: "6) Plating 1 porsi",
        steps: [
          "Nasi di box/piring.",
          "Ayam glaze di samping/atas (jangan rendam nasi dengan saus berlebih).",
          "Side mentimun di cup kecil atau sudut box.",
          "Foto produk: cahaya jendela, saus kilap kelihatan.",
        ],
      },
    ],
    troubleshooting: [
      { symptom: "Terlalu asin", fix: "Next batch +1 sdt madu di saus, atau encerkan 1 sdm air lalu masak sebentar." },
      { symptom: "Terlalu manis", fix: "+1 sdt kecap asin." },
      { symptom: "Kurang wangi garlic", fix: "Tambah 2 siung bawang putih; jangan tambah gula." },
      { symptom: "Ayam kering", fix: "Pakai paha (bukan dada), jangan overcook, marinade jangan kebanyakan garam." },
      { symptom: "Saus tidak nempel", fix: "Ayam harus panas + saus sedikit dikentalkan; jangan siram saus dingin." },
      { symptom: "Pahit", fix: "Bawang putih gosong — ulangi tumisan." },
    ],
    scaling: [
      "Contoh 10 porsi: kalikan bahan ayam & saus ×5 dari resep 2 porsi (±2,5 kg ayam).",
      "Masak ayam batch; glaze per batch kecil biar kilap konsisten.",
      "Cutoff order H-1; produksi sesuai jumlah bayar.",
    ],
  },

  halal: {
    title: "Versi HALAL (tanpa mengubah rasa original)",
    intro:
      "Jiwa soy garlic sudah halal secara alami — kecap asin + bawang putih banyak + madu/gula + minyak wijen. Yang biasanya bikin non-halal justru bahan opsional di resep internet.",
    swaps: [
      {
        problem: "Mirin / hon-mirin",
        why: "Arak manis ~10–14% alkohol",
        swap: "Sudah ada madu+gula di formula = fungsi manis+kilap tercover. Kalau perlu \u201cmirin note\u201d: 1 sdt cuka beras + 1 sdt gula (atau stok mirin halal homemade).",
      },
      {
        problem: "Cheongju / sake / cooking wine",
        why: "Alkohol",
        swap: "Skip total. Diganti sedikit puree apel/pir (1 sdm) di marinade untuk manis alami + tenderize — trik Korea rumah tangga yang umum.",
      },
      {
        problem: "Wine vinegar",
        why: "Berasal dari wine",
        swap: "Pakai cuka beras / cuka putih berlabel jelas, idealnya ada logo halal.",
      },
      {
        problem: "Oyster sauce non-halal",
        why: "Beberapa brand meragukan",
        swap: "Skip di Phase 0, atau hanya brand bersertifikat MUI.",
      },
      {
        problem: "Ayam non-halal",
        why: "Potong sembelih",
        swap: "Ayam dari supplier/pasar halal (standar Indonesia).",
      },
      {
        problem: "Kimchi side non-halal",
        why: "Sering pakai fish sauce/udang",
        swap: "Side Phase 1: cucumber salad / corn dulu; kimchi hanya jika resep/homemade halal.",
      },
    ],
    flavorPrinciples: [
      "Jangan kurangi bawang putih — itu identitas utama, bukan mirin.",
      "Jangan ganti kecap asin dengan kecap manis.",
      "Kilap glaze datang dari madu/gula + reduksi pan, bukan dari alkohol.",
      "Asam halus (cuka beras sedikit) menggantikan fungsi \u201cbright\u201d mirin tanpa bau arak.",
    ],
    mirinSubstitute: [
      "100 ml air + 50 g gula + 2 sdt cuka beras + 1/2 sdt garam → didihkan, dinginkan, simpan botol.",
      "Pakai 1 sdm menggantikan 1 sdm mirin di resep luar.",
    ],
    shoppingChecklist: [
      {
        id: "belanja-halal-logo",
        name: "Semua bumbu kemasan: cari logo halal MUI",
      },
      {
        id: "belanja-hindari-mirin",
        name: "Hindari botol mirin / hon-mirin / rice wine di Korean mart",
        note: "Kecuali tertulis alcohol-free + halal",
      },
      {
        id: "belanja-mulyeot",
        name: "Corn syrup/mulyeot: cek komposisi",
        note: "Umumnya OK jika tanpa alkohol",
      },
      {
        id: "belanja-klaim",
        name: "Klaim marketing: \u201cHalal · Korean Soy Garlic Grill\u201d",
        note: "Jangan klaim \u201cmirin original\u201d",
      },
    ],
    donts: [
      "Campur gochujang \u201cbiar ada pedasnya\u201d ke soy garlic → campur identitas SKU.",
      "Ganti sebagian besar kecap asin dengan kecap manis.",
      "Bawang putih bubuk sebagai pengganti penuh bawang segar.",
      "Masak bawang putih sampai hitam.",
      "Siram saus dingin ke ayam dingin (tidak nempel).",
      "Pakai mirin/sake \u201cnanti hangusnya alkohol\u201d → tetap tidak untuk jalur halal bisnis.",
    ],
  },

  practice: {
    title: "Latihan 7 hari (Phase 0)",
    days: [
      "Hari 1–2: saus saja, cicip sendok, catat takaran.",
      "Hari 3–5: ayam + glaze, foto, minta 2–3 orang bayar/kritik buta.",
      "Hari 6–7: kunci gramasi final di notes (jadikan resep bisnis, jangan \u201csecukupnya\u201d).",
    ],
  },

  phases: [
    {
      id: "phase-0",
      name: "Phase 0 — Stabilize + tes rasa pasar",
      period: "Bulan 0–2",
      goal: "Keluarga aman, tahu menu mana yang orang bayar berulang.",
      actions: [
        "3 kantong uang: Hidup+kontrakan | Ortu (nominal tetap) | Mesin F&B (Rp 2–4 juta/bulan).",
        "Buffer mini Rp 10–15 juta sebelum sewa dapur/booth.",
        "Jangan utang untuk fit-out cafe di fase ini.",
        "Blok waktu — malam weekday 19:30–21:00 (resep, food cost, konten, chat order); Sabtu produksi + jual; Minggu produksi/evaluasi angka.",
      ],
      targets: [
        "Jual minimal 30 porsi berbayar ke orang luar (bukan hanya keluarga).",
        "Repeat ≥ 20% pembeli order lagi dalam 30 hari.",
        "Food cost (bahan+kemasan) ≤ 35% harga jual.",
        "Waktu masak/plating per porsi masuk akal untuk batch.",
        "Kalau 30 porsi sulit laku → ganti menu, jangan sewa tempat.",
      ],
    },
    {
      id: "phase-1",
      name: "Phase 1 — Preorder/cloud kecil + kejar aset Rp 100 juta",
      period: "Bulan 1–18",
      goal: "Bisnis F&B cashflow-positif sambil menabung modal ekspansi.",
      actions: [
        "Preorder WA / komunitas / kantor sekitar.",
        "GrabFood / ShopeeFood / GoFood dari dapur rumah atau shared kitchen murah (kalau aturan kos/kontrakan melarang, pindah shared kitchen per jam).",
        "Paket catering kecil (lunch box 10–20 pax) untuk kantor — cocok WFH networking.",
        "Harga jual hero Rp 25–45 ribu sesuai positioning; food cost ≤ 35%; packaging + platform fee + ongkir dihitung terpisah.",
      ],
      targets: [
        "Omzet F&B konsisten (meski kecil) 12 minggu beruntun.",
        "Net sampingan Rp 3–8 juta/bulan (plus sisih gaji Rp 4 juta).",
        "Aset bersih Rp 100 juta (cash usaha + alat yang likuid/berguna).",
      ],
      prohibitions: [
        "Sewa ruko/cafe mahal.",
        "Beli mesin industri sebelum omzet stabil 3 bulan.",
        "10+ menu \u201cbiar lengkap\u201d.",
        "Promo diskon bunuh margin tanpa hitung.",
        "Resign kerja terlalu cepat.",
      ],
    },
    {
      id: "phase-2",
      name: "Phase 2 — Mesin Rp 10–20 juta net/bulan",
      period: "Bulan 12–30",
      goal: "F&B tidak bergantung kamu masak setiap order.",
      actions: [
        "Sewa dapur kecil / booth / shared kitchen tetap (bukan dine-in besar).",
        "Hire 1 operator (masak+pack); kamu pegang resep standar, stok, sales, quality control.",
        "SOP tertulis: resep gramasi, foto plating, checklist kebersihan, jam produksi.",
        "Channel: 2 app delivery + WA + 1 kanal B2B catering mingguan.",
        "Menu tetap sempit: 1 hero, max 3 SKU.",
      ],
      targets: [
        "Food cost stabil ≤ 35%.",
        "Net profit Rp 10–20 juta/bulan selama 3 bulan.",
        "Kamu tidak berdiri di dapur full weekday (max QC + stok).",
        "Tanpa helper + SOP kamu akan burnout karena bentrok WFH.",
      ],
    },
    {
      id: "phase-3",
      name: "Phase 3 — Scale ke net Rp 100 juta/bulan",
      period: "Tahun 3–7",
      goal: "Fase rantai kecil / food company, bukan jualan harian sendiri.",
      actions: [
        "A. Multi-titik penjualan (cloud outlet / booth) — target besar omzet harian.",
        "B. Catering B2B & event rutin — margin lebih sehat, order terprediksi.",
        "C. Produk kemasan / frozen retail (supermarket, reseller, online) — scale tanpa sewa meja makan.",
        "Contoh bauran net: 3–5 titik cloud/booth Rp 40–50 juta + catering B2B Rp 30–40 juta + kemasan/frozen Rp 20–30 juta = ~Rp 100 juta net.",
      ],
      targets: [
        "Central kitchen / dapur pusat.",
        "Pembukuan terpisah + legal (NIB, PIRT/BPOM sesuai produk, NPWP/PT).",
        "Manajer operasional (bukan kamu di semua shift).",
        "Cadangan operasional 6 bulan (bahan + gaji + sewa).",
        "Metrik mingguan: food cost %, waste %, omzet/titik, net profit.",
        "Dine-in (jika pernah buka): baru boleh 1 sup yang sudah ada sayurnya — tetap bukan buffet 3 tumis sayur.",
      ],
    },
  ],

  moneyRules: {
    title: "Aturan uang",
    allocation: [
      "50% akumulasi aset (kejar Rp 100 juta).",
      "30% reinvest bahan/kemasan/iklan kecil/alat.",
      "20% pajak sederhana + buffer ortu/darurat.",
    ],
    sandwichRules: [
      "Nafkah ortu = biaya tetap, dianggarkan duluan.",
      "Modal F&B tidak boleh dari uang kontrakan / dana darurat ortu.",
      "Jangan naikkan janji gaya hidup ke keluarga sebelum net stabil 6 bulan.",
      "Asuransi kesehatan > dekor booth.",
    ],
    quitJobRule:
      "Longgarkan/tinggalkan full-time job hanya jika net F&B ≥ 2× gaji selama 6 bulan beruntun dan buffer keluarga ≥ 6 bulan nafkah ortu + kontrakan.",
  },

  ninetyDays: {
    title: "Rencana 90 hari pertama (Surabaya · Korean Chicken Grill)",
    blocks: [
      {
        id: "hari-1-30",
        title: "Hari 1–30 (belajar)",
        items: [
          "Beli grill pan/air fryer + timbangan.",
          "Latihan 1 marinade Korea dulu (soy/bulgogi) sampai 5 batch konsisten; baru pelajari spicy.",
          "Kunci 1 side tetap + porsi nasi (gramasi tertulis) — tanpa sup, tanpa 3 tumis.",
          "Hitung food cost; foto produk bergaya Korean clean (bukan sambal bercecer).",
        ],
      },
      {
        id: "hari-31-60",
        title: "Hari 31–60 (preorder validasi)",
        items: [
          "Preorder H-1, kuota kecil (max ~10 porsi/hari produksi).",
          "Target 30 porsi berbayar; keluarga max 20%.",
          "IG/TikTok: konten \u201cKorean grill Surabaya\u201d + cutoff jelas.",
          "Catat: soy vs spicy mana lebih repeat.",
        ],
      },
      {
        id: "hari-61-90",
        title: "Hari 61–90",
        items: [
          "Double-down rasa yang menang; drop yang lemah jika perlu.",
          "Tes catering box 10 pax (satu menu grill saja).",
          "1 app delivery setelah operasional stabil.",
          "Jangan sewa dine-in; sup belum dibuka.",
          "Cadangan jika Korea gagal repeat setelah 30 porsi: sederhanakan jadi 1 rasa (yang lebih laku), baru pertimbangkan pivot ke ayam bakar lokal — bukan menambah sup dulu.",
        ],
      },
    ],
  },

  principles: {
    title: "Prinsip F&B yang membedakan tembus vs rugi",
    items: [
      "Satu hero menu > sepuluh menu biasa.",
      "Food cost & waste dicatat tiap minggu — perasaan \u201claku\u201d tidak cukup.",
      "Jangan sewa tempat untuk ego; sewa hanya setelah demand terbukti.",
      "Scale = SOP + orang + titik, bukan kamu masak lebih lama.",
      "Net profit > omzet > jumlah likes.",
      "Full-time job tetap jadi sponsor hidup sampai F&B pengganti yang lebih kuat.",
    ],
  },

  techRole: {
    title: "Peran tech (minimal, sesuai preferensi)",
    items: [
      "Tidak bangun custom fullstack untuk dijual/maintain.",
      "Pakai: WA Business, spreadsheet/Notion stok, app delivery, kalkulator food cost.",
      "Kalau suatu saat perlu sistem, bayar tools jadi atau freelance sekali jalan — fokus di rasa, operasional, dan ekspansi.",
    ],
  },
};
