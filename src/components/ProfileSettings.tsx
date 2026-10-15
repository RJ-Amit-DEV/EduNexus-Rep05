import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Book, GraduationCap, Camera, Save, CheckCircle, Info, Briefcase, Building, Users, Heart, Phone, Trash2, AlertCircle, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import { ProfileData, UserRole } from '../types';
import { isPrivilegedTeamMember } from '../constants';
import { cn } from '../lib/utils';

interface ProfileSettingsProps {
  profile: ProfileData;
  onUpdate: (data: Partial<ProfileData>) => void;
  onResetAccount?: () => void;
  onRoleSwitch?: (newRole: UserRole) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onUpdate, onResetAccount, onRoleSwitch }) => {
  const [formData, setFormData] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const isPrivileged = isPrivilegedTeamMember(profile.email) || profile.isPrivileged || profile.email.includes('eduplan.local');

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFileError(null);
    
    // Save updates
    setTimeout(() => {
      onUpdate(formData);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 600);
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (!isPrivileged) return;
    setFormData(prev => ({ ...prev, role: newRole }));
    if (onRoleSwitch) {
      onRoleSwitch(newRole);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileError(null);
      if (file.size > 5 * 1024 * 1024) {
        setFileError("Selected image is too large. Please select an image smaller than 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setFormData(prev => ({ ...prev, avatar: compressedDataUrl }));
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm">
              <img 
                src={formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=4f46e5&color=fff&size=256`} 
                alt={formData.name || "Profile"} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white cursor-pointer shadow hover:bg-indigo-700 transition-colors">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formData.name}</h2>
              {isPrivileged && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-md text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                  <ShieldCheck size={12} /> Team Developer • Multi-Role Access
                </span>
              )}
            </div>

            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm capitalize">
              Current Access Role: <span className="font-bold text-slate-900 dark:text-white">{formData.role}</span>
            </p>

            {/* Privileged Team Member Instant Role Switcher */}
            {isPrivileged ? (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw size={12} /> Switch Active Portal Role (Team Developer Privilege)
                  </span>
                  <span className="text-[10px] text-slate-400">Instant Switch</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'teacher', 'parent'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all text-center border cursor-pointer",
                        formData.role === r 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                      )}
                    >
                      {r === 'teacher' ? 'Faculty' : r}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <Lock size={12} className="text-slate-400" />
                <span>Single Role Account ({formData.role === 'teacher' ? 'Faculty Member' : formData.role === 'parent' ? 'Parent / Guardian' : 'Student'}). To switch roles, reset your account below.</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">
                {formData.college || 'EduPlan Academy'}
              </span>
              {formData.role === 'student' && formData.course && (
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  {formData.course}
                </span>
              )}
              {formData.role === 'teacher' && formData.department && (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  {formData.department}
                </span>
              )}
            </div>
          </div>

        </div>

        <AnimatePresence>
          {fileError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm font-semibold"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{fileError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={formData.email}
                  disabled
                  className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {formData.role === 'student' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Course / Branch</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.course || ''}
                      onChange={e => setFormData(prev => ({ ...prev, course: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Semester</label>
                  <div className="relative">
                    <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.semester || ''}
                      onChange={e => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.role === 'teacher' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Department</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.department || ''}
                      onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.designation || ''}
                      onChange={e => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Experience (Years)</label>
                  <div className="relative">
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.experience || ''}
                      onChange={e => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.role === 'parent' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Child's Name</label>
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Required for live results</span>
                  </div>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.childName || ''}
                      onChange={e => setFormData(prev => ({ ...prev, childName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                      placeholder="Enter child's full name exactly"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-2 font-medium">Link by child's name to see their live performance and teacher's marks.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Relationship</label>
                  <div className="relative">
                    <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.relationship || ''}
                      onChange={e => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Contact Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.contact || ''}
                      onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">About Me</label>
            <div className="relative">
              <Info className="absolute left-4 top-4 text-slate-400" size={18} />
              <textarea 
                value={formData.about}
                onChange={e => setFormData(prev => ({ ...prev, about: e.target.value }))}
                rows={4}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white resize-none"
                placeholder="Tell us a bit about yourself..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
            <div className={cn(
              "flex items-center gap-2 text-emerald-600 font-bold transition-opacity duration-300",
              showSuccess ? "opacity-100" : "opacity-0"
            )}>
              <CheckCircle size={20} />
              Profile updated successfully!
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {onResetAccount && (
                <button 
                  type="button"
                  onClick={onResetAccount}
                  className="px-8 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all border border-rose-200"
                >
                  <Trash2 size={20} />
                  Reset Account
                </button>
              )}
              
              <button 
                type="submit"
                disabled={isSaving}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
