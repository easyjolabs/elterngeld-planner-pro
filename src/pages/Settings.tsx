import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LoginModal from "@/components/LoginModal";

// ===========================================
// DESIGN TOKENS (matching Guide)
// ===========================================
const colors = {
  background: "#F4F4ED",
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
  email: string | null;
  email_consent: boolean;
}

interface UserPlan {
  id: string;
  plan_data: unknown;
  user_data: unknown;
  selected_state: string | null;
  updated_at: string | null;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ===========================================
// MAIN COMPONENT
// ===========================================
const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<"general" | "plan">("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Profile State
  const [emailConsent, setEmailConsent] = useState(false);
  const [originalEmailConsent, setOriginalEmailConsent] = useState(false);

  // Plan State
  const [plan, setPlan] = useState<UserPlan | null>(null);

  // Load user data on mount
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (user) {
      loadUserData();
    } else {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const loadUserData = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, email_consent")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setEmailConsent(profile.email_consent || false);
        setOriginalEmailConsent(profile.email_consent || false);
      }

      // Load plan
      const { data: planData } = await supabase
        .from("user_plans")
        .select("id, plan_data, user_data, selected_state, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (planData) {
        setPlan(planData);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = emailConsent !== originalEmailConsent;

  const handleSave = async () => {
    if (!user || !hasChanges) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email_consent: emailConsent,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setOriginalEmailConsent(emailConsent);
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
      await supabase.from("profiles").delete().eq("user_id", user.id);

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
    if (plan) {
      // Extract user data
      const userData = (plan.user_data || {}) as Record<string, unknown>;

      // Create a session that the Guide can restore from
      // This puts user directly at the planner step with their saved data
      const sessionData = {
        // Chat state - set to show planner
        step: 99, // High number to prevent auto-advance
        messages: [
          { type: "bot", content: "Welcome back! Here's your saved Elterngeld plan." },
          { type: "component", component: "planner" },
        ],
        stepHistory: [],
        showInput: { type: "component", component: "continue", pauseLabel: "Continue to application →" },
        isPaused: true,
        isRestoredSession: true,

        // User data from Supabase
        data: userData,
        sliderValue: (userData.income as number) || 3000, // Default if not saved
        partnerSliderValue: (userData.partnerIncome as number) || 2500,

        // Planner state from Supabase
        plannerData: plan.plan_data || Array.from({ length: 32 }, () => ({ you: "none", partner: "none" })),
        plannerMonths: 32,
        selectedState: plan.selected_state || "",

        // Part-time work state (defaults)
        workPartTime: false,
        partTimeIncome: 0,
        partnerPartTimeIncome: 0,

        // UI state
        lastUserMessageIndex: -1,
        ctaStep: 1,
        timestamp: Date.now(),
      };

      localStorage.setItem("elterngeld_pending_session", JSON.stringify(sessionData));
    }

    // Navigate to guide - it will restore from localStorage
    navigate("/guide");
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "plan" as const,
      label: "My Plan",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
    },
  ];

  const hasPlan = plan !== null;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in - show sign in prompt
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.background }}>
        {/* Login Modal */}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

        {/* Header */}
        <div className="flex-shrink-0" style={{ backgroundColor: colors.background }}>
          <div className="px-5 py-3">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button
                onClick={handleBack}
                className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60"
                title="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke={colors.textDark} strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-base font-semibold" style={{ color: colors.textDark }}>
                Settings
              </h1>
              <div className="w-8" />
            </div>
          </div>
          <div className="h-px w-full" style={{ backgroundColor: colors.border }}></div>
        </div>

        {/* Sign in prompt */}
        <div className="flex-1 flex items-center justify-center p-5">
          <div className="text-center max-w-sm">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: colors.tile }}
            >
              <svg className="w-8 h-8" fill="none" stroke={colors.text} strokeWidth={1.5} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: colors.textDark }}>
              Sign in to access settings
            </h2>
            <p className="text-sm mb-6" style={{ color: colors.text }}>
              Create an account or sign in to manage your profile and saved plans.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: colors.buttonDark, color: colors.white }}
            >
              Sign in
            </button>
          </div>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
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

                      {/* Email Consent */}
                      <div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailConsent}
                            onChange={(e) => setEmailConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded"
                            style={{ accentColor: colors.buttonDark }}
                          />
                          <div>
                            <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                              Email updates
                            </span>
                            <p className="text-xs mt-0.5" style={{ color: colors.text }}>
                              Receive helpful tips about Elterngeld and important reminders.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Logout Section */}
                  <section className="pt-6" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <button
                      onClick={() => signOut()}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: colors.white,
                        color: colors.textDark,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      Log out
                    </button>
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                          />
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
                          <h3 className="font-medium" style={{ color: colors.textDark }}>
                            Saved Plan
                          </h3>
                          {plan.updated_at && (
                            <span className="text-xs" style={{ color: colors.text }}>
                              Updated {formatDate(plan.updated_at)}
                            </span>
                          )}
                        </div>

                        <p className="text-sm" style={{ color: colors.text }}>
                          You have a saved Elterngeld plan. Continue editing or start a new calculation.
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={handleEditPlan}
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                          style={{ backgroundColor: colors.buttonDark, color: colors.white }}
                        >
                          Continue Planning
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
