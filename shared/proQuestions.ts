// Tes Bakat AI Pro — Premium 25-Minute Assessment
// 7 Sections, ~97 questions, 7 different question formats
// Based on: RIASEC (Holland), Gardner MI, Big Five, SJT, Values Assessment

export type Language = "id" | "en";

// ========== SECTION 1: PROFIL DIRI ==========
export interface ProfilDiriField {
  id: string;
  label: { id: string; en: string };
  type: "text" | "select" | "textarea";
  placeholder?: { id: string; en: string };
  required: boolean;
  options?: { value: string; label: { id: string; en: string } }[];
}

export const profilDiriFields: ProfilDiriField[] = [
  {
    id: "school",
    label: { id: "Nama Sekolah", en: "School Name" },
    type: "text",
    placeholder: { id: "Contoh: SMA Negeri 1 Jakarta", en: "e.g. SMA Negeri 1 Jakarta" },
    required: true,
  },
  {
    id: "grade",
    label: { id: "Kelas", en: "Grade" },
    type: "select",
    required: true,
    options: [
      { value: "smp_7", label: { id: "SMP Kelas 7", en: "Grade 7" } },
      { value: "smp_8", label: { id: "SMP Kelas 8", en: "Grade 8" } },
      { value: "smp_9", label: { id: "SMP Kelas 9", en: "Grade 9" } },
      { value: "sma_10", label: { id: "SMA Kelas 10", en: "Grade 10" } },
      { value: "sma_11", label: { id: "SMA Kelas 11", en: "Grade 11" } },
      { value: "sma_12", label: { id: "SMA Kelas 12", en: "Grade 12" } },
      { value: "gap_year", label: { id: "Gap Year / Lulus SMA", en: "Gap Year / Graduated" } },
    ],
  },
  {
    id: "city",
    label: { id: "Kota Domisili", en: "City" },
    type: "text",
    placeholder: { id: "Contoh: Jakarta", en: "e.g. Jakarta" },
    required: true,
  },
  {
    id: "dreamJob",
    label: { id: "Apa cita-cita atau pekerjaan impianmu saat ini?", en: "What is your dream job right now?" },
    type: "textarea",
    placeholder: { id: "Ceritakan secara singkat...", en: "Tell us briefly..." },
    required: false,
  },
  {
    id: "parentEmail",
    label: { id: "Email Orang Tua (opsional — untuk laporan orang tua)", en: "Parent Email (optional — for parent report)" },
    type: "text",
    placeholder: { id: "email.orangtua@contoh.com", en: "parent@example.com" },
    required: false,
  },
];

// ========== SECTION 2: MINAT KARIR — RIASEC (30 Likert Scale) ==========
export interface LikertQuestion {
  id: string;
  category: string;
  text: { id: string; en: string };
}

export const riasecProQuestions: LikertQuestion[] = [
  // REALISTIC (R) — Hands-on, practical, physical
  { id: "R1", category: "R", text: { id: "Saya suka memperbaiki barang elektronik atau mesin", en: "I enjoy fixing electronics or machines" } },
  { id: "R2", category: "R", text: { id: "Saya suka bekerja di luar ruangan dan berinteraksi dengan alam", en: "I enjoy working outdoors and interacting with nature" } },
  { id: "R3", category: "R", text: { id: "Saya lebih suka membuat sesuatu dengan tangan saya sendiri", en: "I prefer making things with my own hands" } },
  { id: "R4", category: "R", text: { id: "Saya tertarik dengan cara kerja mesin, kendaraan, atau alat berat", en: "I'm interested in how machines, vehicles, or heavy equipment work" } },
  { id: "R5", category: "R", text: { id: "Saya suka olahraga atau aktivitas fisik yang menantang", en: "I enjoy sports or challenging physical activities" } },

  // INVESTIGATIVE (I) — Analytical, intellectual, scientific
  { id: "I1", category: "I", text: { id: "Saya suka memecahkan teka-teki atau soal matematika yang rumit", en: "I enjoy solving puzzles or complex math problems" } },
  { id: "I2", category: "I", text: { id: "Saya penasaran tentang bagaimana sesuatu bekerja secara ilmiah", en: "I'm curious about how things work scientifically" } },
  { id: "I3", category: "I", text: { id: "Saya suka membaca artikel tentang penemuan atau teknologi baru", en: "I enjoy reading articles about new discoveries or technology" } },
  { id: "I4", category: "I", text: { id: "Saya lebih suka menganalisis data daripada bekerja dengan orang", en: "I prefer analyzing data over working with people" } },
  { id: "I5", category: "I", text: { id: "Saya suka melakukan eksperimen atau riset untuk menemukan jawaban", en: "I enjoy conducting experiments or research to find answers" } },

  // ARTISTIC (A) — Creative, expressive, original
  { id: "A1", category: "A", text: { id: "Saya suka menggambar, melukis, atau membuat karya seni", en: "I enjoy drawing, painting, or creating artwork" } },
  { id: "A2", category: "A", text: { id: "Saya suka menulis cerita, puisi, atau konten kreatif", en: "I enjoy writing stories, poetry, or creative content" } },
  { id: "A3", category: "A", text: { id: "Saya tertarik dengan desain, fashion, atau dekorasi interior", en: "I'm interested in design, fashion, or interior decoration" } },
  { id: "A4", category: "A", text: { id: "Saya suka bermain musik, menyanyi, atau menari", en: "I enjoy playing music, singing, or dancing" } },
  { id: "A5", category: "A", text: { id: "Saya lebih suka pekerjaan yang memungkinkan saya berekspresi secara kreatif", en: "I prefer work that allows me to express myself creatively" } },

  // SOCIAL (S) — Helping, teaching, counseling
  { id: "S1", category: "S", text: { id: "Saya suka membantu teman yang sedang menghadapi masalah", en: "I enjoy helping friends who are facing problems" } },
  { id: "S2", category: "S", text: { id: "Saya suka mengajar atau menjelaskan sesuatu kepada orang lain", en: "I enjoy teaching or explaining things to others" } },
  { id: "S3", category: "S", text: { id: "Saya tertarik dengan kegiatan sosial atau volunteer", en: "I'm interested in social activities or volunteering" } },
  { id: "S4", category: "S", text: { id: "Saya merasa senang ketika bisa membuat orang lain merasa lebih baik", en: "I feel happy when I can make others feel better" } },
  { id: "S5", category: "S", text: { id: "Saya suka bekerja dalam tim dan berkolaborasi dengan orang lain", en: "I enjoy working in teams and collaborating with others" } },

  // ENTERPRISING (E) — Leading, persuading, managing
  { id: "E1", category: "E", text: { id: "Saya suka memimpin kelompok atau organisasi", en: "I enjoy leading groups or organizations" } },
  { id: "E2", category: "E", text: { id: "Saya tertarik dengan bisnis, investasi, atau kewirausahaan", en: "I'm interested in business, investing, or entrepreneurship" } },
  { id: "E3", category: "E", text: { id: "Saya suka meyakinkan orang lain tentang ide atau produk saya", en: "I enjoy convincing others about my ideas or products" } },
  { id: "E4", category: "E", text: { id: "Saya suka mengambil risiko untuk mencapai tujuan besar", en: "I enjoy taking risks to achieve big goals" } },
  { id: "E5", category: "E", text: { id: "Saya suka berkompetisi dan menjadi yang terbaik", en: "I enjoy competing and being the best" } },

  // CONVENTIONAL (C) — Organizing, detail-oriented, systematic
  { id: "C1", category: "C", text: { id: "Saya suka mengatur jadwal dan membuat rencana yang terstruktur", en: "I enjoy organizing schedules and making structured plans" } },
  { id: "C2", category: "C", text: { id: "Saya teliti dan memperhatikan detail dalam pekerjaan saya", en: "I'm thorough and pay attention to detail in my work" } },
  { id: "C3", category: "C", text: { id: "Saya suka bekerja dengan angka, spreadsheet, atau data", en: "I enjoy working with numbers, spreadsheets, or data" } },
  { id: "C4", category: "C", text: { id: "Saya lebih suka mengikuti prosedur yang jelas daripada improvisasi", en: "I prefer following clear procedures over improvising" } },
  { id: "C5", category: "C", text: { id: "Saya suka menyimpan catatan yang rapi dan terorganisir", en: "I enjoy keeping neat and organized records" } },
];

// ========== SECTION 3: KECERDASAN MAJEMUK — MI (24 Forced-Choice Pairs) ==========
export interface ForcedChoicePair {
  id: string;
  optionA: { category: string; text: { id: string; en: string } };
  optionB: { category: string; text: { id: string; en: string } };
}

export const miPairs: ForcedChoicePair[] = [
  // Linguistic vs Logical-Mathematical
  { id: "MI1", optionA: { category: "linguistic", text: { id: "Saya lebih suka menulis esai atau cerita", en: "I prefer writing essays or stories" } }, optionB: { category: "logical", text: { id: "Saya lebih suka memecahkan soal matematika", en: "I prefer solving math problems" } } },
  // Musical vs Spatial
  { id: "MI2", optionA: { category: "musical", text: { id: "Saya mudah mengingat melodi atau irama lagu", en: "I easily remember melodies or song rhythms" } }, optionB: { category: "spatial", text: { id: "Saya mudah membayangkan bentuk 3D dalam pikiran", en: "I easily visualize 3D shapes in my mind" } } },
  // Bodily-Kinesthetic vs Interpersonal
  { id: "MI3", optionA: { category: "kinesthetic", text: { id: "Saya belajar paling baik dengan praktik langsung", en: "I learn best through hands-on practice" } }, optionB: { category: "interpersonal", text: { id: "Saya belajar paling baik dengan diskusi kelompok", en: "I learn best through group discussions" } } },
  // Intrapersonal vs Naturalistic
  { id: "MI4", optionA: { category: "intrapersonal", text: { id: "Saya suka merenung dan memahami perasaan saya sendiri", en: "I enjoy reflecting and understanding my own feelings" } }, optionB: { category: "naturalistic", text: { id: "Saya suka mengamati pola di alam dan lingkungan", en: "I enjoy observing patterns in nature and environment" } } },
  // Logical vs Spatial
  { id: "MI5", optionA: { category: "logical", text: { id: "Saya suka membuat strategi dan rencana logis", en: "I enjoy making strategies and logical plans" } }, optionB: { category: "spatial", text: { id: "Saya suka mendesain atau menggambar layout", en: "I enjoy designing or drawing layouts" } } },
  // Linguistic vs Interpersonal
  { id: "MI6", optionA: { category: "linguistic", text: { id: "Saya suka membaca buku di waktu luang", en: "I enjoy reading books in my free time" } }, optionB: { category: "interpersonal", text: { id: "Saya suka menghabiskan waktu bersama teman-teman", en: "I enjoy spending time with friends" } } },
  // Musical vs Kinesthetic
  { id: "MI7", optionA: { category: "musical", text: { id: "Saya bisa mendeteksi nada yang salah dalam musik", en: "I can detect wrong notes in music" } }, optionB: { category: "kinesthetic", text: { id: "Saya cepat menguasai gerakan olahraga atau tarian baru", en: "I quickly master new sports moves or dances" } } },
  // Naturalistic vs Logical
  { id: "MI8", optionA: { category: "naturalistic", text: { id: "Saya tertarik dengan biologi, ekologi, atau lingkungan", en: "I'm interested in biology, ecology, or environment" } }, optionB: { category: "logical", text: { id: "Saya tertarik dengan fisika, kimia, atau teknologi", en: "I'm interested in physics, chemistry, or technology" } } },
  // Intrapersonal vs Linguistic
  { id: "MI9", optionA: { category: "intrapersonal", text: { id: "Saya sering menulis jurnal atau diary pribadi", en: "I often write personal journals or diaries" } }, optionB: { category: "linguistic", text: { id: "Saya suka berdebat atau berpidato di depan umum", en: "I enjoy debating or public speaking" } } },
  // Spatial vs Kinesthetic
  { id: "MI10", optionA: { category: "spatial", text: { id: "Saya suka membuat peta pikiran atau diagram", en: "I enjoy making mind maps or diagrams" } }, optionB: { category: "kinesthetic", text: { id: "Saya suka membangun model atau prototipe", en: "I enjoy building models or prototypes" } } },
  // Interpersonal vs Intrapersonal
  { id: "MI11", optionA: { category: "interpersonal", text: { id: "Saya mudah memahami perasaan orang lain", en: "I easily understand other people's feelings" } }, optionB: { category: "intrapersonal", text: { id: "Saya lebih memahami motivasi dan keinginan diri sendiri", en: "I better understand my own motivations and desires" } } },
  // Musical vs Linguistic
  { id: "MI12", optionA: { category: "musical", text: { id: "Saya bisa bermain alat musik atau bernyanyi dengan baik", en: "I can play instruments or sing well" } }, optionB: { category: "linguistic", text: { id: "Saya pandai menyusun kata-kata dan kalimat yang indah", en: "I'm good at composing beautiful words and sentences" } } },
  // Logical vs Interpersonal
  { id: "MI13", optionA: { category: "logical", text: { id: "Saya suka menganalisis masalah secara sistematis", en: "I enjoy analyzing problems systematically" } }, optionB: { category: "interpersonal", text: { id: "Saya suka memediasi konflik antar teman", en: "I enjoy mediating conflicts between friends" } } },
  // Naturalistic vs Musical
  { id: "MI14", optionA: { category: "naturalistic", text: { id: "Saya suka berkebun, hiking, atau mengamati hewan", en: "I enjoy gardening, hiking, or observing animals" } }, optionB: { category: "musical", text: { id: "Saya suka mendengarkan dan menganalisis berbagai genre musik", en: "I enjoy listening to and analyzing various music genres" } } },
  // Kinesthetic vs Intrapersonal
  { id: "MI15", optionA: { category: "kinesthetic", text: { id: "Saya mengekspresikan diri melalui gerakan tubuh", en: "I express myself through body movement" } }, optionB: { category: "intrapersonal", text: { id: "Saya mengekspresikan diri melalui refleksi dan meditasi", en: "I express myself through reflection and meditation" } } },
  // Spatial vs Naturalistic
  { id: "MI16", optionA: { category: "spatial", text: { id: "Saya suka fotografi atau videografi", en: "I enjoy photography or videography" } }, optionB: { category: "naturalistic", text: { id: "Saya suka mengidentifikasi jenis tanaman atau hewan", en: "I enjoy identifying types of plants or animals" } } },
  // Linguistic vs Kinesthetic
  { id: "MI17", optionA: { category: "linguistic", text: { id: "Saya lebih suka menjelaskan konsep dengan kata-kata", en: "I prefer explaining concepts with words" } }, optionB: { category: "kinesthetic", text: { id: "Saya lebih suka mendemonstrasikan konsep secara langsung", en: "I prefer demonstrating concepts hands-on" } } },
  // Logical vs Musical
  { id: "MI18", optionA: { category: "logical", text: { id: "Saya menikmati pola dalam angka dan rumus", en: "I enjoy patterns in numbers and formulas" } }, optionB: { category: "musical", text: { id: "Saya menikmati pola dalam ritme dan harmoni", en: "I enjoy patterns in rhythm and harmony" } } },
  // Interpersonal vs Naturalistic
  { id: "MI19", optionA: { category: "interpersonal", text: { id: "Saya lebih suka bekerja dengan banyak orang", en: "I prefer working with many people" } }, optionB: { category: "naturalistic", text: { id: "Saya lebih suka bekerja di lingkungan alam", en: "I prefer working in natural environments" } } },
  // Intrapersonal vs Spatial
  { id: "MI20", optionA: { category: "intrapersonal", text: { id: "Saya pandai mengenali kekuatan dan kelemahan diri", en: "I'm good at recognizing my strengths and weaknesses" } }, optionB: { category: "spatial", text: { id: "Saya pandai membaca peta dan navigasi", en: "I'm good at reading maps and navigation" } } },
  // Linguistic vs Naturalistic
  { id: "MI21", optionA: { category: "linguistic", text: { id: "Saya suka belajar bahasa asing baru", en: "I enjoy learning new foreign languages" } }, optionB: { category: "naturalistic", text: { id: "Saya suka mempelajari tentang cuaca dan iklim", en: "I enjoy learning about weather and climate" } } },
  // Logical vs Intrapersonal
  { id: "MI22", optionA: { category: "logical", text: { id: "Saya membuat keputusan berdasarkan fakta dan data", en: "I make decisions based on facts and data" } }, optionB: { category: "intrapersonal", text: { id: "Saya membuat keputusan berdasarkan intuisi dan perasaan", en: "I make decisions based on intuition and feelings" } } },
  // Spatial vs Interpersonal
  { id: "MI23", optionA: { category: "spatial", text: { id: "Saya suka merancang presentasi visual yang menarik", en: "I enjoy designing attractive visual presentations" } }, optionB: { category: "interpersonal", text: { id: "Saya suka mempresentasikan ide di depan kelompok", en: "I enjoy presenting ideas in front of groups" } } },
  // Kinesthetic vs Musical
  { id: "MI24", optionA: { category: "kinesthetic", text: { id: "Saya suka tantangan fisik seperti parkour atau rock climbing", en: "I enjoy physical challenges like parkour or rock climbing" } }, optionB: { category: "musical", text: { id: "Saya suka menciptakan lagu atau komposisi musik sendiri", en: "I enjoy creating my own songs or music compositions" } } },
];

// ========== SECTION 4: KEPRIBADIAN & NILAI — Big Five + Work Values (20 This-or-That) ==========
export interface ThisOrThatQuestion {
  id: string;
  dimension: string; // e.g. "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism", "value_*"
  optionA: { trait: string; text: { id: string; en: string } };
  optionB: { trait: string; text: { id: string; en: string } };
}

export const personalityQuestions: ThisOrThatQuestion[] = [
  // Extraversion vs Introversion
  { id: "P1", dimension: "extraversion", optionA: { trait: "extravert", text: { id: "Saya mendapat energi dari bersosialisasi dengan banyak orang", en: "I get energy from socializing with many people" } }, optionB: { trait: "introvert", text: { id: "Saya mendapat energi dari waktu sendiri yang tenang", en: "I get energy from quiet time alone" } } },
  { id: "P2", dimension: "extraversion", optionA: { trait: "extravert", text: { id: "Saya suka menjadi pusat perhatian di acara sosial", en: "I enjoy being the center of attention at social events" } }, optionB: { trait: "introvert", text: { id: "Saya lebih suka mengamati dari pinggir di acara sosial", en: "I prefer observing from the sidelines at social events" } } },
  // Openness
  { id: "P3", dimension: "openness", optionA: { trait: "open", text: { id: "Saya suka mencoba hal-hal baru yang belum pernah saya lakukan", en: "I love trying new things I've never done before" } }, optionB: { trait: "traditional", text: { id: "Saya lebih nyaman dengan rutinitas yang sudah saya kenal", en: "I'm more comfortable with routines I already know" } } },
  { id: "P4", dimension: "openness", optionA: { trait: "open", text: { id: "Saya suka berpikir tentang ide-ide abstrak dan filosofis", en: "I enjoy thinking about abstract and philosophical ideas" } }, optionB: { trait: "traditional", text: { id: "Saya lebih suka fokus pada hal-hal praktis dan konkret", en: "I prefer focusing on practical and concrete things" } } },
  // Conscientiousness
  { id: "P5", dimension: "conscientiousness", optionA: { trait: "organized", text: { id: "Saya selalu menyelesaikan tugas jauh sebelum deadline", en: "I always finish tasks well before the deadline" } }, optionB: { trait: "flexible", text: { id: "Saya sering menyelesaikan tugas mendekati deadline", en: "I often finish tasks close to the deadline" } } },
  { id: "P6", dimension: "conscientiousness", optionA: { trait: "organized", text: { id: "Saya membuat to-do list dan mengikutinya dengan disiplin", en: "I make to-do lists and follow them with discipline" } }, optionB: { trait: "flexible", text: { id: "Saya lebih suka mengalir dan fleksibel dalam bekerja", en: "I prefer to go with the flow and be flexible in work" } } },
  // Agreeableness
  { id: "P7", dimension: "agreeableness", optionA: { trait: "agreeable", text: { id: "Saya lebih suka menghindari konflik dan mencari kompromi", en: "I prefer avoiding conflict and seeking compromise" } }, optionB: { trait: "assertive", text: { id: "Saya tidak takut menyampaikan pendapat yang berbeda", en: "I'm not afraid to voice a different opinion" } } },
  { id: "P8", dimension: "agreeableness", optionA: { trait: "agreeable", text: { id: "Saya sering mendahulukan kebutuhan orang lain", en: "I often put others' needs before my own" } }, optionB: { trait: "assertive", text: { id: "Saya memastikan kebutuhan saya terpenuhi terlebih dahulu", en: "I make sure my own needs are met first" } } },
  // Emotional Stability
  { id: "P9", dimension: "stability", optionA: { trait: "stable", text: { id: "Saya tetap tenang di bawah tekanan", en: "I stay calm under pressure" } }, optionB: { trait: "sensitive", text: { id: "Saya mudah merasa cemas saat menghadapi tekanan", en: "I easily feel anxious when facing pressure" } } },
  { id: "P10", dimension: "stability", optionA: { trait: "stable", text: { id: "Saya cepat pulih dari kekecewaan atau kegagalan", en: "I quickly recover from disappointment or failure" } }, optionB: { trait: "sensitive", text: { id: "Kekecewaan atau kegagalan mempengaruhi saya cukup lama", en: "Disappointment or failure affects me for quite a while" } } },
  // Work Values
  { id: "V1", dimension: "value_money_vs_meaning", optionA: { trait: "money", text: { id: "Gaji tinggi dan stabilitas finansial", en: "High salary and financial stability" } }, optionB: { trait: "meaning", text: { id: "Pekerjaan yang bermakna dan berdampak positif", en: "Meaningful work with positive impact" } } },
  { id: "V2", dimension: "value_freedom_vs_structure", optionA: { trait: "freedom", text: { id: "Kebebasan dan fleksibilitas dalam bekerja", en: "Freedom and flexibility in work" } }, optionB: { trait: "structure", text: { id: "Struktur yang jelas dan panduan yang teratur", en: "Clear structure and organized guidance" } } },
  { id: "V3", dimension: "value_team_vs_solo", optionA: { trait: "team", text: { id: "Bekerja dalam tim yang solid dan kolaboratif", en: "Working in a solid, collaborative team" } }, optionB: { trait: "solo", text: { id: "Bekerja mandiri dengan tanggung jawab penuh", en: "Working independently with full responsibility" } } },
  { id: "V4", dimension: "value_prestige_vs_passion", optionA: { trait: "prestige", text: { id: "Pekerjaan yang dihormati dan bergengsi di masyarakat", en: "Work that is respected and prestigious in society" } }, optionB: { trait: "passion", text: { id: "Pekerjaan yang sesuai passion meski kurang populer", en: "Work that matches my passion even if less popular" } } },
  { id: "V5", dimension: "value_innovation_vs_stability", optionA: { trait: "innovation", text: { id: "Lingkungan kerja yang selalu berubah dan inovatif", en: "Work environment that is always changing and innovative" } }, optionB: { trait: "stability", text: { id: "Lingkungan kerja yang stabil dan dapat diprediksi", en: "Work environment that is stable and predictable" } } },
  { id: "V6", dimension: "value_leadership_vs_expertise", optionA: { trait: "leadership", text: { id: "Menjadi pemimpin yang mengarahkan banyak orang", en: "Being a leader who directs many people" } }, optionB: { trait: "expertise", text: { id: "Menjadi ahli yang sangat mendalam di satu bidang", en: "Being a deep expert in one field" } } },
  { id: "V7", dimension: "value_local_vs_global", optionA: { trait: "local", text: { id: "Berkontribusi untuk komunitas lokal dan Indonesia", en: "Contributing to local community and Indonesia" } }, optionB: { trait: "global", text: { id: "Bekerja di perusahaan internasional atau luar negeri", en: "Working in international companies or abroad" } } },
  { id: "V8", dimension: "value_creative_vs_analytical", optionA: { trait: "creative", text: { id: "Pekerjaan yang membutuhkan kreativitas dan imajinasi", en: "Work that requires creativity and imagination" } }, optionB: { trait: "analytical", text: { id: "Pekerjaan yang membutuhkan analisis dan logika", en: "Work that requires analysis and logic" } } },
  { id: "V9", dimension: "value_help_vs_build", optionA: { trait: "help", text: { id: "Membantu orang lain secara langsung setiap hari", en: "Helping others directly every day" } }, optionB: { trait: "build", text: { id: "Membangun sesuatu yang bertahan lama (produk, bisnis)", en: "Building something lasting (product, business)" } } },
  { id: "V10", dimension: "value_risk_vs_security", optionA: { trait: "risk", text: { id: "Mengambil risiko besar untuk peluang besar", en: "Taking big risks for big opportunities" } }, optionB: { trait: "security", text: { id: "Memilih jalur yang aman dan terjamin", en: "Choosing a safe and secure path" } } },
];

// ========== SECTION 5: PENILAIAN SITUASI — SJT (8 Scenarios) ==========
export interface SJTQuestion {
  id: string;
  dimension: string; // leadership, conflict, teamwork, ethics, creativity, time_mgmt, communication, stress
  scenario: { id: string; en: string };
  options: {
    value: string;
    traits: string[]; // which soft skills this choice indicates
    text: { id: string; en: string };
  }[];
}

export const sjtQuestions: SJTQuestion[] = [
  {
    id: "SJT1",
    dimension: "leadership",
    scenario: {
      id: "Kamu ditunjuk sebagai ketua kelompok untuk proyek akhir semester. Salah satu anggota kelompok tidak pernah hadir rapat dan tidak mengerjakan bagiannya. Deadline tinggal 1 minggu.",
      en: "You've been appointed as group leader for a final semester project. One member never attends meetings and hasn't done their part. The deadline is in 1 week."
    },
    options: [
      { value: "A", traits: ["empathetic", "communicative"], text: { id: "Menghubungi anggota tersebut secara pribadi untuk menanyakan apakah ada masalah dan menawarkan bantuan", en: "Contact the member privately to ask if there's a problem and offer help" } },
      { value: "B", traits: ["decisive", "practical"], text: { id: "Membagi tugas anggota tersebut ke anggota lain agar proyek tetap selesai tepat waktu", en: "Redistribute their tasks to other members so the project finishes on time" } },
      { value: "C", traits: ["authoritative", "structured"], text: { id: "Melaporkan situasi ke guru dan meminta panduan tentang langkah selanjutnya", en: "Report the situation to the teacher and ask for guidance on next steps" } },
      { value: "D", traits: ["collaborative", "diplomatic"], text: { id: "Mengadakan rapat darurat dengan seluruh anggota untuk membahas masalah ini bersama-sama", en: "Hold an emergency meeting with all members to discuss this issue together" } },
    ],
  },
  {
    id: "SJT2",
    dimension: "conflict_resolution",
    scenario: {
      id: "Dua teman baikmu sedang bertengkar hebat dan keduanya meminta kamu untuk memihak. Pertengkaran ini sudah mempengaruhi suasana di kelas.",
      en: "Two of your close friends are in a serious fight and both are asking you to take sides. The fight is already affecting the class atmosphere."
    },
    options: [
      { value: "A", traits: ["mediator", "empathetic"], text: { id: "Mendengarkan kedua sisi cerita secara terpisah, lalu mencoba mempertemukan mereka untuk bicara", en: "Listen to both sides separately, then try to bring them together to talk" } },
      { value: "B", traits: ["principled", "honest"], text: { id: "Mengatakan dengan jujur bahwa kamu tidak akan memihak dan menjelaskan alasannya", en: "Honestly say you won't take sides and explain why" } },
      { value: "C", traits: ["supportive", "patient"], text: { id: "Memberikan waktu dan ruang kepada keduanya untuk menenangkan diri sebelum mencoba membantu", en: "Give both of them time and space to cool down before trying to help" } },
      { value: "D", traits: ["proactive", "resourceful"], text: { id: "Meminta bantuan guru BK atau orang dewasa yang dipercaya untuk membantu menyelesaikan konflik", en: "Ask a school counselor or trusted adult for help resolving the conflict" } },
    ],
  },
  {
    id: "SJT3",
    dimension: "time_management",
    scenario: {
      id: "Minggu ini kamu memiliki: ujian matematika besok, tugas presentasi lusa, latihan basket untuk turnamen, dan janji membantu adik belajar. Kamu tidak mungkin melakukan semuanya dengan sempurna.",
      en: "This week you have: a math exam tomorrow, a presentation due the day after, basketball practice for a tournament, and a promise to help your sibling study. You can't do everything perfectly."
    },
    options: [
      { value: "A", traits: ["prioritizer", "strategic"], text: { id: "Membuat daftar prioritas: ujian dulu, lalu presentasi, dan minta maaf ke adik untuk reschedule", en: "Make a priority list: exam first, then presentation, and apologize to sibling to reschedule" } },
      { value: "B", traits: ["balanced", "communicative"], text: { id: "Berkomunikasi dengan semua pihak — minta perpanjangan waktu presentasi dan atur ulang jadwal latihan", en: "Communicate with everyone — ask for presentation extension and reschedule practice" } },
      { value: "C", traits: ["dedicated", "perfectionist"], text: { id: "Begadang untuk menyelesaikan semuanya karena semua komitmen sama pentingnya", en: "Stay up late to finish everything because all commitments are equally important" } },
      { value: "D", traits: ["delegator", "practical"], text: { id: "Meminta bantuan teman untuk materi ujian dan membagi tugas presentasi dengan partner", en: "Ask friends for exam study help and split presentation work with a partner" } },
    ],
  },
  {
    id: "SJT4",
    dimension: "ethics",
    scenario: {
      id: "Kamu menemukan bahwa teman dekatmu menyontek saat ujian penting. Kamu tahu bahwa jika ketahuan, dia bisa dikeluarkan dari sekolah. Tapi kamu juga tahu bahwa menyontek itu salah.",
      en: "You discover that your close friend cheated on an important exam. You know that if caught, they could be expelled. But you also know cheating is wrong."
    },
    options: [
      { value: "A", traits: ["loyal", "supportive"], text: { id: "Bicara dengan temanmu secara pribadi dan minta dia mengaku sendiri ke guru", en: "Talk to your friend privately and ask them to confess to the teacher themselves" } },
      { value: "B", traits: ["principled", "courageous"], text: { id: "Melaporkan ke guru karena integritas akademik harus dijaga", en: "Report to the teacher because academic integrity must be maintained" } },
      { value: "C", traits: ["empathetic", "understanding"], text: { id: "Mencari tahu dulu alasan dia menyontek — mungkin ada masalah serius yang perlu dibantu", en: "First find out why they cheated — maybe there's a serious problem that needs help" } },
      { value: "D", traits: ["pragmatic", "protective"], text: { id: "Tidak melaporkan tapi memastikan dia tidak mengulanginya dan menawarkan bantuan belajar", en: "Don't report but make sure they don't repeat it and offer study help" } },
    ],
  },
  {
    id: "SJT5",
    dimension: "creativity",
    scenario: {
      id: "Sekolahmu mengadakan lomba inovasi. Timmu harus membuat solusi untuk masalah sampah plastik di lingkungan sekolah. Budget terbatas dan waktu hanya 2 minggu.",
      en: "Your school is holding an innovation competition. Your team must create a solution for plastic waste in the school environment. Budget is limited and you only have 2 weeks."
    },
    options: [
      { value: "A", traits: ["innovative", "tech_savvy"], text: { id: "Membuat aplikasi tracking sampah yang gamifikasi — siswa dapat poin untuk daur ulang", en: "Create a gamified waste tracking app — students earn points for recycling" } },
      { value: "B", traits: ["practical", "hands_on"], text: { id: "Membuat ecobrick workshop dan mengajar siswa lain membuat furnitur dari botol plastik bekas", en: "Create an ecobrick workshop teaching students to make furniture from plastic bottles" } },
      { value: "C", traits: ["strategic", "systemic"], text: { id: "Merancang sistem kantin zero-waste dengan vendor dan membuat proposal ke kepala sekolah", en: "Design a zero-waste canteen system with vendors and propose it to the principal" } },
      { value: "D", traits: ["artistic", "communicative"], text: { id: "Membuat kampanye media sosial dan mural dari sampah plastik untuk meningkatkan kesadaran", en: "Create a social media campaign and mural from plastic waste to raise awareness" } },
    ],
  },
  {
    id: "SJT6",
    dimension: "teamwork",
    scenario: {
      id: "Dalam proyek kelompok, kamu yakin idemu adalah yang terbaik. Tapi mayoritas anggota kelompok memilih ide yang menurutmu kurang bagus. Mereka sudah voting dan hasilnya 4 lawan 1.",
      en: "In a group project, you're convinced your idea is the best. But most members chose an idea you think is inferior. They've voted and it's 4 against 1."
    },
    options: [
      { value: "A", traits: ["adaptable", "team_player"], text: { id: "Menerima keputusan mayoritas dan memberikan kontribusi terbaik untuk ide yang dipilih", en: "Accept the majority decision and give your best contribution to the chosen idea" } },
      { value: "B", traits: ["persuasive", "confident"], text: { id: "Meminta waktu untuk mempresentasikan idemu lebih detail dengan data pendukung", en: "Ask for time to present your idea in more detail with supporting data" } },
      { value: "C", traits: ["creative", "collaborative"], text: { id: "Mencoba menggabungkan elemen terbaik dari idemu ke dalam ide yang dipilih kelompok", en: "Try to incorporate the best elements of your idea into the group's chosen idea" } },
      { value: "D", traits: ["independent", "principled"], text: { id: "Mengerjakan bagianmu sesuai ide kelompok, tapi juga menyiapkan versi alternatif sebagai backup", en: "Do your part according to the group's idea, but also prepare an alternative version as backup" } },
    ],
  },
  {
    id: "SJT7",
    dimension: "communication",
    scenario: {
      id: "Kamu harus mempresentasikan hasil riset di depan 200 orang termasuk guru-guru dan orang tua. Kamu sangat gugup karena ini pertama kalinya presentasi di depan audience sebesar ini.",
      en: "You have to present research results in front of 200 people including teachers and parents. You're very nervous because this is your first time presenting to such a large audience."
    },
    options: [
      { value: "A", traits: ["prepared", "disciplined"], text: { id: "Berlatih presentasi berkali-kali di depan cermin dan merekam diri sendiri untuk evaluasi", en: "Practice the presentation many times in front of a mirror and record yourself for evaluation" } },
      { value: "B", traits: ["resourceful", "collaborative"], text: { id: "Meminta teman atau guru untuk menjadi audience latihan dan memberikan feedback", en: "Ask friends or teachers to be a practice audience and give feedback" } },
      { value: "C", traits: ["creative", "adaptive"], text: { id: "Membuat presentasi yang sangat visual dan interaktif agar fokus audience ke slide, bukan ke kamu", en: "Create a very visual and interactive presentation so the audience focuses on slides, not you" } },
      { value: "D", traits: ["honest", "authentic"], text: { id: "Mengakui di awal bahwa kamu gugup — ini justru membuat audience lebih simpatik dan mendukung", en: "Acknowledge at the start that you're nervous — this actually makes the audience more sympathetic" } },
    ],
  },
  {
    id: "SJT8",
    dimension: "stress_handling",
    scenario: {
      id: "Kamu baru saja menerima nilai ujian yang sangat mengecewakan di mata pelajaran yang kamu sukai. Ini bisa mempengaruhi rata-rata nilaimu untuk pendaftaran universitas.",
      en: "You just received a very disappointing exam score in a subject you love. This could affect your GPA for university applications."
    },
    options: [
      { value: "A", traits: ["resilient", "proactive"], text: { id: "Langsung menemui guru untuk memahami kesalahan dan membuat rencana perbaikan", en: "Immediately meet the teacher to understand mistakes and make an improvement plan" } },
      { value: "B", traits: ["analytical", "strategic"], text: { id: "Menganalisis pola kesalahan, mencari sumber belajar tambahan, dan membuat jadwal belajar baru", en: "Analyze error patterns, find additional study resources, and create a new study schedule" } },
      { value: "C", traits: ["emotionally_aware", "balanced"], text: { id: "Mengambil waktu untuk memproses kekecewaan dulu, lalu membuat rencana dengan kepala dingin", en: "Take time to process the disappointment first, then make a plan with a clear head" } },
      { value: "D", traits: ["optimistic", "big_picture"], text: { id: "Melihat gambaran besar — satu nilai buruk tidak menentukan masa depan, fokus ke ujian berikutnya", en: "Look at the big picture — one bad grade doesn't define your future, focus on the next exam" } },
    ],
  },
];

// ========== SECTION 6: PEMIKIRAN KREATIF — Open-Ended (4 Questions) ==========
export interface OpenEndedQuestion {
  id: string;
  dimension: string;
  text: { id: string; en: string };
  placeholder: { id: string; en: string };
  minLength: number;
  maxLength: number;
}

export const creativeQuestions: OpenEndedQuestion[] = [
  {
    id: "OE1",
    dimension: "vision_and_values",
    text: {
      id: "Jika kamu bisa menciptakan satu hal untuk mengubah Indonesia menjadi lebih baik, apa itu dan mengapa? Jelaskan bagaimana caramu mewujudkannya.",
      en: "If you could create one thing to make Indonesia better, what would it be and why? Explain how you would make it happen."
    },
    placeholder: { id: "Tuliskan idemu secara detail (minimal 50 kata)...", en: "Write your idea in detail (minimum 50 words)..." },
    minLength: 50,
    maxLength: 500,
  },
  {
    id: "OE2",
    dimension: "problem_solving",
    text: {
      id: "Ceritakan tentang masalah nyata yang pernah kamu hadapi dan bagaimana kamu menyelesaikannya. Apa yang kamu pelajari dari pengalaman itu?",
      en: "Tell us about a real problem you faced and how you solved it. What did you learn from that experience?"
    },
    placeholder: { id: "Ceritakan pengalamanmu (minimal 50 kata)...", en: "Tell your story (minimum 50 words)..." },
    minLength: 50,
    maxLength: 500,
  },
  {
    id: "OE3",
    dimension: "self_awareness",
    text: {
      id: "Apa yang membuatmu berbeda dari teman-temanmu? Apa kekuatan terbesarmu dan apa yang masih ingin kamu kembangkan?",
      en: "What makes you different from your friends? What is your greatest strength and what do you still want to develop?"
    },
    placeholder: { id: "Jelaskan tentang dirimu (minimal 50 kata)...", en: "Describe yourself (minimum 50 words)..." },
    minLength: 50,
    maxLength: 500,
  },
  {
    id: "OE4",
    dimension: "future_thinking",
    text: {
      id: "Bayangkan dirimu 10 tahun dari sekarang. Di mana kamu? Apa yang sedang kamu kerjakan? Seperti apa kehidupanmu sehari-hari?",
      en: "Imagine yourself 10 years from now. Where are you? What are you working on? What does your daily life look like?"
    },
    placeholder: { id: "Gambarkan masa depanmu (minimal 50 kata)...", en: "Describe your future (minimum 50 words)..." },
    minLength: 50,
    maxLength: 500,
  },
];

// ========== SECTION 7: PRIORITAS HIDUP — Drag-and-Rank (6 Exercises) ==========
export interface RankingExercise {
  id: string;
  dimension: string;
  instruction: { id: string; en: string };
  items: { value: string; label: { id: string; en: string } }[];
}

export const rankingExercises: RankingExercise[] = [
  {
    id: "RK1",
    dimension: "career_factors",
    instruction: { id: "Urutkan faktor karir berikut dari yang PALING penting hingga PALING TIDAK penting bagimu:", en: "Rank the following career factors from MOST important to LEAST important to you:" },
    items: [
      { value: "salary", label: { id: "💰 Gaji tinggi", en: "💰 High salary" } },
      { value: "flexibility", label: { id: "⏰ Waktu fleksibel", en: "⏰ Flexible hours" } },
      { value: "impact", label: { id: "🌍 Dampak positif untuk masyarakat", en: "🌍 Positive impact on society" } },
      { value: "creativity", label: { id: "🎨 Ruang untuk berkreasi", en: "🎨 Room for creativity" } },
      { value: "prestige", label: { id: "👔 Prestise dan pengakuan", en: "👔 Prestige and recognition" } },
      { value: "security", label: { id: "🛡️ Keamanan dan stabilitas kerja", en: "🛡️ Job security and stability" } },
    ],
  },
  {
    id: "RK2",
    dimension: "learning_style",
    instruction: { id: "Urutkan cara belajar berikut dari yang PALING efektif hingga PALING TIDAK efektif bagimu:", en: "Rank the following learning methods from MOST effective to LEAST effective for you:" },
    items: [
      { value: "reading", label: { id: "📖 Membaca buku dan artikel", en: "📖 Reading books and articles" } },
      { value: "video", label: { id: "🎥 Menonton video tutorial", en: "🎥 Watching video tutorials" } },
      { value: "practice", label: { id: "🔧 Praktik langsung / hands-on", en: "🔧 Hands-on practice" } },
      { value: "discussion", label: { id: "💬 Diskusi dengan orang lain", en: "💬 Discussion with others" } },
      { value: "teaching", label: { id: "👨‍🏫 Mengajarkan ke orang lain", en: "👨‍🏫 Teaching others" } },
      { value: "experiment", label: { id: "🧪 Eksperimen dan trial-error", en: "🧪 Experimentation and trial-error" } },
    ],
  },
  {
    id: "RK3",
    dimension: "work_environment",
    instruction: { id: "Urutkan lingkungan kerja berikut dari yang PALING kamu inginkan:", en: "Rank the following work environments from MOST desired:" },
    items: [
      { value: "office", label: { id: "🏢 Kantor modern di kota besar", en: "🏢 Modern office in a big city" } },
      { value: "remote", label: { id: "🏠 Kerja dari rumah / remote", en: "🏠 Work from home / remote" } },
      { value: "outdoor", label: { id: "🌿 Lapangan / outdoor", en: "🌿 Field work / outdoor" } },
      { value: "lab", label: { id: "🔬 Laboratorium atau studio", en: "🔬 Laboratory or studio" } },
      { value: "travel", label: { id: "✈️ Berpindah-pindah / travel", en: "✈️ Moving around / travel" } },
      { value: "startup", label: { id: "🚀 Startup / co-working space", en: "🚀 Startup / co-working space" } },
    ],
  },
  {
    id: "RK4",
    dimension: "life_priorities",
    instruction: { id: "Urutkan prioritas hidup berikut dari yang PALING penting bagimu:", en: "Rank the following life priorities from MOST important to you:" },
    items: [
      { value: "family", label: { id: "👨‍👩‍👧‍👦 Keluarga dan hubungan dekat", en: "👨‍👩‍👧‍👦 Family and close relationships" } },
      { value: "career", label: { id: "📈 Kesuksesan karir dan profesional", en: "📈 Career and professional success" } },
      { value: "health", label: { id: "💪 Kesehatan fisik dan mental", en: "💪 Physical and mental health" } },
      { value: "wealth", label: { id: "💎 Kekayaan dan kemapanan finansial", en: "💎 Wealth and financial security" } },
      { value: "adventure", label: { id: "🌏 Petualangan dan pengalaman baru", en: "🌏 Adventure and new experiences" } },
      { value: "contribution", label: { id: "🤝 Kontribusi untuk masyarakat", en: "🤝 Contribution to society" } },
    ],
  },
  {
    id: "RK5",
    dimension: "skill_confidence",
    instruction: { id: "Urutkan kemampuan berikut dari yang PALING kamu kuasai:", en: "Rank the following skills from your STRONGEST:" },
    items: [
      { value: "communication", label: { id: "🗣️ Komunikasi dan presentasi", en: "🗣️ Communication and presentation" } },
      { value: "analysis", label: { id: "📊 Analisis dan pemecahan masalah", en: "📊 Analysis and problem solving" } },
      { value: "creativity", label: { id: "💡 Kreativitas dan inovasi", en: "💡 Creativity and innovation" } },
      { value: "leadership", label: { id: "👑 Kepemimpinan dan organisasi", en: "👑 Leadership and organization" } },
      { value: "technical", label: { id: "💻 Teknologi dan digital", en: "💻 Technology and digital" } },
      { value: "empathy", label: { id: "❤️ Empati dan memahami orang lain", en: "❤️ Empathy and understanding others" } },
    ],
  },
  {
    id: "RK6",
    dimension: "study_abroad_factors",
    instruction: { id: "Jika kuliah di luar negeri, urutkan faktor berikut dari yang PALING penting:", en: "If studying abroad, rank the following factors from MOST important:" },
    items: [
      { value: "ranking", label: { id: "🏆 Ranking universitas", en: "🏆 University ranking" } },
      { value: "cost", label: { id: "💵 Biaya kuliah terjangkau", en: "💵 Affordable tuition" } },
      { value: "location", label: { id: "📍 Lokasi dan budaya negara", en: "📍 Country location and culture" } },
      { value: "career_prospects", label: { id: "💼 Prospek kerja setelah lulus", en: "💼 Career prospects after graduation" } },
      { value: "scholarship", label: { id: "🎓 Ketersediaan beasiswa", en: "🎓 Scholarship availability" } },
      { value: "program_quality", label: { id: "📚 Kualitas program studi", en: "📚 Study program quality" } },
    ],
  },
];

// ========== UI LABELS ==========
export const proSectionLabels = {
  sections: [
    { id: 1, key: "profil", title: { id: "Profil Diri", en: "Personal Profile" }, icon: "👤", duration: "2 min", color: "#6366f1" },
    { id: 2, key: "riasec", title: { id: "Minat Karir", en: "Career Interests" }, icon: "🎯", duration: "4 min", color: "#ec4899" },
    { id: 3, key: "mi", title: { id: "Kecerdasan Majemuk", en: "Multiple Intelligences" }, icon: "🧠", duration: "4 min", color: "#f59e0b" },
    { id: 4, key: "personality", title: { id: "Kepribadian & Nilai", en: "Personality & Values" }, icon: "💎", duration: "4 min", color: "#10b981" },
    { id: 5, key: "sjt", title: { id: "Penilaian Situasi", en: "Situational Judgment" }, icon: "🎭", duration: "5 min", color: "#8b5cf6" },
    { id: 6, key: "creative", title: { id: "Pemikiran Kreatif", en: "Creative Thinking" }, icon: "✍️", duration: "3 min", color: "#ef4444" },
    { id: 7, key: "ranking", title: { id: "Prioritas Hidup", en: "Life Priorities" }, icon: "📊", duration: "3 min", color: "#0ea5e9" },
  ],
  likertScale: [
    { value: 1, label: { id: "Sangat Tidak Setuju", en: "Strongly Disagree" } },
    { value: 2, label: { id: "Tidak Setuju", en: "Disagree" } },
    { value: 3, label: { id: "Netral", en: "Neutral" } },
    { value: 4, label: { id: "Setuju", en: "Agree" } },
    { value: 5, label: { id: "Sangat Setuju", en: "Strongly Agree" } },
  ],
};
