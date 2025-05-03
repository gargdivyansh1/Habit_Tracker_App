import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // POST - Create a new reminder
  if (req.method === 'POST') {
    try {
      const { habitId, time } = req.body;

      // Validate input
      if (!habitId || !time) {
        return res.status(400).json({ message: 'Missing habitId or time' });
      }

      // Verify habit belongs to user
      const habit = await prisma.habit.findFirst({
        where: {
          id: habitId,
          userId: session.user.id,
        },
      });

      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }

      // Create reminder
      const reminder = await prisma.reminder.create({
        data: {
          time,
          habitId,
        },
      });

      // Create associated notification
      const notification = await prisma.notification.create({
        data: {
          habitName: habit.name,
          message: `Reminder set for ${habit.name} at ${time}`,
          userId: session.user.id,
        },
      });

      return res.status(201).json({
        reminder,
        notification,
      });
    } catch (error) {
      console.error('Error creating reminder:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).end(`Method ${req.method} Not Allowed`);
}