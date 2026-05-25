import { useState, useCallback, useEffect } from "react";
import { SEO } from '@/components/SEO';
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { GraduationCap, Upload, FileText, CheckCircle, Plus, X, ChevronDown, Loader2, ArrowLeft, Sparkles, Shield, Clock, Globe } from "lucide-react";

// University data for selection (same as CountryPage)
const UNIVERSITY_DATA: Record<string, { name: string; flag: string; universities: string[] }> = {
  malaysia: { name: "Malaysia", flag: "\ud83c\uddf2\ud83c\uddfe", universities: ["Taylor's University", "UCSI University", "Monash University Malaysia", "University of Nottingham Malaysia", "INTI International University", "University of Southampton Malaysia", "The One Academy", "MILA University"] },
  singapore: { name: "Singapore", flag: "\ud83c\uddf8\ud83c\uddec", universities: ["Curtin Singapore", "James Cook University (JCU)", "PSB Academy", "Raffles Design Institute", "MDIS", "Kaplan Singapore", "SIM Global Education", "ERC Institute", "Dimensions International College", "Nanyang Institute of Management"] },
  australia: { name: "Australia", flag: "\ud83c\udde6\ud83c\uddfa", universities: ["University of Melbourne", "UNSW", "University of Sydney", "ANU", "Monash University", "University of Queensland", "UWA", "University of Adelaide", "UTS", "Macquarie University", "RMIT University", "Deakin University", "Griffith University", "La Trobe University", "Curtin University", "Swinburne University", "University of Wollongong", "Western Sydney University", "University of Tasmania", "Victoria University"] },
  uk: { name: "United Kingdom", flag: "\ud83c\uddec\ud83c\udde7", universities: ["University of Oxford", "University of Cambridge", "Imperial College London", "UCL", "University of Edinburgh", "University of Manchester", "King's College London", "University of Warwick", "University of Leeds", "University of Birmingham", "University of Glasgow", "University of Sheffield", "University of Nottingham", "Newcastle University", "University of Exeter", "Cardiff University", "University of Liverpool", "Coventry University", "University of Hertfordshire", "De Montfort University"] },
  usa: { name: "USA", flag: "\ud83c\uddfa\ud83c\uddf8", universities: ["MIT", "Stanford University", "Harvard University", "UC Berkeley", "Columbia University", "University of Michigan", "NYU", "Boston University", "Northeastern University", "University of Illinois", "Purdue University", "Arizona State University", "University of South Florida", "San Jose State University", "University of Bridgeport", "Full Sail University", "SCAD", "Drexel University", "George Mason University", "University of Central Florida"] },
  china: { name: "China", flag: "\ud83c\udde8\ud83c\uddf3", universities: ["Tsinghua University", "Peking University", "Fudan University", "Zhejiang University", "Shanghai Jiao Tong University", "Nanjing University", "Tongji University", "Wuhan University", "Sun Yat-sen University", "Beijing Normal University", "Xiamen University", "BLCU", "Shanghai University", "Jinan University", "East China Normal University", "Guangzhou University", "Zhejiang Normal University", "Kunming University of Science and Technology"] },
  canada: { name: "Canada", flag: "\ud83c\udde8\ud83c\udde6", universities: ["University of Toronto", "UBC", "McGill University", "University of Alberta", "University of Waterloo", "University of Montreal", "McMaster University", "University of Ottawa", "University of Calgary", "Simon Fraser University", "York University", "Ryerson University", "University of Manitoba", "Dalhousie University", "Carleton University", "University of Windsor", "Brock University", "Lakehead University", "Cape Breton University", "University of Northern British Columbia"] },
  ireland: { name: "Ireland", flag: "\ud83c\uddee\ud83c\uddea", universities: ["Trinity College Dublin", "UCD", "NUI Galway", "University College Cork", "DCU", "University of Limerick"] },
  "new-zealand": { name: "New Zealand", flag: "\ud83c\uddf3\ud83c\uddff", universities: ["University of Auckland", "University of Otago", "Victoria University of Wellington", "University of Canterbury", "Massey University", "University of Waikato"] },
  netherlands: { name: "Netherlands", flag: "\ud83c\uddf3\ud83c\uddf1", universities: ["TU Delft", "University of Amsterdam", "Erasmus University Rotterdam", "Leiden University", "Utrecht University", "Wageningen University"] },
};

const PROGRAMS = [
  "Business & Management", "Computer Science & IT", "Engineering", "Medicine & Health Sciences",
  "Law", "Arts & Design", "Education", "Accounting & Finance", "Hospitality & Tourism",
  "Architecture", "Media & Communication", "Psychology", "Environmental Science",
  "Agriculture", "Pharmacy", "Nursing", "Data Science & AI", "International Relations",
  "Chinese Language", "Other"
];

const EDUCATION_LEVELS = [
  "High School / SMA",
  "Diploma / D3",
  "Bachelor's Degree / S1",
  "Master's Degree / S2",
  "PhD / S3"
];

interface SelectedUniversity {
  university: string;
  country: string;
  program: string;
}

interface UploadedFile {
  name: string;
  url: string;
  key: string;
  type: string;
}

export default function Apply() {
  useEffect(() => {
    document.title = "Quick Apply - Study Abroad | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Apply to study abroad with SpecTa Education. Quick application process for universities in Australia, UK, USA, Canada, and more.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Apply to study abroad with SpecTa Education. Quick application process for universities in Australia, UK, USA, Canada, and more.';
      document.head.appendChild(meta);
    }
  }, []);

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentSchool, setCurrentSchool] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [ieltsScore, setIeltsScore] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [selectedUniversities, setSelectedUniversities] = useState<SelectedUniversity[]>([{ university: "", country: "", program: "" }]);
  const [transcript, setTranscript] = useState<UploadedFile | null>(null);
  const [passport, setPassport] = useState<UploadedFile | null>(null);
  const [ieltsDoc, setIeltsDoc] = useState<UploadedFile | null>(null);
  const [certificate, setCertificate] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const uploadMutation = trpc.application.uploadDocument.useMutation();
  const submitMutation = trpc.application.submit.useMutation();

  // Pre-fill from URL params (e.g., from Quick Apply buttons on university cards)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const country = params.get('country');
    const university = params.get('university');
    if (country || university) {
      setSelectedUniversities([{
        university: university || '',
        country: country || '',
        program: ''
      }]);
    }
  }, []);

  const addUniversity = () => {
    if (selectedUniversities.length < 5) {
      setSelectedUniversities([...selectedUniversities, { university: "", country: "", program: "" }]);
    }
  };

  const removeUniversity = (index: number) => {
    if (selectedUniversities.length > 1) {
      setSelectedUniversities(selectedUniversities.filter((_, i) => i !== index));
    }
  };

  const updateUniversity = (index: number, field: keyof SelectedUniversity, value: string) => {
    const updated = [...selectedUniversities];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "country") {
      updated[index].university = "";
    }
    setSelectedUniversities(updated);
  };

  const handleFileUpload = useCallback(async (
    file: File,
    documentType: string,
    setter: (f: UploadedFile | null) => void
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }
    setUploading(documentType);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileData: base64,
        fileType: file.type,
        documentType,
      });

      setter({ name: file.name, url: result.url, key: result.fileKey, type: file.type });
    } catch (error) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }, [uploadMutation]);

  const handleSubmit = async () => {
    const validUnis = selectedUniversities.filter(u => u.university && u.country);
    if (!fullName || !email || !phone || validUnis.length === 0) {
      alert("Please fill in all required fields and select at least one university.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        fullName,
        email,
        phone,
        currentSchool: currentSchool || undefined,
        educationLevel: educationLevel || undefined,
        selectedUniversities: JSON.stringify(validUnis),
        ieltsScore: ieltsScore || undefined,
        transcriptUrl: transcript?.url || undefined,
        transcriptKey: transcript?.key || undefined,
        passportUrl: passport?.url || undefined,
        passportKey: passport?.key || undefined,
        ieltsDocUrl: ieltsDoc?.url || undefined,
        ieltsDocKey: ieltsDoc?.key || undefined,
        certificateUrl: certificate?.url || undefined,
        certificateKey: certificate?.key || undefined,
        additionalNotes: additionalNotes || undefined,
      });
      setSubmitted(true);
    } catch (error) {
      alert("Submission failed. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center p-4">
      <SEO
        title="Quick Apply - Study Abroad Application | SpecTa Education"
        description="Submit your study abroad application quickly with SpecTa Education. Upload transcripts, passport, and IELTS scores for fast processing."
      />
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-2">Thank you, <span className="font-semibold text-pink-600">{fullName}</span>!</p>
          <p className="text-gray-600 mb-8">
            Our education consultants will review your application and contact you within 24 hours.
            You'll receive a confirmation email at <span className="font-semibold">{email}</span>.
          </p>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-pink-600">1</span>
                </div>
                <p className="text-sm text-gray-600">Our team reviews your application and documents</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-pink-600">2</span>
                </div>
                <p className="text-sm text-gray-600">A dedicated consultant contacts you for a free consultation</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-pink-600">3</span>
                </div>
                <p className="text-sm text-gray-600">We help you with university applications, visa, and more</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Link href="/" className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              Back to Home
            </Link>
            <a href="https://wa.me/62818218388?text=Hi%2C%20I%20just%20submitted%20my%20application%20on%20the%20website.%20My%20name%20is%20" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all">
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 text-white">
        <div className="container max-w-5xl py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Quick Apply</h1>
              <p className="text-white/80">Start your study abroad journey today</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-white/70" />
              <span className="text-white/90">5 min to complete</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-white/70" />
              <span className="text-white/90">100% Free service</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-white/70" />
              <span className="text-white/90">24hr response</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center gap-2 mb-10">
          {[
            { num: 1, label: "Personal Info" },
            { num: 2, label: "Universities" },
            { num: 3, label: "Documents" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  step === s.num
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200"
                    : step > s.num
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.num ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{s.num}</span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < 2 && <div className={`w-8 h-0.5 ${step > s.num ? "bg-green-300" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
              <p className="text-gray-500 mb-8">Tell us about yourself so we can help you better</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name <span className="text-pink-500">*</span></label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address <span className="text-pink-500">*</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number <span className="text-pink-500">*</span></label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+62 812 3456 7890"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current School / University</label>
                  <input
                    type="text"
                    value={currentSchool}
                    onChange={(e) => setCurrentSchool(e.target.value)}
                    placeholder="e.g., SMA Negeri 1 Jakarta"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Education Level</label>
                  <div className="relative">
                    <select
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none bg-white text-gray-900"
                    >
                      <option value="">Select your education level</option>
                      {EDUCATION_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IELTS Score (if available)</label>
                  <input
                    type="text"
                    value={ieltsScore}
                    onChange={(e) => setIeltsScore(e.target.value)}
                    placeholder="e.g., 6.5"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-900"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!fullName || !email || !phone) {
                    alert("Please fill in your name, email, and phone number.");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full mt-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-pink-200 transition-all"
              >
                Continue to University Selection
              </button>
            </div>
          </div>
        )}

        {/* Step 2: University Selection */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Universities</h2>
              <p className="text-gray-500 mb-8">Choose up to 5 universities you'd like to apply to</p>

              <div className="space-y-6">
                {selectedUniversities.map((uni, index) => (
                  <div key={index} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 relative group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-pink-600">University {index + 1}</span>
                      {selectedUniversities.length > 1 && (
                        <button onClick={() => removeUniversity(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Country <span className="text-pink-500">*</span></label>
                        <div className="relative">
                          <select
                            value={uni.country}
                            onChange={(e) => updateUniversity(index, "country", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none bg-white text-gray-900"
                          >
                            <option value="">Select country</option>
                            {Object.entries(UNIVERSITY_DATA).map(([key, data]) => (
                              <option key={key} value={key}>{data.flag} {data.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {uni.country && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1.5">University <span className="text-pink-500">*</span></label>
                          <div className="relative">
                            <select
                              value={uni.university}
                              onChange={(e) => updateUniversity(index, "university", e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none bg-white text-gray-900"
                            >
                              <option value="">Select university</option>
                              {UNIVERSITY_DATA[uni.country]?.universities.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Program / Major</label>
                        <div className="relative">
                          <select
                            value={uni.program}
                            onChange={(e) => updateUniversity(index, "program", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none bg-white text-gray-900"
                          >
                            <option value="">Select program</option>
                            {PROGRAMS.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedUniversities.length < 5 && (
                  <button
                    onClick={addUniversity}
                    className="w-full py-4 border-2 border-dashed border-pink-200 rounded-2xl text-pink-500 font-medium hover:bg-pink-50 hover:border-pink-300 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Add Another University
                  </button>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    const validUnis = selectedUniversities.filter(u => u.university && u.country);
                    if (validUnis.length === 0) {
                      alert("Please select at least one university.");
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-200 transition-all"
                >
                  Continue to Documents
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Document Upload */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h2>
              <p className="text-gray-500 mb-8">Upload your documents to speed up the application process (optional)</p>

              <div className="space-y-5">
                {[
                  { label: "Academic Transcript", desc: "Latest transcript or report card", type: "transcript", file: transcript, setter: setTranscript, icon: FileText },
                  { label: "Passport", desc: "Clear copy of passport bio page", type: "passport", file: passport, setter: setPassport, icon: Globe },
                  { label: "IELTS / TOEFL Score", desc: "Official test result document", type: "ielts", file: ieltsDoc, setter: setIeltsDoc, icon: GraduationCap },
                  { label: "Certificates", desc: "Awards, achievements, or other certificates", type: "certificate", file: certificate, setter: setCertificate, icon: Shield },
                ].map((doc) => (
                  <div key={doc.type} className={`rounded-2xl border-2 transition-all ${doc.file ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"} p-5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.file ? "bg-green-100" : "bg-gray-200"}`}>
                          <doc.icon className={`w-5 h-5 ${doc.file ? "text-green-600" : "text-gray-500"}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{doc.label}</p>
                          {doc.file ? (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> {doc.file.name}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">{doc.desc}</p>
                          )}
                        </div>
                      </div>
                      <label className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        doc.file
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-pink-100 text-pink-600 hover:bg-pink-200"
                      }`}>
                        {uploading === doc.type ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : doc.file ? (
                          "Replace"
                        ) : (
                          <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</span>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, doc.type, doc.setter);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all resize-none text-gray-900"
                />
              </div>

              {/* Summary */}
              <div className="mt-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border border-pink-100">
                <h3 className="font-semibold text-gray-900 mb-3">Application Summary</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600"><span className="font-medium text-gray-800">Name:</span> {fullName}</p>
                  <p className="text-gray-600"><span className="font-medium text-gray-800">Email:</span> {email}</p>
                  <p className="text-gray-600"><span className="font-medium text-gray-800">Phone:</span> {phone}</p>
                  {currentSchool && <p className="text-gray-600"><span className="font-medium text-gray-800">School:</span> {currentSchool}</p>}
                  {ieltsScore && <p className="text-gray-600"><span className="font-medium text-gray-800">IELTS:</span> {ieltsScore}</p>}
                  <div className="pt-2 border-t border-pink-200 mt-2">
                    <p className="font-medium text-gray-800 mb-1">Applying to:</p>
                    {selectedUniversities.filter(u => u.university).map((u, i) => (
                      <p key={i} className="text-gray-600 ml-2">
                        {i + 1}. {u.university} ({UNIVERSITY_DATA[u.country]?.name}) {u.program && `- ${u.program}`}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-pink-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Submit Application</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
