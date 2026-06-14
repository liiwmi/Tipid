import React, { createContext, useContext } from 'react';
import { useProfile, UserProfile } from '../hooks/useProfile';

interface ProfileContextType {
  profile: UserProfile;
  loading: boolean;
  saving: boolean;
  saveProfile: (updated: UserProfile) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useProfile();
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider');
  return ctx;
}