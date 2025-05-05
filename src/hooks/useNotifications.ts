'use client';

import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  habitId: string;
  habitName: string;
  message: string;
  timestamp: number;
  type?: 'reminder' | 'achievement' | 'streak';
}

const generateId = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
};

const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (
    habit: { id: string; name: string },
    customMessage?: string,
    type?: Notification['type']
  ) => {
    setNotifications(prev => {
      // Prevent duplicates within 24 hours
      const duplicateExists = prev.some(
        n => n.habitId === habit.id && 
             Date.now() - n.timestamp < 24 * 60 * 60 * 1000
      );
      
      if (duplicateExists) return prev;

      return [
        ...prev,
        {
          id: generateId(),
          habitId: habit.id,
          habitName: habit.name,
          message: customMessage || `Don't forget to log your ${habit.name} for today!`,
          timestamp: Date.now(),
          type: type || 'reminder'
        }
      ];
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Auto-clean notifications older than 7 days
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => 
        prev.filter(n => Date.now() - n.timestamp < 7 * 24 * 60 * 60 * 1000)
      );
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  return { 
    notifications,
    addNotification,
    dismissNotification
  };
};

export default useNotifications;