import type { ReactNode } from "react";
import { AvanzaCrmShell } from "../_components/AvanzaCrmShell";

export default function AvanzaCrmAppLayout({ children }: { children: ReactNode }) {
  return <AvanzaCrmShell>{children}</AvanzaCrmShell>;
}
