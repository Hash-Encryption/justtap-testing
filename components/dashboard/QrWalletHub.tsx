'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Smartphone,
  Crown,
  Lock,
  ExternalLink,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/lib/types';
import { generateVCardString } from '@/lib/vcard';

interface QrWalletHubProps {
  card: Card;
  onUpgradeRequest?: () => void;
}

export function QrWalletHub({ card, onUpgradeRequest }: QrWalletHubProps) {
  const [profileQrUrl, setProfileQrUrl] = useState<string>('');
  const [offlineQrUrl, setOfflineQrUrl] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [activeQr, setActiveQr] = useState<'profile' | 'offline'>('profile');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://justtap.app');
  const cardProfileUrl = `${appUrl}/c/${card.slug}`;
  const offlineVCardData = generateVCardString(card);

  const isPro = card.plan === 'pro';

  const isProfile = activeQr === 'profile';
  const activeQrUrl = isProfile ? profileQrUrl : offlineQrUrl;
  const activeSlugSuffix = isProfile ? 'profile' : 'offline';

  useEffect(() => {
    QRCode.toDataURL(cardProfileUrl, { margin: 1, width: 300 }, (err, url) => {
      if (!err && url) setProfileQrUrl(url);
    });
    QRCode.toDataURL(offlineVCardData, { margin: 1, width: 300 }, (err, url) => {
      if (!err && url) setOfflineQrUrl(url);
    });
  }, [cardProfileUrl, offlineVCardData]);

  // PRO Feature: High-Res PNG QR Download
  const handleDownloadHighResQr = async (type: 'profile' | 'offline') => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    const dataToEncode = type === 'profile' ? cardProfileUrl : offlineVCardData;
    try {
      const highResDataUrl = await QRCode.toDataURL(dataToEncode, { margin: 2, width: 2000 });
      const link = document.createElement('a');
      link.href = highResDataUrl;
      link.download = `JustTap_QR_${type}_${card.slug}_2000px.png`;
      link.click();
    } catch (err) {
      console.error('High res QR generation error:', err);
    }
  };

  // PRO Feature: Lockscreen Wallpaper Generator (1080x1920)
  const handleGenerateWallpaper = async () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Dark Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle ambient glow
    const glowGrad = ctx.createRadialGradient(540, 450, 50, 540, 450, 400);
    glowGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1080, 900);

    // 2. Card Box Container
    const boxX = 90;
    const boxY = 280;
    const boxW = 900;
    const boxH = 1360;
    const boxRadius = 60;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, boxRadius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Name & Details
    ctx.textAlign = 'center';

    // Name
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(card.full_name, 540, 420);

    // Title / Company
    if (card.title || card.company) {
      ctx.font = '500 36px sans-serif';
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(card.title || card.company || '', 540, 485);
    }

    // Phone / Contact
    if (card.phone) {
      ctx.font = '400 30px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(card.phone, 540, 540);
    }

    // 4. Generate and Draw Offline QR Code onto Wallpaper
    try {
      const qrDataUrl = await QRCode.toDataURL(offlineVCardData, { margin: 2, width: 600 });
      const img = new Image();
      img.onload = () => {
        // Draw white rounded background for QR
        const qrSize = 520;
        const qrX = (1080 - qrSize) / 2;
        const qrY = 640;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 40);
        ctx.fill();

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // QR Subtext
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('SCAN FOR CONTACT INFO', 540, 1260);

        ctx.font = '400 24px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Works offline without internet connection', 540, 1305);

        // Branding Footer
        ctx.font = 'extrabold 32px sans-serif';
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText('JustTap Digital Business Card', 540, 1530);

        // Export & Download canvas image
        const wallpaperUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = wallpaperUrl;
        link.download = `JustTap_Wallpaper_${card.slug}.png`;
        link.click();
      };
      img.src = qrDataUrl;
    } catch (err) {
      console.error('Wallpaper canvas error:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-violet-400" />
            <span>QR Code & Digital Wallet Hub</span>
          </h3>
          <p className="text-xs text-slate-400">
            Share your contact via dynamic web link QR, offline vCard QR, or Apple Wallet pass
          </p>
        </div>

        {!isPro && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all"
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>Upgrade to PRO</span>
          </button>
        )}
      </div>

      {/* QR TOGGLE + SINGLE PANEL */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col items-center space-y-5 shadow-xl">
        {/* Toggle pill */}
        <div className="flex items-center bg-slate-800/80 rounded-2xl p-1 border border-slate-700/60">
          <button
            onClick={() => setActiveQr('profile')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isProfile
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dynamic Profile</span>
          </button>
          <button
            onClick={() => setActiveQr('offline')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isProfile
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Offline vCard</span>
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 text-center max-w-xs">
          {isProfile
            ? <>Links to your live public profile (<code className="text-violet-300">/c/{card.slug}</code>). Requires internet.</>
            : 'Encodes raw vCard text. Phone cameras save the contact directly — no internet needed.'}
        </p>

        {/* QR Image */}
        <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200">
          {activeQrUrl ? (
            <img src={activeQrUrl} alt={isProfile ? 'Dynamic Profile QR' : 'Offline vCard QR'} className="w-52 h-52 object-contain" />
          ) : (
            <div className="w-52 h-52 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              Generating QR...
            </div>
          )}
        </div>

        {/* Download buttons */}
        <div className="w-full max-w-xs space-y-2">
          <a
            href={activeQrUrl}
            download={`JustTap_QR_${activeSlugSuffix}_${card.slug}.png`}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Standard PNG Download</span>
          </a>

          <button
            onClick={() => handleDownloadHighResQr(activeQr)}
            className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl border flex items-center justify-center space-x-2 transition-all ${
              isPro
                ? isProfile
                  ? 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-violet-500/30'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900/50 text-slate-500 border-slate-800 cursor-pointer'
            }`}
          >
            {!isPro && <Lock className="w-3.5 h-3.5 text-amber-400" />}
            <span>High-Res PNG (2000px)</span>
            {!isPro && <span className="text-[10px] text-amber-400 font-bold ml-1">PRO</span>}
          </button>
        </div>
      </div>

      {/* 3. DIGITAL WALLET & LOCKSCREEN WALLPAPER HUB */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
        <h4 className="text-base font-bold text-white flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-violet-400" />
          <span>Mobile Pass & Wallpaper Sharing</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Apple Wallet Pass Download Button */}
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/60 flex flex-col justify-between space-y-3">
            <div>
              <h5 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>🍎 Apple Wallet Pass</span>
              </h5>
              <p className="text-xs text-slate-400 mt-1">
                Generates a signed <code className="text-slate-300">.pkpass</code> file for Apple Wallet with embedded offline QR.
              </p>
            </div>

            <a
              href={`/api/wallet/${card.slug}`}
              download={`${card.slug}.pkpass`}
              className="w-full py-3 px-4 bg-slate-950 hover:bg-black text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-2 shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Add to Apple Wallet (.pkpass)</span>
            </a>
          </div>

          {/* Lockscreen Wallpaper Generator */}
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/60 flex flex-col justify-between space-y-3">
            <div>
              <h5 className="text-sm font-bold text-white flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Lockscreen Wallpaper Generator</span>
                {!isPro && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-extrabold border border-amber-400/20">PRO</span>}
              </h5>
              <p className="text-xs text-slate-400 mt-1">
                Creates a 1080x1920px custom smartphone wallpaper with your details and offline QR code.
              </p>
            </div>

            <button
              onClick={handleGenerateWallpaper}
              className={`w-full py-3 px-4 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                isPro
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-violet-500 shadow-lg shadow-violet-600/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {!isPro ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Generate Lockscreen Wallpaper (PRO)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generate & Download 1080x1920 Wallpaper</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for wallpaper rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* PRO UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center mx-auto">
              <Crown className="w-8 h-8 fill-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white">Upgrade to JustTap PRO</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlock high-res vector & 2000px PNG downloads, custom smartphone lockscreen wallpaper generation, and remove watermark branding!
              </p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-left space-y-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>High-Res 2000px PNG QR Code Downloads</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Smart Lockscreen Wallpaper (1080x1920px)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Remove &quot;Powered by JustTap&quot; footer watermark</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Priority Apple Wallet pass synchronization</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  if (onUpgradeRequest) onUpgradeRequest();
                }}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-amber-500/20 text-sm transition-all"
              >
                Upgrade to PRO Now
              </button>

              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
