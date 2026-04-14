/**
 * Agent 3 — SEO Builder
 * 
 * Responsibilities:
 * 1. Generate SEO-optimized blog articles using AI (2-3 per week)
 * 2. Target high-value keywords for Indonesian study abroad market
 * 3. Auto-publish articles to the blog system
 * 4. Maintain a content calendar
 * 5. Track keyword performance
 */

import { invokeLLM } from "./_core/llm";
import {
  createSeoContentEntry,
  getAllSeoContentEntries,
  updateSeoContentEntry,
  getSeoContentByStatus,
  createBlogPost,
  createBlogCategory,
  listBlogCategories,
  createAgentRunLog,
  updateAgentRunLog,
  updateAgentConfig,
} from "./db";

// Target keyword clusters for Indonesian study abroad market — 200+ keywords, never runs out
const KEYWORD_CLUSTERS = [
  // Australia — expanded
  { category: "study_australia", keywords: [
    "kuliah di australia", "biaya kuliah australia 2026", "universitas terbaik australia", "beasiswa australia untuk indonesia",
    "visa pelajar australia", "syarat kuliah di australia", "jurusan terbaik di australia", "kehidupan mahasiswa di australia",
    "part time kerja australia mahasiswa", "monash university indonesia", "university of melbourne pendaftaran",
    "ANU australian national university", "university of sydney jurusan", "UNSW kuliah", "university of queensland beasiswa",
    "biaya hidup sydney 2026", "biaya hidup melbourne 2026", "cara apply kuliah australia", "letter of offer australia",
    "student visa australia subclass 500", "english requirement kuliah australia", "IELTS untuk kuliah australia",
    "kuliah s2 australia beasiswa", "kuliah s1 australia dari indonesia", "tips lolos seleksi universitas australia",
    "jurusan engineering australia", "jurusan business australia", "jurusan kedokteran australia", "jurusan IT australia",
    "kerja setelah kuliah di australia", "permanent residency australia setelah kuliah"
  ]},
  // UK — expanded
  { category: "study_uk", keywords: [
    "kuliah di inggris", "biaya kuliah di uk", "universitas terbaik inggris", "beasiswa chevening",
    "visa pelajar uk", "syarat kuliah di inggris", "university of oxford pendaftaran", "university of cambridge tips",
    "imperial college london", "UCL university college london", "LSE london school of economics",
    "biaya hidup london 2026", "biaya hidup manchester", "kuliah di edinburgh scotland",
    "beasiswa british council", "beasiswa GREAT scholarship", "cara daftar kuliah uk dari indonesia",
    "UCAS application tips", "personal statement kuliah uk", "IELTS untuk uk visa",
    "kuliah s2 uk 1 tahun", "master degree uk duration", "post study work visa uk"
  ]},
  // Canada — expanded
  { category: "study_canada", keywords: [
    "kuliah di kanada", "biaya kuliah kanada", "universitas terbaik kanada", "beasiswa kanada",
    "visa pelajar kanada", "kerja setelah kuliah di kanada", "university of toronto", "mcgill university",
    "UBC university of british columbia", "biaya hidup toronto", "biaya hidup vancouver",
    "co-op program kanada", "post graduation work permit kanada", "PR kanada setelah kuliah",
    "kuliah di quebec kanada", "beasiswa vanier canada", "cara apply kuliah kanada"
  ]},
  // New Zealand — expanded
  { category: "study_nz", keywords: [
    "kuliah di selandia baru", "biaya kuliah new zealand", "universitas terbaik new zealand", "beasiswa new zealand",
    "university of auckland", "victoria university wellington", "otago university", "biaya hidup auckland",
    "visa pelajar new zealand", "kerja sambil kuliah new zealand", "beasiswa new zealand ASEAN"
  ]},
  // Ireland — expanded
  { category: "study_ireland", keywords: [
    "kuliah di irlandia", "biaya kuliah irlandia", "universitas terbaik irlandia", "beasiswa irlandia",
    "trinity college dublin", "UCD university college dublin", "biaya hidup dublin",
    "visa pelajar irlandia", "kerja setelah kuliah di irlandia", "beasiswa government of ireland"
  ]},
  // Germany
  { category: "study_germany", keywords: [
    "kuliah di jerman gratis", "biaya kuliah jerman", "universitas terbaik jerman", "beasiswa DAAD",
    "TU Munich", "Heidelberg University", "kuliah bahasa inggris di jerman", "visa pelajar jerman",
    "biaya hidup berlin", "biaya hidup munich", "kuliah s2 jerman", "cara daftar kuliah jerman"
  ]},
  // Japan
  { category: "study_japan", keywords: [
    "kuliah di jepang", "biaya kuliah jepang", "beasiswa monbukagakusho MEXT", "universitas terbaik jepang",
    "university of tokyo", "kyoto university", "osaka university", "visa pelajar jepang",
    "biaya hidup tokyo", "kuliah bahasa inggris di jepang", "beasiswa jepang untuk indonesia"
  ]},
  // USA
  { category: "study_usa", keywords: [
    "kuliah di amerika serikat", "biaya kuliah usa", "beasiswa fulbright indonesia", "universitas terbaik usa",
    "ivy league university", "MIT massachusetts", "stanford university", "visa F1 pelajar usa",
    "TOEFL untuk kuliah usa", "SAT untuk kuliah usa", "biaya hidup new york mahasiswa"
  ]},
  // Netherlands
  { category: "study_netherlands", keywords: [
    "kuliah di belanda", "biaya kuliah belanda", "universitas terbaik belanda", "beasiswa orange tulip",
    "TU Delft", "leiden university", "university of amsterdam", "biaya hidup amsterdam",
    "visa pelajar belanda", "kuliah bahasa inggris belanda"
  ]},
  // IELTS — expanded
  { category: "ielts_tips", keywords: [
    "tips ielts band 7", "persiapan ielts", "cara belajar ielts sendiri", "ielts writing tips",
    "ielts speaking tips", "perbedaan ielts academic general", "kursus ielts jakarta", "ielts online preparation",
    "ielts listening tips", "ielts reading tips", "cara meningkatkan skor ielts", "ielts band 6 ke 7",
    "ielts writing task 2 tips", "ielts speaking part 3 tips", "ielts mock test", "ielts preparation 1 bulan",
    "ielts preparation 3 bulan", "buku persiapan ielts terbaik", "aplikasi belajar ielts",
    "ielts vs toefl perbedaan", "ielts computer based vs paper based", "biaya tes ielts indonesia",
    "tempat tes ielts jakarta", "tempat tes ielts surabaya", "tempat tes ielts bandung"
  ]},
  // Scholarships — expanded
  { category: "scholarships", keywords: [
    "beasiswa luar negeri 2026", "beasiswa s1 luar negeri", "beasiswa s2 luar negeri", "beasiswa tanpa ielts",
    "beasiswa fully funded 2026", "cara mendapatkan beasiswa luar negeri", "daftar beasiswa luar negeri",
    "beasiswa LPDP 2026", "cara daftar beasiswa LPDP", "tips lolos beasiswa LPDP",
    "beasiswa AAS australia awards", "beasiswa DIKTI", "beasiswa bank indonesia",
    "beasiswa tanpa syarat usia", "beasiswa untuk ibu rumah tangga", "beasiswa untuk karyawan",
    "beasiswa parsial luar negeri", "beasiswa s3 luar negeri", "beasiswa riset luar negeri",
    "cara menulis motivation letter beasiswa", "tips interview beasiswa", "contoh esai beasiswa",
    "beasiswa bilateral indonesia", "beasiswa pemerintah jepang", "beasiswa erasmus mundus"
  ]},
  // General study abroad — expanded
  { category: "study_abroad", keywords: [
    "cara kuliah di luar negeri", "persiapan kuliah luar negeri", "tes bakat untuk jurusan kuliah",
    "jurusan kuliah yang bagus di luar negeri", "biaya hidup mahasiswa luar negeri", "tips adaptasi kuliah luar negeri",
    "cara memilih universitas luar negeri", "ranking universitas dunia 2026", "QS world ranking 2026",
    "tips apply kuliah luar negeri", "dokumen yang dibutuhkan kuliah luar negeri",
    "cara membuat personal statement", "cara membuat CV untuk kuliah luar negeri",
    "recommendation letter kuliah luar negeri", "tips wawancara universitas luar negeri",
    "gap year sebelum kuliah luar negeri", "kuliah luar negeri usia 25 ke atas",
    "kuliah luar negeri sambil kerja", "online degree luar negeri", "kuliah luar negeri murah",
    "negara terbaik untuk kuliah dari indonesia", "kuliah luar negeri tanpa beasiswa"
  ]},
  // Career — expanded
  { category: "career", keywords: [
    "karir setelah kuliah luar negeri", "gaji lulusan luar negeri", "jurusan kuliah gaji tinggi",
    "prospek kerja lulusan australia", "kerja di luar negeri setelah kuliah", "jurusan IT prospek kerja",
    "jurusan data science luar negeri", "jurusan AI machine learning", "jurusan finance luar negeri",
    "jurusan engineering terbaik", "jurusan kedokteran luar negeri", "jurusan hukum internasional",
    "MBA luar negeri worth it", "kuliah s2 manfaat untuk karir", "networking kuliah luar negeri"
  ]},
  // Student life & practical tips
  { category: "student_life", keywords: [
    "tips hidup hemat sebagai mahasiswa luar negeri", "cara cari kerja part time luar negeri",
    "akomodasi mahasiswa luar negeri", "tips masak sendiri di luar negeri", "komunitas indonesia di australia",
    "komunitas indonesia di inggris", "tips mengatasi culture shock", "tips belajar efektif luar negeri",
    "cara kirim uang ke luar negeri mahasiswa", "asuransi kesehatan mahasiswa luar negeri",
    "tips cari teman di kampus luar negeri", "manfaat kuliah luar negeri untuk pribadi"
  ]},
  // SpecTa specific
  { category: "specta_promo", keywords: [
    "konsultasi kuliah luar negeri gratis", "education consultant indonesia terpercaya",
    "cara daftar kuliah luar negeri dengan bantuan konsultan", "jasa apply kuliah luar negeri",
    "agen pendidikan luar negeri terbaik", "konsultan beasiswa indonesia",
    "persiapan kuliah luar negeri dari nol", "panduan lengkap kuliah luar negeri"
  ]},
];

// How many days before a keyword can be reused with a fresh angle
const KEYWORD_RECYCLE_DAYS = 90;

/**
 * Main agent execution function
 */
export async function runSeoBuilderAgent(): Promise<{
  articlesPlanned: number;
  articlesGenerated: number;
  articlesPublished: number;
  errors: number;
}> {
  const startTime = Date.now();
  let articlesPlanned = 0;
  let articlesGenerated = 0;
  let articlesPublished = 0;
  let errors = 0;

  const runLog = await createAgentRunLog({
    agentName: "seo_builder",
    status: "running",
    summary: "Starting SEO content generation cycle...",
    startedAt: new Date(),
  });

  try {
    // Step 1: Plan new content if calendar is low
    const planResult = await planNewContent();
    articlesPlanned = planResult.planned;
    errors += planResult.errors;

    // Step 2: Generate content for planned articles
    const genResult = await generatePlannedContent();
    articlesGenerated = genResult.generated;
    errors += genResult.errors;

    // Step 3: Auto-publish generated articles that are ready
    const pubResult = await publishReadyContent();
    articlesPublished = pubResult.published;
    errors += pubResult.errors;

    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: errors > 0 ? "partial" : "success",
        summary: `Planned ${articlesPlanned}, generated ${articlesGenerated}, published ${articlesPublished} articles`,
        details: JSON.stringify({ articlesPlanned, articlesGenerated, articlesPublished, errors }),
        itemsProcessed: articlesPlanned + articlesGenerated + articlesPublished,
        itemsSucceeded: articlesPlanned + articlesGenerated + articlesPublished - errors,
        itemsFailed: errors,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }

    await updateAgentConfig("seo_builder", {
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // next run in 8 hours
    });

  } catch (err) {
    console.error("[SEO Agent] Fatal error:", err);
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }
  }

  return { articlesPlanned, articlesGenerated, articlesPublished, errors };
}

/**
 * Plan new content entries if the calendar needs more
 */
async function planNewContent(): Promise<{ planned: number; errors: number }> {
  let planned = 0;
  let errors = 0;

  try {
    const existingEntries = await getAllSeoContentEntries();
    const plannedOrPending = existingEntries.filter(e => 
      ["planned", "generating", "generated", "review"].includes(e.status)
    );

    // Only plan new content if we have fewer than 5 pending articles
    if (plannedOrPending.length >= 5) {
      console.log(`[SEO Agent] Already have ${plannedOrPending.length} pending articles, skipping planning`);
      return { planned: 0, errors: 0 };
    }

     // Pick keywords: fresh ones first, then recycle old ones (published 90+ days ago)
    const now = Date.now();
    const recycleCutoff = now - KEYWORD_RECYCLE_DAYS * 24 * 60 * 60 * 1000;
    // Keywords used recently (within recycle window) — skip these
    const recentlyUsed = new Set(
      existingEntries
        .filter(e => e.publishedAt ? new Date(e.publishedAt).getTime() > recycleCutoff : e.status !== 'published')
        .map(e => e.targetKeyword.toLowerCase())
    );
    const availableKeywords: Array<{ keyword: string; category: string }> = [];
    for (const cluster of KEYWORD_CLUSTERS) {
      for (const keyword of cluster.keywords) {
        if (!recentlyUsed.has(keyword.toLowerCase())) {
          availableKeywords.push({ keyword, category: cluster.category });
        }
      }
    }
    // If still no keywords available, use AI to generate fresh topic ideas
    if (availableKeywords.length === 0) {
      console.log('[SEO Agent] All keywords used recently — generating fresh AI topics...');
      try {
        const aiTopicsResp = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are an SEO expert for an Indonesian study abroad education consultancy called SpecTa Education. Generate 10 fresh, high-search-volume blog topic ideas in Bahasa Indonesia targeting students who want to study in Australia, UK, Canada, or other countries. Return ONLY a JSON array of objects: [{"keyword": "...", "category": "study_australia|study_uk|scholarships|ielts_tips|study_abroad|career"}]. No explanation.' },
            { role: 'user', content: 'Generate 10 fresh blog topics for SpecTa Education that are not generic — focus on specific universities, specific scholarships, specific cities, or specific programs. Current year is 2026.' }
          ],
          response_format: { type: 'json_schema', json_schema: { name: 'topics', strict: true, schema: { type: 'object', properties: { topics: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, category: { type: 'string' } }, required: ['keyword', 'category'], additionalProperties: false } } }, required: ['topics'], additionalProperties: false } } }
        });
        const parsed = JSON.parse(aiTopicsResp.choices[0].message.content as string);
        for (const t of parsed.topics || []) {
          availableKeywords.push({ keyword: t.keyword, category: t.category });
        }
        console.log(`[SEO Agent] AI generated ${availableKeywords.length} fresh topics`);
      } catch (aiErr) {
        console.error('[SEO Agent] AI topic generation failed:', aiErr);
      }
    }
    // Plan up to 3 new articles
    const toplan = Math.min(3, availableKeywords.length, 5 - plannedOrPending.length);;
    
    // Shuffle and pick
    const shuffled = availableKeywords.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < toplan; i++) {
      const { keyword, category } = shuffled[i];
      
      // Calculate scheduled date (spread across the week)
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (i * 2) + 1); // every 2 days
      const dateStr = scheduledDate.toISOString().split("T")[0];

      try {
        await createSeoContentEntry({
          targetKeyword: keyword,
          secondaryKeywords: JSON.stringify(
            KEYWORD_CLUSTERS.find(c => c.category === category)?.keywords.filter(k => k !== keyword).slice(0, 3) || []
          ),
          language: "id",
          category,
          status: "planned",
          scheduledDate: dateStr,
        });
        planned++;
        console.log(`[SEO Agent] Planned article for keyword: "${keyword}" on ${dateStr}`);
      } catch (err) {
        console.error(`[SEO Agent] Error planning article for "${keyword}":`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[SEO Agent] Error in planNewContent:", err);
    errors++;
  }

  return { planned, errors };
}

/**
 * Generate content for planned articles using AI
 */
async function generatePlannedContent(): Promise<{ generated: number; errors: number }> {
  let generated = 0;
  let errors = 0;

  try {
    const plannedArticles = await getSeoContentByStatus("planned");
    
    // Generate up to 1 article per run to manage LLM costs
    const toGenerate = plannedArticles.slice(0, 1);

    for (const entry of toGenerate) {
      try {
        await updateSeoContentEntry(entry.id, { status: "generating" });

        const secondaryKws = JSON.parse(entry.secondaryKeywords || "[]");
        
        // Generate article using AI
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert SEO content writer for SpecTa Education, an overseas education consultancy based in Jakarta, Indonesia. You write in Bahasa Indonesia with some English terms where appropriate (bilingual style).

Your articles must:
1. Be 1500-2500 words long
2. Use the target keyword naturally 5-8 times
3. Include secondary keywords naturally
4. Have a compelling title (both Indonesian and English)
5. Include an SEO meta description (150-160 chars)
6. Use proper H2 and H3 headings
7. Include practical, actionable advice
8. Mention SpecTa Education naturally 2-3 times as a helpful resource
9. Include a call-to-action to book a free consultation
10. Be factually accurate with current 2026 data
11. Use markdown formatting

Return your response as JSON with this structure:
{
  "title": "Indonesian title",
  "titleEn": "English title",
  "slug": "url-slug-here",
  "metaDescription": "SEO meta description in Indonesian",
  "excerpt": "Short excerpt for blog listing (2-3 sentences)",
  "content": "Full article content in markdown format",
  "tags": ["tag1", "tag2", "tag3"]
}`
            },
            {
              role: "user",
              content: `Write an SEO-optimized article for SpecTa Education's blog.

Target keyword: "${entry.targetKeyword}"
Secondary keywords: ${secondaryKws.join(", ")}
Category: ${entry.category}

Make it informative, engaging, and helpful for Indonesian students interested in studying abroad. Include real data and practical tips.`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "seo_article",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Article title in Indonesian" },
                  titleEn: { type: "string", description: "Article title in English" },
                  slug: { type: "string", description: "URL slug" },
                  metaDescription: { type: "string", description: "SEO meta description" },
                  excerpt: { type: "string", description: "Short excerpt" },
                  content: { type: "string", description: "Full article in markdown" },
                  tags: { type: "array", items: { type: "string" }, description: "Article tags" },
                },
                required: ["title", "titleEn", "slug", "metaDescription", "excerpt", "content", "tags"],
                additionalProperties: false,
              },
            },
          },
        });

        const articleData = JSON.parse(response.choices[0].message.content as string);

        // Update the SEO content entry
        await updateSeoContentEntry(entry.id, {
          title: articleData.title,
          titleId: articleData.title,
          slug: articleData.slug,
          contentBrief: articleData.excerpt,
          status: "generated",
        });

        // Store the full article data in the entry for publishing
        await updateSeoContentEntry(entry.id, {
          contentBrief: JSON.stringify({
            ...articleData,
            generatedAt: new Date().toISOString(),
          }),
          status: "generated",
        });

        generated++;
        console.log(`[SEO Agent] Generated article: "${articleData.title}"`);
      } catch (err) {
        console.error(`[SEO Agent] Error generating article for "${entry.targetKeyword}":`, err);
        await updateSeoContentEntry(entry.id, { status: "failed" });
        errors++;
      }
    }
  } catch (err) {
    console.error("[SEO Agent] Error in generatePlannedContent:", err);
    errors++;
  }

  return { generated, errors };
}

/**
 * Publish generated articles to the blog system
 */
async function publishReadyContent(): Promise<{ published: number; errors: number }> {
  let published = 0;
  let errors = 0;

  try {
    const generatedArticles = await getSeoContentByStatus("generated");

    for (const entry of generatedArticles) {
      try {
        // Parse the stored article data
        let articleData: any;
        try {
          articleData = JSON.parse(entry.contentBrief || "{}");
        } catch {
          console.error(`[SEO Agent] Invalid article data for entry ${entry.id}`);
          errors++;
          continue;
        }

        if (!articleData.title || !articleData.content || !articleData.slug) {
          console.error(`[SEO Agent] Incomplete article data for entry ${entry.id}`);
          errors++;
          continue;
        }

        // Ensure blog category exists
        const categories = await listBlogCategories();
        let categoryId: number | undefined;
        const categoryMap: Record<string, string> = {
          study_australia: "Study in Australia",
          study_uk: "Study in UK",
          study_canada: "Study in Canada",
          study_nz: "Study in New Zealand",
          study_ireland: "Study in Ireland",
          ielts_tips: "IELTS Preparation",
          scholarships: "Scholarships",
          study_abroad: "Study Abroad Tips",
          career: "Career & Jobs",
        };

        const categoryName = categoryMap[entry.category || ""] || "Study Abroad Tips";
        const existingCat = categories.find(c => c.name === categoryName);
        
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          const newCat = await createBlogCategory({
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            description: `Articles about ${categoryName}`,
          });
          if (newCat) categoryId = newCat.id;
        }

        // Create the blog post
        const blogPost = await createBlogPost({
          title: articleData.title,
          slug: articleData.slug,
          excerpt: articleData.excerpt || articleData.metaDescription,
          content: articleData.content,
          metaTitle: articleData.title,
          metaDescription: articleData.metaDescription,
          targetKeyword: entry.targetKeyword,
          categoryId,
          status: "published",
          publishedAt: new Date(),
        });

        if (blogPost) {
          await updateSeoContentEntry(entry.id, {
            status: "published",
            blogPostId: blogPost.id,
            publishedAt: new Date(),
          });
          published++;
          console.log(`[SEO Agent] Published article: "${articleData.title}" (blog post #${blogPost.id})`);
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`[SEO Agent] Error publishing entry ${entry.id}:`, err);
        await updateSeoContentEntry(entry.id, { status: "failed" });
        errors++;
      }
    }
  } catch (err) {
    console.error("[SEO Agent] Error in publishReadyContent:", err);
    errors++;
  }

  return { published, errors };
}
