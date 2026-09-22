import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Wrench,
  Clock3,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Settings,
  LogOut,
  Mic,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Interviews",
      path: "/interviews",
      icon: MessageSquare,
    },
    {
      name: "Practice",
      path: "/practice",
      icon: Wrench,
    },
    {
      name: "History",
      path: "/history",
      icon: Clock3,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Resources",
      path: "/resources",
      icon: BookOpen,
    },
    {
      name: "Mock Tests",
      path: "/mock-tests",
      icon: ClipboardCheck,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <aside className="sidebar">

      {/* LOGO */}
      <div className="sidebar-logo">
        <Mic size={25} />
        <span>AI Interviewer</span>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}

        {/* LOGOUT BELOW SETTINGS */}
        <button
          className="sidebar-nav-item sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>

      </nav>

      {/* PROFILE AT BOTTOM RIGHT */}
      <div className="sidebar-bottom">
        <div
          className="sidebar-profile"
          onClick={() => navigate("/profile")}
        >
          <img
            src="/profile.jpg"
            alt="Profile"
            className="sidebar-profile-image"
          />

          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              John Doe
            </span>

            <span className="sidebar-profile-link">
              View Profile
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;