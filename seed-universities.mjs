/**
 * Seed script for University Matching Engine
 * Run: node seed-universities.mjs
 * 
 * Populates matchUniversities and matchPrograms tables with real university data
 * covering SpecTa Education's partner countries.
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const universities = [
  // === MALAYSIA ===
  {
    name: "Taylor's University",
    nameId: "Universitas Taylor",
    country: "Malaysia",
    city: "Subang Jaya",
    description: "One of Malaysia's top private universities, ranked #284 in QS World Rankings. Known for hospitality, business, and design programs.",
    descriptionId: "Salah satu universitas swasta terbaik di Malaysia, peringkat #284 di QS World Rankings. Terkenal untuk program perhotelan, bisnis, dan desain.",
    website: "https://university.taylors.edu.my",
    tuitionMinUsd: 4000,
    tuitionMaxUsd: 9000,
    ieltsMin: "5.0",
    gpaMin: "2.5",
    scholarshipAvailable: true,
    ranking: "QS #284",
    programs: [
      { programName: "Bachelor of Computer Science", fieldOfStudy: "Computer Science", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Business Administration", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,logical", degreeLevel: "bachelor" },
      { programName: "Bachelor of Hospitality Management", fieldOfStudy: "Hospitality & Tourism", riasecCodes: "ESA", miTypes: "interpersonal,linguistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Design (Hons)", fieldOfStudy: "Arts & Design", riasecCodes: "AIS", miTypes: "spatial,kinesthetic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Psychology", fieldOfStudy: "Psychology", riasecCodes: "SIA", miTypes: "interpersonal,intrapersonal", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "Sunway University",
    nameId: "Universitas Sunway",
    country: "Malaysia",
    city: "Bandar Sunway",
    description: "A leading private university in Malaysia with strong industry partnerships. Ranked among the top 600 globally by QS.",
    descriptionId: "Universitas swasta terkemuka di Malaysia dengan kemitraan industri yang kuat. Peringkat 600 besar dunia oleh QS.",
    website: "https://university.sunway.edu.my",
    tuitionMinUsd: 3500,
    tuitionMaxUsd: 8000,
    ieltsMin: "5.5",
    gpaMin: "2.5",
    scholarshipAvailable: true,
    ranking: "QS 501-550",
    programs: [
      { programName: "BSc (Hons) Information Technology", fieldOfStudy: "Information Technology", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Accounting & Finance", fieldOfStudy: "Accounting", riasecCodes: "CEI", miTypes: "logical,intrapersonal", degreeLevel: "bachelor" },
      { programName: "Bachelor of Communication", fieldOfStudy: "Communication", riasecCodes: "ASE", miTypes: "linguistic,interpersonal", degreeLevel: "bachelor" },
      { programName: "BSc (Hons) Biology", fieldOfStudy: "Biology", riasecCodes: "IRA", miTypes: "naturalistic,logical", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "UCSI University",
    nameId: "Universitas UCSI",
    country: "Malaysia",
    city: "Kuala Lumpur",
    description: "A top private university in Malaysia known for music, engineering, and medical programs. QS ranked #300.",
    descriptionId: "Universitas swasta top di Malaysia yang terkenal untuk program musik, teknik, dan kedokteran. Peringkat QS #300.",
    website: "https://www.ucsiuniversity.edu.my",
    tuitionMinUsd: 3000,
    tuitionMaxUsd: 8500,
    ieltsMin: "5.0",
    gpaMin: "2.5",
    scholarshipAvailable: true,
    ranking: "QS #300",
    programs: [
      { programName: "Bachelor of Music (Hons)", fieldOfStudy: "Music", riasecCodes: "AIS", miTypes: "musical,kinesthetic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Engineering (Mechanical)", fieldOfStudy: "Engineering", riasecCodes: "RIC", miTypes: "logical,spatial,kinesthetic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Pharmacy", fieldOfStudy: "Pharmacy", riasecCodes: "ISC", miTypes: "logical,naturalistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Architecture", fieldOfStudy: "Architecture", riasecCodes: "AIR", miTypes: "spatial,kinesthetic", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "Asia Pacific University (APU)",
    nameId: "Universitas Asia Pacific",
    country: "Malaysia",
    city: "Kuala Lumpur",
    description: "Malaysia's premier digital technology university with strong industry connections in IT and engineering.",
    descriptionId: "Universitas teknologi digital terkemuka Malaysia dengan koneksi industri yang kuat di bidang IT dan teknik.",
    website: "https://www.apu.edu.my",
    tuitionMinUsd: 3000,
    tuitionMaxUsd: 7000,
    ieltsMin: "5.0",
    gpaMin: "2.5",
    scholarshipAvailable: true,
    ranking: "QS 501-550",
    programs: [
      { programName: "BSc (Hons) in Software Engineering", fieldOfStudy: "Computer Science", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "BSc (Hons) in Cybersecurity", fieldOfStudy: "Information Technology", riasecCodes: "ICR", miTypes: "logical,intrapersonal", degreeLevel: "bachelor" },
      { programName: "BSc (Hons) in Data Science", fieldOfStudy: "Data Science", riasecCodes: "ICE", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Business Management", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,logical", degreeLevel: "bachelor" },
    ]
  },

  // === UNITED KINGDOM ===
  {
    name: "University of Leeds",
    nameId: "Universitas Leeds",
    country: "United Kingdom",
    city: "Leeds",
    description: "A Russell Group university ranked in the top 100 globally, known for strong research and diverse program offerings.",
    descriptionId: "Universitas Russell Group yang masuk 100 besar dunia, terkenal dengan penelitian kuat dan program yang beragam.",
    website: "https://www.leeds.ac.uk",
    tuitionMinUsd: 22000,
    tuitionMaxUsd: 32000,
    ieltsMin: "6.0",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #75",
    programs: [
      { programName: "BSc Computer Science", fieldOfStudy: "Computer Science", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "BA International Business", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,linguistic", degreeLevel: "bachelor" },
      { programName: "BEng Mechanical Engineering", fieldOfStudy: "Engineering", riasecCodes: "RIC", miTypes: "logical,spatial,kinesthetic", degreeLevel: "bachelor" },
      { programName: "BA Communication and Media", fieldOfStudy: "Communication", riasecCodes: "ASE", miTypes: "linguistic,interpersonal", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "University of Exeter",
    nameId: "Universitas Exeter",
    country: "United Kingdom",
    city: "Exeter",
    description: "A Russell Group university with a beautiful campus, ranked in the top 150 globally. Strong in business, law, and sciences.",
    descriptionId: "Universitas Russell Group dengan kampus yang indah, peringkat 150 besar dunia. Kuat di bidang bisnis, hukum, dan sains.",
    website: "https://www.exeter.ac.uk",
    tuitionMinUsd: 21000,
    tuitionMaxUsd: 30000,
    ieltsMin: "6.5",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #153",
    programs: [
      { programName: "BSc Economics", fieldOfStudy: "Economics", riasecCodes: "ICE", miTypes: "logical,linguistic", degreeLevel: "bachelor" },
      { programName: "LLB Law", fieldOfStudy: "Law", riasecCodes: "EIS", miTypes: "linguistic,logical", degreeLevel: "bachelor" },
      { programName: "BSc Psychology", fieldOfStudy: "Psychology", riasecCodes: "SIA", miTypes: "interpersonal,intrapersonal", degreeLevel: "bachelor" },
      { programName: "BSc Environmental Science", fieldOfStudy: "Environmental Science", riasecCodes: "IRA", miTypes: "naturalistic,logical", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "University of Birmingham",
    nameId: "Universitas Birmingham",
    country: "United Kingdom",
    city: "Birmingham",
    description: "A prestigious Russell Group university, ranked in the top 100 globally. Known for engineering, medicine, and social sciences.",
    descriptionId: "Universitas Russell Group bergengsi, peringkat 100 besar dunia. Terkenal untuk teknik, kedokteran, dan ilmu sosial.",
    website: "https://www.birmingham.ac.uk",
    tuitionMinUsd: 22000,
    tuitionMaxUsd: 35000,
    ieltsMin: "6.0",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #84",
    programs: [
      { programName: "BEng Chemical Engineering", fieldOfStudy: "Engineering", riasecCodes: "RIC", miTypes: "logical,kinesthetic", degreeLevel: "bachelor" },
      { programName: "BSc Biomedical Science", fieldOfStudy: "Biology", riasecCodes: "ISR", miTypes: "logical,naturalistic", degreeLevel: "bachelor" },
      { programName: "BA Education", fieldOfStudy: "Education", riasecCodes: "SAE", miTypes: "interpersonal,linguistic", degreeLevel: "bachelor" },
      { programName: "BSc Mathematics", fieldOfStudy: "Mathematics", riasecCodes: "ICR", miTypes: "logical,spatial", degreeLevel: "bachelor" },
    ]
  },

  // === AUSTRALIA ===
  {
    name: "Monash University",
    nameId: "Universitas Monash",
    country: "Australia",
    city: "Melbourne",
    description: "A leading Australian university and member of the Group of Eight. Ranked #42 globally with strong research output.",
    descriptionId: "Universitas terkemuka Australia dan anggota Group of Eight. Peringkat #42 dunia dengan output penelitian yang kuat.",
    website: "https://www.monash.edu",
    tuitionMinUsd: 25000,
    tuitionMaxUsd: 40000,
    ieltsMin: "6.5",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #42",
    programs: [
      { programName: "Bachelor of Information Technology", fieldOfStudy: "Information Technology", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Commerce", fieldOfStudy: "Business Administration", riasecCodes: "ECR", miTypes: "logical,interpersonal", degreeLevel: "bachelor" },
      { programName: "Bachelor of Pharmacy", fieldOfStudy: "Pharmacy", riasecCodes: "ISC", miTypes: "logical,naturalistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Design", fieldOfStudy: "Arts & Design", riasecCodes: "AIS", miTypes: "spatial,kinesthetic", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "University of Queensland",
    nameId: "Universitas Queensland",
    country: "Australia",
    city: "Brisbane",
    description: "A top Australian research university, ranked #43 globally. Known for science, engineering, and health programs.",
    descriptionId: "Universitas riset top Australia, peringkat #43 dunia. Terkenal untuk program sains, teknik, dan kesehatan.",
    website: "https://www.uq.edu.au",
    tuitionMinUsd: 24000,
    tuitionMaxUsd: 38000,
    ieltsMin: "6.5",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #43",
    programs: [
      { programName: "Bachelor of Engineering (Honours)", fieldOfStudy: "Engineering", riasecCodes: "RIC", miTypes: "logical,spatial,kinesthetic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Science (Biology)", fieldOfStudy: "Biology", riasecCodes: "IRA", miTypes: "naturalistic,logical", degreeLevel: "bachelor" },
      { programName: "Bachelor of International Relations", fieldOfStudy: "International Relations", riasecCodes: "ESI", miTypes: "linguistic,interpersonal", degreeLevel: "bachelor" },
      { programName: "Bachelor of Nursing", fieldOfStudy: "Nursing", riasecCodes: "SIR", miTypes: "interpersonal,kinesthetic", degreeLevel: "bachelor" },
    ]
  },
  {
    name: "RMIT University",
    nameId: "Universitas RMIT",
    country: "Australia",
    city: "Melbourne",
    description: "A global university of technology, design, and enterprise. Strong industry connections and practical learning approach.",
    descriptionId: "Universitas global teknologi, desain, dan kewirausahaan. Koneksi industri yang kuat dan pendekatan pembelajaran praktis.",
    website: "https://www.rmit.edu.au",
    tuitionMinUsd: 20000,
    tuitionMaxUsd: 35000,
    ieltsMin: "6.0",
    gpaMin: "2.8",
    scholarshipAvailable: true,
    ranking: "QS #140",
    programs: [
      { programName: "Bachelor of Animation and Interactive Media", fieldOfStudy: "Film & Media", riasecCodes: "AIR", miTypes: "spatial,kinesthetic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Information Technology", fieldOfStudy: "Information Technology", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Fashion (Design)", fieldOfStudy: "Arts & Design", riasecCodes: "AES", miTypes: "spatial,kinesthetic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Marketing", fieldOfStudy: "Marketing", riasecCodes: "EAS", miTypes: "interpersonal,linguistic", degreeLevel: "bachelor" },
    ]
  },

  // === CANADA ===
  {
    name: "University of British Columbia",
    nameId: "Universitas British Columbia",
    country: "Canada",
    city: "Vancouver",
    description: "A top Canadian research university ranked #34 globally. Beautiful campus with diverse program offerings.",
    descriptionId: "Universitas riset top Kanada peringkat #34 dunia. Kampus indah dengan program yang beragam.",
    website: "https://www.ubc.ca",
    tuitionMinUsd: 28000,
    tuitionMaxUsd: 42000,
    ieltsMin: "6.5",
    gpaMin: "3.2",
    scholarshipAvailable: true,
    ranking: "QS #34",
    programs: [
      { programName: "BSc Computer Science", fieldOfStudy: "Computer Science", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Commerce", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,logical", degreeLevel: "bachelor" },
      { programName: "BSc Environmental Sciences", fieldOfStudy: "Environmental Science", riasecCodes: "IRA", miTypes: "naturalistic,logical", degreeLevel: "bachelor" },
      { programName: "BA Psychology", fieldOfStudy: "Psychology", riasecCodes: "SIA", miTypes: "interpersonal,intrapersonal", degreeLevel: "bachelor" },
    ]
  },

  // === SINGAPORE ===
  {
    name: "Singapore Management University",
    nameId: "Universitas Manajemen Singapura",
    country: "Singapore",
    city: "Singapore",
    description: "A premier business university in Asia, known for its city campus and strong corporate connections.",
    descriptionId: "Universitas bisnis premier di Asia, terkenal dengan kampus kota dan koneksi korporat yang kuat.",
    website: "https://www.smu.edu.sg",
    tuitionMinUsd: 30000,
    tuitionMaxUsd: 40000,
    ieltsMin: "7.0",
    gpaMin: "3.3",
    scholarshipAvailable: true,
    ranking: "QS #545",
    programs: [
      { programName: "BSc Information Systems", fieldOfStudy: "Information Technology", riasecCodes: "ICE", miTypes: "logical,interpersonal", degreeLevel: "bachelor" },
      { programName: "Bachelor of Business Management", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,logical", degreeLevel: "bachelor" },
      { programName: "BSc Economics", fieldOfStudy: "Economics", riasecCodes: "ICE", miTypes: "logical,linguistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Accountancy", fieldOfStudy: "Accounting", riasecCodes: "CEI", miTypes: "logical,intrapersonal", degreeLevel: "bachelor" },
    ]
  },

  // === CHINA ===
  {
    name: "Xiamen University Malaysia",
    nameId: "Universitas Xiamen Malaysia",
    country: "Malaysia",
    city: "Sepang",
    description: "The first Chinese university to establish a full-fledged campus in Malaysia. Affordable tuition with Chinese-standard education.",
    descriptionId: "Universitas Tiongkok pertama yang mendirikan kampus lengkap di Malaysia. Biaya kuliah terjangkau dengan standar pendidikan Tiongkok.",
    website: "https://www.xmu.edu.my",
    tuitionMinUsd: 2500,
    tuitionMaxUsd: 5000,
    ieltsMin: "5.0",
    gpaMin: "2.5",
    scholarshipAvailable: true,
    ranking: "QS #350",
    programs: [
      { programName: "BSc Data Science & Big Data", fieldOfStudy: "Data Science", riasecCodes: "ICR", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of International Business", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,linguistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Accounting", fieldOfStudy: "Accounting", riasecCodes: "CEI", miTypes: "logical,intrapersonal", degreeLevel: "bachelor" },
      { programName: "Bachelor of Chinese Medicine", fieldOfStudy: "Medicine", riasecCodes: "ISR", miTypes: "naturalistic,interpersonal", degreeLevel: "bachelor" },
    ]
  },

  // === IRELAND ===
  {
    name: "University College Dublin",
    nameId: "Universitas College Dublin",
    country: "Ireland",
    city: "Dublin",
    description: "Ireland's largest and most international university. Strong in business, computer science, and humanities.",
    descriptionId: "Universitas terbesar dan paling internasional di Irlandia. Kuat di bidang bisnis, ilmu komputer, dan humaniora.",
    website: "https://www.ucd.ie",
    tuitionMinUsd: 20000,
    tuitionMaxUsd: 30000,
    ieltsMin: "6.5",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #126",
    programs: [
      { programName: "BSc Computer Science", fieldOfStudy: "Computer Science", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Commerce", fieldOfStudy: "Business Administration", riasecCodes: "ECS", miTypes: "interpersonal,logical", degreeLevel: "bachelor" },
      { programName: "BA Film Studies", fieldOfStudy: "Film & Media", riasecCodes: "AIE", miTypes: "spatial,linguistic", degreeLevel: "bachelor" },
      { programName: "BSc Agriculture", fieldOfStudy: "Agriculture", riasecCodes: "RIA", miTypes: "naturalistic,kinesthetic", degreeLevel: "bachelor" },
    ]
  },

  // === NEW ZEALAND ===
  {
    name: "University of Auckland",
    nameId: "Universitas Auckland",
    country: "New Zealand",
    city: "Auckland",
    description: "New Zealand's highest-ranked university at #68 globally. Comprehensive programs across all disciplines.",
    descriptionId: "Universitas peringkat tertinggi di Selandia Baru di #68 dunia. Program komprehensif di semua disiplin ilmu.",
    website: "https://www.auckland.ac.nz",
    tuitionMinUsd: 22000,
    tuitionMaxUsd: 35000,
    ieltsMin: "6.0",
    gpaMin: "3.0",
    scholarshipAvailable: true,
    ranking: "QS #68",
    programs: [
      { programName: "Bachelor of Engineering (Software)", fieldOfStudy: "Computer Science", riasecCodes: "IRC", miTypes: "logical,spatial", degreeLevel: "bachelor" },
      { programName: "Bachelor of Arts (Sociology)", fieldOfStudy: "Sociology", riasecCodes: "SIE", miTypes: "interpersonal,linguistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Health Sciences", fieldOfStudy: "Public Health", riasecCodes: "ISR", miTypes: "interpersonal,naturalistic", degreeLevel: "bachelor" },
      { programName: "Bachelor of Fine Arts", fieldOfStudy: "Arts & Design", riasecCodes: "AIS", miTypes: "spatial,kinesthetic", degreeLevel: "bachelor" },
    ]
  },
];

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Check if data already exists
    const [existing] = await connection.execute('SELECT COUNT(*) as cnt FROM matchUniversities');
    if (existing[0].cnt > 0) {
      console.log(`Database already has ${existing[0].cnt} universities. Skipping seed.`);
      await connection.end();
      return;
    }

    console.log(`Seeding ${universities.length} universities...`);

    for (const uni of universities) {
      const { programs, ...uniData } = uni;
      
      const [result] = await connection.execute(
        `INSERT INTO matchUniversities (name, nameId, country, city, description, descriptionId, website, tuitionMinUsd, tuitionMaxUsd, ieltsMin, gpaMin, scholarshipAvailable, ranking, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
        [
          uniData.name, uniData.nameId || null, uniData.country, uniData.city,
          uniData.description || null, uniData.descriptionId || null,
          uniData.website || null, uniData.tuitionMinUsd || null,
          uniData.tuitionMaxUsd || null, uniData.ieltsMin || null,
          uniData.gpaMin || null, uniData.scholarshipAvailable ? 1 : 0,
          uniData.ranking || null
        ]
      );

      const universityId = result.insertId;
      console.log(`  ✓ ${uniData.name} (ID: ${universityId})`);

      for (const prog of programs) {
        await connection.execute(
          `INSERT INTO matchPrograms (universityId, programName, degreeLevel, fieldOfStudy, riasecCodes, miTypes, isActive) VALUES (?, ?, ?, ?, ?, ?, true)`,
          [universityId, prog.programName, prog.degreeLevel, prog.fieldOfStudy, prog.riasecCodes, prog.miTypes]
        );
        console.log(`    - ${prog.programName}`);
      }
    }

    console.log(`\n✅ Seeded ${universities.length} universities with programs successfully!`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await connection.end();
  }
}

seed();
