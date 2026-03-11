import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import {
    Users,
    Building,
    GitPullRequest,
    Calendar,
    Code2,
    FolderDot,
} from 'lucide-react';
import ContributionChart from '../components/ContributionChart';
import userConfig from '../../userConfig';

// Markdown utilities imported normally for stability

const MarkdownLoader = () => (
    <div className="flex items-center gap-3 text-sm text-github-text-secondary py-10 justify-center">
        <div className="w-5 h-5 border-2 border-github-text-secondary/30 border-t-github-text-secondary rounded-full animate-spin" />
        Loading markdown...
    </div>
);

// --- Scrolling marquee wrapper ---
const Marquee = ({ children, speed = 30 }) => {
    // If few children, repeat them to ensure seamless overflow
    const items = Array.isArray(children) ? children : [children];
    const repeated = items.length < 10 ? [...items, ...items, ...items] : items;

    return (
        <div className="overflow-hidden relative w-full group">
            <div
                className="flex w-fit animate-marquee hover:pause-marquee"
                style={{ animationDuration: `${speed}s` }}
            >
                <div className="flex gap-4 px-2 items-center">
                    {repeated}
                </div>
                <div className="flex gap-4 px-2 items-center">
                    {repeated}
                </div>
            </div>
        </div>
    );
};

const HomePage = ({ data, username, token, contributionData }) => {
    const [readme, setReadme] = useState('');
    const [readmeLoading, setReadmeLoading] = useState(true);

    // Fetch user README from username/username repo
    useEffect(() => {
        const fetchReadme = async () => {
            setReadmeLoading(true);
            try {
                const res = await fetch(`https://api.github.com/repos/${username}/${username}/readme`, {
                    headers: { Authorization: `bearer ${token}`, Accept: 'application/vnd.github.v3.raw' },
                });
                if (res.ok) {
                    const text = await res.text();
                    setReadme(text);
                } else {
                    setReadme('');
                }
            } catch {
                setReadme('');
            } finally {
                setReadmeLoading(false);
            }
        };
        if (username && token) fetchReadme();
    }, [username, token]);

    // Extract unique organizations from contributions
    const contributionDetails = useMemo(() => {
        if (!data) return { orgs: [], repos: [] };
        const orgsSet = new Set();
        const reposSet = new Set();
        const allNodes = [
            ...(data.pullRequests?.nodes || []),
            ...(data.issues?.nodes || []),
            ...(data.repositoryDiscussions?.nodes || []),
        ];

        allNodes.forEach((n) => {
            const parts = n.repository.nameWithOwner.split('/');
            const owner = parts[0];
            if (owner.toLowerCase() !== username.toLowerCase()) {
                orgsSet.add(owner);
            }
            reposSet.add(n.repository.nameWithOwner);
        });

        return {
            orgs: Array.from(orgsSet),
            repos: Array.from(reposSet)
        };
    }, [data, username]);

    // Extract unique languages with colors
    const languages = useMemo(() => {
        if (!data) return [];
        const langMap = {};
        const allNodes = [
            ...(data.pullRequests?.nodes || []),
            ...(data.issues?.nodes || []),
            ...(data.repositoryDiscussions?.nodes || []),
        ];
        allNodes.forEach((n) => {
            const lang = n.repository.primaryLanguage;
            if (lang && !langMap[lang.name]) {
                langMap[lang.name] = lang.color || '#8b949e';
            }
        });
        return Object.entries(langMap).map(([name, color]) => ({ name, color }));
    }, [data]);

    // Stats
    const totalPRs = data?.pullRequests?.nodes?.length || 0;
    const mergedPRs = data?.pullRequests?.nodes?.filter((n) => n.state === 'MERGED').length || 0;

    return (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-[296px_1fr] gap-8">
                {/* ─── LEFT SIDEBAR ────────────────────────────────────────────────── */}
                <aside className="flex flex-col gap-4">
                    {/* Avatar */}
                    <div className="relative group">
                        <img
                            src={data.avatarUrl}
                            alt={data.name}
                            className="w-full aspect-square rounded-full border border-github-border z-10 relative"
                        />
                        <div className="absolute right-0 bottom-6 w-10 h-10 bg-github-bg border border-github-border rounded-full flex items-center justify-center text-lg shadow-md z-20 group-hover:scale-110 transition-transform">
                            🔥
                        </div>
                    </div>

                    {/* Name / Username */}
                    <div className="py-1">
                        <h1 className="github-name font-bold text-github-text tracking-tight">
                            {data.name || username}
                        </h1>
                        <p className="github-username text-github-text-secondary leading-6">{username}</p>
                    </div>

                    {/* Bio */}
                    {data.bio && (
                        <p className="text-base text-github-text py-1 leading-snug">{data.bio}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full">
                        <button className="flex-1 h-8 flex items-center justify-center text-xs font-semibold bg-github-bg-secondary border border-github-border rounded-md hover:bg-github-border/60 transition-all text-github-text">
                            Follow
                        </button>
                        <a
                            href={userConfig.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-brand-action text-white text-xs font-bold rounded-md hover:brightness-110 transition-all shadow-md shadow-brand-action/20"
                        >
                            <Calendar size={14} />
                            Book Meeting
                        </a>
                    </div>

                    {/* Followers / Following */}
                    <div className="flex items-center gap-1 text-sm text-github-text-secondary hover:text-github-text-link cursor-pointer pt-1">
                        <Users size={16} className="text-github-text-secondary mr-1" />
                        <span className="font-bold text-github-text">{data.followers?.totalCount ?? '0'}</span>
                        <span className="text-github-text-secondary">followers</span>
                        <span className="mx-1 text-github-text-secondary">·</span>
                        <span className="font-bold text-github-text">{data.following?.totalCount ?? '0'}</span>
                        <span className="text-github-text-secondary">following</span>
                    </div>

                    {/* Company & Socials */}
                    <div className="pt-2 mt-0.5 border-t border-github-border/40 flex flex-col gap-1.5">
                        {data.company && (
                            <div className="flex items-center gap-2 text-sm text-github-text">
                                <Building size={16} className="text-github-text-secondary shrink-0" />
                                <span className="font-medium">{data.company}</span>
                            </div>
                        )}

                        {/* Social Logos - Inline SVG for performance */}
                        <div className="flex items-center gap-4 py-1">
                            {/* GitHub - Official Silhouette */}
                            <a href={userConfig.github} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                            {/* LinkedIn - Official Blue Rounded Square */}
                            <a href={userConfig.linkedin} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                    <rect width="24" height="24" rx="4" fill="#0A66C2" />
                                    <path d="M8 19V9H5v10h3zM6.5 7.732c1.016 0 1.842-.827 1.842-1.842A1.842 1.842 0 1 0 4.658 5.89c0 1.015.826 1.842 1.842 1.842zM19 19v-5.399c0-2.895-1.545-4.242-3.605-4.242-1.662 0-2.396.914-2.822 1.555V9h-3.04c.04 1 0 10 0 10h3.04v-5.392c0-.288.02-.577.106-.785.232-.576.758-1.173 1.644-1.173 1.159 0 1.621.884 1.621 2.181V19H19z" fill="white" />
                                </svg>
                            </a>
                            {/* Gmail - Official Detailed Envelope */}
                            <a href={`mailto:${userConfig.email}`} className="hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                    <path d="M22.5 3H1.5C.675 3 0 3.675 0 4.5v15c0 .825.675 1.5 1.5 1.5h21c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5z" fill="#EA4335" />
                                    <path d="M24 4.5v15c0 .825-.675 1.5-1.5 1.5H21V7.125L12 12.75l-9-5.625V21H1.5c-.825 0-1.5-.675-1.5-1.5v-15C0 3.675.675 3 1.5 3H3l9 5.625L21 3h1.5C23.325 3 24 3.675 24 4.5z" fill="#EA4335" />
                                    <path d="M21 7.125V21H3V7.125L12 12.75l9-5.625z" fill="#F2F2F2" />
                                    <path d="M21 7.125L12 12.75V21h9V7.125z" fill="#E0E0E0" />
                                    <path d="M21 3.375L12 9 3 3.375V4.5l9 5.625L21 4.5v-1.125z" fill="#C5221F" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </aside>

                {/* ─── RIGHT MAIN CONTENT ──────────────────────────────────────────── */}
                <main className="flex flex-col min-w-0">


                    <div className="flex flex-col gap-8">
                        {/* README Card */}
                        <div className="rounded-lg border border-github-border overflow-hidden bg-transparent shadow-sm mb-8">
                            <div className="flex items-center justify-between px-4 py-3 bg-transparent border-b border-github-border">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-github-text">{username}</span>
                                    <span className="text-sm text-github-text-secondary">/ README.md</span>
                                </div>
                                <a
                                    href={`https://github.com/${username}/${username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-github-text-secondary hover:text-github-text-link transition-colors"
                                    title="View Source"
                                >
                                    <GitPullRequest size={14} />
                                </a>
                            </div>
                            <div className="p-6 markdown-body">
                                {readmeLoading ? (
                                    <div className="flex items-center gap-3 text-sm text-github-text-secondary py-10 justify-center">
                                        <div className="w-5 h-5 border-2 border-github-text-secondary/30 border-t-github-text-secondary rounded-full animate-spin" />
                                        Loading rich profile...
                                    </div>
                                ) : readme ? (
                                    <div className="prose prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                            {String(readme || '')}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-sm text-github-text-secondary italic py-6 text-center">
                                        No special README found for this profile.
                                    </p>
                                )}
                            </div>
                        </div>




                        {/* ─── CIRCULAR MARQUEE SECTIONS ──────────────────────────────────── */}
                        <div className="grid grid-cols-1 gap-6">
                            {/* Organizations */}
                            {contributionDetails.orgs.length > 0 && (
                                <div className="rounded-lg border border-github-border p-4 bg-github-bg-secondary/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-github-text flex items-center gap-2">
                                            <Building size={16} className="text-github-text-secondary" />
                                            Collaborating Organizations
                                        </h3>
                                        <span className="text-[10px] font-bold text-github-text-secondary uppercase tracking-widest bg-github-bg px-2 py-0.5 rounded border border-github-border">
                                            Total : {contributionDetails.orgs.length}
                                        </span>
                                    </div>
                                    <Marquee speed={40}>
                                        {contributionDetails.orgs.map((org) => (
                                            <a
                                                key={org}
                                                href={`https://github.com/${org}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-github-bg border border-github-border rounded-full text-sm text-github-text hover:border-github-text-link transition-all shrink-0"
                                            >
                                                <img src={`https://github.com/${org}.png?size=32`} alt={org} className="w-6 h-6 rounded-sm" loading="lazy" decoding="async" />
                                                <span className="font-medium">{org}</span>
                                            </a>
                                        ))}
                                    </Marquee>
                                </div>
                            )}

                            {/* Repositories & Languages */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="rounded-lg border border-github-border p-4 bg-github-bg-secondary/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-github-text flex items-center gap-2">
                                            <FolderDot size={16} className="text-github-text-secondary" />
                                            Contribution Repos
                                        </h3>
                                        <span className="text-[10px] font-bold text-github-text-secondary uppercase tracking-widest bg-github-bg px-2 py-0.5 rounded border border-github-border">
                                            Total : {contributionDetails.repos.length}
                                        </span>
                                    </div>
                                    <Marquee speed={50}>
                                        {contributionDetails.repos.map((repo) => (
                                            <span key={repo} className="px-3 py-1.5 bg-github-bg border border-github-border rounded-md text-xs font-mono text-github-text-secondary shrink-0">
                                                {repo.split('/')[1]}
                                            </span>
                                        ))}
                                    </Marquee>
                                </div>
                                <div className="rounded-lg border border-github-border p-4 bg-github-bg-secondary/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-github-text flex items-center gap-2">
                                            <Code2 size={16} className="text-github-text-secondary" />
                                            Stack & Languages
                                        </h3>
                                        <span className="text-[10px] font-bold text-github-text-secondary uppercase tracking-widest bg-github-bg px-2 py-0.5 rounded border border-github-border">
                                            Total : {languages.length}
                                        </span>
                                    </div>
                                    <Marquee speed={35}>
                                        {languages.map((lang) => (
                                            <span
                                                key={lang.name}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-github-bg border border-github-border rounded-md text-sm text-github-text shrink-0"
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
                                                {lang.name}
                                            </span>
                                        ))}
                                    </Marquee>
                                </div>
                            </div>
                        </div>

                        {/* Contribution Chart */}
                        {contributionData && (
                            <div className="pt-4 border-t border-github-border">
                                <h3 className="text-sm font-semibold text-github-text mb-4">Contribution Activity</h3>
                                <ContributionChart contributionData={contributionData} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HomePage;
