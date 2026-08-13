import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[340px] transition-all">
      <div className="relative rounded-[3rem] p-3 bg-gradient-to-b from-slate-800 via-slate-900 to-black border border-slate-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(107,33,168,0.2)]">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-28 h-5 bg-black rounded-full border border-slate-800 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-blue-900/60" />
          </div>
          <div className="w-8 h-1 rounded-full bg-slate-900" />
        </div>

        {/* Screen Container */}
        <div
          data-phone-screen
          className="relative h-[580px] sm:h-[620px] w-full overflow-y-auto overflow-x-hidden rounded-[2.25rem] bg-[#08080A] pt-8 custom-scrollbar scroll-smooth"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
