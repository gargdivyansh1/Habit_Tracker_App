// pages/api/habits/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const habits = await prisma.habit.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        entries: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    // Transform data for frontend
    const formattedHabits = habits.map((habit: { entries: any[]; goal: number; id: any; name: any; icon: any; unit: any; }) => {
      // Create weekly data structure (7 days)
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      
      const weekData = daysOfWeek.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        
        const entry = habit.entries.find(e => {
          const entryDate = new Date(e.date);
          return (
            entryDate.getDate() === date.getDate() &&
            entryDate.getMonth() === date.getMonth() &&
            entryDate.getFullYear() === date.getFullYear()
          );
        });
        
        return {
          day,
          value: entry ? entry.value : null,
        };
      });

      // Calculate streak
      let streak = 0;
      const sortedEntries = [...habit.entries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      for (const entry of sortedEntries) {
        if (entry.value >= habit.goal) {
          streak++;
        } else {
          break;
        }
      }

      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        goal: habit.goal,
        unit: habit.unit,
        streak,
        data: weekData, // Add the data property
        entries: habit.entries, // Keep original entries if needed
      };
    });

    res.status(200).json(formattedHabits);
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}