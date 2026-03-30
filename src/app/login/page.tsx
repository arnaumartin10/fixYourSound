"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LogIn() {
  const router = useRouter();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setError("");
    try {
      await signIn("google", { redirectTo: "/profile" });
    } catch (err) {
      console.error("Google sign in error:", err);
      setError("Failed to sign in with Google");
      setIsLoadingGoogle(false);
    }
  };

  const handleCredentialsSignIn = async (formData: FormData) => {
    setIsLoadingEmail(true);
    setError("");

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please fill in all fields");
      setIsLoadingEmail(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoadingEmail(false);
        return;
      }

      if (result?.ok) {
        router.push("/profile");
      }
    } catch (err) {
      console.error("Credentials sign in error:", err);
      setError("An error occurred. Please try again.");
      setIsLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-white/50 text-sm">Sign in to access your presets</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoadingGoogle || isLoadingEmail}
          className="w-full py-4 rounded-xl bg-white text-black font-black flex items-center justify-center gap-3 hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {isLoadingGoogle ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#0a0a0a] text-white/30 font-bold uppercase tracking-wider text-[10px]">
              Or continue with email
            </span>
          </div>
        </div>

        <form action={handleCredentialsSignIn} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            disabled={isLoadingGoogle || isLoadingEmail}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50 disabled:opacity-50"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            disabled={isLoadingGoogle || isLoadingEmail}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f5d4]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoadingGoogle || isLoadingEmail}
            className="w-full py-4 rounded-xl bg-[#00f5d4] text-black font-black hover:bg-[#00f5d4]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoadingEmail ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm">
          Don't have an account?{" "}
          <Link href="/signup" className="text-[#00f5d4] font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
