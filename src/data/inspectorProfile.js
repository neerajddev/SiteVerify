export const VERIFICATION_STATUS = {
  INCOMPLETE: 'incomplete',
  PENDING: 'pending_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export function getVerificationMeta(status) {
  switch (status) {
    case VERIFICATION_STATUS.VERIFIED:
      return {
        label: 'Profile active',
        description: 'Your profile is complete. You can receive site visits.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: '✓',
      };
    case VERIFICATION_STATUS.PENDING:
      return {
        label: 'Profile under review',
        description: 'We are checking your qualifications. You will be notified once ready.',
        className: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        icon: '⏳',
      };
    case VERIFICATION_STATUS.REJECTED:
      return {
        label: 'Profile needs updates',
        description: 'Please update your details and submit again.',
        className: 'bg-rose-50 border-rose-200 text-rose-800',
        icon: '!',
      };
    default:
      return {
        label: 'Complete your profile',
        description: 'Add your qualifications and experience in Settings to start receiving sites.',
        className: 'bg-amber-50 border-amber-200 text-amber-900',
        icon: '📋',
      };
  }
}

export function getDefaultInspectorProfile(inspectorId, fullName = 'Inspector') {
  return {
    inspectorId,
    fullName,
    phone: '',
    email: '',
    city: '',
    qualifications: [],
    experience: [],
    certifications: '',
    bio: '',
    verificationStatus: VERIFICATION_STATUS.INCOMPLETE,
    submittedAt: null,
    verifiedAt: null,
    adminNote: '',
    updatedAt: new Date().toISOString(),
  };
}

export function buildDemoInspectorProfile(inspectorId, fullName) {
  return {
    inspectorId,
    fullName,
    phone: '+919876543211',
    email: '',
    city: 'Thrissur, Kerala',
    qualifications: [
      { id: 'q1', degree: 'Diploma in Civil Engineering', institution: 'Govt Polytechnic Thrissur', year: '2018' },
      { id: 'q2', degree: 'Site Quality Inspector Certification', institution: 'Kerala Building Centre', year: '2020' },
    ],
    experience: [
      { id: 'e1', role: 'Field Quality Inspector', company: 'Apex Builders', years: '2020–2023', sites: '45+ residential sites' },
      { id: 'e2', role: 'Freelance Site Inspector', company: 'Independent', years: '2023–present', sites: 'Thrissur & Ernakulam districts' },
    ],
    certifications: 'IS 456 concrete practice, foundation inspection, slab formwork QA',
    bio: 'Specialized in Kerala residential construction — RR footing, slab, and structural stage checks.',
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    submittedAt: '2026-06-01T10:00:00+05:30',
    verifiedAt: '2026-06-05T14:00:00+05:30',
    adminNote: '',
    updatedAt: new Date().toISOString(),
  };
}
