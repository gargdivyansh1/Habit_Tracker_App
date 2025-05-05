import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Utility function to format week data
const formatWeekData = (entries: any[], habitGoal: number) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return daysOfWeek.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);

    const entry = entries.find(e => {
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
};

// Utility function to calculate streak
const calculateStreak = (entries: any[], goal: number) => {
  let streak = 0;
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const entry of sortedEntries) {
    if (entry.value !== null && entry.value >= goal) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const habits = await prisma.habit.findMany({
      where: { userId: session.user.id },
      include: { entries: { orderBy: { date: 'asc' } } },
    });

    const formattedHabits = habits.map(habit => ({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      goal: habit.goal,
      unit: habit.unit,
      streak: calculateStreak(habit.entries, habit.goal),
      data: formatWeekData(habit.entries, habit.goal),
    }));

    return NextResponse.json(formattedHabits);
  } catch (error) {
    console.error('Error fetching habits:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Handle new habit creation
    if (body.name && body.goal) {
      const newHabit = await prisma.habit.create({
        data: {
          name: body.name,
          icon: body.icon || 'award',
          goal: body.goal,
          unit: body.unit || 'times',
          userId: session.user.id,
        },
      });

      return NextResponse.json({
        id: newHabit.id,
        name: newHabit.name,
        icon: newHabit.icon,
        goal: newHabit.goal,
        unit: newHabit.unit,
        streak: 0,
        data: Array(7).fill({ day: '', value: null }),
      });
    }

    // Handle entry update
    const { habitId, value, date } = body;
    if (!habitId || value === undefined || !date) {
      return NextResponse.json(
        { message: 'Missing required fields' },
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

    // Upsert the entry
    await prisma.habitEntry.upsert({
      where: {
        habitId_date: { habitId, date: parsedDate },
      },
      update: { value: parseFloat(value) },
      create: {
        value: parseFloat(value),
        date: parsedDate,
        habitId,
      },
    });

    // Get updated habit with entries
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { entries: true },
    });

    if (!habit) {
      return NextResponse.json(
        { message: 'Habit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      goal: habit.goal,
      unit: habit.unit,
      streak: calculateStreak(habit.entries, habit.goal),
      data: formatWeekData(habit.entries, habit.goal),
    });

  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    // Attempt to find the habit based on the provided ID
    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Delete related HabitEntry records first
    await prisma.habitEntry.deleteMany({
      where: { habitId: id },
    });

    // Now delete the habit
    await prisma.habit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[HABIT_DELETE_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

