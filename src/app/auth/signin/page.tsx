import { signIn } from "@/auth";

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-8">
        <div className="text-center">
           <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
           <p className="text-white/50 text-sm">Sign in to save and manage presets</p>
        </div>
        
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/profile" });
          }}
        >
          <button type="submit" className="w-full py-4 rounded-xl bg-white text-black font-black flex items-center justify-center gap-3 hover:bg-white/90 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Sign in with Google
          </button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#0a0a0a] text-white/30 font-bold uppercase tracking-wider text-[10px]">Or continue with email</span>
          </div>
        </div>
        
        <form
          action={async (formData) => {
             "use server"
             await signIn("credentials", formData, { redirectTo: "/profile" })
          }}
          className="space-y-4"
        >
           <input type="email" name="email" placeholder="Email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50" />
           <input type="password" name="password" placeholder="Password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50" />
           <button type="submit" className="w-full py-4 rounded-xl bg-[#00f5d4] text-black font-black hover:bg-[#00f5d4]/90 transition-colors">
              Sign In with Email
           </button>
        </form>
      </div>
    </div>
  )
}
