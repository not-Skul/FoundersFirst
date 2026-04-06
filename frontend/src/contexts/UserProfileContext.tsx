import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  experienceLevel: 'student' | 'beginner' | 'professional' | 'serial_entrepreneur' | '';
  educationLevel: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  industryInterests: string[];
  startupStage: 'idea' | 'validation' | 'prototype' | 'early_revenue' | '';
  onboardingCompleted: boolean;
  createdAt: Date;
}

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completionPercentage: number;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  stats: {
    aiInteractions: number;
    savedSchemes: number;
    savedResources: number;
    roadmapProgress: number;
  };
}

const defaultProfile: UserProfile = {
  id: '1',
  displayName: '',
  email: 'user@example.com',
  experienceLevel: '',
  educationLevel: '',
  location: { country: '', state: '', city: '' },
  industryInterests: [],
  startupStage: '',
  onboardingCompleted: false,
  createdAt: new Date(),
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [stats, setStats] = useState({
    aiInteractions: 12,
    savedSchemes: 5,
    savedResources: 8,
    roadmapProgress: 0,
  });

  // Fetch user profile from backend on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/user-profile', {
          headers: { 'Authorization': token }
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(prev => ({ ...prev, ...data }));
        } else {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-change'));
          return;
        }

        // Fetch roadmap progress stats dynamically
        try {
          const [roadmapRes, progressRes] = await Promise.all([
            fetch('http://localhost:5000/my-roadmap', { headers: { 'Authorization': token } }),
            fetch('http://localhost:5000/roadmap/progress', { headers: { 'Authorization': token } })
          ]);

          if (roadmapRes.ok && progressRes.ok) {
            const rData = await roadmapRes.json();
            const pData = await progressRes.json();

            let totalSteps = 0;
            let percentDone = 0;

            if (rData.roadmap && rData.roadmap.length > 0) {
              totalSteps = rData.roadmap.reduce((acc: number, phase: any) => acc + (phase.tasks?.length || 0), 0);
              if (totalSteps > 0 && pData.completedSteps) {
                percentDone = Math.round((pData.completedSteps.length / totalSteps) * 100);
              }
            }
            setStats(prev => ({ ...prev, roadmapProgress: percentDone }));
          }
        } catch (err) {
          console.error("Failed to sync roadmap progress:", err);
        }

      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-change'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [])

  useEffect(() => {
    // Show onboarding if profile is incomplete and not previously completed
    if (!profile.onboardingCompleted && !profile.displayName) {
      const timer = setTimeout(() => setIsOnboardingOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [profile.onboardingCompleted, profile.displayName]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const calculateCompletion = (): number => {
    const fields = [
      { value: profile.displayName, weight: 20 },
      { value: profile.experienceLevel, weight: 15 },
      { value: profile.educationLevel, weight: 10 },
      { value: profile.location.country, weight: 10 },
      { value: profile.location.state, weight: 5 },
      { value: profile.location.city, weight: 5 },
      { value: profile.industryInterests.length > 0, weight: 20 },
      { value: profile.startupStage, weight: 15 },
    ];

    return fields.reduce((acc, field) => {
      return acc + (field.value ? field.weight : 0);
    }, 0);
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
        completionPercentage: calculateCompletion(),
        isOnboardingOpen,
        setIsOnboardingOpen,
        stats,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
