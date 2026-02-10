import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle, MapPin, GraduationCap, ChevronLeft, ChevronRight, Globe } from "lucide-react";

const CONSULTATION_TYPES = [
  { value: "general", label: "General Consultation", icon: "💬", description: "Explore study abroad options" },
  { value: "university", label: "University Selection", icon: "🎓", description: "Find the right university for you" },
  { value: "ielts", label: "IELTS Preparation", icon: "📝", description: "IELTS course & strategy advice" },
  { value: "visa", label: "Visa Assistance", icon: "🛂", description: "Student visa guidance" },
  { value: "scholarship", label: "Scholarship Guidance", icon: "🏆", description: "Find & apply for scholarships" },
] as const;

const COUNTRIES = [
  "Malaysia", "Singapore", "Australia", "United Kingdom", "USA", "Canada", "China", "Ireland", "New Zealand", "Netherlands", "Not Sure Yet"
];

export default function BookConsultation() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    preferredCountry: "",
    notes: "",
  });
  const [bookingComplete, setBookingComplete] = useState(false);

  const slotsQuery = trpc.appointment.getAvailableSlots.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  const bookMutation = trpc.appointment.book.useMutation({
    onSuccess: () => {
      setBookingComplete(true);
    },
  });

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: string; day: number; disabled: boolean; isToday: boolean }[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: "", day: 0, disabled: true, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateObj < today;
      const isSunday = dateObj.getDay() === 0;
      days.push({
        date: dateStr,
        day: d,
        disabled: isPast || isSunday,
        isToday: dateObj.getTime() === today.getTime(),
      });
    }

    return days;
  }, [currentMonth]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleSubmit = () => {
    if (!selectedType || !selectedDate || !selectedSlot || !formData.fullName || !formData.email || !formData.phone) return;
    
    bookMutation.mutate({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      date: selectedDate,
      timeSlot: selectedSlot,
      consultationType: selectedType as any,
      preferredCountry: formData.preferredCountry || undefined,
      notes: formData.notes || undefined,
    });
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="container max-w-2xl pt-32 pb-20">
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-8">Your consultation has been scheduled. We'll send a confirmation to your email shortly.</p>
            
            <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700 font-medium">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700 font-medium">{selectedSlot} (Jakarta Time, GMT+7)</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700 font-medium">{CONSULTATION_TYPES.find(t => t.value === selectedType)?.label}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <a href="/" className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                Back to Home
              </a>
              <a
                href="https://wa.me/62819668278?text=Hi%20SpecTa!%20I%20just%20booked%20a%20consultation."
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-10 px-4">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            Free Consultation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Book Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Free Consultation</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Schedule a one-on-one session with our expert education consultants. Get personalized advice on universities, IELTS, visas, and scholarships.
          </p>
        </div>
      </section>

      {/* Progress Steps */}
      <div className="container max-w-3xl mb-8">
        <div className="flex items-center justify-center gap-2">
          {[
            { num: 1, label: "Type" },
            { num: 2, label: "Date & Time" },
            { num: 3, label: "Details" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s.num ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-sm font-medium hidden sm:inline ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>{s.label}</span>
              {i < 2 && <div className={`w-12 h-0.5 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="container max-w-3xl pb-20">
        {/* Step 1: Consultation Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">What would you like to discuss?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONSULTATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => { setSelectedType(type.value); setStep(2); }}
                  className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    selectedType === type.value
                      ? 'border-blue-600 bg-blue-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className="text-3xl mb-3 block">{type.icon}</span>
                  <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Pick a Date & Time</h2>
            <p className="text-center text-gray-500 text-sm mb-6">All times are in Jakarta Time (GMT+7)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold text-gray-900">{monthLabel}</h3>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-xs font-medium text-gray-400 py-2">{d}</div>
                  ))}
                  {calendarDays.map((d, i) => (
                    <button
                      key={i}
                      disabled={d.disabled || !d.date}
                      onClick={() => { setSelectedDate(d.date); setSelectedSlot(""); }}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        !d.date ? 'invisible' :
                        d.disabled ? 'text-gray-300 cursor-not-allowed' :
                        selectedDate === d.date ? 'bg-blue-600 text-white shadow-md' :
                        d.isToday ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                        'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {d.day || ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Available Times
                </h3>
                {!selectedDate ? (
                  <div className="text-center py-10 text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Select a date to see available times</p>
                  </div>
                ) : slotsQuery.isLoading ? (
                  <div className="text-center py-10 text-gray-400">
                    <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                    <p>Loading available slots...</p>
                  </div>
                ) : slotsQuery.data?.closed ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-lg font-medium">Closed on Sundays</p>
                    <p className="text-sm mt-1">Please select another date</p>
                  </div>
                ) : slotsQuery.data?.slots.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-lg font-medium">Fully Booked</p>
                    <p className="text-sm mt-1">Please try another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                    {slotsQuery.data?.slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                          selectedSlot === slot
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDate || !selectedSlot}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Personal Details */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Your Details</h2>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-4 mb-8 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{CONSULTATION_TYPES.find(t => t.value === selectedType)?.icon}</span>
                  <span className="font-medium text-blue-800">{CONSULTATION_TYPES.find(t => t.value === selectedType)?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Clock className="w-4 h-4" />
                  {selectedSlot}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="+62 xxx xxxx xxxx"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.preferredCountry}
                      onChange={(e) => setFormData({ ...formData, preferredCountry: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      <option value="">Select a country (optional)</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      placeholder="Tell us what you'd like to discuss..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.fullName || !formData.email || !formData.phone || bookMutation.isPending}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
              >
                {bookMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Booking...
                  </span>
                ) : (
                  'Confirm Booking ✓'
                )}
              </button>
            </div>

            {bookMutation.isError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
                Something went wrong. Please try again.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
