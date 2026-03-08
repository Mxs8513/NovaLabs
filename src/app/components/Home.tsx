import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Users, ArrowRight, Search, BrainCircuit, Route, Lightbulb, GraduationCap } from "lucide-react";
import { searchNebulaProfessors, searchNebulaCourses } from "../services/nebulaApi"; // for live suggestions

import { motion } from "motion/react";

export function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const navigate = useNavigate();

  const routeFromQuery = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const lowerQuery = trimmed.toLowerCase();
    const isWhoDoIAskQuery =
      lowerQuery.includes("who do i ask") ||
      lowerQuery.includes("who do i even ask") ||
      lowerQuery.includes("routing");

    if (isWhoDoIAskQuery) {
      navigate(`/who-do-i-ask?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    navigate(`/results?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    routeFromQuery(query);
  };

  // when the user types, fetch some quick suggestions from Nebula
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [profs, courses] = await Promise.all([
          searchNebulaProfessors(query),
          searchNebulaCourses(query)
        ]);
        const profNames = profs.slice(0, 3).map(p => `${p.first_name} ${p.last_name}`);
        const courseNames = courses.slice(0, 3).map(c => `${c.subject_prefix} ${c.course_number}`);
        setSuggestions([...profNames, ...courseNames]);
      } catch (err) {
        console.error("Suggestion fetch error", err);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);


  const examplePrompts = [
    "Find me a quiet room near ECSW",
    "Who do I ask about registration?",
    "Best professor for CS 3345",
    "Help me pick a professor for my learning style",
    "Where is the advising office?"
  ];

  const featureCards = [
    {
      title: "Professor Pick",
      desc: "AI match for your learning style",
      icon: Sparkles,
      color: "from-cyan-400 to-blue-500",
      shadow: "hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]",
      path: "/professor-pick"
    },
    {
      title: "Who Do I Ask?",
      desc: "Smart routing to the right office",
      icon: Users,
      color: "from-white to-cyan-200 text-slate-900",
      iconColor: "text-slate-900",
      shadow: "hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]",
      path: "/who-do-i-ask"
    },
    {
      title: "Degree Planner",
      desc: "Plan semesters and track credits",
      icon: GraduationCap,
      color: "from-blue-500 to-cyan-400",
      shadow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]",
      path: "/degree-planner"
    }
  ];

  return (
    <div className="h-full w-full flex flex-col items-center p-8 relative overflow-y-auto [&::-webkit-scrollbar]:hidden pb-20">
      <div className="max-w-4xl w-full flex flex-col items-center mt-[8vh] relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-cyan-400 text-xs font-medium mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:bg-white/[0.06] transition-colors cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
            UT Dallas AI Assistant by Nova Labs
          </div>
          <h1 className="text-5xl md:text-[64px] leading-tight font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-cyan-100/50 drop-shadow-sm">
            Your AI Campus <br className="hidden md:block"/> Help Desk
          </h1>
          <p className="text-slate-400/80 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Ask anything about professors, rooms, schedules, campus issues, and student life at UT Dallas.
          </p>
        </motion.div>

        {/* Feature Cards row (shortcuts) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-3xl mb-10"
        >
          {featureCards.map((card, i) => (
            <div 
              key={i} 
              onClick={() => navigate(card.path)}
              className={`p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all duration-300 cursor-pointer backdrop-blur-md group relative overflow-hidden ${card.shadow}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
              <div className="relative z-10 flex items-center gap-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor || "text-white"}`} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white tracking-wide mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-cyan-100/50 group-hover:text-cyan-100/80 leading-relaxed transition-colors">
                    {card.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Primary Search Input */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full relative group max-w-3xl"
        >
          {/* Animated glow border */}
          <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500 via-white/30 to-blue-500 rounded-2xl opacity-40 group-hover:opacity-100 blur-xl transition duration-700 group-hover:duration-300" />
          
          <form 
            onSubmit={handleSearch}
            className="relative bg-[#050b14]/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] transition-all duration-300 group-focus-within:border-cyan-500/50 group-focus-within:bg-[#070e1c]/90 group-focus-within:shadow-[0_0_40px_rgba(34,211,238,0.2)]"
          >
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about professors, rooms, buildings, or campus help..."
              className="flex-1 bg-transparent border-none outline-none text-white px-5 py-4 text-[17px] md:text-lg placeholder:text-slate-500 font-light placeholder:font-light selection:bg-cyan-500/30"
              autoFocus
            />
            <button 
              type="submit"
              className={`px-6 h-14 rounded-xl flex items-center gap-2.5 font-semibold tracking-wide transition-all duration-300 ${
                query.trim() 
                  ? "bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:bg-cyan-50 hover:shadow-[0_0_25px_rgba(255,255,255,0.7)] hover:scale-105" 
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              disabled={!query.trim()}
            >
              Search
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* suggestion dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute z-20 w-full bg-[#050b14]/95 backdrop-blur-2xl mt-1 rounded-xl border border-white/10 shadow-lg">
              {suggestions.map((text, i) => (
                <li
                  key={i}
                  className="px-4 py-2 text-white hover:bg-white/[0.1] cursor-pointer"
                  onClick={() => {
                    setQuery(text);
                    routeFromQuery(text);
                    setSuggestions([]);
                  }}
                >
                  {text}
                </li>
              ))}
            </ul>
          )}
          
          <div className="text-center mt-4">
            <span className="text-[13px] text-slate-500 font-medium tracking-wide">
              Try asking a real campus question to get relevant UTD results
            </span>
          </div>
        </motion.div>

        {/* Example Prompts */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-8 max-w-3xl"
        >
          {examplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(prompt);
                routeFromQuery(prompt);
              }}
              className="px-4 py-2.5 rounded-full bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/50 text-[13px] text-slate-400 hover:text-white transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:-translate-y-0.5 group/prompt"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover/prompt:opacity-100 group-hover/prompt:text-cyan-400 transition-all" />
            </button>
          ))}
        </motion.div>

        {/* Search Journey Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-16 w-full max-w-3xl border-t border-white/5 pt-10"
        >
          <div className="text-center mb-8">
            <h3 className="text-sm font-semibold tracking-widest uppercase text-cyan-500/60">What happens when you search</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-0" />
            
            <div className="flex flex-col items-center text-center relative z-10 group">
              <div className="w-14 h-14 rounded-2xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center mb-4 shadow-lg group-hover:border-cyan-500/40 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all group-hover:-translate-y-1">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-[15px] font-semibold text-slate-200 mb-2">1. Understand Question</h4>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">AI analyzes your prompt's intent, category, and specific details.</p>
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10 group">
              <div className="w-14 h-14 rounded-2xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center mb-4 shadow-lg group-hover:border-blue-500/40 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all group-hover:-translate-y-1">
                <Route className="w-6 h-6 text-cyan-200" />
              </div>
              <h4 className="text-[15px] font-semibold text-slate-200 mb-2">2. Route to Tool</h4>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">Query is matched with live APIs, maps, or the university directory.</p>
            </div>

            <div className="flex flex-col items-center text-center relative z-10 group">
              <div className="w-14 h-14 rounded-2xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center mb-4 shadow-lg group-hover:border-white/40 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all group-hover:-translate-y-1">
                <Lightbulb className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="text-[15px] font-semibold text-slate-200 mb-2">3. Show Insights</h4>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">Get direct answers, next step suggestions, and helpful context cards.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
