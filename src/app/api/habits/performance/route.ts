import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getSession } from 'next-auth/react';
import { Habit, HabitEntry } from '@prisma/client';

interface RadarDataPoint {
  name: string;
  [day: string]: number | string; // Dynamic keys for days
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get habits with their entries for the current week
    const habits = await prisma.habit.findMany({
      where: { userId: session.user.id },
      include: {
        entries: {
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
              lte: new Date()
            }
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    });

    // Transform data into radar chart format
    const radarData: RadarDataPoint[] = habits.map(habit => {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayData: RadarDataPoint = { name: habit.name };
      
      // Initialize all days to 0
      daysOfWeek.forEach(day => {
        dayData[day] = 0;
      });

      // Fill in actual data
      habit.entries.forEach(entry => {
        const entryDay = daysOfWeek[new Date(entry.date).getDay()];
        const completionPercentage = Math.round(((entry.value ?? 0) / habit.goal) * 100);
        dayData[entryDay] = Math.min(100, Math.max(0, completionPercentage)); // Clamp between 0-100
      });
      
      return dayData;
    });

    res.status(200).json(radarData);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}