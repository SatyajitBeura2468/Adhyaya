import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adhyaya — lesson planning, made clear",
  description: "A calm, structured lesson-planning workspace for CBSE teachers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
