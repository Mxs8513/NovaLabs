import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { supabase } from "../../utils/supabase/client";

export function Layout() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      } else {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#030712] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#030712] text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30 relative">
      {/* Background abstract gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[30%] -right-[20%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>
      
      {/* Texture grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>

      <Sidebar />
      <main className="flex-1 relative z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <Outlet />
      </main>
    </div>
  );
}
