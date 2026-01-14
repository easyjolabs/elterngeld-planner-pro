import React from "react";

// ===========================================
// DESIGN TOKENS (matching Guide)
// ===========================================
const colors = {
  background: "#F4F4ED",
  tile: "#F0EEE6",
  text: "#57534E",
  textDark: "#000000",
  border: "#E7E5E4",
  white: "#FFFFFF",
  error: "#E07B3C",
};

// ===========================================
// TYPES
// ===========================================
interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
  };
  onNavigate: (route: "settings") => void;
  onLogout: () => void;
}

// ===========================================
// MAIN COMPONENT
// ===========================================
const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onClose, user, onNavigate, onLogout }) => {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: "settings",
      label: "Settings",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Invisible overlay - closes dropdown on click outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div
        className="absolute bottom-full left-0 mb-2 w-56 rounded-xl shadow-lg overflow-hidden z-50"
        style={{
          backgroundColor: colors.white,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* User Info */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <p className="text-[14px] font-medium truncate" style={{ color: colors.textDark }}>
            {user.name}
          </p>
          <p className="text-[12px] truncate" style={{ color: colors.text }}>
            {user.email}
          </p>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id as "settings");
                onClose();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 transition-all hover:bg-opacity-50"
              style={{ color: colors.textDark }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.tile)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ color: colors.text }}>{item.icon}</span>
              <span className="text-[14px]">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div style={{ borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center gap-3 transition-all"
            style={{ color: colors.text }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.tile)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
            <span className="text-[14px]">Log out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserDropdown;
