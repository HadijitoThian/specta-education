// Script to send all 7 university partnership outreach emails
// Run via: npx tsx server/sendPartnershipEmails.ts

import { sendPartnershipEmail } from "./email";

function signatureHtml(): string {
  return `
<br>
<p><strong>Hadi Jito Thian</strong><br>
Founder &amp; CEO, SpecTa Education<br>
Email: <a href="mailto:info@spectaeducation.com">info@spectaeducation.com</a><br>
WhatsApp: +62 818 668 277<br>
Website: <a href="https://www.spectaeducation.com">www.spectaeducation.com</a><br>
Office: Jl. Kelapa Nias Raya CE1 No. 14, Kelapa Gading, Jakarta</p>`;
}

const emails = [
  {
    to: "reshmi.dutta@rmit.edu.au",
    cc: "agentmanagement@rmit.edu.au",
    subject: "Partnership Inquiry — SpecTa Education, Indonesia's First AI-Powered Study Abroad Platform",
    html: `
<p>Dear Ms. Reshmi Dutta,</p>

<p>I hope this message finds you well. My name is Hadi Jito Thian, Founder &amp; CEO of SpecTa Education, a leading education consultancy headquartered in Jakarta, Indonesia. I am writing to express our strong interest in establishing a formal partnership with RMIT University as an authorized education agent.</p>

<p>SpecTa Education has been guiding Indonesian students toward international education since 2005, and we have recently launched <strong>SpecTa 2.0</strong> — making us, to our knowledge, the first and only Indonesian education agency to integrate AI technology directly into our student advisory platform. Here is what makes SpecTa 2.0 unique:</p>

<p><strong>AI-Powered Student Matching:</strong><br>
Our proprietary AI Aptitude Test combines the RIASEC career interest model with Multiple Intelligence theory to scientifically match students with the right courses and universities. This means students who come to us are not just browsing — they arrive with data-driven clarity about their academic direction, resulting in higher enrollment conversion and lower dropout rates.</p>

<p><strong>Intelligent Student Support:</strong></p>
<ul>
<li><strong>AI Chatbot "Ask SpecTa"</strong> — available 24/7 on every page of our platform, providing instant answers about courses, visa requirements, and application processes</li>
<li><strong>AI-Powered IELTS Practice Tests</strong> — helping students prepare and achieve target scores (our average student improves from 5.0 to 7.0+)</li>
<li><strong>IELTS Breakthrough Self-Study Platform</strong> — 28 complete modules across all 4 skills with audio lessons and lifetime access</li>
<li><strong>Track My Application Portal</strong> — real-time application status tracking for students and parents</li>
<li><strong>University Comparison Tool</strong> — side-by-side comparison of programs, fees, and entry requirements</li>
<li><strong>Scholarship Finder</strong> — AI-assisted scholarship matching based on student profiles</li>
</ul>

<p><strong>Our Track Record:</strong></p>
<ul>
<li>1,000+ students successfully placed at international universities</li>
<li>50+ partner universities across 10+ countries</li>
<li>6,000+ IELTS students trained since 2005 with a 4.9/5.0 rating from 276+ Google reviews</li>
<li>3 branches across Jakarta (PIK, Kelapa Gading, Gading Serpong)</li>
<li>20+ years of experience in international education consulting</li>
</ul>

<p>Australia remains our top destination for Indonesian students, and RMIT's strength in technology, design, and business programs aligns perfectly with the career aspirations of our students. We are confident that our AI-driven approach to student counseling would deliver well-prepared, high-quality applicants to RMIT.</p>

<p>We would welcome the opportunity to discuss how SpecTa Education can contribute to RMIT's recruitment goals in Indonesia. I would be happy to arrange a video call or provide any additional documentation required for your agent assessment process.</p>

<p>Thank you for your time and consideration.</p>

<p>Warm regards,</p>
${signatureHtml()}`,
  },
  {
    to: "seap.contact@qut.edu.au",
    cc: "qut.agentsupport@qut.edu.au",
    subject: "Agent Partnership Proposal — SpecTa Education, Indonesia's AI-Powered Education Platform",
    html: `
<p>Dear Mr. Satya Shah and the QUT Southeast Asia Team,</p>

<p>I am writing on behalf of SpecTa Education, Indonesia's first AI-powered education consultancy, to express our interest in becoming an authorized QUT education agent.</p>

<p>Founded in 2005 and headquartered in Jakarta with three branches (PIK, Kelapa Gading, and Gading Serpong), SpecTa Education has placed over 1,000 Indonesian students at universities across 10+ countries. We recently launched <strong>SpecTa 2.0</strong>, a technology-driven platform that we believe sets a new standard for education consulting in Southeast Asia.</p>

<p><strong>Why SpecTa 2.0 is different from traditional agencies:</strong></p>
<ol>
<li><strong>AI Aptitude Testing</strong> — Before any university recommendation, every student completes our proprietary AI-powered aptitude test that combines RIASEC career interest profiling with Multiple Intelligence assessment. This ensures students are matched to programs where they will thrive — not just programs they have heard of. The result: higher enrollment quality and stronger student retention.</li>
<li><strong>24/7 AI Student Support</strong> — Our AI chatbot "Ask SpecTa" is embedded on every page of our platform, providing instant, accurate responses about courses, entry requirements, visa processes, and campus life. This keeps students engaged and informed throughout their decision-making journey.</li>
<li><strong>Integrated IELTS Preparation</strong> — We operate one of Jakarta's top-rated IELTS preparation programs (4.9/5.0 from 276+ reviews, 6,000+ students trained since 2005). Our AI-powered practice tests and 28-module self-study platform help students achieve their target scores efficiently.</li>
<li><strong>Digital Student Journey</strong> — From our Scholarship Finder and University Comparison Tool to our real-time Track My Application portal, every step of the student journey is digitized and transparent.</li>
</ol>

<p>QUT's reputation as "the university for the real world" resonates strongly with our student base — Indonesian families who value practical, career-oriented education. We see significant demand for QUT's programs in business, IT, engineering, and creative industries.</p>

<p>We would be delighted to provide our company profile, student placement history, and any documentation required for your agent assessment. Please let us know the next steps to begin the partnership process.</p>

<p>Best regards,</p>
${signatureHtml()}`,
  },
  {
    to: "agentcontracts@unisa.edu.au",
    subject: "Education Agent Application — SpecTa Education, AI-Driven Student Recruitment from Indonesia",
    html: `
<p>Dear UniSA International Recruitment Team,</p>

<p>I am Hadi Jito Thian, Founder &amp; CEO of SpecTa Education, and I am writing to apply to become an authorized education agent for the University of South Australia.</p>

<p>SpecTa Education is a Jakarta-based education consultancy with 20+ years of experience and over 1,000 students placed internationally. What distinguishes us from other Indonesian agencies is our recent launch of <strong>SpecTa 2.0</strong> — an AI-integrated platform that transforms how students discover, evaluate, and apply to universities.</p>

<p><strong>SpecTa 2.0 — How AI improves student recruitment quality:</strong></p>
<p>Our platform uses artificial intelligence at every stage of the student journey:</p>
<ul>
<li><strong>Discovery:</strong> Our AI Aptitude Test (combining RIASEC + Multiple Intelligence frameworks) helps students identify their ideal study areas with scientific precision, rather than relying on peer pressure or parental assumptions alone.</li>
<li><strong>Preparation:</strong> Our AI-powered IELTS practice tests and 28-module self-study platform have helped 6,000+ students achieve their target scores. Our average student improves from IELTS 5.0 to 7.0+.</li>
<li><strong>Comparison:</strong> Students use our University Comparison Tool and AI-powered Scholarship Finder to make informed decisions based on data, not marketing brochures.</li>
<li><strong>Application:</strong> Our Track My Application portal provides real-time status updates, reducing anxiety and keeping students committed through the enrollment process.</li>
<li><strong>Support:</strong> Our AI chatbot "Ask SpecTa" provides 24/7 assistance on every page of our platform.</li>
</ul>

<p><strong>Why this matters for UniSA:</strong><br>
Students who go through our AI-driven process arrive at their chosen university with clarity about their academic direction and realistic expectations. This translates to higher enrollment conversion, stronger academic performance, and better retention rates.</p>

<p><strong>Our credentials:</strong></p>
<ul>
<li>1,000+ students placed at 50+ partner universities across 10+ countries</li>
<li>3 branches in Jakarta (PIK, Kelapa Gading, Gading Serpong)</li>
<li>4.9/5.0 Google rating from 276+ reviews</li>
<li>Comprehensive visa assistance and pre-departure support</li>
</ul>

<p>Adelaide's growing reputation as a student-friendly city with excellent value for money makes UniSA an attractive option for Indonesian families. We are eager to introduce UniSA's programs to our student network.</p>

<p>Please let us know the documentation required to proceed with the agent application process. We are happy to provide our company registration, student placement records, and any other materials you may need.</p>

<p>Kind regards,</p>
${signatureHtml()}`,
  },
  {
    to: "C.Li@curtin.edu.au",
    cc: "Patricia.Kelly@curtin.edu.au",
    subject: "Partnership Inquiry from SpecTa Education — Indonesia's First AI-Powered Education Agency",
    html: `
<p>Dear Ms. Corrinne Li,</p>

<p>I hope this email finds you well. My name is Hadi Jito Thian, and I am the Founder &amp; CEO of SpecTa Education, a leading education consultancy based in Jakarta, Indonesia.</p>

<p>I am reaching out to explore the possibility of becoming an authorized Curtin University education agent. We understand that Curtin already has excellent representation in Indonesia through Patricia Kelly and Sri Yenawati, and we would welcome the opportunity to complement these efforts with our unique technology-driven approach.</p>

<p><strong>Introducing SpecTa 2.0 — AI-Powered Education Consulting:</strong></p>
<p>SpecTa Education has recently launched SpecTa 2.0, making us — to our knowledge — the only Indonesian education agency with a fully AI-integrated student advisory platform. Here is what this means in practice:</p>
<ul>
<li><strong>AI Aptitude Test:</strong> Every prospective student takes our proprietary test combining RIASEC career profiling with Multiple Intelligence assessment. This produces a detailed report identifying their ideal study areas, which our counselors then use to recommend specific programs. Students arrive at their chosen university knowing exactly why they chose their course.</li>
<li><strong>AI-Powered IELTS Ecosystem:</strong> We run one of Jakarta's highest-rated IELTS programs (4.9/5.0, 276+ reviews, 6,000+ students since 2005). Our platform includes AI practice tests and a 28-module self-study system that helps students improve from IELTS 5.0 to 7.0+ on average.</li>
<li><strong>Smart Decision Tools:</strong> Our University Comparison Tool, Scholarship Finder, and Study Abroad Simulator help students make data-driven decisions. The simulator even lets students experience "3 days of student life" at their target destination before committing.</li>
<li><strong>Full Digital Journey:</strong> From initial consultation through our AI chatbot "Ask SpecTa" to real-time application tracking via our Track My Application portal, every touchpoint is digitized.</li>
</ul>

<p><strong>Our track record:</strong> 1,000+ students placed, 50+ partner universities, 10+ countries, 3 Jakarta branches, and 20+ years of experience.</p>

<p>Curtin's strengths in mining, engineering, health sciences, and technology are highly relevant to Indonesian students, particularly those from families connected to Indonesia's natural resources and infrastructure sectors. We believe our AI-driven approach would deliver exceptionally well-matched candidates to Curtin.</p>

<p>I would welcome the opportunity to discuss this further. Please let me know if there is a formal application process or if a call would be appropriate.</p>

<p>Warm regards,</p>
${signatureHtml()}`,
  },
  {
    to: "international-agents@uow.edu.au",
    subject: "Agent Expression of Interest — SpecTa Education, AI-Powered Student Recruitment from Indonesia",
    html: `
<p>Dear UOW Global Student Recruitment Team,</p>

<p>I am writing to express SpecTa Education's interest in becoming an authorized UOW education agent. My name is Hadi Jito Thian, Founder &amp; CEO of SpecTa Education, a Jakarta-based education consultancy that has been operating for over 20 years.</p>

<p>We understand that UOW maintains high standards for agent partnerships, including a requirement for representatives to have worked with Top 20 Australian universities. We are confident that our credentials and our innovative approach to student recruitment meet and exceed these expectations.</p>

<p><strong>SpecTa 2.0 — A new model for education consulting:</strong></p>
<p>SpecTa Education recently launched SpecTa 2.0, an AI-powered platform that fundamentally changes how Indonesian students discover and apply to international universities. To our knowledge, we are the first Indonesian education agency to integrate artificial intelligence directly into our student advisory process.</p>

<p><strong>What makes our approach unique:</strong></p>
<ol>
<li><strong>Scientific Student-Course Matching:</strong> Our AI Aptitude Test uses RIASEC career interest profiling combined with Multiple Intelligence theory to generate personalized course recommendations. This is not a simple quiz — it is a comprehensive assessment that produces detailed reports, ensuring students choose programs aligned with their genuine strengths and interests.</li>
<li><strong>Integrated English Preparation:</strong> Our IELTS program is one of the most established in Jakarta (since 2005, 6,000+ students, 4.9/5.0 from 276+ Google reviews). We have added AI-powered practice tests and a 28-module digital self-study platform, enabling students to prepare more efficiently and achieve higher scores.</li>
<li><strong>End-to-End Digital Experience:</strong> From our AI chatbot "Ask SpecTa" (available 24/7) to our University Comparison Tool, Scholarship Finder, and Track My Application portal, every step of the student journey is supported by technology.</li>
<li><strong>Proven Scale:</strong> 1,000+ students placed at 50+ universities across 10+ countries, with 3 branches across Jakarta.</li>
</ol>

<p>UOW's strong reputation in engineering, IT, and health sciences, combined with its welcoming campus environment, makes it an excellent fit for Indonesian students seeking a high-quality education outside of the major capital cities. We are particularly excited about UOW's emphasis on practical learning and industry connections.</p>

<p>We have submitted our Expression of Interest through your online portal and would welcome any further discussion about how SpecTa Education can support UOW's recruitment objectives in Indonesia.</p>

<p>Best regards,</p>
${signatureHtml()}`,
  },
  {
    to: "gi-agent@griffith.edu.au",
    subject: "Agent Partnership Application — SpecTa Education, Indonesia's AI-Driven Education Consultancy",
    html: `
<p>Dear Griffith University International Agent Team,</p>

<p>I am Hadi Jito Thian, Founder &amp; CEO of SpecTa Education, and I am writing to apply for an agent partnership with Griffith University.</p>

<p>SpecTa Education is a Jakarta-based education consultancy with over 20 years of experience and a track record of placing 1,000+ Indonesian students at international universities. We operate three branches across Jakarta (PIK, Kelapa Gading, and Gading Serpong) and maintain partnerships with 50+ universities across 10+ countries.</p>

<p><strong>Why SpecTa Education stands out — SpecTa 2.0:</strong></p>
<p>We recently launched SpecTa 2.0, an AI-powered platform that we believe makes us the first Indonesian education agency to fully integrate artificial intelligence into the student advisory process. Here is how this benefits our university partners:</p>

<p><strong>Higher-quality applicants:</strong> Our AI Aptitude Test combines RIASEC career profiling with Multiple Intelligence assessment to scientifically match students with programs. Students who apply through SpecTa have already been through a rigorous self-discovery process — they know what they want to study and why.</p>

<p><strong>Better-prepared students:</strong> Our IELTS preparation program (4.9/5.0 rating, 6,000+ students since 2005) now includes AI-powered practice tests and a 28-module digital self-study platform. Our average student improves from IELTS 5.0 to 7.0+.</p>

<p><strong>Engaged and informed applicants:</strong> Our AI chatbot "Ask SpecTa" provides 24/7 support, while our University Comparison Tool, Scholarship Finder, and Study Abroad Simulator help students make confident, well-researched decisions.</p>

<p><strong>Transparent process:</strong> Our Track My Application portal gives students and parents real-time visibility into their application status, reducing drop-off during the enrollment process.</p>

<p>Griffith University's strengths in tourism, hospitality, health, and environmental sciences are highly relevant to Indonesian students. Queensland's lifestyle and Griffith's Gold Coast and Brisbane campuses are particularly attractive to families looking for a safe, vibrant study destination.</p>

<p>We would be pleased to provide our company profile, registration documents, and student placement history. Please let us know the next steps in your agent assessment process.</p>

<p>Kind regards,</p>
${signatureHtml()}`,
  },
  {
    to: "internationalagents@latrobe.edu.au",
    subject: "Agent Partnership Inquiry — SpecTa Education, Indonesia's First AI-Integrated Education Platform",
    html: `
<p>Dear La Trobe University International Agents Team,</p>

<p>My name is Hadi Jito Thian, and I am the Founder &amp; CEO of SpecTa Education, a leading education consultancy based in Jakarta, Indonesia. I am writing to explore the possibility of becoming an authorized La Trobe University education agent.</p>

<p>SpecTa Education has been guiding Indonesian students toward international education opportunities for over 20 years, with 1,000+ successful placements across 50+ universities in 10+ countries. We operate from three branches in Jakarta (PIK, Kelapa Gading, and Gading Serpong) and are proud to maintain a 4.9/5.0 Google rating from 276+ reviews.</p>

<p><strong>SpecTa 2.0 — Redefining education consulting with AI:</strong></p>
<p>We have recently launched SpecTa 2.0, which we believe makes us the first and only Indonesian education agency with a fully AI-integrated student advisory platform. This is not a marketing gimmick — it is a fundamental shift in how we counsel students:</p>
<ul>
<li><strong>AI Aptitude Test:</strong> Every student takes our proprietary assessment combining RIASEC career interest profiling with Multiple Intelligence theory. The AI generates a detailed report identifying ideal study areas, which our experienced counselors then use to recommend specific universities and programs. This scientific approach means students arrive at university with genuine alignment between their abilities and their chosen course.</li>
<li><strong>AI-Enhanced IELTS Preparation:</strong> Our IELTS program has trained 6,000+ students since 2005 and is rated 4.9/5.0 on Google. We have now added AI-powered practice tests and a comprehensive 28-module digital self-study platform, helping students improve from IELTS 5.0 to 7.0+ on average.</li>
<li><strong>Smart Discovery Tools:</strong> Our platform includes a University Comparison Tool for side-by-side program analysis, a Scholarship Finder that matches students with relevant financial aid, and a Study Abroad Simulator that lets students experience "3 days of student life" at their target destination.</li>
<li><strong>24/7 AI Support:</strong> Our AI chatbot "Ask SpecTa" is available on every page of our platform, providing instant answers about courses, requirements, visa processes, and campus life — keeping students engaged and reducing counselor workload.</li>
<li><strong>Digital Application Tracking:</strong> Our Track My Application portal provides real-time status updates to students and parents, maintaining engagement throughout the enrollment process.</li>
</ul>

<p>La Trobe's strengths in health sciences, cybersecurity, and agricultural sciences, combined with Melbourne's appeal as a study destination, make it an excellent match for our student demographic. We are particularly interested in La Trobe's commitment to social inclusion and its strong industry connections.</p>

<p>We would welcome the opportunity to discuss a partnership and are happy to provide any documentation required for your agent assessment process.</p>

<p>Warm regards,</p>
${signatureHtml()}`,
  },
];

async function main() {
  console.log("=== Sending 7 University Partnership Emails ===\n");
  console.log("From: Hadi Jito Thian - SpecTa Education <hadi@spectaeducation.com>\n");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    console.log(`[${i + 1}/7] Sending to: ${email.to}${email.cc ? ` (CC: ${email.cc})` : ""}`);
    console.log(`  Subject: ${email.subject}`);

    const success = await sendPartnershipEmail({
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      html: email.html,
    });

    if (success) {
      console.log(`  ✅ SENT successfully\n`);
      successCount++;
    } else {
      console.log(`  ❌ FAILED to send\n`);
      failCount++;
    }

    // Small delay between emails to avoid rate limiting
    if (i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`✅ Sent: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total: ${emails.length}`);
}

main().catch(console.error);
