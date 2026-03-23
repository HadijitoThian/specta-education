/**
 * Server-Side SEO Meta Tag Injector
 * 
 * Since this is a React SPA, crawlers see the raw index.html before JS loads.
 * This module injects page-specific meta tags into the HTML response based on the URL,
 * so crawlers get the correct title, description, OG tags, and canonical URL.
 */

const BASE_URL = "https://spectaeducation.com";
const DEFAULT_OG_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/JkROfRrqqpCGwfuP.png";

interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  noindex?: boolean;
}

// Static page meta definitions - must match the client-side SEO component values
const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: "SpecTa Education - Konsultan Pendidikan Luar Negeri Terpercaya di Indonesia Sejak 2005",
    description: "SpecTa Education - Konsultan pendidikan luar negeri terpercaya di Indonesia sejak 2005. Bimbingan kuliah di Australia, UK, USA, Kanada, Singapura, Malaysia, China, Irlandia, Belanda & Selandia Baru. IELTS preparation, bantuan visa, beasiswa. 1000+ pelajar terbantu. Konsultasi gratis!",
    keywords: "study abroad consultant Jakarta, konsultan pendidikan luar negeri Indonesia, IELTS preparation, kuliah luar negeri, SpecTa Education, beasiswa luar negeri, kuliah di Australia, kuliah di Inggris, study in UK, study in Australia",
  },
  "/about": {
    title: "About SpecTa Education - Study Abroad Consultant",
    description: "SpecTa Education is Indonesia's trusted study abroad consultant since 2005. Helping students achieve dreams of studying in UK, USA, Australia, and more.",
    keywords: "about SpecTa Education, study abroad consultant Indonesia, konsultan pendidikan luar negeri, education consultant Jakarta, trusted study abroad agent",
  },
  "/ielts": {
    title: "IELTS Preparation Course - SpecTa Education | Kursus IELTS Terbaik",
    description: "Persiapan IELTS terbaik di Indonesia bersama SpecTa Education. Kelas IELTS online & offline dengan tutor berpengalaman, mock test, dan garansi skor. Raih target IELTS band 6.5+ untuk kuliah di luar negeri.",
    keywords: "IELTS preparation, kursus IELTS, IELTS online, IELTS mock test, IELTS band 6.5, IELTS Indonesia, belajar IELTS, IELTS writing, IELTS speaking",
  },
  "/ielts/practice": {
    title: "Free IELTS Practice Test | SpecTa Education",
    description: "Practice IELTS Reading, Writing, Listening, and Speaking with AI-powered questions. Get instant scoring and band score estimation.",
    keywords: "IELTS practice test, free IELTS test, IELTS reading practice, IELTS writing practice, IELTS listening practice, IELTS speaking practice",
  },
  "/destinations": {
    title: "Study Abroad Destinations | SpecTa Education",
    description: "Explore 10+ study abroad destinations including UK, USA, Australia, Canada, Singapore, Malaysia, and more with SpecTa Education.",
    keywords: "study abroad destinations, kuliah luar negeri, study in UK, study in USA, study in Australia, study in Canada, study in Singapore, study in Malaysia, study in China, education consultant Indonesia",
  },
  "/scholarships": {
    title: "Study Abroad Scholarships 2026 | SpecTa Education",
    description: "Find scholarships for studying abroad in Australia, UK, USA, Canada, and more. SpecTa Education helps you secure funding for your education.",
    keywords: "study abroad scholarships, beasiswa luar negeri, scholarship 2026, beasiswa kuliah, international scholarships, LPDP scholarship",
  },
  "/contact": {
    title: "Contact Us - SpecTa Education Indonesia",
    description: "Get in touch with SpecTa Education. Visit our offices in PIK, Kelapa Gading, or Gading Serpong. Call, email, or WhatsApp us today.",
    keywords: "contact SpecTa Education, konsultan pendidikan Jakarta, study abroad consultant contact, education consultant PIK, Kelapa Gading, Gading Serpong",
  },
  "/book": {
    title: "Book a Consultation | SpecTa Education",
    description: "Schedule a free consultation with SpecTa Education counselors. Get expert guidance on studying abroad, IELTS prep, and university selection.",
    keywords: "book consultation, free consultation, study abroad consultation, IELTS consultation, university selection help",
  },
  "/book-consultation": {
    title: "Book a Consultation | SpecTa Education",
    description: "Schedule a free consultation with SpecTa Education counselors. Get expert guidance on studying abroad, IELTS prep, and university selection.",
    keywords: "book consultation, free consultation, study abroad consultation, IELTS consultation, university selection help",
  },
  "/blog": {
    title: "SpecTa Education Blog | Study Abroad News & Updates",
    description: "Latest news, tips, and updates about studying abroad from SpecTa Education. Expert advice on IELTS, scholarships, and university admissions.",
    keywords: "study abroad blog, kuliah luar negeri tips, IELTS tips, scholarship news, university admissions",
  },
  "/articles": {
    title: "Study Abroad Articles & Tips | SpecTa Education",
    description: "Read expert articles about studying abroad, IELTS preparation, scholarship tips, and student life in top destinations worldwide.",
    keywords: "study abroad articles, education tips, IELTS articles, scholarship guide, student life abroad",
  },
  "/apply": {
    title: "Quick Apply - Study Abroad Application | SpecTa Education",
    description: "Submit your study abroad application quickly with SpecTa Education. Upload transcripts, passport, and IELTS scores for fast processing.",
    keywords: "study abroad application, apply university, quick apply, university application Indonesia",
  },
  "/compare": {
    title: "Compare Study Destinations | SpecTa Education",
    description: "Compare study abroad destinations side-by-side. Tuition costs, living expenses, visa requirements, and post-study work options.",
    keywords: "compare study abroad destinations, biaya kuliah luar negeri, tuition fees comparison, study abroad cost calculator, visa requirements",
  },
  "/aptitude-test/pro": {
    title: "Tes Bakat AI Pro - Career Assessment | SpecTa Education",
    description: "Comprehensive AI-powered career and major assessment. Get personalized recommendations for your ideal study path and career direction.",
    keywords: "tes bakat AI pro, comprehensive aptitude test, tes minat bakat lengkap, career assessment Indonesia, personality test, RIASEC pro",
  },
  "/test/pro": {
    title: "Tes Bakat AI Pro - Career Assessment | SpecTa Education",
    description: "Comprehensive AI-powered career and major assessment. Get personalized recommendations for your ideal study path and career direction.",
    keywords: "tes bakat AI pro, comprehensive aptitude test, tes minat bakat lengkap, career assessment Indonesia",
  },
  "/simulator": {
    title: "Study Abroad Simulator - 3-Day Experience | SpecTa Education",
    description: "Experience studying abroad with our AI-powered 3-day simulator. Make real decisions, manage your budget, and discover your readiness.",
    keywords: "study abroad simulator, kuliah luar negeri simulator, study abroad experience, student life simulator",
  },
  "/country-quiz": {
    title: "Country Quiz - Find Your Ideal Destination | SpecTa Education",
    description: "Take our fun quiz to discover the perfect study abroad destination for you. Match your personality and preferences with the ideal country.",
    keywords: "country quiz, study abroad quiz, destination quiz, which country to study abroad",
  },
  "/quiz": {
    title: "Country Quiz - Find Your Ideal Destination | SpecTa Education",
    description: "Take our fun quiz to discover the perfect study abroad destination for you. Match your personality and preferences with the ideal country.",
    keywords: "country quiz, study abroad quiz, destination quiz, which country to study abroad",
  },
  "/specta-play": {
    title: "SpecTa Play - Fun Educational Games | SpecTa Education",
    description: "Play fun educational games about studying abroad. Test your knowledge of countries, universities, and student life with SpecTa Play.",
    keywords: "educational games, study abroad games, fun learning, SpecTa Play",
  },
  "/persona": {
    title: "Student Persona Quiz | SpecTa Education",
    description: "Discover your student persona and find the perfect study abroad destination. Take our fun personality quiz to match your learning style.",
    keywords: "student persona, personality quiz, learning style quiz, study abroad personality",
  },
  "/track": {
    title: "Track Your Application | SpecTa Education",
    description: "Track your study abroad application status with SpecTa Education. Check updates, upload documents, and communicate with your counselor.",
    keywords: "track application, application status, study abroad application tracking",
  },
  "/my-journey": {
    title: "My Study Abroad Journey | SpecTa Education",
    description: "Track your personalized study abroad journey with SpecTa Education. View your progress, recommendations, and next steps.",
    keywords: "study abroad journey, personalized journey, study abroad progress",
  },
  // Destination country pages
  "/malaysia": {
    title: "Study in Malaysia - Top Universities | SpecTa Education",
    description: "Explore top Malaysian universities with SpecTa Education. Affordable tuition, multicultural campus life, and globally recognized degrees. Kuliah di Malaysia dengan biaya terjangkau.",
    keywords: "study in Malaysia, kuliah di Malaysia, universitas Malaysia, biaya kuliah Malaysia, beasiswa Malaysia",
  },
  "/destinations/australia": {
    title: "Study in Australia - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Australia bersama SpecTa Education. Panduan lengkap universitas terbaik, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Australia, kuliah di Australia, universitas Australia, beasiswa Australia, visa pelajar Australia",
  },
  "/destinations/uk": {
    title: "Study in United Kingdom - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Inggris bersama SpecTa Education. Panduan lengkap universitas terbaik UK, program studi, biaya kuliah, beasiswa Chevening, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in UK, kuliah di Inggris, universitas UK, beasiswa UK, Chevening scholarship, visa pelajar UK",
  },
  "/destinations/usa": {
    title: "Study in USA - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Amerika bersama SpecTa Education. Panduan lengkap universitas terbaik USA, program studi, biaya kuliah, beasiswa, dan proses visa F-1 untuk pelajar Indonesia.",
    keywords: "study in USA, kuliah di Amerika, universitas USA, beasiswa USA, visa F-1, study in America",
  },
  "/destinations/canada": {
    title: "Study in Canada - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Kanada bersama SpecTa Education. Panduan lengkap universitas terbaik Kanada, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Canada, kuliah di Kanada, universitas Kanada, beasiswa Kanada, visa pelajar Kanada",
  },
  "/destinations/singapore": {
    title: "Study in Singapore - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Singapura bersama SpecTa Education. Panduan lengkap universitas terbaik Singapura, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Singapore, kuliah di Singapura, universitas Singapura, beasiswa Singapura, NUS, NTU",
  },
  "/destinations/china": {
    title: "Study in China - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di China bersama SpecTa Education. Panduan lengkap universitas terbaik China, program studi, biaya kuliah, beasiswa CSC 100%, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in China, kuliah di China, universitas China, beasiswa China, CSC scholarship, visa pelajar China",
  },
  "/destinations/ireland": {
    title: "Study in Ireland - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Irlandia bersama SpecTa Education. Panduan lengkap universitas terbaik Irlandia, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Ireland, kuliah di Irlandia, universitas Irlandia, beasiswa Irlandia, visa pelajar Irlandia",
  },
  "/destinations/new-zealand": {
    title: "Study in New Zealand - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Selandia Baru bersama SpecTa Education. Panduan lengkap universitas terbaik New Zealand, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in New Zealand, kuliah di Selandia Baru, universitas New Zealand, beasiswa New Zealand, visa pelajar NZ",
  },
  "/destinations/netherlands": {
    title: "Study in Netherlands - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Belanda bersama SpecTa Education. Panduan lengkap universitas terbaik Belanda, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Netherlands, kuliah di Belanda, universitas Belanda, beasiswa Belanda, visa pelajar Belanda",
  },
  "/destinations/germany": {
    title: "Study in Germany - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Jerman bersama SpecTa Education. Panduan lengkap universitas terbaik Jerman, program studi, biaya kuliah gratis, beasiswa DAAD, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Germany, kuliah di Jerman, universitas Jerman, beasiswa DAAD, visa pelajar Jerman, tuition free Germany",
  },
  "/destinations/france": {
    title: "Study in France - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Perancis bersama SpecTa Education. Panduan lengkap universitas terbaik Perancis, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in France, kuliah di Perancis, universitas Perancis, beasiswa Perancis, visa pelajar Perancis",
  },
  "/destinations/japan": {
    title: "Study in Japan - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Jepang bersama SpecTa Education. Panduan lengkap universitas terbaik Jepang, program studi, biaya kuliah, beasiswa MEXT, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in Japan, kuliah di Jepang, universitas Jepang, beasiswa MEXT, visa pelajar Jepang",
  },
  "/destinations/south-korea": {
    title: "Study in South Korea - Universities, Programs & Scholarships | SpecTa Education",
    description: "Kuliah di Korea Selatan bersama SpecTa Education. Panduan lengkap universitas terbaik Korea, program studi, biaya kuliah, beasiswa KGSP, dan proses visa untuk pelajar Indonesia.",
    keywords: "study in South Korea, kuliah di Korea, universitas Korea, beasiswa KGSP, visa pelajar Korea",
  },
  // Play/Game pages
  "/play": {
    title: "SpecTa Play - Fun Educational Games | SpecTa Education",
    description: "Play fun educational games about studying abroad. Test your knowledge of countries, universities, and student life with SpecTa Play.",
    keywords: "educational games, study abroad games, fun learning, SpecTa Play",
  },
  "/play/quiz": {
    title: "Country Quiz - Find Your Ideal Study Destination | SpecTa Education",
    description: "Take our fun quiz to discover the perfect study abroad destination for you. Match your personality and preferences with the ideal country.",
    keywords: "country quiz, study abroad quiz, destination quiz, which country to study abroad",
  },
  "/play/persona": {
    title: "Student Persona Quiz | SpecTa Education",
    description: "Discover your student persona and find the perfect study abroad destination. Take our fun personality quiz to match your learning style.",
    keywords: "student persona, personality quiz, learning style quiz, study abroad personality",
  },
  "/play/aptitude": {
    title: "AI Aptitude Test - Temukan Jurusan Terbaik Kamu | SpecTa Education",
    description: "Ikuti tes bakat AI gratis SpecTa Education untuk menemukan jurusan kuliah yang paling cocok. Analisis RIASEC dan Multiple Intelligence dalam 10 menit.",
    keywords: "aptitude test, tes bakat, tes minat bakat, career test, RIASEC test, multiple intelligence test, AI aptitude test",
  },
  // Redirect aliases - pages that may be linked from external sources
  "/scholarship-finder": {
    title: "Study Abroad Scholarships 2026 | SpecTa Education",
    description: "Find scholarships for studying abroad in Australia, UK, USA, Canada, and more. SpecTa Education helps you secure funding for your education.",
    keywords: "study abroad scholarships, beasiswa luar negeri, scholarship 2026, beasiswa kuliah, international scholarships, LPDP scholarship",
  },
  "/aptitude-test": {
    title: "AI Aptitude Test - Temukan Jurusan Terbaik Kamu | SpecTa Education",
    description: "Ikuti tes bakat AI gratis SpecTa Education untuk menemukan jurusan kuliah yang paling cocok. Analisis RIASEC dan Multiple Intelligence dalam 10 menit.",
    keywords: "aptitude test, tes bakat, tes minat bakat, career test, RIASEC test, multiple intelligence test, AI aptitude test",
  },
  // Simulator sub-pages
  "/simulator/experience": {
    title: "Study Abroad Simulator Experience | SpecTa Education",
    description: "Live your study abroad experience with our AI-powered simulator. Make real decisions about university, accommodation, and student life.",
    keywords: "study abroad simulator experience, student life abroad, university life simulator",
  },
  "/simulator/report": {
    title: "Your Study Abroad Readiness Report | SpecTa Education",
    description: "See your personalized study abroad readiness report. Discover your strengths, areas to improve, and recommended next steps.",
    keywords: "study abroad readiness, readiness report, study abroad assessment",
  },
  // AI-Optimized Answer Pages (GEO — structured for ChatGPT, Perplexity, Google AI)
  "/ai-answers": {
    title: "FAQ Kuliah Luar Negeri & IELTS Indonesia | SpecTa Education",
    description: "Jawaban lengkap pertanyaan tentang kuliah luar negeri, IELTS preparation, beasiswa, dan konsultan study abroad terbaik di Indonesia. SpecTa Education — 20+ tahun pengalaman.",
    keywords: "konsultan study abroad Indonesia, kursus IELTS terbaik Jakarta, beasiswa kuliah luar negeri, kuliah di Australia Indonesia, SpecTa Education FAQ",
  },
  "/faq": {
    title: "FAQ Kuliah Luar Negeri & IELTS Indonesia | SpecTa Education",
    description: "Jawaban lengkap pertanyaan tentang kuliah luar negeri, IELTS preparation, beasiswa, dan konsultan study abroad terbaik di Indonesia. SpecTa Education — 20+ tahun pengalaman.",
    keywords: "konsultan study abroad Indonesia, kursus IELTS terbaik Jakarta, beasiswa kuliah luar negeri, kuliah di Australia Indonesia, SpecTa Education FAQ",
  },
  // Admin pages - noindex
  "/admin": { title: "Admin Dashboard | SpecTa Education", description: "Administration dashboard", noindex: true },
  "/admin/agents": { title: "Agent Command Center | SpecTa Education", description: "AI Agent management", noindex: true },
  "/staff-login": { title: "Staff Login | SpecTa Education", description: "Staff login portal", noindex: true },
  "/staff-dashboard": { title: "Staff Dashboard | SpecTa Education", description: "Staff management dashboard", noindex: true },
};

/**
 * Get meta tags for a given URL path
 */
function getPageMeta(urlPath: string): PageMeta {
  // Normalize path - remove trailing slash, query string, hash
  let path = urlPath.split("?")[0].split("#")[0];
  if (path !== "/" && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  // Check exact match first
  if (PAGE_META[path]) {
    return PAGE_META[path];
  }

  // Check dynamic routes
  // Blog post: /blog/:slug
  const blogMatch = path.match(/^\/blog\/(.+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const readableTitle = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      title: `${readableTitle} | SpecTa Education Blog`,
      description: `Read about ${readableTitle.toLowerCase()} on the SpecTa Education blog. Expert insights on studying abroad, IELTS preparation, and international education.`,
      keywords: `${slug.replace(/-/g, ", ")}, study abroad, SpecTa Education`,
    };
  }

  // Country page: /destinations/:country
  const destMatch = path.match(/^\/destinations\/(.+)$/);
  if (destMatch) {
    const country = destMatch[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      title: `Study in ${country} - Universities, Programs & Scholarships | SpecTa Education`,
      description: `Kuliah di ${country} bersama SpecTa Education. Panduan lengkap universitas terbaik, program studi, biaya kuliah, beasiswa, dan proses visa untuk pelajar Indonesia.`,
      keywords: `study in ${country}, kuliah di ${country}, universitas ${country}, beasiswa ${country}`,
    };
  }

  // Default fallback
  return {
    title: "SpecTa Education - Konsultan Pendidikan Luar Negeri Terpercaya di Indonesia Sejak 2005",
    description: "SpecTa Education - Konsultan pendidikan luar negeri terpercaya di Indonesia sejak 2005. Bimbingan kuliah di Australia, UK, USA, Kanada, Singapura, Malaysia, China, Irlandia, Belanda & Selandia Baru. IELTS preparation, bantuan visa, beasiswa. 1000+ pelajar terbantu.",
    keywords: "study abroad consultant Jakarta, konsultan pendidikan luar negeri, IELTS preparation, kuliah luar negeri, SpecTa Education",
  };
}

/**
 * Inject page-specific meta tags into the HTML template
 * This replaces the default meta tags in index.html with page-specific ones
 * Also injects page-specific H1 and content into the pre-rendered body section
 */
export function injectSeoMeta(html: string, urlPath: string): string {
  const meta = getPageMeta(urlPath);
  const canonicalUrl = `${BASE_URL}${urlPath === "/" ? "" : urlPath}`;
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE;

  // Replace <title> tag
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`
  );

  // Replace meta keywords
  if (meta.keywords) {
    html = html.replace(
      /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
      `<meta name="keywords" content="${escapeAttr(meta.keywords)}" />`
    );
  }

  // Replace robots meta
  if (meta.noindex) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="noindex, nofollow" />`
    );
  }

  // Replace canonical URL if it exists, otherwise inject one before </head>
  if (/<link\s+rel="canonical"/.test(html)) {
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`
    );
  } else {
    // If no canonical link exists (removed to avoid platform duplication), don't add one
    // The platform injects its own canonical link
  }

  // Replace Open Graph tags
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`
  );

  // Replace Twitter Card tags
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`
  );

  // Inject page-specific H1 into the pre-rendered content
  // Use a more readable H1 derived from the title (before the pipe or brand name)
  const h1Text = meta.title.split(" | ")[0];
  html = html.replace(
    /<h1>[^<]*<\/h1>/,
    `<h1>${escapeHtml(h1Text)}</h1>`
  );

  return html;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
