'use client';

import React, { useEffect, useState } from 'react';
import { Eye, Download, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface AnalyticsTabProps {
  cardId: string;
}

export function AnalyticsTab({ cardId }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [pageViews, setPageViews] = useState(0);
  const [vcardDownloads, setVcardDownloads] = useState(0);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_analytics')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const views = (data || []).filter((e) => e.event_type === 'page_view').length;
      const downloads = (data || []).filter((e) => e.event_type === 'vcard_download').length;

      setPageViews(views);
      setVcardDownloads(downloads);
      setRecentEvents((data || []).slice(0, 10));
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cardId) fetchAnalytics();
  }, [cardId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Card Analytics</h3>
          <p className="text-xs text-slate-400">Track total NFC taps, QR scans, and vCard downloads</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Views Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Page Views / Scans
            </span>
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-2xl">
              <Eye className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-white">
              {loading ? '...' : pageViews}
            </span>
            <span className="text-xs text-slate-400">total views</span>
          </div>
        </div>

        {/* Total vCard Downloads Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              vCard Downloads
            </span>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
              <Download className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-white">
              {loading ? '...' : vcardDownloads}
            </span>
            <span className="text-xs text-slate-400">contacts saved</span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY LOG */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <span>Recent Activity Stream</span>
        </h4>

        {loading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Loading activity log...</p>
        ) : recentEvents.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No activity recorded yet. Share your card to get started!</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-xl ${
                      evt.event_type === 'vcard_download'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-violet-500/10 text-violet-400'
                    }`}
                  >
                    {evt.event_type === 'vcard_download' ? (
                      <Download className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">
                      {evt.event_type === 'vcard_download' ? 'Contact Saved (.vcf)' : 'Public Card Viewed'}
                    </span>
                    <p className="text-[10px] text-slate-500 truncate max-w-xs">
                      {evt.user_agent || 'NFC / Web Browser'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{new Date(evt.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
