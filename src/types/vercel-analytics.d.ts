declare module "@vercel/analytics/next" {
  import type { ComponentType } from "react";
  export const Analytics: ComponentType<Record<string, never>>;
}

declare module "@vercel/analytics/react" {
  import type { ComponentType } from "react";
  export const Analytics: ComponentType<Record<string, never>>;
}

