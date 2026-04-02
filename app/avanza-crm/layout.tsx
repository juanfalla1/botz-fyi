import type { ReactNode } from "react";

export default function AvanzaCrmRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{"body{padding-top:0!important;}"}</style>
      {children}
    </>
  );
}
