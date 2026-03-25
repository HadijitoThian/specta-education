/**
 * University seed data — top universities per country that SpecTa represents
 * Sprint 9: Used to pre-populate the universities table
 */

export const UNIVERSITY_SEEDS = [
  // ─── United Kingdom ───────────────────────────────────────────────────────
  { name: "University of Oxford", country: "UK", city: "Oxford", ranking: 3, website: "https://www.ox.ac.uk", type: "public", programs: JSON.stringify(["Medicine", "Law", "Philosophy", "Computer Science", "Engineering"]) },
  { name: "University of Cambridge", country: "UK", city: "Cambridge", ranking: 5, website: "https://www.cam.ac.uk", type: "public", programs: JSON.stringify(["Mathematics", "Natural Sciences", "Engineering", "Economics", "Law"]) },
  { name: "Imperial College London", country: "UK", city: "London", ranking: 8, website: "https://www.imperial.ac.uk", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Science", "Business", "Computing"]) },
  { name: "University College London (UCL)", country: "UK", city: "London", ranking: 9, website: "https://www.ucl.ac.uk", type: "public", programs: JSON.stringify(["Architecture", "Law", "Medicine", "Arts", "Engineering"]) },
  { name: "University of Edinburgh", country: "UK", city: "Edinburgh", ranking: 27, website: "https://www.ed.ac.uk", type: "public", programs: JSON.stringify(["Medicine", "Law", "Business", "Engineering", "Arts"]) },
  { name: "King's College London", country: "UK", city: "London", ranking: 40, website: "https://www.kcl.ac.uk", type: "public", programs: JSON.stringify(["Medicine", "Law", "Nursing", "Business", "Arts"]) },
  { name: "University of Manchester", country: "UK", city: "Manchester", ranking: 34, website: "https://www.manchester.ac.uk", type: "public", programs: JSON.stringify(["Business", "Engineering", "Medicine", "Science", "Social Sciences"]) },
  { name: "University of Warwick", country: "UK", city: "Coventry", ranking: 69, website: "https://www.warwick.ac.uk", type: "public", programs: JSON.stringify(["Business", "Economics", "Engineering", "Mathematics", "Law"]) },
  { name: "University of Bristol", country: "UK", city: "Bristol", ranking: 55, website: "https://www.bristol.ac.uk", type: "public", programs: JSON.stringify(["Engineering", "Law", "Medicine", "Arts", "Science"]) },
  { name: "University of Glasgow", country: "UK", city: "Glasgow", ranking: 78, website: "https://www.gla.ac.uk", type: "public", programs: JSON.stringify(["Medicine", "Engineering", "Business", "Law", "Arts"]) },
  { name: "University of Birmingham", country: "UK", city: "Birmingham", ranking: 90, website: "https://www.birmingham.ac.uk", type: "public", programs: JSON.stringify(["Business", "Engineering", "Medicine", "Law", "Science"]) },
  { name: "University of Leeds", country: "UK", city: "Leeds", ranking: 101, website: "https://www.leeds.ac.uk", type: "public", programs: JSON.stringify(["Business", "Engineering", "Medicine", "Arts", "Science"]) },
  { name: "University of Nottingham", country: "UK", city: "Nottingham", ranking: 110, website: "https://www.nottingham.ac.uk", type: "public", programs: JSON.stringify(["Business", "Engineering", "Medicine", "Law", "Science"]) },
  { name: "University of Sheffield", country: "UK", city: "Sheffield", ranking: 113, website: "https://www.sheffield.ac.uk", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Business", "Architecture", "Science"]) },
  { name: "University of Southampton", country: "UK", city: "Southampton", ranking: 81, website: "https://www.southampton.ac.uk", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Medicine", "Business", "Law"]) },

  // ─── Australia ────────────────────────────────────────────────────────────
  { name: "Australian National University (ANU)", country: "Australia", city: "Canberra", ranking: 30, website: "https://www.anu.edu.au", type: "public", programs: JSON.stringify(["Law", "Economics", "Science", "Arts", "Engineering"]) },
  { name: "University of Melbourne", country: "Australia", city: "Melbourne", ranking: 33, website: "https://www.unimelb.edu.au", type: "public", programs: JSON.stringify(["Medicine", "Law", "Business", "Engineering", "Arts"]) },
  { name: "University of Sydney", country: "Australia", city: "Sydney", ranking: 41, website: "https://www.sydney.edu.au", type: "public", programs: JSON.stringify(["Medicine", "Law", "Business", "Engineering", "Architecture"]) },
  { name: "University of Queensland", country: "Australia", city: "Brisbane", ranking: 43, website: "https://www.uq.edu.au", type: "public", programs: JSON.stringify(["Medicine", "Engineering", "Business", "Science", "Law"]) },
  { name: "University of New South Wales (UNSW)", country: "Australia", city: "Sydney", ranking: 47, website: "https://www.unsw.edu.au", type: "public", programs: JSON.stringify(["Engineering", "Business", "Law", "Medicine", "Arts"]) },
  { name: "Monash University", country: "Australia", city: "Melbourne", ranking: 57, website: "https://www.monash.edu", type: "public", programs: JSON.stringify(["Business", "Engineering", "Medicine", "Law", "Pharmacy"]) },
  { name: "University of Western Australia", country: "Australia", city: "Perth", ranking: 90, website: "https://www.uwa.edu.au", type: "public", programs: JSON.stringify(["Medicine", "Engineering", "Business", "Law", "Science"]) },
  { name: "University of Adelaide", country: "Australia", city: "Adelaide", ranking: 109, website: "https://www.adelaide.edu.au", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Business", "Law", "Science"]) },
  { name: "RMIT University", country: "Australia", city: "Melbourne", ranking: 188, website: "https://www.rmit.edu.au", type: "public", programs: JSON.stringify(["Design", "Engineering", "Business", "Architecture", "IT"]) },
  { name: "Macquarie University", country: "Australia", city: "Sydney", ranking: 195, website: "https://www.mq.edu.au", type: "public", programs: JSON.stringify(["Business", "Law", "Science", "Engineering", "Arts"]) },
  { name: "University of Technology Sydney (UTS)", country: "Australia", city: "Sydney", ranking: 160, website: "https://www.uts.edu.au", type: "public", programs: JSON.stringify(["Engineering", "IT", "Business", "Design", "Law"]) },
  { name: "Curtin University", country: "Australia", city: "Perth", ranking: 201, website: "https://www.curtin.edu.au", type: "public", programs: JSON.stringify(["Engineering", "Business", "Science", "Health", "Arts"]) },
  { name: "Deakin University", country: "Australia", city: "Melbourne", ranking: 251, website: "https://www.deakin.edu.au", type: "public", programs: JSON.stringify(["Business", "Health", "Engineering", "Education", "Arts"]) },

  // ─── USA ──────────────────────────────────────────────────────────────────
  { name: "Massachusetts Institute of Technology (MIT)", country: "USA", city: "Cambridge, MA", ranking: 1, website: "https://www.mit.edu", type: "private", programs: JSON.stringify(["Engineering", "Computer Science", "Physics", "Mathematics", "Business"]) },
  { name: "Harvard University", country: "USA", city: "Cambridge, MA", ranking: 4, website: "https://www.harvard.edu", type: "private", programs: JSON.stringify(["Law", "Medicine", "Business", "Economics", "Arts"]) },
  { name: "Stanford University", country: "USA", city: "Stanford, CA", ranking: 6, website: "https://www.stanford.edu", type: "private", programs: JSON.stringify(["Computer Science", "Engineering", "Business", "Medicine", "Law"]) },
  { name: "University of California, Berkeley", country: "USA", city: "Berkeley, CA", ranking: 10, website: "https://www.berkeley.edu", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Business", "Law", "Science"]) },
  { name: "California Institute of Technology (Caltech)", country: "USA", city: "Pasadena, CA", ranking: 15, website: "https://www.caltech.edu", type: "private", programs: JSON.stringify(["Engineering", "Physics", "Chemistry", "Mathematics", "Computer Science"]) },
  { name: "University of Chicago", country: "USA", city: "Chicago, IL", ranking: 21, website: "https://www.uchicago.edu", type: "private", programs: JSON.stringify(["Economics", "Law", "Business", "Social Sciences", "Medicine"]) },
  { name: "Columbia University", country: "USA", city: "New York, NY", ranking: 22, website: "https://www.columbia.edu", type: "private", programs: JSON.stringify(["Law", "Business", "Journalism", "Engineering", "Medicine"]) },
  { name: "New York University (NYU)", country: "USA", city: "New York, NY", ranking: 38, website: "https://www.nyu.edu", type: "private", programs: JSON.stringify(["Business", "Law", "Arts", "Engineering", "Medicine"]) },
  { name: "University of Michigan", country: "USA", city: "Ann Arbor, MI", ranking: 23, website: "https://www.umich.edu", type: "public", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Law", "Science"]) },
  { name: "University of California, Los Angeles (UCLA)", country: "USA", city: "Los Angeles, CA", ranking: 44, website: "https://www.ucla.edu", type: "public", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Law", "Arts"]) },
  { name: "Purdue University", country: "USA", city: "West Lafayette, IN", ranking: 99, website: "https://www.purdue.edu", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Agriculture", "Business", "Science"]) },
  { name: "University of Texas at Austin", country: "USA", city: "Austin, TX", ranking: 67, website: "https://www.utexas.edu", type: "public", programs: JSON.stringify(["Business", "Engineering", "Law", "Computer Science", "Arts"]) },

  // ─── Canada ───────────────────────────────────────────────────────────────
  { name: "University of Toronto", country: "Canada", city: "Toronto, ON", ranking: 25, website: "https://www.utoronto.ca", type: "public", programs: JSON.stringify(["Medicine", "Law", "Engineering", "Business", "Arts"]) },
  { name: "McGill University", country: "Canada", city: "Montreal, QC", ranking: 46, website: "https://www.mcgill.ca", type: "public", programs: JSON.stringify(["Medicine", "Law", "Engineering", "Business", "Science"]) },
  { name: "University of British Columbia (UBC)", country: "Canada", city: "Vancouver, BC", ranking: 38, website: "https://www.ubc.ca", type: "public", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Science", "Arts"]) },
  { name: "University of Alberta", country: "Canada", city: "Edmonton, AB", ranking: 110, website: "https://www.ualberta.ca", type: "public", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Science", "Law"]) },
  { name: "University of Waterloo", country: "Canada", city: "Waterloo, ON", ranking: 149, website: "https://www.uwaterloo.ca", type: "public", programs: JSON.stringify(["Computer Science", "Engineering", "Mathematics", "Business", "Science"]) },
  { name: "Western University", country: "Canada", city: "London, ON", ranking: 172, website: "https://www.uwo.ca", type: "public", programs: JSON.stringify(["Business", "Medicine", "Law", "Engineering", "Science"]) },
  { name: "Queen's University", country: "Canada", city: "Kingston, ON", ranking: 209, website: "https://www.queensu.ca", type: "public", programs: JSON.stringify(["Business", "Engineering", "Medicine", "Law", "Arts"]) },
  { name: "Simon Fraser University", country: "Canada", city: "Burnaby, BC", ranking: 298, website: "https://www.sfu.ca", type: "public", programs: JSON.stringify(["Business", "Engineering", "Computing Science", "Arts", "Science"]) },
  { name: "York University", country: "Canada", city: "Toronto, ON", ranking: 451, website: "https://www.yorku.ca", type: "public", programs: JSON.stringify(["Business", "Law", "Arts", "Science", "Engineering"]) },
  { name: "Dalhousie University", country: "Canada", city: "Halifax, NS", ranking: 298, website: "https://www.dal.ca", type: "public", programs: JSON.stringify(["Medicine", "Law", "Engineering", "Business", "Science"]) },

  // ─── Malaysia ─────────────────────────────────────────────────────────────
  { name: "University of Malaya (UM)", country: "Malaysia", city: "Kuala Lumpur", ranking: 65, website: "https://www.um.edu.my", type: "public", programs: JSON.stringify(["Medicine", "Engineering", "Business", "Law", "Science"]) },
  { name: "Universiti Putra Malaysia (UPM)", country: "Malaysia", city: "Serdang", ranking: 133, website: "https://www.upm.edu.my", type: "public", programs: JSON.stringify(["Agriculture", "Engineering", "Medicine", "Business", "Science"]) },
  { name: "Universiti Teknologi Malaysia (UTM)", country: "Malaysia", city: "Johor Bahru", ranking: 187, website: "https://www.utm.my", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Architecture", "Business", "Science"]) },
  { name: "Universiti Kebangsaan Malaysia (UKM)", country: "Malaysia", city: "Bangi", ranking: 184, website: "https://www.ukm.my", type: "public", programs: JSON.stringify(["Medicine", "Engineering", "Business", "Law", "Science"]) },
  { name: "Monash University Malaysia", country: "Malaysia", city: "Subang Jaya", ranking: 57, website: "https://www.monash.edu.my", type: "private", programs: JSON.stringify(["Business", "Engineering", "Medicine", "IT", "Arts"]) },
  { name: "Taylor's University", country: "Malaysia", city: "Subang Jaya", ranking: 601, website: "https://www.taylors.edu.my", type: "private", programs: JSON.stringify(["Business", "Hospitality", "Engineering", "Architecture", "Medicine"]) },
  { name: "Sunway University", country: "Malaysia", city: "Subang Jaya", ranking: 601, website: "https://www.sunway.edu.my", type: "private", programs: JSON.stringify(["Business", "Computing", "Engineering", "Arts", "Science"]) },
  { name: "HELP University", country: "Malaysia", city: "Kuala Lumpur", ranking: 1001, website: "https://www.help.edu.my", type: "private", programs: JSON.stringify(["Business", "Psychology", "Law", "Computing", "Arts"]) },

  // ─── Singapore ────────────────────────────────────────────────────────────
  { name: "National University of Singapore (NUS)", country: "Singapore", city: "Singapore", ranking: 8, website: "https://www.nus.edu.sg", type: "public", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Law", "Computing"]) },
  { name: "Nanyang Technological University (NTU)", country: "Singapore", city: "Singapore", ranking: 26, website: "https://www.ntu.edu.sg", type: "public", programs: JSON.stringify(["Engineering", "Business", "Science", "Arts", "Computing"]) },
  { name: "Singapore Management University (SMU)", country: "Singapore", city: "Singapore", ranking: 511, website: "https://www.smu.edu.sg", type: "private", programs: JSON.stringify(["Business", "Law", "Economics", "Accounting", "IT"]) },
  { name: "Singapore University of Technology and Design (SUTD)", country: "Singapore", city: "Singapore", ranking: 601, website: "https://www.sutd.edu.sg", type: "public", programs: JSON.stringify(["Engineering", "Architecture", "Design", "Computer Science", "Science"]) },

  // ─── New Zealand ──────────────────────────────────────────────────────────
  { name: "University of Auckland", country: "New Zealand", city: "Auckland", ranking: 68, website: "https://www.auckland.ac.nz", type: "public", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Law", "Arts"]) },
  { name: "University of Otago", country: "New Zealand", city: "Dunedin", ranking: 206, website: "https://www.otago.ac.nz", type: "public", programs: JSON.stringify(["Medicine", "Business", "Law", "Science", "Arts"]) },
  { name: "Victoria University of Wellington", country: "New Zealand", city: "Wellington", ranking: 244, website: "https://www.wgtn.ac.nz", type: "public", programs: JSON.stringify(["Law", "Business", "Engineering", "Arts", "Science"]) },
  { name: "University of Canterbury", country: "New Zealand", city: "Christchurch", ranking: 251, website: "https://www.canterbury.ac.nz", type: "public", programs: JSON.stringify(["Engineering", "Business", "Science", "Arts", "Law"]) },
  { name: "Auckland University of Technology (AUT)", country: "New Zealand", city: "Auckland", ranking: 451, website: "https://www.aut.ac.nz", type: "public", programs: JSON.stringify(["Business", "Health", "Engineering", "Design", "Arts"]) },

  // ─── Ireland ──────────────────────────────────────────────────────────────
  { name: "Trinity College Dublin", country: "Ireland", city: "Dublin", ranking: 81, website: "https://www.tcd.ie", type: "public", programs: JSON.stringify(["Medicine", "Law", "Engineering", "Business", "Arts"]) },
  { name: "University College Dublin (UCD)", country: "Ireland", city: "Dublin", ranking: 181, website: "https://www.ucd.ie", type: "public", programs: JSON.stringify(["Business", "Medicine", "Engineering", "Law", "Science"]) },
  { name: "University College Cork (UCC)", country: "Ireland", city: "Cork", ranking: 303, website: "https://www.ucc.ie", type: "public", programs: JSON.stringify(["Medicine", "Business", "Law", "Engineering", "Science"]) },
  { name: "University of Galway", country: "Ireland", city: "Galway", ranking: 283, website: "https://www.universityofgalway.ie", type: "public", programs: JSON.stringify(["Medicine", "Business", "Engineering", "Law", "Arts"]) },
  { name: "Dublin City University (DCU)", country: "Ireland", city: "Dublin", ranking: 451, website: "https://www.dcu.ie", type: "public", programs: JSON.stringify(["Business", "Engineering", "Computing", "Science", "Arts"]) },

  // ─── Netherlands ──────────────────────────────────────────────────────────
  { name: "Delft University of Technology", country: "Netherlands", city: "Delft", ranking: 47, website: "https://www.tudelft.nl", type: "public", programs: JSON.stringify(["Engineering", "Architecture", "Computer Science", "Applied Sciences", "Design"]) },
  { name: "University of Amsterdam", country: "Netherlands", city: "Amsterdam", ranking: 53, website: "https://www.uva.nl", type: "public", programs: JSON.stringify(["Business", "Law", "Social Sciences", "Arts", "Science"]) },
  { name: "Leiden University", country: "Netherlands", city: "Leiden", ranking: 111, website: "https://www.universiteitleiden.nl", type: "public", programs: JSON.stringify(["Law", "Medicine", "Science", "Arts", "Social Sciences"]) },
  { name: "Erasmus University Rotterdam", country: "Netherlands", city: "Rotterdam", ranking: 176, website: "https://www.eur.nl", type: "public", programs: JSON.stringify(["Business", "Economics", "Law", "Medicine", "Social Sciences"]) },
  { name: "Utrecht University", country: "Netherlands", city: "Utrecht", ranking: 87, website: "https://www.uu.nl", type: "public", programs: JSON.stringify(["Medicine", "Science", "Law", "Social Sciences", "Arts"]) },

  // ─── Germany ──────────────────────────────────────────────────────────────
  { name: "Technical University of Munich (TUM)", country: "Germany", city: "Munich", ranking: 37, website: "https://www.tum.de", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Business", "Medicine", "Natural Sciences"]) },
  { name: "Ludwig Maximilian University of Munich (LMU)", country: "Germany", city: "Munich", ranking: 54, website: "https://www.lmu.de", type: "public", programs: JSON.stringify(["Medicine", "Law", "Business", "Arts", "Science"]) },
  { name: "Heidelberg University", country: "Germany", city: "Heidelberg", ranking: 47, website: "https://www.uni-heidelberg.de", type: "public", programs: JSON.stringify(["Medicine", "Law", "Science", "Arts", "Social Sciences"]) },
  { name: "Humboldt University of Berlin", country: "Germany", city: "Berlin", ranking: 120, website: "https://www.hu-berlin.de", type: "public", programs: JSON.stringify(["Law", "Medicine", "Arts", "Science", "Social Sciences"]) },
  { name: "RWTH Aachen University", country: "Germany", city: "Aachen", ranking: 106, website: "https://www.rwth-aachen.de", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Natural Sciences", "Business", "Medicine"]) },

  // ─── China ────────────────────────────────────────────────────────────────
  { name: "Peking University", country: "China", city: "Beijing", ranking: 17, website: "https://www.pku.edu.cn", type: "public", programs: JSON.stringify(["Medicine", "Law", "Business", "Science", "Engineering"]) },
  { name: "Tsinghua University", country: "China", city: "Beijing", ranking: 25, website: "https://www.tsinghua.edu.cn", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Business", "Architecture", "Science"]) },
  { name: "Fudan University", country: "China", city: "Shanghai", ranking: 55, website: "https://www.fudan.edu.cn", type: "public", programs: JSON.stringify(["Medicine", "Business", "Law", "Science", "Engineering"]) },
  { name: "Shanghai Jiao Tong University", country: "China", city: "Shanghai", ranking: 51, website: "https://www.sjtu.edu.cn", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Business", "Science", "Law"]) },
  { name: "Zhejiang University", country: "China", city: "Hangzhou", ranking: 47, website: "https://www.zju.edu.cn", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Science", "Agriculture", "Business"]) },

  // ─── Japan ────────────────────────────────────────────────────────────────
  { name: "University of Tokyo", country: "Japan", city: "Tokyo", ranking: 28, website: "https://www.u-tokyo.ac.jp", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Law", "Science", "Business"]) },
  { name: "Kyoto University", country: "Japan", city: "Kyoto", ranking: 46, website: "https://www.kyoto-u.ac.jp", type: "public", programs: JSON.stringify(["Science", "Engineering", "Medicine", "Law", "Arts"]) },
  { name: "Osaka University", country: "Japan", city: "Osaka", ranking: 80, website: "https://www.osaka-u.ac.jp", type: "public", programs: JSON.stringify(["Medicine", "Engineering", "Science", "Business", "Arts"]) },
  { name: "Tohoku University", country: "Japan", city: "Sendai", ranking: 79, website: "https://www.tohoku.ac.jp", type: "public", programs: JSON.stringify(["Engineering", "Science", "Medicine", "Business", "Arts"]) },
  { name: "Waseda University", country: "Japan", city: "Tokyo", ranking: 201, website: "https://www.waseda.jp", type: "private", programs: JSON.stringify(["Business", "Engineering", "Law", "Arts", "Social Sciences"]) },

  // ─── South Korea ──────────────────────────────────────────────────────────
  { name: "Seoul National University (SNU)", country: "South Korea", city: "Seoul", ranking: 41, website: "https://www.snu.ac.kr", type: "public", programs: JSON.stringify(["Engineering", "Medicine", "Business", "Law", "Science"]) },
  { name: "Korea Advanced Institute of Science and Technology (KAIST)", country: "South Korea", city: "Daejeon", ranking: 65, website: "https://www.kaist.ac.kr", type: "public", programs: JSON.stringify(["Engineering", "Computer Science", "Science", "Business", "Design"]) },
  { name: "Yonsei University", country: "South Korea", city: "Seoul", ranking: 79, website: "https://www.yonsei.ac.kr", type: "private", programs: JSON.stringify(["Medicine", "Business", "Engineering", "Law", "Arts"]) },
  { name: "Korea University", country: "South Korea", city: "Seoul", ranking: 79, website: "https://www.korea.ac.kr", type: "private", programs: JSON.stringify(["Business", "Law", "Engineering", "Medicine", "Arts"]) },
  { name: "Sungkyunkwan University (SKKU)", country: "South Korea", city: "Seoul", ranking: 109, website: "https://www.skku.edu", type: "private", programs: JSON.stringify(["Engineering", "Business", "Medicine", "Science", "Arts"]) },
];
