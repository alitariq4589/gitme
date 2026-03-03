import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import GithubLogo from './GithubLogo';

const Navbar = ({ data, onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    return (
        <nav className="border-b border-github-border bg-github-bg-secondary sticky top-0 z-50">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <NavLink to="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <GithubLogo size={32} className="text-github-text" />
                        <span className="font-bold text-base tracking-tight text-github-text hidden sm:inline">GitMe</span>
                    </NavLink>

                    {data && (
                        <div className="flex items-center gap-1">
                            <NavLink
                                to="/home"
                                className={({ isActive }) =>
                                    `px-3 py-[18px] text-sm font-medium border-b-2 transition-colors ${isActive
                                        ? 'text-github-text border-github-status-closed'
                                        : 'text-github-text-secondary border-transparent hover:text-github-text hover:border-github-border'
                                    }`
                                }
                            >
                                Overview
                            </NavLink>
                            <NavLink
                                to="/profile"
                                className={({ isActive }) =>
                                    `px-3 py-[18px] text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${isActive
                                        ? 'text-github-text border-github-status-closed'
                                        : 'text-github-text-secondary border-transparent hover:text-github-text hover:border-github-border'
                                    }`
                                }
                            >
                                Contributions
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-github-accent-success/20 text-github-accent-success border border-github-accent-success/30 rounded-full leading-none">
                                    New
                                </span>
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">

                    {data && (
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-github-text-secondary border border-github-border rounded-md hover:bg-github-accent-danger/10 hover:text-github-status-closed hover:border-github-accent-danger/50 transition-all"
                        >
                            <LogOut size={14} />
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
