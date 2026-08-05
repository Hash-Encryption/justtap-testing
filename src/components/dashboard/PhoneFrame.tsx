import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="relative rounded-[2.4rem] border border-border bg-black p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="h-[600px] overflow-y-auto overflow-x-hidden rounded-[2rem]">
          {children}
        </div>
      </div>
    </div>
  );
}
