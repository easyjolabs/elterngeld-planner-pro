import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Calendar, MessageCircle, FileText } from "lucide-react";

// Color constants from design system (matching Guide)
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
  success: "#1AB689",
};

interface TeaserCardProps {
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const TeaserCard: React.FC<TeaserCardProps> = ({ title, description, gradientFrom, gradientTo, icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col text-left rounded-xl overflow-hidden"
      style={{
        backgroundColor: colors.white,
        boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Illustration Placeholder - Gradient Area */}
      <div className="relative h-36 w-full flex items-center justify-center overflow-hidden">
        {/* Background that scales on hover */}
        <div
          className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          }}
        />

        {/* Decorative geometric shapes */}
        <div
          className="absolute top-3 right-3 w-12 h-12 rounded-full opacity-30 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: colors.white }}
        />
        <div
          className="absolute bottom-6 left-6 w-16 h-16 rounded-lg rotate-12 opacity-20 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: colors.white }}
        />
        <div
          className="absolute top-8 left-8 w-5 h-5 rounded-sm rotate-45 opacity-40 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: colors.white }}
        />

        {/* Icon */}
        <div
          className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
        >
          {icon}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold" style={{ color: colors.textDark }}>
            {title}
          </h3>
          <ArrowRight
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ color: colors.textDark }}
          />
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: colors.text }}>
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
      gradientFrom: "#FC631B",
      gradientTo: "#FF8A5B",
      icon: <Calendar size={28} strokeWidth={1.5} color={colors.textDark} />,
      onClick: () => navigate("/guide"),
    },
    {
      title: "Ask the Expert",
      description: "Get instant answers to your Elterngeld questions from our AI assistant.",
      gradientFrom: "#C9B8A8",
      gradientTo: "#D8CABA",
      icon: <MessageCircle size={28} strokeWidth={1.5} color={colors.textDark} />,
      onClick: () => navigate("/chat"),
    },
    {
      title: "Fill your Application",
      description: "Complete the official 23-page form step by step with guidance.",
      gradientFrom: "#F2F53A",
      gradientTo: "#F7F871",
      icon: <FileText size={28} strokeWidth={1.5} color={colors.textDark} />,
      onClick: () => navigate("/application"),
    },
  ];

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: colors.background }}>
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-bold mb-2 leading-tight" style={{ color: colors.textDark }}>
            How can we help with your Elterngeld?
          </h1>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="mb-10">
          <div
            className="relative flex items-center rounded-xl overflow-hidden transition-shadow duration-200 focus-within:shadow-md"
            style={{
              backgroundColor: colors.white,
              boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
              border: `1.5px solid ${colors.border}`,
            }}
          >
            <Search size={18} className="absolute left-4" style={{ color: colors.text }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Ask anything about Elterngeld..."
              className="w-full py-3 pl-11 pr-12 text-[14px] outline-none"
              style={{
                backgroundColor: "transparent",
                color: colors.textDark,
              }}
            />
            <button
              type="submit"
              className="absolute right-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
              style={{
                backgroundColor: searchQuery.trim() ? colors.buttonDark : colors.tile,
              }}
            >
              <ArrowRight size={16} color={searchQuery.trim() ? colors.white : colors.text} />
            </button>
          </div>
        </form>

        {/* Teaser Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teasers.map((teaser, index) => (
            <TeaserCard
              key={index}
              title={teaser.title}
              description={teaser.description}
              gradientFrom={teaser.gradientFrom}
              gradientTo={teaser.gradientTo}
              icon={teaser.icon}
              onClick={teaser.onClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
