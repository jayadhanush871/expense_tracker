import React, { useState, useEffect } from 'react';
import { X, User, Mail, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Profile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSave: (data: { full_name: string; email: string }) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
    }
    setErrors({});
    setSuccessMessage('');
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: { fullName?: string; email?: string } = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full Name is required.';
    }

    if (!email.trim()) {
      errs.email = 'Email Address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Please provide a valid email format (e.g. name@example.com).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      setSuccessMessage('Profile saved securely! Your name will be used across dashboard & email reports.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrors({ email: err.message || 'Failed to save profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {profile?.email ? 'Update Your Profile' : 'Simple Profile Setup'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only two fields required &bull; No clutter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Privacy Note */}
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              Your full name and email are stored securely. We do not ask for phone numbers, profile photos, addresses, or other intrusive details.
            </span>
          </div>

          {successMessage && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Field 1: Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dhanush"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.fullName
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.fullName}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Used in the dashboard greeting and your weekly email header.
            </p>
          </div>

          {/* Field 2: Email Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dhanush@example.com"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Weekly financial reports and budget utilization summaries will be delivered here.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
