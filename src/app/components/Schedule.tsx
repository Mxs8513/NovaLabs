import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { 
  UploadCloud, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  BookOpen, 
  ChevronRight, 
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  ArrowRight,
  Code
} from "lucide-react";

type ParsedEvent = {
  time: string;
  course: string;
  title: string;
  location: string;
  type: "class" | "lab" | "gap";
};

type SupportDetails = {
  event: ParsedEvent;
  mentor: string;
  sessionType: string;
  room: string;
  nextSlot: string;
  studyFocus: string;
  notes: string;
};

export function Schedule() {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [scheduleText, setScheduleText] = useState("");
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedSupport, setSelectedSupport] = useState<SupportDetails | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildSupportDetails = (event: ParsedEvent, idx: number): SupportDetails => {
    const mentors = ["Alex Rivera", "Mia Johnson", "Priya Patel", "Jordan Lee", "Sam Chen"];
    const rooms = ["Student Success Center 2.210", "ECSW 1.145", "Founders Hall 2.312", "SCI 1.220"];
    const focusAreas = [
      "Practice problem sets and exam strategy",
      "Concept review and weekly quiz prep",
      "Homework debugging and office-hour prep",
      "Lab report walkthrough and checklist",
    ];
    const sessionTypes = ["PLTL Group", "Tutoring Lab", "Peer Mentoring"];
    const slots = ["Today 5:30 PM", "Tomorrow 11:00 AM", "Wed 2:00 PM", "Thu 6:15 PM"];

    return {
      event,
      mentor: mentors[idx % mentors.length],
      sessionType: sessionTypes[idx % sessionTypes.length],
      room: rooms[idx % rooms.length],
      nextSlot: slots[idx % slots.length],
      studyFocus: focusAreas[idx % focusAreas.length],
      notes: `Bring notes from ${event.course} and the latest assignment for faster help.`,
    };
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        setScheduleText(text);
        processText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        setScheduleText(text);
        processText(text);
      };
      reader.readAsText(file);
    }
  };

  const processText = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    
    setIsUploading(true);
    setErrorMsg("");
    setParsedEvents([]);

    try {
      let rawText = "";
      let lastError = "";

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a9f9c092/extract-schedule`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ text: textToProcess })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned HTTP ${response.status}`);
          }
          
          const data = await response.json();
          rawText = data.rawText;
          
          if (rawText?.trim()) break; 
        } catch (e: any) {
          lastError = e.message;
          console.warn(`Extraction attempt ${attempt} failed:`, e);
          if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (!rawText?.trim()) {
        throw new Error(lastError ? `Network Error: ${lastError}` : "AI service returned empty response");
      }

      console.log("Raw Pollinations Response:", rawText);

      let extractedJSON = rawText;
      const arrayMatch = rawText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        extractedJSON = arrayMatch[0];
      }
      
      // Strip common bad formatting
      extractedJSON = extractedJSON.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(extractedJSON) as ParsedEvent[];
      } catch (parseError) {
        console.error("Strict JSON parse failed, attempting loose eval...", extractedJSON);
        try {
          // Fallback for missing quotes on keys or slight syntax errors
          parsed = new Function(`return ${extractedJSON}`)();
        } catch (e) {
          throw new Error("Could not parse AI response into valid JSON. Response might be malformed.");
        }
      }
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out bad elements
        const validEvents = parsed.filter(e => e && typeof e === 'object' && e.course);
        if (validEvents.length > 0) {
          setParsedEvents(validEvents);
          setIsUploaded(true);
        } else {
          throw new Error("Extracted array contained no valid classes.");
        }
      } else {
        throw new Error("Parsed data was empty or not an array.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to extract schedule. ${err.message || "Unknown error"}. Try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDemoSchedule = () => {
    // If we're unable to hit the backend due to environment issues,
    // explicitly mock the final output so the demo always works perfectly.
    setIsUploading(true);
    setErrorMsg("");
    
    // Show a realistic UI loading state before skipping to the result
    setTimeout(() => {
      setParsedEvents([
        {
          "time": "10:00 AM - 11:15 AM",
          "course": "CS 3345",
          "title": "Data Structures",
          "location": "ECSS 2.410",
          "type": "class"
        },
        {
          "time": "2:30 PM - 3:45 PM",
          "course": "MATH 2418",
          "title": "Linear Algebra",
          "location": "SLC 1.102",
          "type": "class"
        },
        {
          "time": "4:00 PM - 6:45 PM",
          "course": "PHYS 2325",
          "title": "Mechanics Lab",
          "location": "SCI 2.220",
          "type": "lab"
        }
      ]);
      setIsUploaded(true);
      setIsUploading(false);
    }, 1200);
  };

  return (
    <div className="h-full w-full max-w-[1100px] mx-auto px-6 py-10 md:px-12 flex flex-col gap-8 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-cyan-400" />
            My Schedule
          </h1>
          <p className="text-slate-400 font-light">
            Upload your Orion schedule to plan around classes and discover related tutoring.
          </p>
        </div>
        
        {isUploaded && (
          <button 
            onClick={() => setIsUploaded(false)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors text-slate-300 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            <UploadCloud className="w-4 h-4" />
            Update Schedule
          </button>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {!isUploaded ? (
          // Upload State
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center min-h-[500px] w-full"
          >
            <div className="w-full max-w-2xl bg-[#0a0f1c]/60 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`w-full bg-white/[0.02] border-2 border-dashed ${isUploading ? 'border-cyan-500/50' : 'border-white/15 hover:border-cyan-400/50'} rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 group hover:bg-white/[0.04] mb-6 relative`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".txt,.ics,.csv"
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 relative">
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                      <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-ping"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">AI is parsing your schedule...</h3>
                    <p className="text-sm text-slate-400">Extracting courses, locations, and timings</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500 cursor-pointer" onClick={handleUploadClick}>
                      <UploadCloud className="w-8 h-8 text-blue-400 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-white transition-colors">
                      Upload Schedule File
                    </h3>
                    <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
                      Drop your exported Canvas ICS or text file here, or browse.
                    </p>
                  </div>
                )}
              </div>

              {!isUploading && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Or Paste Text</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>

                  <div className="space-y-4">
                    <textarea 
                      value={scheduleText}
                      onChange={(e) => setScheduleText(e.target.value)}
                      placeholder="Paste your schedule text from Galaxy here (Course, Time, Location)..."
                      className="w-full bg-[#050b14]/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-cyan-500/50 outline-none transition-colors min-h-[120px] resize-none placeholder:text-slate-600"
                    />
                    
                    {errorMsg && (
                      <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                        {errorMsg}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button 
                        onClick={() => processText(scheduleText)}
                        disabled={!scheduleText.trim()}
                        className="flex-1 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-cyan-50 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex justify-center items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> Extract & Build Itinerary
                      </button>
                      <button 
                        onClick={handleDemoSchedule}
                        className="px-6 py-3 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 rounded-xl font-medium text-sm transition-all"
                      >
                        Load Demo
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          // Parsed Schedule & PLTL State
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10"
          >
            {/* Left Column: Today's Timeline */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-[#0a0f1c]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.5)]">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Generated Itinerary
                </h3>
                
                <div className="relative border-l-2 border-white/5 ml-3 space-y-8 pb-4">
                  {parsedEvents.map((evt, idx) => {
                    if (evt.type === 'gap') {
                      return (
                        <div key={idx} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0a0f1c] border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                          <div className="py-2">
                            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-3">
                              <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <span className="text-[13px] font-medium text-emerald-300">Free Time / Gap</span>
                              </div>
                              <button className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                Optimize <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#0a0f1c] border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                        <div className="text-xs font-bold text-cyan-400 mb-1 flex items-center gap-2">
                          {evt.time}
                        </div>
                        <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 transition-colors">
                          <h4 className="text-white font-medium text-[15px] mb-1">{evt.course}</h4>
                          <div className="text-[13px] text-slate-400 mb-3">{evt.title}</div>
                          {evt.location && (
                            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {evt.location}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {parsedEvents.length === 0 && (
                    <div className="text-sm text-slate-500 italic pl-6">No events extracted.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: PLTL & Tutoring */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Users className="w-6 h-6 text-purple-400" />
                  Smart Academic Support
                </h2>
                <span className="text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full">
                  Based on your classes
                </span>
              </div>

              {/* Support Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {parsedEvents.filter(e => e.type !== 'gap').map((evt, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-purple-900/20 to-[#0a0f1c]/80 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-[0_15px_40px_-15px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                        {idx % 2 === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                        {idx % 2 === 0 ? "PLTL Match" : "Tutoring Lab"}
                      </div>
                      <span className="bg-white/5 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-md uppercase">{evt.course.split(' ')[0] || evt.course}</span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 relative z-10">{evt.title} Support</h3>
                    <p className="text-[13px] text-slate-400 mb-5 relative z-10 line-clamp-2 leading-relaxed">
                      Recommended peer-led team learning and drop-in tutoring based on your enrollment in {evt.course}.
                    </p>

                    <div className="space-y-3 mb-6 relative z-10">
                      <div className="flex items-center gap-3 text-[13px] text-slate-300 font-medium">
                        <Clock className="w-4 h-4 text-purple-400" /> After your {evt.time.split(' - ')[1] || 'class'}
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-slate-300 font-medium">
                        <MapPin className="w-4 h-4 text-purple-400" /> Student Success Center
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedSupport(buildSupportDetails(evt, idx))}
                      className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    >
                      View Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Extra Suggestion */}
              {parsedEvents.length > 0 && (
                <div className="mt-2 bg-gradient-to-r from-blue-900/20 to-transparent border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <BookOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-200 text-sm font-semibold mb-0.5">Supplemental Instruction (SI)</h4>
                      <p className="text-slate-500 text-xs font-medium">Available for {parsedEvents.find(e => e.type !== 'gap')?.course || "your classes"} this week</p>
                    </div>
                  </div>
                  <button className="text-blue-400 bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSupport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedSupport(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xl bg-[#0a0f1c]/95 border border-white/10 rounded-2xl p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedSupport.event.course} • Support Details</h3>
                  <p className="text-sm text-slate-400 mt-1">{selectedSupport.event.title}</p>
                </div>
                <button
                  onClick={() => setSelectedSupport(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Session Type</div>
                  <div className="text-white font-semibold">{selectedSupport.sessionType}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Mentor</div>
                  <div className="text-white font-semibold">{selectedSupport.mentor}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Room</div>
                  <div className="text-white font-semibold">{selectedSupport.room}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Next Slot</div>
                  <div className="text-white font-semibold">{selectedSupport.nextSlot}</div>
                </div>
              </div>

              <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 space-y-2">
                <div className="text-purple-300 font-semibold text-sm">Recommended Focus</div>
                <p className="text-slate-200 text-sm">{selectedSupport.studyFocus}</p>
                <p className="text-slate-400 text-xs">{selectedSupport.notes}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
