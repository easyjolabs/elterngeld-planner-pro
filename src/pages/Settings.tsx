import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ===========================================
// DESIGN TOKENS (matching Guide)
// ===========================================
const colors = {
  background: "#F9F8F4",
  tile: "#F0EEE6",
  tileHover: "#EAE6DD",
  text: "#57534E",
  textDark: "#000000",
  border: "#E7E5E4",
  white: "#FFFFFF",
  buttonDark: "#3D3D3A",
  basis: "#C0630B",
  plus: "#FC631B",
  bonus: "#FFBDF0",
};

// ===========================================
// TYPES
// ===========================================
interface UserProfile {
  first_name: string;
  last_name: string;
  language: "en" | "de";
}

interface PlanData {
  id: string;
  due_date: string | null;
  application_type: "single" | "couple" | null;
  your_income: number | null;
  partner_income: number | null;
  planner_data: Record<string, "basis" | "plus" | "bonus"> | null;
  total_amount: number | null;
  updated_at: string;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatCurrency = (amount: number | null): string => {
  if (!amount) return "—";
  return `€${amount.toLocaleString("de-DE")}`;
};

const countMonths = (
  plannerData: Record<string, "basis" | "plus" | "bonus"> | null,
  type?: "basis" | "plus" | "bonus",
  person?: "you" | "partner"
): number => {
  if (!plannerData) return 0;
  return Object.entries(plannerData).filter(([key, value]) => {
    const matchesType = type ? value === type : true;
    const matchesPerson = person ? key.startsWith(person) : true;
    return matchesType && matchesPerson;
  }).length;
};

// ===========================================
// MAIN COMPONENT
// ===========================================
const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<"general" | "plan">("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [language, setLanguage] = useState<"en" | "de">("en");
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);

  // Plan State
  const [plan, setPlan] = useState<PlanData | null>(null);

  // Load user data on mount
  useEffect(() => {
    if (!user) {
      navigate("/guide");
      return;
    }

    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, language")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setLanguage(profile.language || "en");
        setOriginalProfile({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          language: profile.language || "en",
        });
      }

      // Load plan
      const { data: planData } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (planData) {
        setPlan(planData as PlanData);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = originalProfile && (
    firstName !== originalProfile.first_name ||
    lastName !== originalProfile.last_name ||
    language !== originalProfile.language
  );

  const handleSave = async () => {
    if (!user || !hasChanges) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          language: language,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setOriginalProfile({
        first_name: firstName,
        last_name: lastName,
        language: language,
      });
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);

    try {
      // Delete user data (profiles and plans will cascade or be deleted by RLS)
      await supabase.from("user_plans").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);

      // Sign out
      await signOut();

      // Redirect to home
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditPlan = () => {
    navigate("/guide?step=plan");
  };

  const handleStartGuide = () => {
    navigate("/guide");
  };

  const tabs = [
    {
      id: "general" as const,
      label: "General",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "plan" as const,
      label: "My Plan",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
  ];

  const hasPlan = plan && (plan.due_date || plan.planner_data);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="flex-shrink-0" style={{ backgroundColor: colors.background }}>
        <div className="px-5 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60"
              title="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title */}
            <h1 className="text-base font-semibold" style={{ color: colors.textDark }}>
              Settings
            </h1>

            {/* Placeholder for symmetry */}
            <div className="w-8" />
          </div>
        </div>

        {/* Header Divider */}
        <div className="h-px w-full" style={{ backgroundColor: colors.border }}></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6">
          {/* Mobile Tabs */}
          <div className="flex gap-1 mb-6 md:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: activeTab === tab.id ? colors.tile : "transparent",
                  color: activeTab === tab.id ? colors.textDark : colors.text,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Layout: Sidebar + Content */}
          <div className="flex gap-8">
            {/* Sidebar - Hidden on mobile */}
            <div className="hidden md:block w-36 shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: activeTab === tab.id ? colors.tile : "transparent",
                      color: activeTab === tab.id ? colors.textDark : colors.text,
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {activeTab === "general" && (
                <div className="space-y-8">
                  {/* Profile Section */}
                  <section>
                    {/* Section Header with Save Button */}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold" style={{ color: colors.textDark }}>
                        Profile
                      </h2>
                      {hasChanges && (
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: colors.buttonDark,
                            color: colors.white,
                            opacity: isSaving ? 0.7 : 1,
                          }}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Email (read-only) */}
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: colors.text }}>
                          Email
                        </label>
                        <div
                          className="w-full px-4 py-3 rounded-xl text-sm"
                          style={{
                            backgroundColor: colors.tile,
                            color: colors.text,
                          }}
                        >
                          {user?.email || "—"}
                        </div>
                      </div>

                      {/* First Name */}
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: colors.text }}>
                          First name
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{
                            backgroundColor: colors.white,
                            color: colors.textDark,
                            border: `1px solid ${colors.border}`,
                          }}
                          placeholder="First name"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: colors.text }}>
                          Last name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{
                            backgroundColor: colors.white,
                            color: colors.textDark,
                            border: `1px solid ${colors.border}`,
                          }}
                          placeholder="Last name"
                        />
                      </div>

                      {/* Language (disabled) */}
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: colors.text }}>
                          Language
                          <span className="ml-2 text-xs font-normal" style={{ color: colors.text, opacity: 0.6 }}>
                            Coming soon
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            disabled
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-not-allowed opacity-50"
                            style={{
                              backgroundColor: language === "en" ? colors.buttonDark : colors.white,
                              color: language === "en" ? colors.white : colors.textDark,
                              border: `1px solid ${language === "en" ? colors.buttonDark : colors.border}`,
                            }}
                          >
                            English
                          </button>
                          <button
                            disabled
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-not-allowed opacity-50"
                            style={{
                              backgroundColor: language === "de" ? colors.buttonDark : colors.white,
                              color: language === "de" ? colors.white : colors.textDark,
                              border: `1px solid ${language === "de" ? colors.buttonDark : colors.border}`,
                            }}
                          >
                            Deutsch
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Delete Account Section */}
                  <section className="pt-6" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <h2 className="text-base font-semibold mb-2" style={{ color: colors.textDark }}>
                      Delete Account
                    </h2>
                    <p className="text-sm mb-4" style={{ color: colors.text }}>
                      Permanently delete your account and all associated data.
                    </p>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        style={{
                          backgroundColor: colors.white,
                          color: colors.textDark,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        Delete my account
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl" style={{ backgroundColor: colors.tile }}>
                        <p className="text-sm mb-4" style={{ color: colors.textDark }}>
                          Are you sure? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg text-sm font-medium"
                            style={{
                              backgroundColor: colors.white,
                              color: colors.textDark,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg text-sm font-medium"
                            style={{
                              backgroundColor: colors.buttonDark,
                              color: colors.white,
                              opacity: isDeleting ? 0.7 : 1,
                            }}
                          >
                            {isDeleting ? "Deleting..." : "Yes, delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === "plan" && (
                <div>
                  <h2 className="text-base font-semibold mb-4" style={{ color: colors.textDark }}>
                    My Elterngeld Plan
                  </h2>

                  {!hasPlan ? (
                    <div
                      className="text-center py-12 rounded-xl"
                      style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}
                    >
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: colors.tile }}
                      >
                        <svg className="w-7 h-7" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold mb-2" style={{ color: colors.textDark }}>
                        No plan yet
                      </h3>
                      <p className="text-sm mb-6" style={{ color: colors.text }}>
                        Start the guide to create your Elterngeld plan
                      </p>
                      <button
                        onClick={handleStartGuide}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ backgroundColor: colors.buttonDark, color: colors.white }}
                      >
                        Start Guide
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary Card */}
                      <div
                        className="p-5 rounded-xl"
                        style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium" style={{ color: colors.textDark }}>Summary</h3>
                          {plan.updated_at && (
                            <span className="text-xs" style={{ color: colors.text }}>
                              Updated {formatDate(plan.updated_at)}
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm" style={{ color: colors.text }}>Due Date</span>
                            <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                              {formatDate(plan.due_date)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm" style={{ color: colors.text }}>Application Type</span>
                            <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                              {plan.application_type === "couple" ? "Couple" : "Single Parent"}
                            </span>
                          </div>
                          {plan.your_income && (
                            <div className="flex justify-between">
                              <span className="text-sm" style={{ color: colors.text }}>Your Income</span>
                              <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                                {formatCurrency(plan.your_income)}/month
                              </span>
                            </div>
                          )}
                          {plan.application_type === "couple" && plan.partner_income && (
                            <div className="flex justify-between">
                              <span className="text-sm" style={{ color: colors.text }}>Partner's Income</span>
                              <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                                {formatCurrency(plan.partner_income)}/month
                              </span>
                            </div>
                          )}
                          {plan.total_amount && (
                            <div className="flex justify-between pt-3 mt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                              <span className="text-sm font-medium" style={{ color: colors.textDark }}>Total Elterngeld</span>
                              <span className="text-base font-semibold" style={{ color: colors.basis }}>
                                {formatCurrency(plan.total_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Months Breakdown */}
                      {plan.planner_data && Object.keys(plan.planner_data).length > 0 && (
                        <div
                          className="p-5 rounded-xl"
                          style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}
                        >
                          <h3 className="font-medium mb-4" style={{ color: colors.textDark }}>Months Breakdown</h3>

                          <div className="mb-4">
                            <p className="text-xs font-medium mb-2" style={{ color: colors.text }}>You</p>
                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.basis }} />
                                <span className="text-xs" style={{ color: colors.textDark }}>
                                  {countMonths(plan.planner_data, "basis", "you")} Basis
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.plus }} />
                                <span className="text-xs" style={{ color: colors.textDark }}>
                                  {countMonths(plan.planner_data, "plus", "you")} Plus
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.bonus }} />
                                <span className="text-xs" style={{ color: colors.textDark }}>
                                  {countMonths(plan.planner_data, "bonus", "you")} Bonus
                                </span>
                              </div>
                            </div>
                          </div>

                          {plan.application_type === "couple" && (
                            <div>
                              <p className="text-xs font-medium mb-2" style={{ color: colors.text }}>Partner</p>
                              <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.basis }} />
                                  <span className="text-xs" style={{ color: colors.textDark }}>
                                    {countMonths(plan.planner_data, "basis", "partner")} Basis
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.plus }} />
                                  <span className="text-xs" style={{ color: colors.textDark }}>
                                    {countMonths(plan.planner_data, "plus", "partner")} Plus
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.bonus }} />
                                  <span className="text-xs" style={{ color: colors.textDark }}>
                                    {countMonths(plan.planner_data, "bonus", "partner")} Bonus
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={handleEditPlan}
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                          style={{ backgroundColor: colors.buttonDark, color: colors.white }}
                        >
                          Edit Plan
                        </button>
                        <button
                          onClick={handleStartGuide}
                          className="px-6 py-2.5 rounded-xl text-sm font-medium"
                          style={{
                            backgroundColor: colors.white,
                            color: colors.textDark,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          Continue to Application
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
