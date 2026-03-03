import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, Sparkles } from 'lucide-react';

const GitMeChat = ({ data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const [showTeaser, setShowTeaser] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isOpen) setShowTeaser(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setShowTeaser(false);
        }
    }, [messages, isOpen]);

    const cleanData = (rawData) => {
        if (!rawData) return '{}';

        // Deep clone to avoid mutations
        const clone = JSON.parse(JSON.stringify(rawData));

        // Remove deep nesting and extra fields to stay within token limits
        if (clone.pullRequests?.nodes) {
            clone.pullRequests = clone.pullRequests.nodes.map(pr => ({
                title: pr.title,
                state: pr.state,
                repository: pr.repository.nameWithOwner,
                createdAt: pr.createdAt
            })).slice(0, 15);
        }

        if (clone.issues?.nodes) {
            clone.issues = clone.issues.nodes.map(issue => ({
                title: issue.title,
                state: issue.state,
                repository: issue.repository.nameWithOwner
            })).slice(0, 10);
        }

        if (clone.repositoryDiscussions?.nodes) {
            clone.discussions = clone.repositoryDiscussions.nodes.map(disc => ({
                title: disc.title,
                repository: disc.repository.nameWithOwner,
                createdAt: disc.createdAt
            })).slice(0, 10);
            delete clone.repositoryDiscussions;
        }

        return JSON.stringify(clone);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage].slice(-10);
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const api_key = import.meta.env.VITE_OPENROUTER_API_KEY;
        const systemPrompt = `You are the GitMe AI. You are analyzing a developer's GitHub activity. Data: ${cleanData(data)}. Your goal is to answer questions like: 'What is their main expertise?', 'How many languages do they know?', or 'Are they good at documentation?'. Keep answers short (2-3 sentences), data-driven, and encouraging.`;

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "GitMe",
                    "Authorization": `Bearer ${api_key?.trim()}`
                },
                body: JSON.stringify({
                    model: "openrouter/auto",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...newMessages
                    ]
                })
            });

            const result = await response.json();
            console.log("OpenRouter Result:", result);

            if (result.error) {
                throw new Error(result.error.message || "API Error");
            }

            const aiResponse = result.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }].slice(-10));
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = error.message.includes("401") || error.message.includes("key")
                ? "Invalid API Key. Please check your .env file."
                : "AI connection failed. Please ensure your VITE_OPENROUTER_API_KEY is correct.";
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }].slice(-10));
        } finally {
            setIsLoading(false);
        }
    };

    if (!data) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            {/* Teaser Popup */}
            {!isOpen && showTeaser && (
                <div className="absolute bottom-16 right-0 mb-2 mr-0 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="relative bg-brand-action text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2">
                        <Sparkles size={14} className="animate-pulse" />
                        <span>Ask me anything about {data.name.split(' ')[0] || 'this developer'}!</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTeaser(false);
                            }}
                            className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        >
                            <X size={12} />
                        </button>
                        {/* Little spike pointing at the button */}
                        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-brand-action rotate-45 border-r border-b border-white/20"></div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    setShowTeaser(false);
                }}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 border-2 border-white/10 ${isOpen ? 'bg-github-status-closed text-white hover:rotate-90' : 'bg-brand-action text-white'
                    }`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-[90vw] max-w-[380px] h-[500px] bg-brand-surface/95 backdrop-blur-md rounded-2xl shadow-2xl border border-brand-ai/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="p-4 border-b border-brand-ai/20 flex items-center gap-3 bg-gradient-to-r from-brand-ai/10 to-transparent">
                        <div className="w-8 h-8 rounded-full bg-brand-action flex items-center justify-center">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                GitMe AI Assistant
                                <Sparkles size={12} className="text-brand-action" />
                            </h3>
                            <p className="text-[10px] text-github-text-secondary">Technical Recruiter Persona</p>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-xs text-github-text-secondary leading-relaxed px-4">
                                    Hello! I've analyzed {data.name || 'this developer'}'s profile. Ask me anything about their technical background or impact.
                                </p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-brand-action text-white rounded-tr-none'
                                        : 'bg-gradient-to-br from-brand-ai/20 to-transparent border border-brand-ai/10 text-github-text rounded-tl-none'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-github-bg-secondary px-4 py-2 rounded-2xl rounded-tl-none border border-github-border flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 bg-github-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-github-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-github-text-secondary rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-brand-ai/20">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={`Ask me anything about ${data.name || 'this developer'}...`}
                                className="w-full bg-github-bg-tertiary border border-github-border rounded-xl px-4 py-2 text-sm text-github-text focus:outline-none focus:border-brand-action transition-colors pr-12"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-action hover:bg-brand-action/10 rounded-lg transition-all disabled:opacity-30"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default GitMeChat;
