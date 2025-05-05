import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { message: 'Invalid JSON body' }, 
      { status: 400 }
    );
  }

  const { habitId, value, date } = body;

  if (!habitId || value === undefined || !date) {
    return NextResponse.json(
      { message: 'Missing habitId, value, or date' }, 
      { status: 400 }
    );
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { message: 'Invalid date format' }, 
      { status: 400 }
    );
  }

  const numericValue = Number(value);
  if (isNaN(numericValue)) {
    return NextResponse.json(
      { message: 'Value must be a number' }, 
      { status: 400 }
    );
  }

  try {
    // Verify the habit belongs to the user
    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId: session.user.id
      }
    });

    if (!habit) {
      return NextResponse.json(
        { message: 'Habit not found or not owned by user' }, 
        { status: 404 }
      );
    }

    const entry = await prisma.habitEntry.upsert({
      where: {
        habitId_date: {
          habitId,
          date: parsedDate,
        },
      },
      update: {
        value: numericValue,
      },
      create: {
        value: numericValue,
        date: parsedDate,
        habitId,
      },
    });

    // Get the updated habit with entries
    const updatedHabit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        entries: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!updatedHabit) {
      return NextResponse.json(
        { message: 'Habit not found after update' }, 
        { status: 404 }
      );
    }

    // Calculate streak
    let streak = 0;
    for (const entry of updatedHabit.entries) {
      if (entry.value !== null && entry.value >= updatedHabit.goal) {
        streak++;
      } else {
        break;
      }
    }

    // Format week data
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const weekData = daysOfWeek.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const entry = updatedHabit.entries.find((e) => {
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

    return NextResponse.json({
      id: updatedHabit.id,
      name: updatedHabit.name,
      icon: updatedHabit.icon,
      goal: updatedHabit.goal,
      unit: updatedHabit.unit,
      streak,
      data: weekData,
    });
  } catch (error) {
    console.error('Error saving habit entry:', error);
    return NextResponse.json(
      { message: 'Internal server error' }, 
      { status: 500 }
    );
  }
}