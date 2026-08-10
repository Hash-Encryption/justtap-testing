'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Crown,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/lib/types';

export default function AdminPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSlugId, setEditingSlugId] = useState<string | null>(null);
  const [newSlugVal, setNewSlugVal] = useState('');

  const fetchAdminCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards((data as Card[]) || []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminCards();
  }, []);

  const handleTogglePlan = async (cardId: string, currentPlan: string) => {
    const nextPlan = currentPlan === 'pro' ? 'free' : 'pro';
    try {
      const { error } = await supabase
        .from('cards')
        .update({ plan: nextPlan })
        .eq('id', cardId);

      if (error) throw error;
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, plan: nextPlan } : c))
      );
    } catch (err) {
      console.error('Plan toggle error:', err);
    }
  };

  const handleToggleActive = async (cardId: string, currentActive?: boolean) => {
    const nextActive = currentActive === false ? true : false;
    try {
      const { error } = await supabase
        .from('cards')
        .update({ is_active: nextActive })
        .eq('id', cardId);

      if (error) throw error;
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, is_active: nextActive } : c))
      );
    } catch (err) {
      console.error('Active toggle error:', err);
    }
  };

  const handleReassignSlug = async (cardId: string) => {
    if (!newSlugVal.trim()) return;
    const sanitizedSlug = newSlugVal.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    try {
      const { error } = await supabase
        .from('cards')
        .update({ slug: sanitizedSlug })
        .eq('id', cardId);

      if (error) throw error;
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, slug: sanitizedSlug } : c))
      );
      setEditingSlugId(null);
      setNewSlugVal('');
    } catch (err: any) {
      alert(`Failed to update slug: ${err.message}`);
    }
  };

  const filteredCards = cards.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* NAVBAR */}
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-violet-600/30">
                J
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">JustTap</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAdminCards}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh dataset"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/dashboard"
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition-colors"
            >
              Client Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* HEADER BAR & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Master Account & Card Control</h1>
            <p className="text-xs text-slate-400">
              Manage multi-tenant client cards, assign custom slugs, and update plan tiers
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, slug, email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold">Total Accounts / Cards</span>
            <div className="text-3xl font-extrabold text-white mt-2">{cards.length}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold">PRO Tier Accounts</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">
              {cards.filter((c) => c.plan === 'pro').length}
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold">Free Tier Accounts</span>
            <div className="text-3xl font-extrabold text-violet-400 mt-2">
              {cards.filter((c) => c.plan !== 'pro').length}
            </div>
          </div>
        </div>

        {/* CARDS TABLE */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading master cards registry...</div>
          ) : filteredCards.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No registered card accounts match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-4 font-semibold">Card Owner</th>
                    <th className="py-4 px-4 font-semibold">Card Slug / URL</th>
                    <th className="py-4 px-4 font-semibold">Plan Tier</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold">Created Date</th>
                    <th className="py-4 px-4 font-semibold text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                            {card.avatar_url ? (
                              <img src={card.avatar_url} alt={card.full_name} className="w-full h-full object-cover" />
                            ) : (
                              card.full_name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{card.full_name}</div>
                            <div className="text-[11px] text-slate-400">{card.phone} • {card.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>

                      {/* SLUG COLUMN WITH EDITING */}
                      <td className="py-4 px-4 font-mono text-xs">
                        {editingSlugId === card.id ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={newSlugVal}
                              onChange={(e) => setNewSlugVal(e.target.value)}
                              className="px-2 py-1 bg-slate-800 border border-violet-500 rounded text-xs text-white"
                            />
                            <button
                              onClick={() => handleReassignSlug(card.id)}
                              className="px-2 py-1 bg-violet-600 text-white rounded text-[10px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSlugId(null)}
                              className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <Link
                              href={`/c/${card.slug}`}
                              target="_blank"
                              className="text-violet-400 hover:underline flex items-center space-x-1"
                            >
                              <span>/c/{card.slug}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            <button
                              onClick={() => {
                                setEditingSlugId(card.id);
                                setNewSlugVal(card.slug);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-300"
                              title="Reassign slug"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* PLAN TIER TOGGLE */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleTogglePlan(card.id, card.plan)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border flex items-center space-x-1 transition-all ${
                            card.plan === 'pro'
                              ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <Crown className="w-3 h-3 fill-current" />
                          <span>{card.plan === 'pro' ? 'PRO PLAN' : 'FREE PLAN'}</span>
                        </button>
                      </td>

                      {/* ACTIVE STATUS TOGGLE */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(card.id, card.is_active)}
                          className={`flex items-center space-x-1 text-[11px] font-semibold ${
                            card.is_active !== false
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {card.is_active !== false ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-4 text-slate-400 text-[11px]">
                        {new Date(card.created_at || Date.now()).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/c/${card.slug}`}
                          target="_blank"
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 text-xs inline-flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
