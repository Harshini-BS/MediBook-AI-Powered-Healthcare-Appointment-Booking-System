import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Menu,
  X,
  Calendar,
  LayoutDashboard,
  Search,
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <div className="navbar__logo">
            <Activity size={20} strokeWidth={2.5} />
          </div>

          <span className="navbar__name">
            Medi<span>Book</span>
          </span>
        </Link>

        <div
          className={`navbar__links ${
            menuOpen ? 'navbar__links--open' : ''
          }`}
        >
          <Link
            to="/"
            className={`navbar__link ${
              isActive('/') ? 'navbar__link--active' : ''
            }`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <Link
            to="/book"
            className={`navbar__link ${
              isActive('/book') ? 'navbar__link--active' : ''
            }`}
          >
            <Calendar size={16} />
            Book Appointment
          </Link>

          <Link
            to="/track"
            className={`navbar__link ${
              isActive('/track') ? 'navbar__link--active' : ''
            }`}
          >
            <Search size={16} />
            Track Appointment
          </Link>
        </div>

        <Link to="/book" className="navbar__cta">
          Book Now
        </Link>

        <button
          className="navbar__hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;