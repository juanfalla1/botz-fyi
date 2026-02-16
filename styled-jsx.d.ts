// Allow styled-jsx props on <style> tags in TSX.
// Next.js supports <style jsx> via styled-jsx, but some TS setups miss these types.

import "react";

declare module "react" {
  interface StyleHTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}
