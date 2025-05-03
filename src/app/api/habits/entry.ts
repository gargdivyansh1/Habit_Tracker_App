import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { habitId, value, date } = req.body;
      
      // Upsert the entry (create or update if exists for that date)
      const entry = await prisma.habitEntry.upsert({
        where: {
          habitId_date: {
            habitId,
            date: new Date(date),
          },
        },
        update: {
          value: parseFloat(value),
        },
        create: {
          value: parseFloat(value),
          date: new Date(date),
          habitId,
        },
      });

      // Get the updated habit with entries to calculate streak
      const habit = await prisma.habit.findUnique({
        where: {
          id: habitId,
        },
        include: {
          entries: {
            orderBy: {
              date: 'desc',
            },
          },
        },
      });

      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }

      // Calculate streak
      let streak = 0;
      for (const entry of habit.entries) {
        if (entry.value >= habit.goal) {
          streak++;
        } else {
          break;
        }
      }

      // Format the response similar to the GET endpoint
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      
      const weekData = daysOfWeek.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        
        const entry = habit.entries.find((e: { date: string | number | Date; }) => {
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

      res.status(200).json({
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        goal: habit.goal,
        unit: habit.unit,
        streak,
        data: weekData,
      });
    } catch (error) {
      console.error('Error saving habit entry:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}