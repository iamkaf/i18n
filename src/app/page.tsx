import { PublicShell } from "@/components/atelier/public-shell";
import { StatusPill } from "@/components/atelier/status-pill";
import { ChevronRight } from "lucide-react";

export default function Page() {
  return (
    <PublicShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 min-h-screen">
        
        {/* Animated Hello Message */}
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center justify-center opacity-0 translate-y-4 animate-[fadeInUp_1.2s_ease-out_forwards]">
          
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-[var(--atelier-text)] mb-6" style={{ fontFamily: "var(--font-syne)" }}>
            Hello.
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--atelier-muted)] max-w-lg mx-auto leading-relaxed font-medium">
            This is Kaf's Atelier.
            <br />
            A quiet space dedicated to translating Minecraft mods into your language.
          </p>

          <div className="mt-12 opacity-0 animate-[fadeIn_1s_ease-out_forwards_0.8s]">
             <a 
               href="/api/auth/discord" 
               className="group flex flex-col items-center gap-3 transition-opacity hover:opacity-80"
             >
               <div className="w-14 h-14 rounded-full bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-[var(--atelier-highlight)] group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
               </div>
               <span className="text-[14px] text-[var(--atelier-highlight)] font-medium">Help translate a mod</span>
             </a>
          </div>
        </div>

      </div>
    </PublicShell>
  );
}
