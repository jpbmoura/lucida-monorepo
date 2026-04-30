"use client";

import { useState } from "react";
import { UserCircle, Lock, Bell, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCompleteness, type UserProfileDTO } from "./data";
import { ProfileForm } from "./components/profile-form";
import { AccountForm } from "./components/account-form";
import { CompletenessBar } from "./components/completeness-bar";

interface SettingsPageProps {
  profile: UserProfileDTO;
}

type Tab = "profile" | "account";

export function SettingsPage({ profile }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const completeness = computeCompleteness(profile);

  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Configurações
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Sua{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            conta
          </span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Ajuste seus dados de perfil, conta e notificações.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <nav className="flex flex-col gap-1" aria-label="Seções">
            <TabItem
              icon={<UserCircle className="size-4" />}
              label="Perfil"
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
            />
            <TabItem
              icon={<Lock className="size-4" />}
              label="Conta"
              active={activeTab === "account"}
              onClick={() => setActiveTab("account")}
            />
            <TabItem
              icon={<Bell className="size-4" />}
              label="Notificações"
              comingSoon
            />
          </nav>
        </aside>

        <section className="flex flex-col gap-6">
          {activeTab === "profile" && (
            <>
              <CompletenessBar percent={completeness} />
              <ProfileForm profile={profile} />
            </>
          )}
          {activeTab === "account" && <AccountForm userEmail={profile.email} />}
        </section>
      </div>
    </div>
  );
}

function TabItem({
  icon,
  label,
  active,
  comingSoon,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
    active && "bg-gray-100 font-medium text-ink",
    !active && !comingSoon && "text-gray-500 hover:bg-gray-50 hover:text-ink",
    comingSoon && "cursor-not-allowed text-gray-400",
  );

  const content = (
    <>
      <span className={cn(active ? "text-ink" : "text-gray-400")}>{icon}</span>
      <span className="flex-1">{label}</span>
      {comingSoon && (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-brand-primary">
          <Sparkles className="size-2.5" />
          Em breve
        </span>
      )}
    </>
  );

  if (comingSoon) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </button>
  );
}
