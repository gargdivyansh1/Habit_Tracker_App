import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // GET all notifications for user
  if (req.method === 'GET') {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          read: false, // Only get unread notifications
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // DELETE (dismiss) a notification
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      await prisma.notification.update({
        where: {
          id: id as string,
          userId: session.user.id, // Ensure user owns the notification
        },
        data: {
          read: true, // Mark as read instead of deleting
        },
      });

      return res.status(204).end();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).end(`Method ${req.method} Not Allowed`);
}