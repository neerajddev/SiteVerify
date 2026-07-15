import React from 'react';
import { parseGoogleMapsLink } from '../utils/parseGoogleMapsLink';

/**
 * Site location: type address + optional paste of Google Maps link (no Google API billing).
 */
export default function SiteLocationPicker({
  address = '',
  pinCode = '',
  mapsUrl = '',
  coordinates = null,
  onChange,
  required = true,
}) {
  const emit = (patch) => {
    onChange?.({
      address,
      pinCode,
      mapsUrl,
      coordinates,
      ...patch,
    });
  };

  const handleMapsPaste = (value) => {
    const parsed = parseGoogleMapsLink(value);
    emit({
      mapsUrl: value.trim(),
      coordinates: parsed.coordinates,
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
          Site location {required && '*'}
        </label>
        <input
          type="text"
          required={required}
          placeholder="e.g. Edappally, Kochi, Kerala"
          value={address}
          onChange={(e) => emit({ address: e.target.value })}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
        />
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
          PIN code {required && '*'}
        </label>
        <input
          type="text"
          inputMode="numeric"
          required={required}
          maxLength={6}
          placeholder="e.g. 682024"
          value={pinCode}
          onChange={(e) => emit({ pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
        />
        <p className="text-[9px] text-slate-400 mt-1">6-digit PIN so we know your area.</p>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
          Google Maps link <span className="text-slate-300 normal-case font-bold">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={mapsUrl}
          onChange={(e) => handleMapsPaste(e.target.value)}
          placeholder="Paste a Google Maps link or share location URL here"
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
        />
        <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
          Open Google Maps → your plot → Share → Copy link → paste here. Helps the inspector find the exact site. Not required.
        </p>
        {coordinates && (
          <p className="text-[10px] text-[#1D9E75] mt-1.5 font-bold">
            ✓ Coordinates found in link ({coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)})
          </p>
        )}
        {mapsUrl.trim() && !coordinates && (
          <p className="text-[10px] text-slate-500 mt-1.5">
            Link saved. Short links (goo.gl) may not include coordinates — still useful for the inspector.
          </p>
        )}
      </div>
    </div>
  );
}
