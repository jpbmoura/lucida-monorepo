import { HeroSection } from "@/features/marketing/sections/hero";
import { StatsSection } from "@/features/marketing/sections/stats";
import { DashboardPreviewSection } from "@/features/marketing/sections/dashboard-preview";
import { FeaturesSection } from "@/features/marketing/sections/features";
import { HowItWorksSection } from "@/features/marketing/sections/how-it-works";
import { BeforeAfterSection } from "@/features/marketing/sections/before-after";
import { TestimonialsSection } from "@/features/marketing/sections/testimonials";
import { PricingTeaserSection } from "@/features/marketing/sections/pricing-teaser";
import { AnalyticsSection } from "@/features/marketing/sections/analytics";
import { FaqSection } from "@/features/marketing/sections/faq";
import { FinalCtaSection } from "@/features/marketing/sections/final-cta";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <DashboardPreviewSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BeforeAfterSection />
      <TestimonialsSection />
      <PricingTeaserSection />
      <AnalyticsSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
