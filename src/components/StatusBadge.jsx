import React from 'react';
import { getStatusBadge } from '../data/designTokens';

/**
 * Canonical status pill — same look on homeowner, inspector, and admin.
 */
export default function StatusBadge({ status, label, className = '' }) {
  const badge = getStatusBadge(status);
  return (
    <span
      className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-full border ${
        className || badge.className
      }`}
    >
      {label || badge.label}
    </span>
  );
}
