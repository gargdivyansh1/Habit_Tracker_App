// pages/api/notifications/reminders.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set response content type
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
      allowedMethods: ['POST']
    });
  }

  try {
    // Verify session
    const session = await getSession({ req });
    console.log('Session data:', session);
    
    if (!session?.user?.id) {
      console.warn('Unauthorized access attempt');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Please log in'
      });
    }

    // Parse and validate request body
    let { habitId, time } = req.body;
    
    if (!habitId || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['habitId', 'time'],
        received: { habitId, time }
      });
    }

    // Trim and validate time format (HH:MM)
    time = time.trim();
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM (24-hour format)',
        example: '14:30'
      });
    }

    // Verify habit exists and belongs to user
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      select: { id: true, name: true, userId: true }
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    if (habit.userId !== session.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this habit'
      });
    }

    // Create reminder
    const reminder = await prisma.reminder.create({
      data: { time, habitId },
      select: { id: true, time: true, createdAt: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        habitName: habit.name,
        message: `Reminder set for ${habit.name} at ${time}`,
        userId: session.user.id
      }
    });

    // Successful response
    return res.status(201).json({
      success: true,
      reminder,
      message: 'Reminder created successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}