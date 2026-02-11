// RIASEC + Multiple Intelligences Aptitude Test Question Bank
// Based on IIP RIASEC Markers (Liao, Armstrong & Rounds 2008) and Gardner's MI Theory

export type Language = "id" | "en";

export interface AptitudeQuestion {
  id: string;
  category: string; // RIASEC dimension or MI type
  text: { id: string; en: string };
}

export interface PersonalQuestion {
  id: string;
  text: { id: string; en: string };
  type: "select" | "multiselect" | "text";
  options?: { value: string; label: { id: string; en: string } }[];
}

// ========== RIASEC QUESTIONS (30 total, 5 per dimension) ==========
// Scale: 1 = Sangat Tidak Suka / Strongly Dislike → 5 = Sangat Suka / Strongly Like

export const riasecQuestions: AptitudeQuestion[] = [
  // REALISTIC (R) - Hands-on, practical, physical
  { id: "R1", category: "R", text: { id: "Saya suka memperbaiki barang elektronik atau mesin", en: "I enjoy fixing electronics or machines" } },
  { id: "R2", category: "R", text: { id: "Saya suka bekerja di luar ruangan dan berinteraksi dengan alam", en: "I enjoy working outdoors and interacting with nature" } },
  { id: "R3", category: "R", text: { id: "Saya lebih suka membuat sesuatu dengan tangan saya sendiri", en: "I prefer making things with my own hands" } },
  { id: "R4", category: "R", text: { id: "Saya tertarik dengan cara kerja mesin, kendaraan, atau alat berat", en: "I'm interested in how machines, vehicles, or heavy equipment work" } },
  { id: "R5", category: "R", text: { id: "Saya suka olahraga atau aktivitas fisik yang menantang", en: "I enjoy sports or challenging physical activities" } },

  // INVESTIGATIVE (I) - Analytical, intellectual, scientific
  { id: "I1", category: "I", text: { id: "Saya suka memecahkan teka-teki atau soal matematika yang rumit", en: "I enjoy solving puzzles or complex math problems" } },
  { id: "I2", category: "I", text: { id: "Saya penasaran tentang bagaimana sesuatu bekerja secara ilmiah", en: "I'm curious about how things work scientifically" } },
  { id: "I3", category: "I", text: { id: "Saya suka membaca artikel tentang penemuan atau teknologi baru", en: "I enjoy reading articles about new discoveries or technology" } },
  { id: "I4", category: "I", text: { id: "Saya lebih suka menganalisis data daripada bekerja dengan orang", en: "I prefer analyzing data over working with people" } },
  { id: "I5", category: "I", text: { id: "Saya suka melakukan eksperimen atau riset untuk menemukan jawaban", en: "I enjoy conducting experiments or research to find answers" } },

  // ARTISTIC (A) - Creative, expressive, original
  { id: "A1", category: "A", text: { id: "Saya suka menggambar, melukis, atau membuat karya seni", en: "I enjoy drawing, painting, or creating artwork" } },
  { id: "A2", category: "A", text: { id: "Saya suka menulis cerita, puisi, atau konten kreatif", en: "I enjoy writing stories, poetry, or creative content" } },
  { id: "A3", category: "A", text: { id: "Saya tertarik dengan desain, fashion, atau dekorasi interior", en: "I'm interested in design, fashion, or interior decoration" } },
  { id: "A4", category: "A", text: { id: "Saya suka bermain musik, menyanyi, atau menari", en: "I enjoy playing music, singing, or dancing" } },
  { id: "A5", category: "A", text: { id: "Saya lebih suka pekerjaan yang memungkinkan saya berekspresi secara kreatif", en: "I prefer work that allows me to express myself creatively" } },

  // SOCIAL (S) - Helping, teaching, counseling
  { id: "S1", category: "S", text: { id: "Saya suka membantu teman yang sedang menghadapi masalah", en: "I enjoy helping friends who are facing problems" } },
  { id: "S2", category: "S", text: { id: "Saya suka mengajar atau menjelaskan sesuatu kepada orang lain", en: "I enjoy teaching or explaining things to others" } },
  { id: "S3", category: "S", text: { id: "Saya tertarik dengan kegiatan sosial atau volunteer", en: "I'm interested in social activities or volunteering" } },
  { id: "S4", category: "S", text: { id: "Saya merasa senang ketika bisa membuat orang lain merasa lebih baik", en: "I feel happy when I can make others feel better" } },
  { id: "S5", category: "S", text: { id: "Saya suka bekerja dalam tim dan berkolaborasi dengan orang lain", en: "I enjoy working in teams and collaborating with others" } },

  // ENTERPRISING (E) - Leading, persuading, managing
  { id: "E1", category: "E", text: { id: "Saya suka memimpin kelompok atau mengorganisir acara", en: "I enjoy leading groups or organizing events" } },
  { id: "E2", category: "E", text: { id: "Saya tertarik dengan dunia bisnis dan kewirausahaan", en: "I'm interested in business and entrepreneurship" } },
  { id: "E3", category: "E", text: { id: "Saya suka meyakinkan orang lain untuk mengikuti ide saya", en: "I enjoy convincing others to follow my ideas" } },
  { id: "E4", category: "E", text: { id: "Saya suka mengambil risiko untuk mencapai tujuan yang besar", en: "I enjoy taking risks to achieve big goals" } },
  { id: "E5", category: "E", text: { id: "Saya tertarik dengan public speaking atau debat", en: "I'm interested in public speaking or debate" } },

  // CONVENTIONAL (C) - Organizing, detail-oriented, systematic
  { id: "C1", category: "C", text: { id: "Saya suka mengatur dan merapikan data atau file", en: "I enjoy organizing and tidying up data or files" } },
  { id: "C2", category: "C", text: { id: "Saya lebih suka mengikuti prosedur yang jelas daripada improvisasi", en: "I prefer following clear procedures over improvising" } },
  { id: "C3", category: "C", text: { id: "Saya teliti dan memperhatikan detail kecil dalam pekerjaan", en: "I'm meticulous and pay attention to small details in work" } },
  { id: "C4", category: "C", text: { id: "Saya suka bekerja dengan angka, spreadsheet, atau akuntansi", en: "I enjoy working with numbers, spreadsheets, or accounting" } },
  { id: "C5", category: "C", text: { id: "Saya merasa nyaman dengan pekerjaan yang terstruktur dan rutin", en: "I feel comfortable with structured and routine work" } },
];

// ========== MULTIPLE INTELLIGENCES QUESTIONS (16 total, 2 per type) ==========
// Scale: 1 = Sangat Tidak Setuju / Strongly Disagree → 5 = Sangat Setuju / Strongly Agree

export const miQuestions: AptitudeQuestion[] = [
  // Linguistic Intelligence
  { id: "MI_LI1", category: "linguistic", text: { id: "Saya mudah mengekspresikan pikiran saya melalui tulisan atau kata-kata", en: "I can easily express my thoughts through writing or words" } },
  { id: "MI_LI2", category: "linguistic", text: { id: "Saya suka membaca buku dan belajar bahasa baru", en: "I enjoy reading books and learning new languages" } },

  // Logical-Mathematical Intelligence
  { id: "MI_LM1", category: "logical", text: { id: "Saya suka mencari pola dan hubungan logis dalam suatu masalah", en: "I enjoy finding patterns and logical relationships in problems" } },
  { id: "MI_LM2", category: "logical", text: { id: "Saya bisa dengan mudah menghitung dan memecahkan soal matematika", en: "I can easily calculate and solve math problems" } },

  // Spatial Intelligence
  { id: "MI_SP1", category: "spatial", text: { id: "Saya bisa membayangkan objek 3D di kepala saya dengan mudah", en: "I can easily visualize 3D objects in my head" } },
  { id: "MI_SP2", category: "spatial", text: { id: "Saya pandai membaca peta, diagram, atau denah bangunan", en: "I'm good at reading maps, diagrams, or floor plans" } },

  // Musical Intelligence
  { id: "MI_MU1", category: "musical", text: { id: "Saya bisa mengenali nada, ritme, dan melodi dengan mudah", en: "I can easily recognize tones, rhythms, and melodies" } },
  { id: "MI_MU2", category: "musical", text: { id: "Saya sering mendengarkan musik dan bisa memainkan alat musik", en: "I often listen to music and can play a musical instrument" } },

  // Bodily-Kinesthetic Intelligence
  { id: "MI_BK1", category: "kinesthetic", text: { id: "Saya belajar lebih baik dengan praktik langsung daripada membaca teori", en: "I learn better through hands-on practice than reading theory" } },
  { id: "MI_BK2", category: "kinesthetic", text: { id: "Saya memiliki koordinasi tubuh yang baik dalam olahraga atau kerajinan", en: "I have good body coordination in sports or crafts" } },

  // Interpersonal Intelligence
  { id: "MI_IE1", category: "interpersonal", text: { id: "Saya mudah memahami perasaan dan motivasi orang lain", en: "I can easily understand other people's feelings and motivations" } },
  { id: "MI_IE2", category: "interpersonal", text: { id: "Saya sering menjadi penengah ketika teman-teman saya berkonflik", en: "I often become a mediator when my friends have conflicts" } },

  // Intrapersonal Intelligence
  { id: "MI_IA1", category: "intrapersonal", text: { id: "Saya sangat mengenal kekuatan dan kelemahan diri saya sendiri", en: "I know my own strengths and weaknesses very well" } },
  { id: "MI_IA2", category: "intrapersonal", text: { id: "Saya sering merefleksikan tujuan hidup dan nilai-nilai pribadi saya", en: "I often reflect on my life goals and personal values" } },

  // Naturalistic Intelligence
  { id: "MI_NA1", category: "naturalistic", text: { id: "Saya tertarik dengan alam, hewan, tumbuhan, dan lingkungan", en: "I'm interested in nature, animals, plants, and the environment" } },
  { id: "MI_NA2", category: "naturalistic", text: { id: "Saya bisa mengenali dan mengklasifikasikan berbagai jenis makhluk hidup", en: "I can recognize and classify various types of living things" } },
];

// ========== PERSONAL CONTEXT QUESTIONS (5 questions) ==========

export const personalQuestions: PersonalQuestion[] = [
  {
    id: "P1",
    text: { id: "Apa tingkat pendidikan kamu saat ini?", en: "What is your current education level?" },
    type: "select",
    options: [
      { value: "smp", label: { id: "SMP / Kelas 7-9", en: "Junior High School / Grade 7-9" } },
      { value: "sma", label: { id: "SMA/SMK / Kelas 10-12", en: "Senior High School / Grade 10-12" } },
      { value: "gap_year", label: { id: "Gap Year / Lulus SMA", en: "Gap Year / High School Graduate" } },
      { value: "d3_s1", label: { id: "Kuliah D3/S1", en: "Undergraduate (D3/S1)" } },
      { value: "s2", label: { id: "S2 / Pascasarjana", en: "Postgraduate (S2/Masters)" } },
    ],
  },
  {
    id: "P2",
    text: { id: "Mata pelajaran apa yang paling kamu sukai? (Pilih maks 3)", en: "Which subjects do you enjoy the most? (Pick up to 3)" },
    type: "multiselect",
    options: [
      { value: "math", label: { id: "Matematika", en: "Mathematics" } },
      { value: "physics", label: { id: "Fisika", en: "Physics" } },
      { value: "chemistry", label: { id: "Kimia", en: "Chemistry" } },
      { value: "biology", label: { id: "Biologi", en: "Biology" } },
      { value: "bahasa", label: { id: "Bahasa Indonesia/Inggris", en: "Languages (Indonesian/English)" } },
      { value: "history", label: { id: "Sejarah", en: "History" } },
      { value: "economics", label: { id: "Ekonomi", en: "Economics" } },
      { value: "geography", label: { id: "Geografi", en: "Geography" } },
      { value: "art", label: { id: "Seni & Budaya", en: "Art & Culture" } },
      { value: "it", label: { id: "Informatika / Komputer", en: "IT / Computer Science" } },
      { value: "pe", label: { id: "Olahraga", en: "Physical Education" } },
      { value: "sociology", label: { id: "Sosiologi", en: "Sociology" } },
    ],
  },
  {
    id: "P3",
    text: { id: "Apa hobi atau kegiatan yang paling sering kamu lakukan?", en: "What hobbies or activities do you do most often?" },
    type: "multiselect",
    options: [
      { value: "gaming", label: { id: "Gaming / Main game", en: "Gaming" } },
      { value: "reading", label: { id: "Membaca buku/artikel", en: "Reading books/articles" } },
      { value: "sports", label: { id: "Olahraga", en: "Sports" } },
      { value: "music", label: { id: "Musik (main/dengar)", en: "Music (play/listen)" } },
      { value: "art_craft", label: { id: "Seni & Kerajinan", en: "Art & Crafts" } },
      { value: "coding", label: { id: "Coding / Teknologi", en: "Coding / Technology" } },
      { value: "social_media", label: { id: "Konten kreator / Sosmed", en: "Content creation / Social media" } },
      { value: "cooking", label: { id: "Masak / Kuliner", en: "Cooking / Culinary" } },
      { value: "volunteering", label: { id: "Volunteer / Kegiatan sosial", en: "Volunteering / Social activities" } },
      { value: "travel", label: { id: "Traveling / Jalan-jalan", en: "Traveling" } },
      { value: "writing", label: { id: "Menulis / Blogging", en: "Writing / Blogging" } },
      { value: "debate", label: { id: "Debat / Public speaking", en: "Debate / Public speaking" } },
    ],
  },
  {
    id: "P4",
    text: { id: "Apa yang paling penting buat kamu dalam memilih jurusan kuliah?", en: "What matters most to you when choosing a major?" },
    type: "select",
    options: [
      { value: "passion", label: { id: "Sesuai passion dan minat saya", en: "Aligned with my passion and interests" } },
      { value: "salary", label: { id: "Prospek gaji yang tinggi", en: "High salary prospects" } },
      { value: "job_market", label: { id: "Banyak peluang kerja", en: "Many job opportunities" } },
      { value: "parents", label: { id: "Sesuai harapan orang tua", en: "Meeting parents' expectations" } },
      { value: "impact", label: { id: "Bisa memberi dampak positif ke masyarakat", en: "Making a positive impact on society" } },
      { value: "flexibility", label: { id: "Fleksibel dan bisa dipakai di banyak bidang", en: "Flexible and applicable to many fields" } },
    ],
  },
  {
    id: "P5",
    text: { id: "Bagaimana gaya belajar kamu?", en: "What is your learning style?" },
    type: "select",
    options: [
      { value: "visual", label: { id: "Visual — saya suka diagram, video, dan gambar", en: "Visual — I like diagrams, videos, and images" } },
      { value: "auditory", label: { id: "Auditori — saya suka mendengarkan penjelasan", en: "Auditory — I like listening to explanations" } },
      { value: "reading", label: { id: "Baca/Tulis — saya suka membaca dan mencatat", en: "Read/Write — I like reading and taking notes" } },
      { value: "kinesthetic", label: { id: "Kinestetik — saya suka praktik langsung", en: "Kinesthetic — I like hands-on practice" } },
    ],
  },
];

// ========== RIASEC TYPE DESCRIPTIONS ==========

export const riasecTypes = {
  R: {
    name: { id: "Realistis", en: "Realistic" },
    emoji: "🔧",
    description: {
      id: "Kamu tipe orang yang suka bekerja dengan tangan, alat, mesin, atau alam. Kamu praktis, mandiri, dan suka tantangan fisik.",
      en: "You're the type who enjoys working with hands, tools, machines, or nature. You're practical, independent, and enjoy physical challenges.",
    },
    color: "#EF4444",
  },
  I: {
    name: { id: "Investigatif", en: "Investigative" },
    emoji: "🔬",
    description: {
      id: "Kamu tipe pemikir yang suka menganalisis, meneliti, dan memecahkan masalah kompleks. Kamu penasaran dan suka mencari tahu.",
      en: "You're a thinker who enjoys analyzing, researching, and solving complex problems. You're curious and love finding answers.",
    },
    color: "#3B82F6",
  },
  A: {
    name: { id: "Artistik", en: "Artistic" },
    emoji: "🎨",
    description: {
      id: "Kamu tipe kreatif yang suka berekspresi melalui seni, desain, musik, atau tulisan. Kamu imajinatif dan orisinal.",
      en: "You're a creative type who loves expressing through art, design, music, or writing. You're imaginative and original.",
    },
    color: "#A855F7",
  },
  S: {
    name: { id: "Sosial", en: "Social" },
    emoji: "🤝",
    description: {
      id: "Kamu tipe orang yang suka membantu, mengajar, dan berinteraksi dengan orang lain. Kamu empatis dan peduli.",
      en: "You're the type who enjoys helping, teaching, and interacting with others. You're empathetic and caring.",
    },
    color: "#10B981",
  },
  E: {
    name: { id: "Enterprising", en: "Enterprising" },
    emoji: "🚀",
    description: {
      id: "Kamu tipe pemimpin yang suka mengambil inisiatif, memimpin tim, dan mewujudkan ide besar. Kamu ambisius dan persuasif.",
      en: "You're a leader who takes initiative, leads teams, and brings big ideas to life. You're ambitious and persuasive.",
    },
    color: "#F59E0B",
  },
  C: {
    name: { id: "Konvensional", en: "Conventional" },
    emoji: "📊",
    description: {
      id: "Kamu tipe orang yang terorganisir, teliti, dan suka bekerja dengan sistem yang terstruktur. Kamu bisa diandalkan dan detail-oriented.",
      en: "You're organized, meticulous, and enjoy working with structured systems. You're reliable and detail-oriented.",
    },
    color: "#6366F1",
  },
};

// ========== MI TYPE DESCRIPTIONS ==========

export const miTypes = {
  linguistic: { name: { id: "Linguistik", en: "Linguistic" }, emoji: "📝", color: "#EF4444" },
  logical: { name: { id: "Logis-Matematis", en: "Logical-Mathematical" }, emoji: "🧮", color: "#3B82F6" },
  spatial: { name: { id: "Spasial-Visual", en: "Spatial-Visual" }, emoji: "🎯", color: "#A855F7" },
  musical: { name: { id: "Musikal", en: "Musical" }, emoji: "🎵", color: "#EC4899" },
  kinesthetic: { name: { id: "Kinestetik", en: "Bodily-Kinesthetic" }, emoji: "🏃", color: "#F59E0B" },
  interpersonal: { name: { id: "Interpersonal", en: "Interpersonal" }, emoji: "👥", color: "#10B981" },
  intrapersonal: { name: { id: "Intrapersonal", en: "Intrapersonal" }, emoji: "🧘", color: "#6366F1" },
  naturalistic: { name: { id: "Naturalis", en: "Naturalistic" }, emoji: "🌿", color: "#22C55E" },
};

// ========== LIKERT SCALE LABELS ==========

export const likertLabels = {
  riasec: {
    id: ["Sangat Tidak Suka", "Tidak Suka", "Netral", "Suka", "Sangat Suka"],
    en: ["Strongly Dislike", "Dislike", "Neutral", "Like", "Strongly Like"],
  },
  mi: {
    id: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"],
    en: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
  },
};

// ========== UI LABELS ==========

export const uiLabels = {
  title: { id: "Tes Bakat AI", en: "AI Aptitude Test" },
  subtitle: { id: "Temukan jurusan kuliah yang paling cocok untuk kamu!", en: "Discover the best college major for you!" },
  startButton: { id: "Mulai Tes Bakat", en: "Start Aptitude Test" },
  nextButton: { id: "Lanjut", en: "Next" },
  backButton: { id: "Kembali", en: "Back" },
  submitButton: { id: "Lihat Hasil Saya!", en: "See My Results!" },
  analyzingTitle: { id: "AI sedang menganalisis jawaban kamu...", en: "AI is analyzing your answers..." },
  analyzingSubtitle: { id: "Mohon tunggu sebentar, kami sedang menyiapkan hasil yang personal untuk kamu", en: "Please wait a moment, we're preparing personalized results for you" },
  section1Title: { id: "Bagian 1: Minat & Aktivitas", en: "Part 1: Interests & Activities" },
  section1Subtitle: { id: "Seberapa suka kamu dengan aktivitas-aktivitas berikut?", en: "How much do you enjoy the following activities?" },
  section2Title: { id: "Bagian 2: Kecerdasan & Kekuatan", en: "Part 2: Intelligence & Strengths" },
  section2Subtitle: { id: "Seberapa setuju kamu dengan pernyataan berikut?", en: "How much do you agree with the following statements?" },
  section3Title: { id: "Bagian 3: Tentang Kamu", en: "Part 3: About You" },
  section3Subtitle: { id: "Bantu kami mengenal kamu lebih baik!", en: "Help us get to know you better!" },
  resultsTitle: { id: "Hasil Tes Bakat Kamu", en: "Your Aptitude Test Results" },
  personalityTitle: { id: "Profil Kepribadian", en: "Personality Profile" },
  hollandCodeTitle: { id: "Holland Code Kamu", en: "Your Holland Code" },
  intelligenceTitle: { id: "Profil Kecerdasan", en: "Intelligence Profile" },
  majorTitle: { id: "Jurusan yang Cocok untuk Kamu", en: "Majors That Fit You" },
  careerTitle: { id: "Prospek Karir", en: "Career Outlook" },
  parentTitle: { id: "Untuk Orang Tua", en: "For Parents" },
  parentSubtitle: { id: "Ringkasan hasil tes bakat anak Anda", en: "Summary of your child's aptitude test results" },
  ctaTitle: { id: "Mau tau lebih lanjut?", en: "Want to know more?" },
  ctaSubtitle: { id: "Konsultasi GRATIS dengan counselor SpecTa untuk rekomendasi universitas!", en: "FREE consultation with a SpecTa counselor for university recommendations!" },
  ctaButton: { id: "Konsultasi Gratis", en: "Free Consultation" },
  retakeButton: { id: "Ulangi Tes", en: "Retake Test" },
  shareButton: { id: "Bagikan Hasil", en: "Share Results" },
  compatibilityLabel: { id: "Cocok", en: "Match" },
  questionOf: { id: "dari", en: "of" },
  leadCaptureName: { id: "Nama lengkap kamu", en: "Your full name" },
  leadCaptureEmail: { id: "Email kamu", en: "Your email" },
  leadCapturePhone: { id: "Nomor WhatsApp kamu", en: "Your WhatsApp number" },
  leadCaptureTitle: { id: "Simpan hasil kamu!", en: "Save your results!" },
  leadCaptureSubtitle: { id: "Masukkan data kamu untuk menyimpan hasil dan mendapat rekomendasi personal dari counselor SpecTa", en: "Enter your info to save results and get personal recommendations from a SpecTa counselor" },
  leadCaptureButton: { id: "Simpan & Lihat Hasil", en: "Save & View Results" },
};
