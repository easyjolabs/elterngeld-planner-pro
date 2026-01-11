import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Calendar, MessageCircle, FileText } from "lucide-react";

// Color constants from design system
const colors = {
  background: "#F9F8F4",
  tile: "#F0EEE6",
  tileHover: "#EAE6DD",
  text: "#57534E",
  textDark: "#000000",
  border: "#E7E5E4",
  white: "#FFFFFF",
  basis: "#C0630B",
  plus: "#FC631B",
  bonus: "#FFBDF0",
  success: "#1AB689",
};

interface TeaserCardProps {
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
  onClick: () => void;
  accentColor: string;
}

const TeaserCard: React.FC<TeaserCardProps> = ({
  title,
  description,
  gradientFrom,
  gradientTo,
  icon,
  onClick,
  accentColor,
}) => {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col text-left rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{
        backgroundColor: colors.white,
        boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Illustration Placeholder - Gradient Area */}
      <div
        className="relative h-48 w-full flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        }}
      >
        {/* Decorative geometric shapes */}
        <div
          className="absolute top-4 right-4 w-16 h-16 rounded-full opacity-30"
          style={{ backgroundColor: colors.white }}
        />
        <div
          className="absolute bottom-8 left-8 w-24 h-24 rounded-lg rotate-12 opacity-20"
          style={{ backgroundColor: colors.white }}
        />
        <div
          className="absolute top-12 left-12 w-8 h-8 rounded-sm rotate-45 opacity-40"
          style={{ backgroundColor: colors.white }}
        />

        {/* Icon */}
        <div
          className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
        >
          {icon}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold" style={{ color: colors.textDark }}>
            {title}
          </h3>
          <ArrowRight
            size={18}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ color: accentColor }}
          />
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: colors.text }}>
          {description}
        </p>
      </div>
    </button>
  );
};

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/chat");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit(e);
    }
  };

  const teasers = [
    {
      title: "Plan your Elterngeld",
      description: "Calculate your benefit and plan your months with our interactive guide.",
      gradientFrom: "#C0630B",
      gradientTo: "#FC631B",
      accentColor: colors.basis,
      icon: <Calendar size={36} strokeWidth={1.5} color={colors.basis} />,
      onClick: () => navigate("/guide"),
    },
    {
      title: "Ask the Expert",
      description: "Get instant answers to your Elterngeld questions from our AI assistant.",
      gradientFrom: "#FFBDF0",
      gradientTo: "#FFD4F5",
      accentColor: "#D946A0",
      icon: <MessageCircle size={36} strokeWidth={1.5} color="#D946A0" />,
      onClick: () => navigate("/chat"),
    },
    {
      title: "Fill your Application",
      description: "Complete the official 23-page form step by step with guidance.",
      gradientFrom: "#1AB689",
      gradientTo: "#34D9A8",
      accentColor: colors.success,
      icon: <FileText size={36} strokeWidth={1.5} color={colors.success} />,
      onClick: () => navigate("/application"),
    },
  ];

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: colors.background }}>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-[32px] md:text-[42px] font-bold mb-4 leading-tight" style={{ color: colors.textDark }}>
            How can we help with your
            <br />
            Elterngeld?
          </h1>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="mb-16">
          <div
            className="relative flex items-center rounded-full overflow-hidden transition-shadow duration-200 focus-within:shadow-md"
            style={{
              backgroundColor: colors.white,
              boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
              border: `1px solid ${colors.border}`,
            }}
          >
            <Search size={20} className="absolute left-5" style={{ color: colors.text }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Ask anything about Elterngeld..."
              className="w-full py-4 pl-14 pr-14 text-[15px] outline-none"
              style={{
                backgroundColor: "transparent",
                color: colors.textDark,
              }}
            />
            <button
              type="submit"
              className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{
                backgroundColor: searchQuery.trim() ? colors.basis : colors.tile,
              }}
            >
              <ArrowRight size={18} color={searchQuery.trim() ? colors.white : colors.text} />
            </button>
          </div>
        </form>

        {/* Teaser Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teasers.map((teaser, index) => (
            <TeaserCard
              key={index}
              title={teaser.title}
              description={teaser.description}
              gradientFrom={teaser.gradientFrom}
              gradientTo={teaser.gradientTo}
              icon={teaser.icon}
              onClick={teaser.onClick}
              accentColor={teaser.accentColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
