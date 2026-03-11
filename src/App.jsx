import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import GitMeChat from './components/GitMeChat';
import Footer from './components/Footer';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const PageLoader = () => (
  <div className="min-h-screen bg-github-bg flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-github-text-secondary/30 border-t-github-text-secondary rounded-full animate-spin" />
  </div>
);

const App = () => {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [data, setData] = useState(null);
  const [contributionData, setContributionData] = useState(null);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  // --- Automatic Login ---
  useEffect(() => {
    const autoUsername = import.meta.env.VITE_GITHUB_USERNAME;
    const autoToken = import.meta.env.VITE_GITHUB_TOKEN;

    if (autoUsername && autoToken && !data && !isAutoLoggingIn) {
      setIsAutoLoggingIn(true);
      handleLogin(autoUsername, autoToken)
        .catch((err) => {
          console.error("Auto-login failed:", err);
        })
        .finally(() => {
          setIsAutoLoggingIn(false);
        });
    }
  }, []);



  // --- Fetch contribution calendar for a given year (PARALLEL) ---
  const fetchContributionCalendar = async (ghToken, loginName, years) => {
    const calendars = {};

    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);

    const periods = [
      { id: 'Last Year', from: lastYear.toISOString(), to: today.toISOString() },
      ...years.map(y => ({
        id: y.toString(),
        from: `${y}-01-01T00:00:00Z`,
        to: `${y}-12-31T23:59:59Z`
      }))
    ];

    const fetchPeriod = async (period) => {
      const query = `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                    color
                  }
                }
              }
            }
          }
        }
      `;

      try {
        const response = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: { Authorization: `bearer ${ghToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { login: loginName, from: period.from, to: period.to } }),
        });
        const result = await response.json();
        if (result.data?.user?.contributionsCollection?.contributionCalendar) {
          return { id: period.id, calendar: result.data.user.contributionsCollection.contributionCalendar };
        }
      } catch (err) {
        console.error(`Error fetching calendar for ${period.id}:`, err);
      }
      return null;
    };

    const results = await Promise.all(periods.map(fetchPeriod));
    results.forEach(r => {
      if (r) calendars[r.id] = r.calendar;
    });

    return calendars;
  };

  const handleLogin = async (user, tok) => {
    try {
      setUsername(user);
      setToken(tok);

      const query = `
        query($login: String!) {
          user(login: $login) {
            name
            login
            bio
            avatarUrl
            url
            company
            location
            websiteUrl
            followers { totalCount }
            following { totalCount }
            contributionsCollection {
              contributionYears
            }
            pullRequests(last: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                title url state createdAt
                repository {
                  nameWithOwner
                  primaryLanguage { name color }
                  licenseInfo { name spdxId }
                }
              }
            }
            issues(last: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                title url state createdAt
                repository {
                  nameWithOwner
                  primaryLanguage { name color }
                  licenseInfo { name spdxId }
                }
              }
            }
            repositoryDiscussions(last: 50) {
              nodes {
                title url createdAt
                repository {
                  nameWithOwner
                  primaryLanguage { name color }
                  licenseInfo { name spdxId }
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { login: user } }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);

      const userData = result.data.user;
      if (!userData) throw new Error("User not found");

      setData(userData);

      // Fetch contribution calendars for all years (up to last 5)
      const allYears = userData.contributionsCollection?.contributionYears || [new Date().getFullYear()];
      const yearsToFetch = allYears.slice(0, 5);
      const calendars = await fetchContributionCalendar(tok, user, yearsToFetch);
      setContributionData({ years: yearsToFetch, calendar: calendars });
    } catch (err) {
      console.error("Login error:", err);
      throw err; // Re-throw so LoginPage can catch it
    }
  };

  const handleLogout = () => {
    setData(null);
    setToken('');
    setUsername('');
    setContributionData(null);
  };

  return (
    <BrowserRouter basename="/gitme">
      <div className="min-h-screen bg-github-bg text-github-text flex flex-col">
        {data && (
          <Navbar
            data={data}
            username={username}
            onLogout={handleLogout}
          />
        )}

        <main className="flex-grow">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route
                path="/"
                element={
                  data ? (
                    <Navigate to="/home" replace />
                  ) : (
                    <LoginPage onLogin={handleLogin} autoLoggingIn={isAutoLoggingIn} />
                  )
                }
              />
              <Route
                path="/home"
                element={
                  data ? (
                    <HomePage
                      data={data}
                      username={username}
                      token={token}
                      contributionData={contributionData}
                    />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/profile"
                element={
                  data ? <ProfilePage data={data} /> : <Navigate to="/" replace />
                }
              />
            </Routes>
          </Suspense>
        </main>

        {data && <Footer />}

        {/* Global Floating AI Chatbot */}
        {data && <GitMeChat data={data} />}
      </div>
    </BrowserRouter >
  );
};

export default App;