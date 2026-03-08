import { Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase/client";
import { 
  MessageSquarePlus, 
  MessageSquare, 
  Sparkles, 
  Flame, 
  Users, 
  Clock, 
  Settings, 
  HelpCircle,
  Home,
  Calendar,
  Map as MapIcon,
  GraduationCap,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Student");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.name) {
        setUserName(session.user.user_metadata.name.split(" ")[0]);
      }
    };
    fetchUser();
  }, []);
  
  const pastChats = [
    "Find me a quiet room near ECSW",
    "Who do I ask about registration?",
    "Best professor for CS 3345",
    "What can I do in my 45 min gap?"
  ];

  const getPastChatPath = (chat: string) => {
    const trimmed = chat.trim();
    const lowerQuery = trimmed.toLowerCase();
    const isWhoDoIAskQuery =
      lowerQuery.includes("who do i ask") ||
      lowerQuery.includes("who do i even ask") ||
      lowerQuery.includes("routing");

    if (isWhoDoIAskQuery) {
      return `/who-do-i-ask?q=${encodeURIComponent(trimmed)}`;
    }

    return `/results?q=${encodeURIComponent(trimmed)}`;
  };

  const features = [
    { name: "Home", icon: Home, path: "/" },
    { name: "My Schedule", icon: Calendar, path: "/schedule" },
    { name: "Degree Planner", icon: GraduationCap, path: "/degree-planner" },
    { name: "Campus Map", icon: MapIcon, path: "/map" },
    { name: "Professor Pick", icon: Sparkles, path: "/professor-pick" },
    { name: "Who Do I Even Ask?", icon: Users, path: "/who-do-i-ask" },
  ];

  return (
    <div className="w-72 h-full border-r border-white/5 bg-[#050b14]/50 backdrop-blur-3xl flex flex-col relative z-20 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)]">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-[17px] tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          Nova Labs
        </span>
      </div>

      <div className="px-4 mb-6">
        <Link 
          to="/"
          className="w-full flex items-center gap-2.5 py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[14px] font-medium transition-all group shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-white/20"
        >
          <MessageSquarePlus className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          <span className="text-slate-200 group-hover:text-white transition-colors">New Chat</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2">
          Previous Chats
        </div>
        <div className="space-y-1 mb-8">
          {pastChats.map((chat, i) => (
            <Link 
              key={i} 
              to={getPastChatPath(chat)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] text-[13px] text-slate-400 hover:text-white transition-colors group"
            >
              <MessageSquare className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              <span className="truncate">{chat}</span>
            </Link>
          ))}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full mb-6" />

        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2">
          Features
        </div>
        <div className="space-y-1">
          {features.map((feat, i) => {
            const isActive = location.pathname === feat.path;
            return (
              <Link 
                key={i} 
                to={feat.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-[13px] ${
                  isActive 
                    ? "bg-blue-500/10 text-cyan-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                <feat.icon className={`w-4 h-4 ${isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-slate-500"}`} />
                <span>{feat.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between px-2 text-slate-400">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors hover:text-white group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
          <Link to="/profile" className="flex items-center flex-col gap-1 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] cursor-pointer group-hover:scale-105 transition-transform flex items-center justify-center">
              <span className="text-white text-xs font-bold">{userName[0]?.toUpperCase() || "S"}</span>
            </div>
          </Link>
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors hover:text-white group"
          >
            <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#050b14]/90 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl"
            >
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-wide">App Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-sm font-medium text-slate-200">Dark Theme</span>
                  <div className="w-10 h-5 bg-cyan-500 rounded-full relative shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed">
                  <span className="text-sm font-medium text-slate-200">Push Notifications</span>
                  <div className="w-10 h-5 bg-slate-700 rounded-full relative">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-slate-400 rounded-full"></div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/profile');
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    Go to Account Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#050b14]/90 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl"
            >
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <HelpCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-wide">Nova Support</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Welcome to Nova Labs. If you need assistance navigating the UT Dallas campus or have issues with this platform, our AI is here to route you to the correct department.
              </p>
              <div className="space-y-3">
                <a href="mailto:support@novalabs.example.com" className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                  Contact Support Team
                </a>
                <button 
                  onClick={() => {
                    setShowHelp(false);
                    navigate('/who-do-i-ask');
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Visit "Who Do I Ask"
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
