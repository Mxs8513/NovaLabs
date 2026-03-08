import { motion } from "motion/react";
import { useSearchParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import orientationSchedule from "../../imports/orientation-schedule.json";
import profDataLocal from "../../imports/jennifer-johnson-data.json";
import { 
  CheckCircle2, MapPin, Clock, ChevronRight, Building2, Lightbulb, ArrowRight,
  BrainCircuit, ThumbsUp, ThumbsDown, Copy, RotateCcw, UserCheck, Star, 
  BookOpen, AlertTriangle, Info, Calendar, Ticket, Loader2, Sparkles, Navigation, GraduationCap, Users
} from "lucide-react";
import { searchNebulaProfessors, searchNebulaCourses } from "../services/nebulaApi";
import { askAI } from "../services/aiService"; // new AI helper

type AIResultData = {
  intent: string;
  tags: string[];
  message: React.ReactNode;
  aiMessage?: string; // additional prose coming from a language model
  options: {
    title: string;
    icon: any;
    color: string;
    iconColor: string;
    subtext1: string;
    subicon1: any;
    subtext2: string;
    subicon2: any;
    badge?: string;
    isTopPick?: boolean;
    image?: string;
  }[];
  suggestion: string;
  actionText: string;
  crossSell: {
    title: string;
    text: string;
    icon: any;
    color: string;
    borderColor: string;
  };
};

export function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "Hello";
  const [data, setData] = useState<AIResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const resolveActionPath = (result: AIResultData): string => {
    const action = result.actionText.toLowerCase();

    if (action.includes("reserve a pod")) return `/map?q=${encodeURIComponent("study pod")}`;
    if (action.includes("draft email")) return `/who-do-i-ask?q=${encodeURIComponent(query)}`;
    if (action.includes("sync to calendar")) return `/schedule?q=${encodeURIComponent(query)}`;
    if (action.includes("office hours")) return `/professor-pick?q=${encodeURIComponent(query)}`;
    if (action.includes("prerequisite")) return `/degree-planner?q=${encodeURIComponent(query)}`;
    if (action.includes("schedule planner")) return `/schedule?q=${encodeURIComponent(query)}`;
    if (action.includes("student insights")) return `/professor-pick?q=${encodeURIComponent(query)}`;
    if (action.includes("open now")) return `/map?q=${encodeURIComponent("open now")}`;

    return `/results?q=${encodeURIComponent(query)}`;
  };

  const resolveCrossSellPath = (result: AIResultData): string => {
    const title = result.crossSell.title.toLowerCase();

    if (title.includes("who do i ask")) return `/who-do-i-ask?q=${encodeURIComponent(query)}`;
    if (title.includes("professor pick")) return `/professor-pick?q=${encodeURIComponent(query)}`;
    if (title.includes("course catalog")) return `/degree-planner?q=${encodeURIComponent(query)}`;

    return `/results?q=${encodeURIComponent(query)}`;
  };

  const resolveOptionPath = (optionTitle: string): string => {
    const lowerTitle = optionTitle.toLowerCase();

    if (lowerTitle.includes("advising") || lowerTitle.includes("bursar") || lowerTitle.includes("registrar")) {
      return `/who-do-i-ask?q=${encodeURIComponent(optionTitle)}`;
    }

    if (lowerTitle.includes("library") || lowerTitle.includes("ecsw") || lowerTitle.includes("ecss")) {
      return `/map?q=${encodeURIComponent(optionTitle)}`;
    }

    if (/[a-z]{2,4}\s*\d{4}/i.test(optionTitle)) {
      return `/degree-planner?q=${encodeURIComponent(optionTitle)}`;
    }

    return `/results?q=${encodeURIComponent(optionTitle)}`;
  };

  const handleCopy = async () => {
    if (!data) return;
    const lines = [
      `Intent: ${data.intent}`,
      `Query: ${query}`,
      `Suggestion: ${data.suggestion}`,
      ...data.options.map((opt) => `- ${opt.title}: ${opt.subtext1} | ${opt.subtext2}`),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  useEffect(() => {
    async function processQuery() {
      setLoading(true);
      const lowerQuery = query.toLowerCase();
      let resultData: AIResultData | null = null;

      // start an asynchronous request to the language model so it can run in parallel
      const aiPromise = askAI(query);


      const getEvents = () => {
        try {
          const allEvents = orientationSchedule.flatMap(day => 
            day.buildings.flatMap(bldg => 
              bldg.rooms.flatMap(room => 
                room.events.filter(e => e.statusDescription === 'Confirmed').map(ev => {
                  const d = new Date(ev.dateTimeStart);
                  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  return {
                    name: ev.eventName,
                    org: ev.organizationName,
                    location: `${bldg.building} ${room.room}`,
                    date: day.date,
                    time: time
                  };
                })
              )
            )
          );
          const distinctEvents = Array.from(new Map(allEvents.map(item => [item.name, item])).values());
          const curatedEvents = distinctEvents.filter(e => !e.name.includes("Tabling") && !e.name.includes("Rain location"));
          return curatedEvents.slice(0, 3);
        } catch(e) { return []; }
      };

      // Intent Detectors
      const isProfessorPick = lowerQuery.includes("learning style") || lowerQuery.includes("professor pick") || lowerQuery.includes("help me pick");
      const isWhoDoIAsk = lowerQuery.includes("who do i ask") || lowerQuery.includes("routing");
      
      const isEventQuery = lowerQuery.includes("event") || lowerQuery.includes("happening") || lowerQuery.includes("orientation") || lowerQuery.includes("schedule");
      const isRoomQuery = lowerQuery.includes("room") || lowerQuery.includes("quiet") || lowerQuery.includes("study") || lowerQuery.includes("ecsw") || lowerQuery.includes("ecss");
      const isIssueQuery = lowerQuery.includes("issue") || lowerQuery.includes("ask") || lowerQuery.includes("struggling") || lowerQuery.includes("registration") || lowerQuery.includes("registreation") || lowerQuery.includes("hold") || lowerQuery.includes("bursar") || lowerQuery.includes("advising") || lowerQuery.includes("financial aid");
      
      const isJenniferJohnson = lowerQuery.includes("jennifer") || lowerQuery.includes("johnson");
      const isProfessorQuery = isJenniferJohnson || lowerQuery.includes("prof") || lowerQuery.includes("teach") || lowerQuery.includes("faculty");
      const isCourseQuery = lowerQuery.includes("class") || lowerQuery.includes("course") || /[a-z]{2,4}\s*\d{4}/.test(lowerQuery);

      if (isProfessorPick) {
         resultData = {
          intent: "Professor Pick",
          tags: ["AI Match", "Learning Style", "Faculty Insights"],
          message: (
            <>I analyzed your request and ran a matching algorithm across UT Dallas faculty based on <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">teaching methodologies, syllabus structures, and grading styles</span>. Here are the professors most aligned with visual and project-based learning.</>
          ),
          options: [
            {
              title: `${profDataLocal[0].first_name} ${profDataLocal[0].last_name}`,
              icon: Sparkles,
              color: "cyan",
              iconColor: "text-cyan-400",
              subtext1: "Highly Visual, Project-Based",
              subicon1: BrainCircuit,
              subtext2: "Clear Grading Rubrics",
              subicon2: CheckCircle2,
              isTopPick: true,
              image: profDataLocal[0].image_uri
            },
            {
              title: "Dr. Karen Mazidi",
              icon: UserCheck,
              color: "blue",
              iconColor: "text-blue-400",
              subtext1: "Interactive Lectures",
              subicon1: Users,
              subtext2: "Accessible Office Hours",
              subicon2: Clock
            },
            {
              title: "Dr. Jason Smith",
              icon: UserCheck,
              color: "slate",
              iconColor: "text-slate-300",
              subtext1: "Group Discussions",
              subicon1: Users,
              subtext2: "Moderate Workload",
              subicon2: Info
            }
          ],
          suggestion: "Want to see recent student reviews regarding their exams?",
          actionText: "Read Student Insights",
          crossSell: {
            title: "Course Catalog Search",
            text: "See which specific courses these top-matched professors are teaching next semester.",
            icon: BookOpen,
            color: "text-cyan-400",
            borderColor: "border-cyan-500/20"
          }
        };
      } else if (isWhoDoIAsk || isIssueQuery) {
        resultData = {
          intent: "Who Do I Ask? (Smart Routing)",
          tags: ["Campus Support", "Smart Routing", "Direct Line"],
          message: (
            <>It looks like you're trying to figure out where to go for a <span className="text-white font-medium bg-white/10 px-2 py-0.5 rounded-md border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)]">campus issue or hold</span>. I have mapped the university's administrative flowchart to route you directly to the offices that can solve this.</>
          ),
          options: [
            {
              title: "ECS Advising Office",
              icon: Navigation,
              color: "white",
              iconColor: "text-white",
              subtext1: "Prerequisites & Degree Plans",
              subicon1: GraduationCap,
              subtext2: "Book appointment online",
              subicon2: Clock,
              isTopPick: true
            },
            {
              title: "Comet Central / Bursar",
              icon: Info,
              color: "cyan",
              iconColor: "text-cyan-400",
              subtext1: "Financial & Billing Holds",
              subicon1: AlertTriangle,
              subtext2: "Drop-ins open now",
              subicon2: Clock
            },
            {
              title: "University Registrar",
              icon: BookOpen,
              color: "slate",
              iconColor: "text-slate-300",
              subtext1: "Transcripts & Transfer Credits",
              subicon1: Copy,
              subtext2: "Response via email ~2 days",
              subicon2: Clock
            }
          ],
          suggestion: "Would you like me to draft a professional email to the ECS Advising desk for you?",
          actionText: "Draft Email to Advisor",
          crossSell: {
            title: "Professor Pick",
            text: "Once your registration hold is cleared, let me help you pick the best professors.",
            icon: Sparkles,
            color: "text-white",
            borderColor: "border-white/20"
          }
        };
      } else if (isEventQuery) {
        const events = getEvents();
        resultData = {
          intent: "Campus Events Directory",
          tags: ["Events", "Student Life", "Live Schedule"],
          message: (
            <>I scanned the university master calendar and extracted the <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">upcoming confirmed events</span>. Here are the top events happening around campus that match your criteria.</>
          ),
          options: events.map((ev, idx) => ({
            title: ev.name.length > 25 ? ev.name.substring(0, 25) + "..." : ev.name,
            icon: Ticket,
            color: idx === 0 ? "white" : idx === 1 ? "cyan" : "slate",
            iconColor: idx === 0 ? "text-white" : idx === 1 ? "text-cyan-400" : "text-slate-300",
            subtext1: ev.location.length > 20 ? ev.location.substring(0,20)+"..." : ev.location,
            subicon1: MapPin,
            subtext2: `${ev.date} @ ${ev.time}`,
            subicon2: Clock,
            isTopPick: idx === 0
          })),
          suggestion: "Would you like me to sync these events with your Google Calendar?",
          actionText: "Sync to Calendar",
          crossSell: {
            title: "Professor Pick",
            text: "Find professors who fit your schedule and learning style.",
            icon: Sparkles,
            color: "text-cyan-400",
            borderColor: "border-cyan-500/20"
          }
        };
        if(events.length === 0) {
          resultData.message = <>I checked the master calendar but couldn't parse the events at this time.</>;
        }
      } else if (isRoomQuery) {
        resultData = {
          intent: "Study Space Optimizer",
          tags: ["Study Space", "Availability", "Live Map"],
          message: (
            <>I analyzed real-time campus data and found <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">3 available quiet rooms</span> matching your criteria. The closest option is just a short walk away.</>
          ),
          options: [
            {
              title: "ECSW 1.130",
              icon: Building2,
              color: "white",
              iconColor: "text-white",
              subtext1: "2 min walk",
              subicon1: MapPin,
              subtext2: "Available until 4:30 PM",
              subicon2: Clock,
              isTopPick: true
            },
            {
              title: "ECSS 2.311",
              icon: Building2,
              color: "cyan",
              iconColor: "text-cyan-400",
              subtext1: "5 min walk",
              subicon1: MapPin,
              subtext2: "Open study area",
              subicon2: Clock
            },
            {
              title: "Founders Library",
              icon: Building2,
              color: "slate",
              iconColor: "text-slate-300",
              subtext1: "8 min walk",
              subicon1: MapPin,
              subtext2: "Usually crowded",
              subicon2: Info
            }
          ],
          suggestion: "Want me to reserve a study pod for tomorrow instead?",
          actionText: "Reserve a Pod",
          crossSell: {
            title: "Who Do I Ask?",
            text: "Have a question while you study? See where to route your specific campus questions.",
            icon: Navigation,
            color: "text-cyan-400",
            borderColor: "border-cyan-500/20"
          }
        };
      } else if (isProfessorQuery || isJenniferJohnson) {
        // Query Nebula API for professors
        let apiProfs: any[] = [];
        
        if (isJenniferJohnson) {
           // Guarantee local rich data if they ask for Jennifer Johnson
           apiProfs = profDataLocal;
        } else {
           apiProfs = await searchNebulaProfessors(query);
           if (!apiProfs || apiProfs.length === 0) {
             // Fallback to local data to prevent empty states
             apiProfs = profDataLocal.slice(0, 1);
           }
        }

        const displayProfs = apiProfs.slice(0, 3);
        
        resultData = {
          intent: "Faculty Directory API Match",
          tags: ["Academics", "Faculty Profiles", "Nebula API"],
          message: (
            <>I queried the <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">UTD Nebula Database</span> and matched your request with the official faculty directory. Here are the precise profiles and office coordinates.</>
          ),
          options: displayProfs.map((prof: any, idx: number) => {
            const title = prof.titles && prof.titles.length > 0 ? prof.titles[0] : "University Professor";
            const office = prof.office && prof.office.building ? `${prof.office.building} ${prof.office.room}` : "Office hours online";
            return {
              title: `${prof.first_name} ${prof.last_name}`,
              icon: UserCheck,
              color: idx === 0 ? "white" : idx === 1 ? "cyan" : "slate",
              iconColor: idx === 0 ? "text-white" : idx === 1 ? "text-cyan-400" : "text-slate-300",
              subtext1: title.length > 28 ? title.substring(0,28) + "..." : title,
              subicon1: Star,
              subtext2: office,
              subicon2: MapPin,
              isTopPick: idx === 0,
              image: prof.image_uri && !prof.image_uri.includes('default.png') ? prof.image_uri : undefined
            };
          }),
          suggestion: "Should I add this professor's office hours to your prospective schedule?",
          actionText: "View Office Hours",
          crossSell: {
            title: "Professor Pick",
            text: "See what other students are saying about their workload and grading style this semester.",
            icon: Sparkles,
            color: "text-white",
            borderColor: "border-white/20"
          }
        };

      } else if (isCourseQuery) {
        // Query Nebula API for courses
        let apiCourses = await searchNebulaCourses(query);
        
        if (apiCourses && apiCourses.length > 0) {
           const topCourses = apiCourses.slice(0, 3);
           resultData = {
              intent: "Course Catalog API Match",
              tags: ["Academics", "Course Information", "Nebula API"],
              message: (
                <>I extracted the course details from your query and retrieved the live academic data from the <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">UTD Nebula API</span>. Here is the official catalog information.</>
              ),
              options: topCourses.map((c: any, idx: number) => ({
                title: `${c.subject_prefix} ${c.course_number}`,
                icon: BookOpen,
                color: idx === 0 ? "white" : "cyan",
                iconColor: idx === 0 ? "text-white" : "text-cyan-400",
                subtext1: c.title?.length > 25 ? c.title.substring(0,25) + "..." : (c.title || "Course"),
                subicon1: Info,
                subtext2: c.credit_hours ? `${c.credit_hours} Credits` : "Credit Varies",
                subicon2: Clock,
                isTopPick: idx === 0
              })),
              suggestion: "Want to see the prerequisites or degree plan requirements for these courses?",
              actionText: "View Prerequisites",
              crossSell: {
                title: "Professor Pick",
                text: "Find the best professor for this exact course based on grading style.",
                icon: UserCheck,
                color: "text-cyan-400",
                borderColor: "border-cyan-500/20"
              }
           };
        } else {
           // Fallback if course API fails but it was a course query
           resultData = {
              intent: "Course Information Match",
              tags: ["Academics", "Catalog"],
              message: (
                <>I checked the academic catalog for <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">{query}</span>. Here are the top related subjects and course disciplines.</>
              ),
              options: [
                {
                  title: "Course Catalog Search",
                  icon: BookOpen,
                  color: "white",
                  iconColor: "text-white",
                  subtext1: "Search full degree plan",
                  subicon1: Info,
                  subtext2: "Updated for Fall",
                  subicon2: Clock,
                  isTopPick: true
                },
                {
                  title: "Academic Advising",
                  icon: Users,
                  color: "cyan",
                  iconColor: "text-cyan-400",
                  subtext1: "Discuss prerequisites",
                  subicon1: AlertTriangle,
                  subtext2: "Virtual Queue Open",
                  subicon2: MapPin
                }
              ],
              suggestion: "Need help planning this semester's schedule?",
              actionText: "Open Schedule Planner",
              crossSell: {
                title: "Who Do I Ask?",
                text: "Not sure who to contact about degree plans? Let me route you.",
                icon: Navigation,
                color: "text-cyan-400",
                borderColor: "border-cyan-500/20"
              }
           };
        }

      } else {
        // Broad Fallback - Try Both APIs
        const [apiProfs, apiCourses] = await Promise.all([
          searchNebulaProfessors(query),
          searchNebulaCourses(query)
        ]);
        
        if (apiProfs && apiProfs.length > 0) {
          const displayProfs = apiProfs.slice(0, 3);
          resultData = {
            intent: "Faculty Directory API Match",
            tags: ["Academics", "Faculty Profiles", "Nebula API"],
            message: (
              <>I queried the <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">UTD Nebula Database</span> and matched your request with the official faculty directory. Here are the precise profiles and office coordinates.</>
            ),
            options: displayProfs.map((prof: any, idx: number) => {
              const title = prof.titles && prof.titles.length > 0 ? prof.titles[0] : "Instructor";
              const office = prof.office && prof.office.building ? `${prof.office.building} ${prof.office.room}` : "Office hours online";
              return {
                title: `${prof.first_name} ${prof.last_name}`,
                icon: UserCheck,
                color: idx === 0 ? "white" : idx === 1 ? "cyan" : "slate",
                iconColor: idx === 0 ? "text-white" : idx === 1 ? "text-cyan-400" : "text-slate-300",
                subtext1: title.length > 25 ? title.substring(0,25) + "..." : title,
                subicon1: Star,
                subtext2: office,
                subicon2: MapPin,
                isTopPick: idx === 0,
                image: prof.image_uri && !prof.image_uri.includes('default.png') ? prof.image_uri : undefined
              };
            }),
            suggestion: "Should I add this professor's office hours to your prospective schedule?",
            actionText: "View Office Hours",
            crossSell: {
              title: "Professor Pick",
              text: "See what other students are saying about their workload and grading style this semester.",
              icon: Sparkles,
              color: "text-cyan-400",
              borderColor: "border-cyan-500/20"
            }
          };
        } else if (apiCourses && apiCourses.length > 0) {
           const topCourses = apiCourses.slice(0, 3);
           resultData = {
              intent: "Course Catalog API Match",
              tags: ["Academics", "Course Information", "Nebula API"],
              message: (
                <>I analyzed your request and retrieved the related academic data from the <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">UTD Nebula API</span>. Here is the official catalog information.</>
              ),
              options: topCourses.map((c: any, idx: number) => ({
                title: `${c.subject_prefix} ${c.course_number}`,
                icon: BookOpen,
                color: idx === 0 ? "white" : "cyan",
                iconColor: idx === 0 ? "text-white" : "text-cyan-400",
                subtext1: c.title?.length > 25 ? c.title.substring(0,25) + "..." : (c.title || "Course"),
                subicon1: Info,
                subtext2: c.credit_hours ? `${c.credit_hours} Credits` : "Variable",
                subicon2: Clock,
                isTopPick: idx === 0
              })),
              suggestion: "Want to see the prerequisites for these courses?",
              actionText: "View Prerequisites",
              crossSell: {
                title: "Professor Pick",
                text: "Find the best professor for this exact course based on grading style.",
                icon: Sparkles,
                color: "text-white",
                borderColor: "border-white/20"
              }
           };
        } else {
          // Ultimate Assistant Fallback
          resultData = {
            intent: "Campus Assistant Routing",
            tags: ["General Navigation", "Campus Info"],
            message: (
              <>I've analyzed your request regarding <span className="text-cyan-400 font-medium bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">{query.length > 30 ? query.substring(0,30)+"..." : query}</span>. I have prepared the most relevant campus resources and fast-action tools to assist you right now.</>
            ),
            options: [
              {
                title: "Campus Directory Search",
                icon: MapPin,
                color: "white",
                iconColor: "text-white",
                subtext1: "Find people & places",
                subicon1: UserCheck,
                subtext2: "Live Data",
                subicon2: Clock,
                isTopPick: true
              },
              {
                title: "Who Do I Ask?",
                icon: Navigation,
                color: "cyan",
                iconColor: "text-cyan-400",
                subtext1: "Smart Campus Routing",
                subicon1: AlertTriangle,
                subtext2: "Get Connected",
                subicon2: MapPin
              },
              {
                title: "Library Services",
                icon: BookOpen,
                color: "slate",
                iconColor: "text-slate-300",
                subtext1: "Research help & equipment",
                subicon1: Info,
                subtext2: "Open 24/7",
                subicon2: Clock
              }
            ],
            suggestion: "Want me to refine this search to show only currently open facilities?",
            actionText: "Filter by Open Now",
            crossSell: {
              title: "Professor Pick",
              text: "Find professors tailored to your exact learning and grading style.",
              icon: Sparkles,
              color: "text-white",
              borderColor: "border-white/20"
            }
          };
        }
      }

      // give the LM a chance to augment our structured result
      try {
        const aiText = await aiPromise;
        if (aiText && resultData) {
          resultData.aiMessage = aiText;
        }
      } catch (e) {
        // ignore AI errors but log for debugging
        console.error("AI call failed", e);
      }

      setData(resultData);
      setLoading(false);
    }
    
    processQuery();
  }, [query]);

  return (
    <div className="h-full w-full max-w-[1000px] mx-auto px-6 py-10 md:px-12 flex flex-col gap-10 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-20">
      {/* User Query */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-end mt-4"
      >
        <div className="max-w-[75%] bg-white/[0.04] backdrop-blur-3xl px-6 py-4 rounded-3xl rounded-tr-sm border border-white/10 text-[17px] font-light text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] leading-relaxed hover:bg-white/[0.06] transition-colors">
          {query}
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
         <div className="flex gap-5 w-full items-start animate-pulse">
           <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-1 border border-white/10">
             <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
           </div>
           <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-3xl p-8 min-h-[300px]" />
         </div>
      )}

      {/* AI Response Section */}
      {!loading && data && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex gap-5 w-full items-start"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] flex-shrink-0 mt-1 border border-white/10">
          <BrainCircuit className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 flex flex-col gap-8">
          {/* Main AI Response Panel */}
          <div className="bg-[#0a0f1c]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-white/15 transition-colors">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none transition-all duration-700 group-hover:bg-cyan-500/10" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none transition-all duration-700 group-hover:bg-white/10" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {data.intent}
                </div>
                {data.tags.map((tag, i) => (
                  <span key={i} className="text-slate-400/80 text-[13px] font-medium flex items-center gap-2 tracking-wide">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="text-slate-200 text-[17px] leading-[1.8] mb-10 font-light">
                {data.message}
              </div>
              {data.aiMessage && (
                <div className="text-slate-400 text-[15px] leading-[1.6] mb-10 font-light italic">
                  {data.aiMessage}
                </div>
              )}

              {/* Extracted Details & Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                
                {data.options.map((opt, i) => {
                  const isTop = opt.isTopPick;
                  // Restrict colors to cyan/white/slate theme
                  let cardStyles = "bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/15";
                  let titleColor = "text-slate-200 group-hover/card:text-white";
                  let iconColor = "text-slate-500 group-hover/card:" + opt.iconColor;
                  let badgeColors = "text-cyan-500/80 bg-cyan-500/10 border-cyan-500/10 group-hover/card:text-cyan-400 group-hover/card:border-cyan-500/30";

                  if (isTop) {
                    cardStyles = `bg-gradient-to-br from-white/10 via-cyan-600/5 to-transparent border border-white/20 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.1)] hover:border-white/40`;
                    titleColor = "text-white";
                    iconColor = "text-white";
                    badgeColors = `text-white bg-white/10 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]`;
                  } else if (opt.color === 'slate') {
                    badgeColors = "text-slate-400 bg-slate-500/10 border-slate-500/20 group-hover/card:text-slate-300 group-hover/card:border-slate-500/30";
                  } else if (opt.color === 'blue') {
                    badgeColors = "text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover/card:text-blue-300 group-hover/card:border-blue-500/30";
                  } else if (opt.color === 'cyan') {
                    badgeColors = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover/card:text-cyan-300 group-hover/card:border-cyan-500/30";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => navigate(resolveOptionPath(opt.title))}
                      className={`${cardStyles} rounded-2xl p-5 relative overflow-hidden transition-all cursor-pointer group/card hover:-translate-y-1 flex flex-col text-left`}
                    >
                      {isTop && (
                        <div className={`absolute top-0 right-0 px-3 py-1.5 bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase rounded-bl-xl border-l border-b border-white/30 backdrop-blur-md`}>
                          Top Pick
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <h4 className={`${titleColor} font-semibold text-[15px] flex items-start gap-2.5 transition-colors leading-tight pr-2`}>
                          <opt.icon className={`w-4 h-4 ${iconColor} transition-colors flex-shrink-0 mt-0.5`} />
                          {opt.title}
                        </h4>
                        {opt.image && (
                          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden flex-shrink-0 -mt-1 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            <img src={opt.image} alt={opt.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto flex flex-col gap-3">
                        <div className="text-[13px] text-slate-400 flex items-center gap-2.5 font-medium group-hover/card:text-slate-300 transition-colors">
                          <opt.subicon1 className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{opt.subtext1}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-[12px] font-medium border px-3 py-1.5 rounded-lg w-fit transition-colors ${badgeColors}`}>
                          <opt.subicon2 className="w-3.5 h-3.5 flex-shrink-0" /> {opt.subtext2}
                        </div>
                      </div>
                    </button>
                  );
                })}

              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

              {/* Next Steps / Suggested Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-[14px] text-slate-300 font-medium">{data.suggestion}</span>
                </div>
                <button
                  onClick={() => navigate(resolveActionPath(data))}
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-[14px] font-semibold transition-all group hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 w-full sm:w-auto justify-center text-white whitespace-nowrap"
                >
                  {data.actionText}
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* Map / Resource Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Map Card */}
            <div 
              onClick={() => navigate('/map')}
              className="md:col-span-2 bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-3 relative overflow-hidden h-56 group hover:border-white/20 transition-colors shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] cursor-pointer"
            >
              <div className="absolute inset-0 bg-[#06142e] z-0 flex items-center justify-center overflow-hidden">
                {/* Simulated stylized map */}
                <div className="w-[150%] h-[150%] opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] animate-[spin_120s_linear_infinite]" />
                <div className="absolute w-64 h-64 border border-cyan-500/20 rounded-full" />
                <div className="absolute w-32 h-32 border border-cyan-500/30 rounded-full" />
                <div className="absolute w-16 h-16 bg-cyan-500/20 rounded-full animate-ping" />
                <div className="absolute w-5 h-5 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,1)] z-10 border-2 border-[#06142e] flex items-center justify-center">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                </div>
                <div className="absolute top-5 left-5 bg-[#030712]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[12px] font-bold tracking-wider uppercase text-slate-200 z-10 shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                  Campus Map
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-transparent to-transparent pointer-events-none z-10" />
            </div>

            {/* Dynamic Cross-sell */}
            <button
              onClick={() => navigate(resolveCrossSellPath(data))}
              className={`bg-gradient-to-b from-[#0a0f1c] to-[#0a0f1c]/80 backdrop-blur-xl border ${data.crossSell.borderColor} rounded-3xl p-7 relative group cursor-pointer hover:border-opacity-100 transition-all shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] hover:-translate-y-1 flex flex-col text-left`}
            >
              <div className="absolute top-0 right-0 p-5 opacity-20 group-hover:opacity-60 transition-opacity duration-500 group-hover:rotate-12 group-hover:scale-110">
                <data.crossSell.icon className={`w-8 h-8 ${data.crossSell.color}`} />
              </div>
              <h3 className={`${data.crossSell.color} font-semibold text-[16px] mb-3 mt-4 pr-6`}>{data.crossSell.title}</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-6 font-medium group-hover:text-slate-300 transition-colors">
                {data.crossSell.text}
              </p>
              <div className="mt-auto">
               <span className={`text-[12px] font-bold tracking-wide ${data.crossSell.color} opacity-80 flex items-center gap-1.5 group-hover:gap-2.5 transition-all uppercase`}>
                  Explore Feature <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>

          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-4 ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className={`p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-110 ${copied ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/results?q=${encodeURIComponent(query)}&refresh=${Date.now()}`)}
              className="p-2.5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-slate-300 transition-all hover:scale-110"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-white/10 mx-3" />
            <button
              onClick={() => setFeedback("up")}
              className={`p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-110 ${feedback === "up" ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"}`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFeedback("down")}
              className={`p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-110 ${feedback === "down" ? "text-red-400" : "text-slate-500 hover:text-red-400"}`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
          
        </div>
      </motion.div>
      )}

    </div>
  );
}
