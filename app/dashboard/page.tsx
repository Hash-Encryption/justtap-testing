'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Edit3,
  BarChart3,
  Users,
  QrCode,
  ExternalLink,
  LogOut,
  Sparkles,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/lib/types';
import { CardEditor } from '@/components/dashboard/CardEditor';
import { ProFeaturesTab } from '@/components/dashboard/ProFeaturesTab';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { LeadsTab } from '@/components/dashboard/LeadsTab';
import { QrWalletHub } from '@/components/dashboard/QrWalletHub';

export default function DashboardPage() {
  const router = Router();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'pro' | 'analytics' | 'leads' | 'qr'>('editor');
  const [creationMode, setCreationMode] = useState(false);

  useEffect(() => {
    async function loadUserAndCard() {
      setLoading(true);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        // Not authenticated, redirect to login
        router.push('/auth');
        return;
      }

      setUser(currentUser);

      // Query card for user
      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', currentUser.id);

      if (!error && cards && cards.length > 0) {
        setCard(cards[0] as Card);
        setCreationMode(false);
      } else {
        // No card found for this user -> Creation mode
        setCard(null);
        setCreationMode(true);
      }

      setLoading(false);
    }

    loadUserAndCard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleCardSaved = (updatedCard: Card) => {
    setCard(updatedCard);
    setCreationMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Loading JustTap Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* DASHBOARD NAVBAR */}
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-violet-600/30">
                J
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">JustTap</span>
            </Link>
            <span className="hidden sm:inline text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
              Client Portal
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {card?.slug && (
              <Link
                href={`/c/${card.slug}`}
                target="_blank"
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
              >
                <span>View Card</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* NO CARD / CREATION MODE PROMPT */}
        {creationMode ? (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 max-w-2xl mx-auto shadow-2xl">
              <div className="w-14 h-14 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center mx-auto">
                <PlusCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Create Your Digital Business Card</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Fill in your contact details below to activate your JustTap profile card and enable NFC taps & QR sharing.
              </p>
            </div>

            <CardEditor
              card={{ full_name: user?.user_metadata?.full_name || '', email: user?.email }}
              onSaveSuccess={handleCardSaved}
            />
          </div>
        ) : (
          <>
            {/* CARD BANNER SUMMARY */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-violet-500/40 flex items-center justify-center overflow-hidden shrink-0 text-violet-400 font-bold text-lg">
                  {card?.avatar_url ? (
                    <img src={card.avatar_url} alt={card.full_name} className="w-full h-full object-cover" />
                  ) : (
                    card?.full_name?.substring(0, 2).toUpperCase() || 'JT'
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-white">{card?.full_name}</h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        card?.plan === 'pro'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {card?.plan === 'pro' ? 'PRO PLAN' : 'FREE PLAN'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Slug: <code className="text-violet-400">/c/{card?.slug}</code> • Created:{' '}
                    {new Date(card?.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Link
                  href={`/c/${card?.slug}`}
                  target="_blank"
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/25 flex items-center justify-center space-x-1.5 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View My Live Card (/c/{card?.slug})</span>
                </Link>
              </div>
            </div>

            {/* DASHBOARD TABS */}
            <div className="border-b border-slate-800 flex items-center space-x-1 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('editor')}
                className={`py-3 px-5 text-xs font-bold rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'editor'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-4 h-4 text-violet-400" />
                <span>Card Editor</span>
              </button>

              <button
                onClick={() => setActiveTab('pro')}
                className={`py-3 px-5 text-xs font-bold rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'pro'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Special Pro Features ⭐</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-3 px-5 text-xs font-bold rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('leads')}
                className={`py-3 px-5 text-xs font-bold rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'leads'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 text-violet-400" />
                <span>Leads Inbox</span>
              </button>

              <button
                onClick={() => setActiveTab('qr')}
                className={`py-3 px-5 text-xs font-bold rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'qr'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4 text-violet-400" />
                <span>QR Code & Wallet Hub</span>
              </button>
            </div>

            {/* TAB CONTENT VIEWS */}
            <div className="pt-2">
              {activeTab === 'editor' && card && (
                <CardEditor card={card} onSaveSuccess={setCard} />
              )}

              {activeTab === 'pro' && card && (
                <ProFeaturesTab
                  card={card}
                  onChange={(updatedCard) => setCard(updatedCard)}
                  userId={user?.id || ''}
                />
              )}

              {activeTab === 'analytics' && card && <AnalyticsTab cardId={card.id} />}

              {activeTab === 'leads' && card && <LeadsTab cardId={card.id} />}

              {activeTab === 'qr' && card && (
                <QrWalletHub
                  card={card}
                  onUpgradeRequest={() => {
                    // Update local card plan simulation for user
                    setCard({ ...card, plan: 'pro' });
                    setActiveTab('pro');
                  }}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Custom hook helper for useRouter inside component
function Router() {
  return useRouter();
}
