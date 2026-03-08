import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, AlertTriangle, GraduationCap, Building, 
  Monitor, ChevronRight, Mail, Phone, MapPin, Search, Sparkles, Loader2, Bot,
  Calendar, Clock, X, CheckCircle2
} from "lucide-react";
import { getOpenAIUserFacingErrorMessage, routeWhoDoIAskQuery } from "../services/openaiRoutingApi";

export function WhoDoIAsk() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<{ text: string, categoryId: string | null } | null>(null);
  
  // Booking Modal State
  const [bookingCategory, setBookingCategory] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<"calendar" | "success">("calendar");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Email Modal State
  const [draftingEmailCat, setDraftingEmailCat] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailStep, setEmailStep] = useState<"compose" | "success">("compose");

  // Map Modal State
  const [mapModal, setMapModal] = useState<{isOpen: boolean, location: string, office: string} | null>(null);
  
  const navigate = useNavigate();

  const handleOpenBooking = (e: React.MouseEvent, cat: any) => {
    e.stopPropagation();
    setBookingCategory(cat);
    setBookingStep("calendar");
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleConfirmBooking = () => {
    setBookingStep("success");
    setTimeout(() => {
      setBookingCategory(null);
    }, 2500);
  };

  const handleOpenEmail = (e: React.MouseEvent, cat: any) => {
    e.stopPropagation();
    setDraftingEmailCat(cat);
    setEmailSubject(`Inquiry regarding ${cat.title}`);
    
    const draftQuery = query.trim() ? `regarding the following issue:\n\n"${query}"\n\nCould you please help me with this?` : "with a question.";
    setEmailBody(`Hello ${cat.office},\n\nI am a student reaching out for assistance ${draftQuery}\n\nThank you!`);
    
    setEmailStep("compose");
  };

  const handleSendEmail = () => {
    setEmailStep("success");
    setTimeout(() => {
      setDraftingEmailCat(null);
    }, 2500);
  };

  const handleRouteMe = async () => {
    if (!query.trim()) return;
    
    setIsAiLoading(true);
    setAiAnswer(null);
    setActiveCategory(null); // Close any open categories to focus on the AI answer

    try {
      const result = await routeWhoDoIAskQuery(query.trim());
      setAiAnswer(result);
    } catch (err) {
      console.error("WhoDoIAsk OpenAI routing error:", err);
      setAiAnswer({ 
        text: getOpenAIUserFacingErrorMessage(err), 
        categoryId: null 
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const categories = [
    {
      id: "academic",
      title: "Academic & Advising",
      icon: GraduationCap,
      desc: "Degree plans, prereqs, transferring credits",
      office: "ECS Academic Advising",
      location: "ECSW 2.102",
      email: "ecs.advising@utdallas.edu",
      phone: "972-883-2000"
    },
    {
      id: "financial",
      title: "Financial & Billing",
      icon: AlertTriangle,
      desc: "Tuition, bursar holds, financial aid",
      office: "Comet Central",
      location: "SSB 2.300",
      email: "financial-aid@utdallas.edu",
      phone: "972-883-2270"
    },
    {
      id: "housing",
      title: "Housing & Dining",
      icon: Building,
      desc: "Dorm issues, meal plans, parking",
      office: "University Housing",
      location: "Res Hall West",
      email: "housing@utdallas.edu",
      phone: "972-883-6391"
    },
    {
      id: "tech",
      title: "Tech Support",
      icon: Monitor,
      desc: "NetID, elearning, campus Wi-Fi",
      office: "OIT Help Desk",
      location: "Founders 1.100",
      email: "assist@utdallas.edu",
      phone: "972-883-2911"
    }
  ];

  const matchedCat = aiAnswer?.categoryId ? categories.find(c => c.id === aiAnswer.categoryId) : null;

  return (
    <div className="h-full w-full flex flex-col p-8 md:p-12 overflow-y-auto [&::-webkit-scrollbar]:hidden relative">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 text-center items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-cyan-200 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] mb-2">
            <Users className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Who Do I Ask?</h1>
          <p className="text-slate-400 text-lg max-w-2xl font-light">
            Skip the endless campus runaround. Select your issue below or search directly, and we'll route you to the exact desk that can fix it.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-2xl mx-auto w-full group"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/0 via-white/20 to-cyan-500/0 rounded-2xl opacity-40 group-focus-within:opacity-100 blur-md transition duration-500" />
          <div className="relative bg-[#050b14]/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center p-2 shadow-2xl transition-all group-focus-within:border-white/30">
            <Search className="w-5 h-5 text-slate-400 ml-4 mr-2" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRouteMe()}
              placeholder="e.g., I have a hold on my registration..."
              className="flex-1 bg-transparent border-none outline-none text-white px-3 py-3 text-[16px] placeholder:text-slate-500 font-light"
            />
            <button 
              onClick={handleRouteMe}
              disabled={isAiLoading}
              className="px-5 py-2 bg-white text-slate-900 rounded-xl font-bold hover:bg-cyan-50 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              Route Me
            </button>
          </div>
        </motion.div>

        {/* AI Direct Answer Section */}
        <AnimatePresence>
          {(isAiLoading || aiAnswer) && (
            <motion.div 
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="w-full max-w-2xl mx-auto overflow-hidden mt-2"
            >
              <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/20 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.15)] relative">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                    {isAiLoading ? (
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <Bot className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-h-[40px] flex flex-col justify-center">
                    {isAiLoading ? (
                      <div className="flex items-center gap-2 text-cyan-100/70 font-medium animate-pulse">
                        Nova AI is finding the right office...
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="text-white text-[15px] leading-relaxed whitespace-pre-wrap font-light">
                          {aiAnswer?.text}
                        </div>
                        
                        {matchedCat && (
                          <div className="mt-2 pt-4 border-t border-cyan-500/20 flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold">Matched Department:</span>
                              <span className="text-white font-medium text-sm">{matchedCat.office}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                               <button 
                                onClick={(e) => handleOpenBooking(e, matchedCat)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-cyan-50 text-slate-900 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                               >
                                 <Calendar className="w-4 h-4" /> Book Appointment
                               </button>

                               <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMapModal({ isOpen: true, location: matchedCat.location, office: matchedCat.office });
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-50 rounded-xl text-sm font-medium transition-all"
                               >
                                 <MapPin className="w-4 h-4" /> View Map
                               </button>
                               
                               <button 
                                onClick={(e) => handleOpenEmail(e, matchedCat)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                               >
                                 <Mail className="w-4 h-4" /> Draft Email
                               </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flowchart / Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4"
        >
          {categories.map((cat) => (
            <div 
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`border rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
                activeCategory === cat.id 
                  ? "bg-white/[0.05] border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]" 
                  : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="p-6 flex items-center gap-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  activeCategory === cat.id ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400"
                }`}>
                  <cat.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 transition-colors ${
                    activeCategory === cat.id ? "text-cyan-400" : "text-white"
                  }`}>
                    {cat.title}
                  </h3>
                  <p className="text-[13px] text-slate-400 font-light">{cat.desc}</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${
                  activeCategory === cat.id ? "rotate-90 text-cyan-400" : ""
                }`} />
              </div>

              <AnimatePresence>
                {activeCategory === cat.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10 bg-[#050b14]/50"
                  >
                    <div className="p-6 flex flex-col gap-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="px-3 py-1 bg-white border border-white text-slate-900 text-[11px] font-bold tracking-widest uppercase rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                          Target Office
                        </div>
                        <span className="text-white font-semibold text-lg">{cat.office}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMapModal({ isOpen: true, location: cat.location, office: cat.office });
                          }}
                          className="flex flex-col gap-1.5 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <MapPin className="w-4 h-4 text-cyan-400 mb-1 group-hover:animate-bounce" />
                            <span className="text-[10px] text-cyan-400/0 group-hover:text-cyan-400 transition-colors">VIEW MAP</span>
                          </div>
                          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Location</span>
                          <span className="text-sm text-slate-200 group-hover:text-cyan-50 transition-colors">{cat.location}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                          <Mail className="w-4 h-4 text-cyan-400 mb-1" />
                          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Email</span>
                          <span className="text-sm text-slate-200">{cat.email}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                          <Phone className="w-4 h-4 text-cyan-400 mb-1" />
                          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Phone</span>
                          <span className="text-sm text-slate-200">{cat.phone}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-2">
                        <button 
                          onClick={(e) => handleOpenBooking(e, cat)}
                          className="flex-1 py-3 bg-white hover:bg-cyan-50 text-slate-900 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                          Book Appointment
                        </button>
                        <button 
                          onClick={(e) => handleOpenEmail(e, cat)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all"
                        >
                          Draft Email
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        {/* Booking Modal Overlay */}
        <AnimatePresence>
          {bookingCategory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050b14]/80 backdrop-blur-md"
              onClick={() => setBookingCategory(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0a1120] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.1)] overflow-hidden relative"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setBookingCategory(null)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {bookingStep === "calendar" ? (
                  <div className="p-8 flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Book Appointment</h2>
                      <p className="text-slate-400 text-sm font-light">
                        Select a time to meet with <span className="text-cyan-400 font-medium">{bookingCategory.office}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm uppercase tracking-wider text-slate-300">Select Date</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        {[
                          { day: "Mon", date: 12 },
                          { day: "Tue", date: 13 },
                          { day: "Wed", date: 14 },
                          { day: "Thu", date: 15 },
                          { day: "Fri", date: 16 }
                        ].map((d) => (
                          <button
                            key={d.date}
                            onClick={() => setSelectedDate(d.date)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all flex-1 ${
                              selectedDate === d.date 
                                ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]" 
                                : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20"
                            }`}
                          >
                            <span className="text-xs uppercase tracking-wider mb-1">{d.day}</span>
                            <span className={`text-xl font-bold ${selectedDate === d.date ? "text-cyan-400" : "text-white"}`}>
                              {d.date}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedDate ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm uppercase tracking-wider text-slate-300">Select Time</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {["09:00 AM", "10:30 AM", "01:00 PM", "03:00 PM"].map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                              selectedTime === t
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmBooking}
                      disabled={!selectedDate || !selectedTime}
                      className="mt-4 w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-cyan-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      Confirm Booking
                    </button>
                  </div>
                ) : (
                  <div className="p-10 flex flex-col items-center justify-center text-center gap-6 min-h-[420px]">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                      <CheckCircle2 className="w-10 h-10 text-cyan-400" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Appointment Confirmed!</h2>
                      <p className="text-slate-400 font-light">
                        You're all set to meet with <span className="text-white font-medium">{bookingCategory.office}</span>. 
                        A calendar invite has been drafted for your UTD email.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Draft Modal Overlay */}
        <AnimatePresence>
          {draftingEmailCat && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050b14]/80 backdrop-blur-md"
              onClick={() => setDraftingEmailCat(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-[#0a1120] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.1)] overflow-hidden relative"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setDraftingEmailCat(null)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {emailStep === "compose" ? (
                  <div className="p-8 flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Draft Email</h2>
                      <p className="text-slate-400 text-sm font-light">
                        Message <span className="text-cyan-400 font-medium">{draftingEmailCat.office}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 mt-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">To</label>
                        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-medium">
                          {draftingEmailCat.email}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Subject</label>
                        <input 
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-cyan-500/50 outline-none transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Message</label>
                        <textarea 
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          rows={6}
                          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-cyan-500/50 outline-none transition-colors resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setDraftingEmailCat(null)}
                        className="flex-1 py-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendEmail}
                        className="flex-[2] py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-cyan-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                      >
                        Send Email
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 flex flex-col items-center justify-center text-center gap-6 min-h-[460px]">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                      <CheckCircle2 className="w-10 h-10 text-cyan-400" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Email Sent!</h2>
                      <p className="text-slate-400 font-light">
                        Your message has been sent to <span className="text-white font-medium">{draftingEmailCat.office}</span>. 
                        They will respond to your UTD student email shortly.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Location Modal Overlay */}
        <AnimatePresence>
          {mapModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#050b14]/90 backdrop-blur-md"
              onClick={() => setMapModal(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0a1120] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.1)] overflow-hidden relative flex flex-col"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setMapModal(null)}
                  className="absolute top-4 right-4 p-2 text-slate-800 bg-white/80 hover:bg-white rounded-full transition-colors z-10 shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="h-64 sm:h-80 w-full relative bg-slate-800 overflow-hidden">
                  <iframe 
                    src={`https://maps.google.com/maps?q=${encodeURIComponent("UT Dallas " + mapModal.office)}&t=&z=16&ie=UTF8&iwloc=&output=embed`} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)" }} 
                    allowFullScreen 
                    aria-hidden="false" 
                    tabIndex={0}
                    title="UT Dallas Map"
                  ></iframe>
                  <div className="absolute inset-0 bg-cyan-900/10 pointer-events-none"></div>
                </div>

                <div className="p-6 md:p-8 bg-gradient-to-b from-[#0a1120] to-[#050b14] flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold tracking-widest uppercase rounded-full">
                      Location Pin
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{mapModal.location}</h2>
                  <p className="text-slate-400 font-light flex items-center gap-2 mt-1">
                    <Building className="w-4 h-4" /> Home to <span className="text-white font-medium">{mapModal.office}</span>
                  </p>
                  
                  <button 
                    onClick={() => setMapModal(null)}
                    className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Close Map
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
