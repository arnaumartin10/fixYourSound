import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DashboardTabs } from "./DashboardTabs";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
     redirect("/auth/signin");
  }

  // Fetch all presets for this user
  const presets = await prisma.preset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl min-h-screen">
       <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 md:p-12 shadow-2xl space-y-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9d4edd] flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(0,245,212,0.2)]">
                   {session.user.image ? <img src={session.user.image} alt="User" className="w-full h-full rounded-full object-cover" /> : session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                </div>
                <div>
                   <h1 className="text-3xl font-black text-white">{session.user.name || "Music Producer"}</h1>
                   <p className="text-white/50">{session.user.email}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-4">
               <button className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white">
                 <Settings size={20} />
               </button>
               <form action={async () => { "use server"; await signOut({ redirectTo: "/" }) }}>
                 <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 transition-all">
                   <LogOut size={18} /> Sign Out
                 </button>
               </form>
             </div>
          </div>
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Main Dashboard Area */}
          <DashboardTabs presets={presets} />
       </div>
    </div>
  )
}
