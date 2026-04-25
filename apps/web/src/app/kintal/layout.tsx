import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · Kintal",
    default: "Kintal",
  },
  description: "Backoffice interno da Lucida.",
  robots: { index: false, follow: false },
};

export default function KintalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-kintal min-h-svh bg-background text-foreground">
      {children}
    </div>
  );
}
