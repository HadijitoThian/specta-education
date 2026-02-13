import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// =============================================
// COST OF LIVING DATA
// =============================================
const costData = [
  // Singapore
  { country: "Singapore", countrySlug: "singapore", city: "Singapore City", category: "rent", amountMinUsd: 800, amountMaxUsd: 2000, localCurrency: "SGD", amountMinLocal: 1100, amountMaxLocal: 2700, notes: "Shared room to private studio", notesId: "Kamar sharing hingga studio pribadi" },
  { country: "Singapore", countrySlug: "singapore", city: "Singapore City", category: "food", amountMinUsd: 250, amountMaxUsd: 500, localCurrency: "SGD", amountMinLocal: 340, amountMaxLocal: 680, notes: "Hawker centers to restaurants", notesId: "Hawker center hingga restoran" },
  { country: "Singapore", countrySlug: "singapore", city: "Singapore City", category: "transport", amountMinUsd: 60, amountMaxUsd: 120, localCurrency: "SGD", amountMinLocal: 80, amountMaxLocal: 160, notes: "MRT student pass", notesId: "Kartu pelajar MRT" },
  { country: "Singapore", countrySlug: "singapore", city: "Singapore City", category: "utilities", amountMinUsd: 80, amountMaxUsd: 150, localCurrency: "SGD", amountMinLocal: 110, amountMaxLocal: 200, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Singapore", countrySlug: "singapore", city: "Singapore City", category: "entertainment", amountMinUsd: 100, amountMaxUsd: 300, localCurrency: "SGD", amountMinLocal: 135, amountMaxLocal: 410, notes: "Social activities & leisure", notesId: "Aktivitas sosial & hiburan" },
  { country: "Singapore", countrySlug: "singapore", city: "Singapore City", category: "tuition", amountMinUsd: 8000, amountMaxUsd: 25000, localCurrency: "SGD", amountMinLocal: 10800, amountMaxLocal: 34000, notes: "Varies by university and program", notesId: "Bervariasi tergantung universitas dan program" },

  // China - Beijing
  { country: "China", countrySlug: "china", city: "Beijing", category: "rent", amountMinUsd: 300, amountMaxUsd: 800, localCurrency: "CNY", amountMinLocal: 2200, amountMaxLocal: 5800, notes: "Dorm to private apartment", notesId: "Asrama hingga apartemen pribadi" },
  { country: "China", countrySlug: "china", city: "Beijing", category: "food", amountMinUsd: 150, amountMaxUsd: 350, localCurrency: "CNY", amountMinLocal: 1100, amountMaxLocal: 2500, notes: "Campus canteen to restaurants", notesId: "Kantin kampus hingga restoran" },
  { country: "China", countrySlug: "china", city: "Beijing", category: "transport", amountMinUsd: 20, amountMaxUsd: 50, localCurrency: "CNY", amountMinLocal: 145, amountMaxLocal: 360, notes: "Subway and bus pass", notesId: "Kartu subway dan bus" },
  { country: "China", countrySlug: "china", city: "Beijing", category: "utilities", amountMinUsd: 30, amountMaxUsd: 60, localCurrency: "CNY", amountMinLocal: 220, amountMaxLocal: 430, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "China", countrySlug: "china", city: "Beijing", category: "entertainment", amountMinUsd: 50, amountMaxUsd: 150, localCurrency: "CNY", amountMinLocal: 360, amountMaxLocal: 1100, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "China", countrySlug: "china", city: "Beijing", category: "tuition", amountMinUsd: 3000, amountMaxUsd: 10000, localCurrency: "CNY", amountMinLocal: 21700, amountMaxLocal: 72300, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },
  // China - Shanghai
  { country: "China", countrySlug: "china", city: "Shanghai", category: "rent", amountMinUsd: 350, amountMaxUsd: 900, localCurrency: "CNY", amountMinLocal: 2500, amountMaxLocal: 6500, notes: "Dorm to private apartment", notesId: "Asrama hingga apartemen pribadi" },
  { country: "China", countrySlug: "china", city: "Shanghai", category: "food", amountMinUsd: 180, amountMaxUsd: 400, localCurrency: "CNY", amountMinLocal: 1300, amountMaxLocal: 2900, notes: "Campus canteen to restaurants", notesId: "Kantin kampus hingga restoran" },
  { country: "China", countrySlug: "china", city: "Shanghai", category: "transport", amountMinUsd: 25, amountMaxUsd: 55, localCurrency: "CNY", amountMinLocal: 180, amountMaxLocal: 400, notes: "Metro and bus", notesId: "Metro dan bus" },
  { country: "China", countrySlug: "china", city: "Shanghai", category: "utilities", amountMinUsd: 35, amountMaxUsd: 70, localCurrency: "CNY", amountMinLocal: 250, amountMaxLocal: 500, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "China", countrySlug: "china", city: "Shanghai", category: "entertainment", amountMinUsd: 60, amountMaxUsd: 180, localCurrency: "CNY", amountMinLocal: 430, amountMaxLocal: 1300, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "China", countrySlug: "china", city: "Shanghai", category: "tuition", amountMinUsd: 3500, amountMaxUsd: 12000, localCurrency: "CNY", amountMinLocal: 25300, amountMaxLocal: 86700, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },

  // UK - London
  { country: "United Kingdom", countrySlug: "uk", city: "London", category: "rent", amountMinUsd: 800, amountMaxUsd: 1800, localCurrency: "GBP", amountMinLocal: 650, amountMaxLocal: 1450, notes: "Shared to private accommodation", notesId: "Akomodasi sharing hingga pribadi" },
  { country: "United Kingdom", countrySlug: "uk", city: "London", category: "food", amountMinUsd: 250, amountMaxUsd: 500, localCurrency: "GBP", amountMinLocal: 200, amountMaxLocal: 400, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "United Kingdom", countrySlug: "uk", city: "London", category: "transport", amountMinUsd: 80, amountMaxUsd: 180, localCurrency: "GBP", amountMinLocal: 65, amountMaxLocal: 145, notes: "Student Oyster card", notesId: "Kartu pelajar Oyster" },
  { country: "United Kingdom", countrySlug: "uk", city: "London", category: "utilities", amountMinUsd: 100, amountMaxUsd: 180, localCurrency: "GBP", amountMinLocal: 80, amountMaxLocal: 145, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "United Kingdom", countrySlug: "uk", city: "London", category: "entertainment", amountMinUsd: 100, amountMaxUsd: 300, localCurrency: "GBP", amountMinLocal: 80, amountMaxLocal: 240, notes: "Social activities & leisure", notesId: "Aktivitas sosial & hiburan" },
  { country: "United Kingdom", countrySlug: "uk", city: "London", category: "tuition", amountMinUsd: 15000, amountMaxUsd: 35000, localCurrency: "GBP", amountMinLocal: 12000, amountMaxLocal: 28000, notes: "Varies by university and program", notesId: "Bervariasi tergantung universitas dan program" },
  // UK - Manchester
  { country: "United Kingdom", countrySlug: "uk", city: "Manchester", category: "rent", amountMinUsd: 500, amountMaxUsd: 1100, localCurrency: "GBP", amountMinLocal: 400, amountMaxLocal: 880, notes: "More affordable than London", notesId: "Lebih terjangkau dari London" },
  { country: "United Kingdom", countrySlug: "uk", city: "Manchester", category: "food", amountMinUsd: 200, amountMaxUsd: 400, localCurrency: "GBP", amountMinLocal: 160, amountMaxLocal: 320, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "United Kingdom", countrySlug: "uk", city: "Manchester", category: "transport", amountMinUsd: 50, amountMaxUsd: 100, localCurrency: "GBP", amountMinLocal: 40, amountMaxLocal: 80, notes: "Student bus pass", notesId: "Kartu bus pelajar" },
  { country: "United Kingdom", countrySlug: "uk", city: "Manchester", category: "utilities", amountMinUsd: 80, amountMaxUsd: 140, localCurrency: "GBP", amountMinLocal: 65, amountMaxLocal: 112, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "United Kingdom", countrySlug: "uk", city: "Manchester", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 200, localCurrency: "GBP", amountMinLocal: 65, amountMaxLocal: 160, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "United Kingdom", countrySlug: "uk", city: "Manchester", category: "tuition", amountMinUsd: 12000, amountMaxUsd: 28000, localCurrency: "GBP", amountMinLocal: 9600, amountMaxLocal: 22400, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },

  // Australia - Sydney
  { country: "Australia", countrySlug: "australia", city: "Sydney", category: "rent", amountMinUsd: 700, amountMaxUsd: 1600, localCurrency: "AUD", amountMinLocal: 1050, amountMaxLocal: 2400, notes: "Shared to private accommodation", notesId: "Akomodasi sharing hingga pribadi" },
  { country: "Australia", countrySlug: "australia", city: "Sydney", category: "food", amountMinUsd: 250, amountMaxUsd: 500, localCurrency: "AUD", amountMinLocal: 375, amountMaxLocal: 750, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "Australia", countrySlug: "australia", city: "Sydney", category: "transport", amountMinUsd: 80, amountMaxUsd: 150, localCurrency: "AUD", amountMinLocal: 120, amountMaxLocal: 225, notes: "Student Opal card", notesId: "Kartu pelajar Opal" },
  { country: "Australia", countrySlug: "australia", city: "Sydney", category: "utilities", amountMinUsd: 80, amountMaxUsd: 150, localCurrency: "AUD", amountMinLocal: 120, amountMaxLocal: 225, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Australia", countrySlug: "australia", city: "Sydney", category: "entertainment", amountMinUsd: 100, amountMaxUsd: 300, localCurrency: "AUD", amountMinLocal: 150, amountMaxLocal: 450, notes: "Social activities & leisure", notesId: "Aktivitas sosial & hiburan" },
  { country: "Australia", countrySlug: "australia", city: "Sydney", category: "tuition", amountMinUsd: 15000, amountMaxUsd: 35000, localCurrency: "AUD", amountMinLocal: 22500, amountMaxLocal: 52500, notes: "Varies by university and program", notesId: "Bervariasi tergantung universitas dan program" },
  // Australia - Melbourne
  { country: "Australia", countrySlug: "australia", city: "Melbourne", category: "rent", amountMinUsd: 600, amountMaxUsd: 1400, localCurrency: "AUD", amountMinLocal: 900, amountMaxLocal: 2100, notes: "Slightly cheaper than Sydney", notesId: "Sedikit lebih murah dari Sydney" },
  { country: "Australia", countrySlug: "australia", city: "Melbourne", category: "food", amountMinUsd: 220, amountMaxUsd: 450, localCurrency: "AUD", amountMinLocal: 330, amountMaxLocal: 675, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "Australia", countrySlug: "australia", city: "Melbourne", category: "transport", amountMinUsd: 60, amountMaxUsd: 120, localCurrency: "AUD", amountMinLocal: 90, amountMaxLocal: 180, notes: "Student Myki card", notesId: "Kartu pelajar Myki" },
  { country: "Australia", countrySlug: "australia", city: "Melbourne", category: "utilities", amountMinUsd: 70, amountMaxUsd: 130, localCurrency: "AUD", amountMinLocal: 105, amountMaxLocal: 195, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Australia", countrySlug: "australia", city: "Melbourne", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 250, localCurrency: "AUD", amountMinLocal: 120, amountMaxLocal: 375, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "Australia", countrySlug: "australia", city: "Melbourne", category: "tuition", amountMinUsd: 14000, amountMaxUsd: 32000, localCurrency: "AUD", amountMinLocal: 21000, amountMaxLocal: 48000, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },

  // Canada - Toronto
  { country: "Canada", countrySlug: "canada", city: "Toronto", category: "rent", amountMinUsd: 700, amountMaxUsd: 1500, localCurrency: "CAD", amountMinLocal: 950, amountMaxLocal: 2050, notes: "Shared to private accommodation", notesId: "Akomodasi sharing hingga pribadi" },
  { country: "Canada", countrySlug: "canada", city: "Toronto", category: "food", amountMinUsd: 250, amountMaxUsd: 500, localCurrency: "CAD", amountMinLocal: 340, amountMaxLocal: 680, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "Canada", countrySlug: "canada", city: "Toronto", category: "transport", amountMinUsd: 80, amountMaxUsd: 130, localCurrency: "CAD", amountMinLocal: 110, amountMaxLocal: 175, notes: "TTC student pass", notesId: "Kartu pelajar TTC" },
  { country: "Canada", countrySlug: "canada", city: "Toronto", category: "utilities", amountMinUsd: 80, amountMaxUsd: 150, localCurrency: "CAD", amountMinLocal: 110, amountMaxLocal: 200, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Canada", countrySlug: "canada", city: "Toronto", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 250, localCurrency: "CAD", amountMinLocal: 110, amountMaxLocal: 340, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "Canada", countrySlug: "canada", city: "Toronto", category: "tuition", amountMinUsd: 12000, amountMaxUsd: 30000, localCurrency: "CAD", amountMinLocal: 16300, amountMaxLocal: 40800, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },
  // Canada - Vancouver
  { country: "Canada", countrySlug: "canada", city: "Vancouver", category: "rent", amountMinUsd: 700, amountMaxUsd: 1600, localCurrency: "CAD", amountMinLocal: 950, amountMaxLocal: 2180, notes: "Shared to private accommodation", notesId: "Akomodasi sharing hingga pribadi" },
  { country: "Canada", countrySlug: "canada", city: "Vancouver", category: "food", amountMinUsd: 250, amountMaxUsd: 500, localCurrency: "CAD", amountMinLocal: 340, amountMaxLocal: 680, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "Canada", countrySlug: "canada", city: "Vancouver", category: "transport", amountMinUsd: 70, amountMaxUsd: 120, localCurrency: "CAD", amountMinLocal: 95, amountMaxLocal: 163, notes: "TransLink student pass", notesId: "Kartu pelajar TransLink" },
  { country: "Canada", countrySlug: "canada", city: "Vancouver", category: "utilities", amountMinUsd: 70, amountMaxUsd: 130, localCurrency: "CAD", amountMinLocal: 95, amountMaxLocal: 177, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Canada", countrySlug: "canada", city: "Vancouver", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 250, localCurrency: "CAD", amountMinLocal: 110, amountMaxLocal: 340, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "Canada", countrySlug: "canada", city: "Vancouver", category: "tuition", amountMinUsd: 11000, amountMaxUsd: 28000, localCurrency: "CAD", amountMinLocal: 14960, amountMaxLocal: 38080, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },

  // USA - New York
  { country: "United States", countrySlug: "usa", city: "New York", category: "rent", amountMinUsd: 1000, amountMaxUsd: 2500, localCurrency: "USD", amountMinLocal: 1000, amountMaxLocal: 2500, notes: "Shared to private apartment", notesId: "Apartemen sharing hingga pribadi" },
  { country: "United States", countrySlug: "usa", city: "New York", category: "food", amountMinUsd: 300, amountMaxUsd: 600, localCurrency: "USD", amountMinLocal: 300, amountMaxLocal: 600, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "United States", countrySlug: "usa", city: "New York", category: "transport", amountMinUsd: 90, amountMaxUsd: 130, localCurrency: "USD", amountMinLocal: 90, amountMaxLocal: 130, notes: "MetroCard student pass", notesId: "Kartu pelajar MetroCard" },
  { country: "United States", countrySlug: "usa", city: "New York", category: "utilities", amountMinUsd: 100, amountMaxUsd: 200, localCurrency: "USD", amountMinLocal: 100, amountMaxLocal: 200, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "United States", countrySlug: "usa", city: "New York", category: "entertainment", amountMinUsd: 100, amountMaxUsd: 350, localCurrency: "USD", amountMinLocal: 100, amountMaxLocal: 350, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "United States", countrySlug: "usa", city: "New York", category: "tuition", amountMinUsd: 20000, amountMaxUsd: 50000, localCurrency: "USD", amountMinLocal: 20000, amountMaxLocal: 50000, notes: "Varies widely by university", notesId: "Sangat bervariasi tergantung universitas" },
  // USA - Los Angeles
  { country: "United States", countrySlug: "usa", city: "Los Angeles", category: "rent", amountMinUsd: 800, amountMaxUsd: 2000, localCurrency: "USD", amountMinLocal: 800, amountMaxLocal: 2000, notes: "Shared to private apartment", notesId: "Apartemen sharing hingga pribadi" },
  { country: "United States", countrySlug: "usa", city: "Los Angeles", category: "food", amountMinUsd: 250, amountMaxUsd: 500, localCurrency: "USD", amountMinLocal: 250, amountMaxLocal: 500, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "United States", countrySlug: "usa", city: "Los Angeles", category: "transport", amountMinUsd: 50, amountMaxUsd: 150, localCurrency: "USD", amountMinLocal: 50, amountMaxLocal: 150, notes: "TAP card + occasional rideshare", notesId: "Kartu TAP + rideshare sesekali" },
  { country: "United States", countrySlug: "usa", city: "Los Angeles", category: "utilities", amountMinUsd: 80, amountMaxUsd: 160, localCurrency: "USD", amountMinLocal: 80, amountMaxLocal: 160, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "United States", countrySlug: "usa", city: "Los Angeles", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 300, localCurrency: "USD", amountMinLocal: 80, amountMaxLocal: 300, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "United States", countrySlug: "usa", city: "Los Angeles", category: "tuition", amountMinUsd: 18000, amountMaxUsd: 45000, localCurrency: "USD", amountMinLocal: 18000, amountMaxLocal: 45000, notes: "Varies widely by university", notesId: "Sangat bervariasi tergantung universitas" },

  // Ireland - Dublin
  { country: "Ireland", countrySlug: "ireland", city: "Dublin", category: "rent", amountMinUsd: 700, amountMaxUsd: 1500, localCurrency: "EUR", amountMinLocal: 650, amountMaxLocal: 1400, notes: "Shared to private accommodation", notesId: "Akomodasi sharing hingga pribadi" },
  { country: "Ireland", countrySlug: "ireland", city: "Dublin", category: "food", amountMinUsd: 200, amountMaxUsd: 450, localCurrency: "EUR", amountMinLocal: 185, amountMaxLocal: 415, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "Ireland", countrySlug: "ireland", city: "Dublin", category: "transport", amountMinUsd: 60, amountMaxUsd: 120, localCurrency: "EUR", amountMinLocal: 55, amountMaxLocal: 110, notes: "Leap card student fare", notesId: "Tarif pelajar Leap card" },
  { country: "Ireland", countrySlug: "ireland", city: "Dublin", category: "utilities", amountMinUsd: 80, amountMaxUsd: 150, localCurrency: "EUR", amountMinLocal: 74, amountMaxLocal: 138, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Ireland", countrySlug: "ireland", city: "Dublin", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 250, localCurrency: "EUR", amountMinLocal: 74, amountMaxLocal: 230, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "Ireland", countrySlug: "ireland", city: "Dublin", category: "tuition", amountMinUsd: 10000, amountMaxUsd: 25000, localCurrency: "EUR", amountMinLocal: 9200, amountMaxLocal: 23000, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },

  // Netherlands - Amsterdam
  { country: "Netherlands", countrySlug: "netherlands", city: "Amsterdam", category: "rent", amountMinUsd: 600, amountMaxUsd: 1400, localCurrency: "EUR", amountMinLocal: 550, amountMaxLocal: 1290, notes: "Student housing to private", notesId: "Asrama pelajar hingga pribadi" },
  { country: "Netherlands", countrySlug: "netherlands", city: "Amsterdam", category: "food", amountMinUsd: 200, amountMaxUsd: 400, localCurrency: "EUR", amountMinLocal: 185, amountMaxLocal: 370, notes: "Cooking at home to eating out", notesId: "Masak sendiri hingga makan di luar" },
  { country: "Netherlands", countrySlug: "netherlands", city: "Amsterdam", category: "transport", amountMinUsd: 40, amountMaxUsd: 80, localCurrency: "EUR", amountMinLocal: 37, amountMaxLocal: 74, notes: "OV-chipkaart student", notesId: "Kartu pelajar OV-chipkaart" },
  { country: "Netherlands", countrySlug: "netherlands", city: "Amsterdam", category: "utilities", amountMinUsd: 80, amountMaxUsd: 150, localCurrency: "EUR", amountMinLocal: 74, amountMaxLocal: 138, notes: "Electricity, water, internet", notesId: "Listrik, air, internet" },
  { country: "Netherlands", countrySlug: "netherlands", city: "Amsterdam", category: "entertainment", amountMinUsd: 80, amountMaxUsd: 200, localCurrency: "EUR", amountMinLocal: 74, amountMaxLocal: 185, notes: "Social activities", notesId: "Aktivitas sosial" },
  { country: "Netherlands", countrySlug: "netherlands", city: "Amsterdam", category: "tuition", amountMinUsd: 8000, amountMaxUsd: 20000, localCurrency: "EUR", amountMinLocal: 7400, amountMaxLocal: 18400, notes: "Varies by university", notesId: "Bervariasi tergantung universitas" },
];

console.log("Seeding cost of living data...");
for (const item of costData) {
  await conn.execute(
    `INSERT INTO costOfLivingData (country, countrySlug, city, category, amountMinUsd, amountMaxUsd, localCurrency, amountMinLocal, amountMaxLocal, notes, notesId, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
    [item.country, item.countrySlug, item.city, item.category, item.amountMinUsd, item.amountMaxUsd, item.localCurrency, item.amountMinLocal, item.amountMaxLocal, item.notes, item.notesId]
  );
}
console.log(`Inserted ${costData.length} cost of living entries`);

// =============================================
// CHECKLIST ITEMS
// =============================================
const checklistItems = [
  // 12 months before
  { phase: "12_months", category: "tests", sortOrder: 1, title: "Register for IELTS/TOEFL test", titleId: "Daftar tes IELTS/TOEFL", description: "Book your English proficiency test early to allow time for retakes if needed", descriptionId: "Pesan tes kemampuan bahasa Inggris lebih awal untuk memberi waktu mengulang jika diperlukan" },
  { phase: "12_months", category: "documents", sortOrder: 2, title: "Gather academic transcripts", titleId: "Kumpulkan transkrip akademik", description: "Request official transcripts from your school/university", descriptionId: "Minta transkrip resmi dari sekolah/universitas kamu" },
  { phase: "12_months", category: "applications", sortOrder: 3, title: "Research universities and programs", titleId: "Riset universitas dan program", description: "Use SpecTa's AI Aptitude Test to find matching programs", descriptionId: "Gunakan Tes Bakat AI SpecTa untuk menemukan program yang cocok" },
  { phase: "12_months", category: "finances", sortOrder: 4, title: "Create a study abroad budget", titleId: "Buat anggaran studi luar negeri", description: "Use our Cost of Living Calculator to estimate expenses", descriptionId: "Gunakan Kalkulator Biaya Hidup kami untuk memperkirakan pengeluaran" },
  { phase: "12_months", category: "applications", sortOrder: 5, title: "Book a FREE consultation with SpecTa", titleId: "Pesan konsultasi GRATIS dengan SpecTa", description: "Our counselors will help you plan your study abroad journey", descriptionId: "Konselor kami akan membantu merencanakan perjalanan studi luar negeri kamu" },

  // 9 months before
  { phase: "9_months", category: "tests", sortOrder: 1, title: "Take IELTS/TOEFL test", titleId: "Ikuti tes IELTS/TOEFL", description: "Complete your English proficiency test", descriptionId: "Selesaikan tes kemampuan bahasa Inggris kamu" },
  { phase: "9_months", category: "documents", sortOrder: 2, title: "Prepare personal statement / motivation letter", titleId: "Siapkan personal statement / surat motivasi", description: "Write a compelling essay about your goals and aspirations", descriptionId: "Tulis esai yang menarik tentang tujuan dan aspirasi kamu" },
  { phase: "9_months", category: "documents", sortOrder: 3, title: "Get recommendation letters", titleId: "Dapatkan surat rekomendasi", description: "Request letters from teachers, professors, or employers", descriptionId: "Minta surat dari guru, dosen, atau atasan" },
  { phase: "9_months", category: "applications", sortOrder: 4, title: "Submit university applications", titleId: "Kirim aplikasi universitas", description: "Apply to your shortlisted universities through SpecTa", descriptionId: "Daftar ke universitas pilihan melalui SpecTa" },
  { phase: "9_months", category: "finances", sortOrder: 5, title: "Apply for scholarships", titleId: "Daftar beasiswa", description: "Check our Scholarships page for available opportunities", descriptionId: "Cek halaman Beasiswa kami untuk peluang yang tersedia" },

  // 6 months before
  { phase: "6_months", category: "applications", sortOrder: 1, title: "Accept university offer", titleId: "Terima tawaran universitas", description: "Confirm your acceptance and pay any required deposits", descriptionId: "Konfirmasi penerimaan dan bayar deposit yang diperlukan" },
  { phase: "6_months", category: "visa", sortOrder: 2, title: "Start visa application process", titleId: "Mulai proses aplikasi visa", description: "Gather required documents and submit your student visa application", descriptionId: "Kumpulkan dokumen yang diperlukan dan ajukan aplikasi visa pelajar" },
  { phase: "6_months", category: "documents", sortOrder: 3, title: "Get passport ready", titleId: "Siapkan paspor", description: "Ensure your passport is valid for at least 6 months beyond your planned stay", descriptionId: "Pastikan paspor berlaku minimal 6 bulan setelah rencana tinggal" },
  { phase: "6_months", category: "finances", sortOrder: 4, title: "Set up international bank account", titleId: "Buka rekening bank internasional", description: "Research banking options in your destination country", descriptionId: "Riset pilihan perbankan di negara tujuan" },
  { phase: "6_months", category: "health", sortOrder: 5, title: "Get health check-up and vaccinations", titleId: "Lakukan pemeriksaan kesehatan dan vaksinasi", description: "Check if your destination requires specific vaccinations", descriptionId: "Cek apakah negara tujuan memerlukan vaksinasi tertentu" },

  // 3 months before
  { phase: "3_months", category: "accommodation", sortOrder: 1, title: "Arrange accommodation", titleId: "Atur akomodasi", description: "Book university housing or find private accommodation", descriptionId: "Pesan asrama universitas atau cari akomodasi pribadi" },
  { phase: "3_months", category: "finances", sortOrder: 2, title: "Pay tuition fees", titleId: "Bayar biaya kuliah", description: "Complete tuition payment or set up payment plan", descriptionId: "Selesaikan pembayaran kuliah atau atur rencana pembayaran" },
  { phase: "3_months", category: "health", sortOrder: 3, title: "Arrange health insurance", titleId: "Atur asuransi kesehatan", description: "Get OSHC (Australia), NHS (UK), or equivalent coverage", descriptionId: "Dapatkan OSHC (Australia), NHS (UK), atau cakupan setara" },
  { phase: "3_months", category: "travel", sortOrder: 4, title: "Book flights", titleId: "Pesan tiket pesawat", description: "Book your flights early for better prices", descriptionId: "Pesan tiket lebih awal untuk harga lebih baik" },
  { phase: "3_months", category: "documents", sortOrder: 5, title: "Prepare certified document copies", titleId: "Siapkan salinan dokumen tersertifikasi", description: "Get notarized copies of important documents", descriptionId: "Dapatkan salinan notaris dari dokumen penting" },

  // 1 month before
  { phase: "1_month", category: "travel", sortOrder: 1, title: "Confirm flight and accommodation details", titleId: "Konfirmasi detail penerbangan dan akomodasi", description: "Double-check all bookings and arrangements", descriptionId: "Periksa ulang semua pemesanan dan pengaturan" },
  { phase: "1_month", category: "finances", sortOrder: 2, title: "Arrange currency exchange", titleId: "Atur penukaran mata uang", description: "Get some local currency for initial expenses", descriptionId: "Dapatkan mata uang lokal untuk pengeluaran awal" },
  { phase: "1_month", category: "documents", sortOrder: 3, title: "Organize all documents in one folder", titleId: "Rapikan semua dokumen dalam satu folder", description: "Passport, visa, acceptance letter, insurance, accommodation proof", descriptionId: "Paspor, visa, surat penerimaan, asuransi, bukti akomodasi" },
  { phase: "1_month", category: "travel", sortOrder: 4, title: "Research airport pickup / transport", titleId: "Riset penjemputan bandara / transportasi", description: "Check if university offers airport pickup service", descriptionId: "Cek apakah universitas menyediakan layanan penjemputan bandara" },
  { phase: "1_month", category: "accommodation", sortOrder: 5, title: "Pack essentials and check luggage limits", titleId: "Pak barang penting dan cek batas bagasi", description: "Check airline baggage allowance and pack accordingly", descriptionId: "Cek jatah bagasi maskapai dan pak sesuai" },

  // 2 weeks before
  { phase: "2_weeks", category: "documents", sortOrder: 1, title: "Print all important documents", titleId: "Cetak semua dokumen penting", description: "Have physical copies of visa, acceptance letter, insurance", descriptionId: "Siapkan salinan fisik visa, surat penerimaan, asuransi" },
  { phase: "2_weeks", category: "travel", sortOrder: 2, title: "Notify your bank about travel", titleId: "Beritahu bank tentang perjalanan", description: "Prevent your cards from being blocked abroad", descriptionId: "Cegah kartu kamu diblokir di luar negeri" },
  { phase: "2_weeks", category: "health", sortOrder: 3, title: "Get prescription medications", titleId: "Dapatkan obat resep", description: "Bring enough medication with doctor's letter if needed", descriptionId: "Bawa obat yang cukup dengan surat dokter jika diperlukan" },
  { phase: "2_weeks", category: "travel", sortOrder: 4, title: "Download useful apps", titleId: "Unduh aplikasi berguna", description: "Maps, translation, banking, and university apps", descriptionId: "Peta, terjemahan, perbankan, dan aplikasi universitas" },

  // Departure day
  { phase: "departure", category: "travel", sortOrder: 1, title: "Check-in online and confirm seat", titleId: "Check-in online dan konfirmasi kursi", description: "Complete online check-in 24 hours before departure", descriptionId: "Selesaikan check-in online 24 jam sebelum keberangkatan" },
  { phase: "departure", category: "documents", sortOrder: 2, title: "Carry all documents in hand luggage", titleId: "Bawa semua dokumen di tas tangan", description: "Never put important documents in checked luggage", descriptionId: "Jangan pernah taruh dokumen penting di bagasi" },
  { phase: "departure", category: "travel", sortOrder: 3, title: "Arrive at airport 3 hours early", titleId: "Tiba di bandara 3 jam lebih awal", description: "Allow extra time for international check-in and immigration", descriptionId: "Beri waktu ekstra untuk check-in internasional dan imigrasi" },
  { phase: "departure", category: "travel", sortOrder: 4, title: "Say goodbye and start your adventure!", titleId: "Ucapkan selamat tinggal dan mulai petualanganmu!", description: "You're ready! SpecTa Education wishes you the best 🎓✈️", descriptionId: "Kamu siap! SpecTa Education mendoakan yang terbaik 🎓✈️" },
];

console.log("Seeding checklist items...");
for (const item of checklistItems) {
  await conn.execute(
    `INSERT INTO checklistItems (phase, category, sortOrder, title, titleId, description, descriptionId, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
    [item.phase, item.category, item.sortOrder, item.title, item.titleId, item.description, item.descriptionId]
  );
}
console.log(`Inserted ${checklistItems.length} checklist items`);

await conn.end();
console.log("Done!");
