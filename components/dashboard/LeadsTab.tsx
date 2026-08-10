'use client';

import React, { useEffect, useState } from 'react';
import { Download, Trash2, UserCheck, Phone, Calendar, RefreshCw, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CardLead } from '@/lib/types';

interface LeadsTabProps {
  cardId: string;
}

export function LeadsTab({ cardId }: LeadsTabProps) {
  const [leads, setLeads] = useState<CardLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_leads')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as CardLead[]) || []);
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cardId) fetchLeads();
  }, [cardId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead entry?')) return;
    try {
      const { error } = await supabase.from('card_leads').delete().eq('id', id);
      if (error) throw error;
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Delete lead error:', err);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Sender Name', 'Sender Phone', 'Note', 'Date Submitted'];
    const rows = leads.map((l) => [
      `"${l.sender_name.replace(/"/g, '""')}"`,
      `"${l.sender_phone.replace(/"/g, '""')}"`,
      `"${(l.note || '').replace(/"/g, '""')}"`,
      `"${new Date(l.created_at).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-violet-400" />
            <span>Lead Exchange Inbox</span>
          </h3>
          <p className="text-xs text-slate-400">
            Contacts collected from visitors using the &quot;Exchange Info&quot; button
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLeads}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-600/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading inbox leads...</div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No lead submissions yet. Visitors can share their info on your profile card!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Sender Name</th>
                  <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                  <th className="py-3.5 px-4 font-semibold">Note</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{lead.sender_name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <a href={`tel:${lead.sender_phone}`} className="hover:text-violet-400 flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{lead.sender_phone}</span>
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {lead.note || <span className="text-slate-600 font-italic">No note</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
