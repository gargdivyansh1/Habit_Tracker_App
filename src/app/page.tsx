'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Bell, Check, AlertCircle, Droplet, Monitor, Moon, Plus, X,
  Award, TrendingUp, Zap, BookOpen, Dumbbell, Coffee
} from 'lucide-react';
import prisma from '@/lib/prisma'
import type { Habit } from '@/generated/prisma';
import { useSession } from 'next-auth/react';
import { FrontendHabit } from '@/types/habit';
import './globals.css';
import toast from 'react-hot-toast'

export default function HabitTracker() {

  const { data: session} = useSession();

  const [habits, setHabits] = useState<FrontendHabit[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<(Habit & { data: { day: string; value: number | null }[] }) | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState<string>("");
  const [newHabitGoal, setNewHabitGoal] = useState<number>(1);
  const [newHabitUnit, setNewHabitUnit] = useState<"times" | "hours" | "glasses" | "pages" | "minutes">("times");
  const [newHabitIcon, setNewHabitIcon] = useState<"award" | "sleep" | "water" | "screen" | "trending" | "reading" | "workout" | "coffee" | "energy">("award");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInValue, setCheckInValue] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; habit: string; message: string }[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderHabit, setReminderHabit] = useState<typeof habits[0] | null>(null);
  const [reminderTime, setReminderTime] = useState("09:00");

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const iconMap = {
    sleep: <Moon className="text-indigo-500" />,
    water: <Droplet className="text-blue-500" />,
    screen: <Monitor className="text-red-500" />,
    award: <Award className="text-amber-500" />,
    trending: <TrendingUp className="text-green-500" />,
    reading: <BookOpen className="text-emerald-500" />,
    workout: <Dumbbell className="text-rose-500" />,
    coffee: <Coffee className="text-amber-700" />,
    energy: <Zap className="text-yellow-500" />
  };

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const response = await fetch('/api/habits');
        const data = await response.json();
        setHabits(data);
        if (data.habits.length > 0) {
          setSelectedHabit(data.habits[0]);
        }
      } catch (error) {
        console.error("Error fetching habits: ", error)
      }
    }
  });

  const calculateSummary = () => {
    const summary: { [key: string]: { completion: number; performance: number } } = {};
    habits.forEach(habit => {
      const completedDays = habit.data.filter(day => day.value !== null).length;
      const goalMet = habit.data.filter(day => day.value !== null && day.value >= habit.goal).length;
      summary[habit.id] = {
        completion: completedDays / 7 * 100,
        performance: goalMet / (completedDays || 1) * 100
      };
    });
    return summary;
  };

  const summary = calculateSummary();

  // Generate statistics data
  const generateStatsData = () => {
    // Performance by habit
    const performanceData = habits.map(habit => {
      const completedDays = habit.data.filter(day => day.value !== null).length;
      const goalMet = habit.data.filter(day => day.value !== null && day.value >= habit.goal).length;
      return {
        name: habit.name,
        value: (goalMet / (completedDays || 1) * 100).toFixed(1)
      };
    });

    // Consistency by day
    const dayMap = {
      "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6
    };

    const consistencyByDay = [0, 0, 0, 0, 0, 0, 0]; // For each day of week
    const totalHabits = habits.length;

    habits.forEach(habit => {
      habit.data.forEach(day => {
        if (day.value !== null && day.value >= habit.goal) {
          consistencyByDay[dayMap[day.day as keyof typeof dayMap]] += 1;
        }
      });
    });

    const consistencyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
      return {
        day: day,
        completion: (consistencyByDay[index] / totalHabits * 100).toFixed(1)
      };
    });

    // Radar chart data for habit performance
    const radarData = habits.map(habit => {
      const dataObj: { [key: string]: string | number } = { name: habit.name };
      habit.data.forEach(day => {
        if (day.value !== null) {
          dataObj[day.day] = (day.value / habit.goal * 100).toFixed(0);
        } else {
          dataObj[day.day] = 0;
        }
      });
      return dataObj;
    });

    return { performanceData, consistencyData, radarData };
  };

  const { performanceData, consistencyData, radarData } = generateStatsData();

  // Handle habit check-in
  const handleCheckIn = async () => {
    if (checkInValue > 0 && selectedHabit) {
      try {
        const response = await fetch('/api/habits/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            habitId: selectedHabit.id,
            value: checkInValue,
            data: new Date().toISOString()
          })
        })

        const updatedHabit = await response.json();

        const updatedHabits = habits.map(habits => {
          if (habits.id === updatedHabit.id) {
            return updatedHabit;
          }
          return habits;
        })

        setHabits(updatedHabits);
        setSelectedHabit(updatedHabit);
        setShowCheckInModal(false);
        setCheckInValue(0);

      } catch (error) {
        console.error("Error updating habit: ", error)
      }
    }
  }


  // Add new habit
  const handleAddHabit = async () => {
    if (newHabitName.trim() !== "" && newHabitGoal > 0) {
      try {
        const response = await fetch('/api/habits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newHabitName.trim(),
            icon: newHabitIcon,
            goal: newHabitGoal,
            unit: newHabitUnit,
          }),
        });

        const newHabit = await response.json();
        const updatedHabits = [...habits, newHabit];

        setHabits(updatedHabits);
        setShowAddModal(false);
        setNewHabitName("");
        setNewHabitGoal(1);
        setNewHabitUnit("times");
      } catch (error) {
        console.error('Error adding new habit:', error);
      }
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss notification');
      }

      setNotifications(prev => prev.filter(notif => notif.id !== id));
      toast.success('Notification dismissed');
    } catch (error) {
      console.error("Error dismissing notification:", error);
      toast.error('Failed to dismiss notification');
    }
  };

  // Set reminder
  const handleSetReminder = async () => {
    if (!reminderHabit) return;

    try {
      const response = await fetch('/api/notifications/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          habitId: reminderHabit.id,
          time: reminderTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set reminder');
      }

      const { notification } = await response.json();
      setNotifications(prev => [...prev, notification]);
      setShowReminderModal(false);
      setReminderHabit(null);
      setReminderTime("09:00");
    } catch (error) {
      console.error('Error setting reminder:', error);
      // Add user feedback here
    }
  };

  // Check progress
  useEffect(() => {
    const checkMissingEntries = () => {
      const today = new Date().getDay();
      const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentDay = dayMap[today];

      habits.forEach((habit: { data: any[]; name: any; }) => {
        const dayData = habit.data.find((d: { day: string; }) => d.day === currentDay);
        if (dayData && dayData.value === null) {
          const notificationExists = notifications.some(n => n.habit === habit.name && n.message.includes("Don't forget"));

          if (!notificationExists) {
            setNotifications(prev => [
              ...prev,
              {
                id: (prev.length + 1).toString(),
                habit: habit.name,
                message: `Don't forget to log your ${habit.name} for today!`
              }
            ]);
          }
        }
      });
    };

    checkMissingEntries();

    const intervalId = setInterval(checkMissingEntries, 3600000);

    return () => clearInterval(intervalId);
  }, [habits, notifications]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans">

      <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-5 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Zap size={28} className="text-white" />
            <h1 className="text-2xl font-extrabold tracking-tight">Habitat</h1>
          </div>
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all">
              <Bell size={24} />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto">
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Notifications</h2>
              <div className="space-y-2">
                {notifications.map(notification => (
                  <div key={notification.id} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-amber-500 flex justify-between items-center">
                    <div className="flex items-center">
                      <AlertCircle className="text-amber-500 mr-2" size={20} />
                      <span>{notification.message}</span>
                    </div>
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b mb-8">
            <button
              className={`px-6 py-3 font-medium text-sm transition-all ${activeTab === "dashboard" ? "text-indigo-600 border-b-2 border-indigo-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`px-6 py-3 font-medium text-sm transition-all ${activeTab === "habits" ? "text-indigo-600 border-b-2 border-indigo-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("habits")}
            >
              My Habits
            </button>
            <button
              className={`px-6 py-3 font-medium text-sm transition-all ${activeTab === "stats" ? "text-indigo-600 border-b-2 border-indigo-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("stats")}
            >
              Statistics
            </button>
          </div>

          {activeTab === "dashboard" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100"
                    onClick={() => {
                      setSelectedHabit({
                        ...habit,
                        userId: '',
                        createdAt: new Date(), 
                        updatedAt: new Date(), 
                      });
                      setShowCheckInModal(true);
                    }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-gray-50">
                          {iconMap[habit.icon as keyof typeof iconMap]}
                        </div>
                        <h3 className="font-bold ml-3 text-gray-800">{habit.name}</h3>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 py-1.5 px-3 rounded-full">
                          Goal: {habit.goal} {habit.unit}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 mb-4">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min((habit.data[6].value || 0) / habit.goal * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-medium">Streak</div>
                        <div className="flex items-center">
                          <Award size={16} className="text-amber-500 mr-1" />
                          <span className="font-bold text-gray-800">{habit.streak} days</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-medium">Today</div>
                        {habit.data[6].value !== null ? (
                          <div className="flex items-center">
                            <Check size={16} className="text-green-500 mr-1" />
                            <span className="font-medium">{habit.data[6].value} {habit.unit}</span>
                          </div>
                        ) : (
                          <button
                            className="text-xs bg-indigo-600 text-white py-1.5 px-3 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-all"
                          >
                            Check in
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div
                  className="bg-gradient-to-br from-indigo-50 to-violet-50 p-5 rounded-xl shadow-md border-2 border-dashed border-indigo-200 flex items-center justify-center cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all"
                  onClick={() => setShowAddModal(true)}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3">
                      <Plus size={24} className="text-indigo-500" />
                    </div>
                    <span className="text-indigo-700 font-medium block">Add New Habit</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Weekly Performance</h2>
                    {selectedHabit && (
                      <p className="text-sm text-gray-500 mt-1">
                        Goal: <span className="font-medium text-indigo-600">{selectedHabit.goal} {selectedHabit.unit}/day</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {habits.map(habit => (
                      <button
                        key={habit.id}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedHabit?.id === habit.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        onClick={() => setSelectedHabit({
                          ...habit,
                          userId: '', 
                          createdAt: new Date(), 
                          updatedAt: new Date() 
                        })}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selectedHabit?.id === habit.id ? 'bg-white' : 'bg-indigo-600'
                            }`}></div>
                          {habit.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={selectedHabit ? selectedHabit.data : []}
                      margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f3f4f6"
                      />

                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickMargin={10}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickMargin={10}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #e5e7eb',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(4px)',
                          padding: '12px'
                        }}
                        formatter={(value, name) => [
                          `${value} ${selectedHabit?.unit || ''}`,
                          name === 'Goal' ? 'Daily Goal' : name
                        ]}
                        labelFormatter={(day) => `Day: ${day}`}
                      />

                      <Legend
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => (
                          <span className="text-gray-600 text-sm">{value === 'Goal' ? 'Daily Goal' : value}</span>
                        )}
                      />

                      <Line
                        type="monotone"
                        dataKey="value"
                        name={selectedHabit?.name || "Value"}
                        stroke="#6366F1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        dot={{
                          stroke: '#6366F1',
                          strokeWidth: 2,
                          r: 4,
                          fill: 'white',
                          strokeOpacity: 0.8
                        }}
                        activeDot={{
                          r: 8,
                          stroke: '#6366F1',
                          strokeWidth: 2,
                          fill: '#6366F1',
                          strokeOpacity: 1
                        }}
                      />

                      {selectedHabit && (
                        <Line
                          type="monotone"
                          dataKey={() => selectedHabit.goal}
                          name="Goal"
                          stroke="#10B981"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          strokeOpacity={0.8}
                          dot={false}
                          activeDot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex justify-center gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></div>
                    Actual
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full border-2 border-emerald-500 mr-2"></div>
                    Goal
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Habits Tab */}
          {activeTab === "habits" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Habits</h2>
                <button
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-indigo-700 shadow-sm transition-all duration-200 hover:shadow-md group"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={18} className="mr-2 transition-transform group-hover:rotate-90" />
                  <span className="font-medium">Add Habit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    className="border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50 hover:border-indigo-100/50 relative overflow-hidden"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex items-center">
                        <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-100">
                          {iconMap[habit.icon as keyof typeof iconMap]}
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-lg text-gray-900">{habit.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">Daily goal: <span className="font-medium text-gray-700">{habit.goal} {habit.unit}</span></p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          className="text-amber-600 hover:text-amber-800 font-medium px-3 py-1.5 border border-amber-100 rounded-lg hover:bg-amber-50/50 transition-all text-sm shadow-xs hover:shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReminderHabit(habit);
                            setShowReminderModal(true);
                          }}
                        >
                          Remind Me
                        </button>
                        <button
                          className="text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 border border-indigo-100 rounded-lg hover:bg-indigo-50/50 transition-all text-sm shadow-xs hover:shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHabit({
                              ...habit,
                              userId: '', 
                              createdAt: new Date(),
                              updatedAt: new Date(), 
                            });
                            setShowCheckInModal(true);
                          }}
                        >
                          Check In
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 relative z-10">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">This week</span>
                        <span className="bg-indigo-50 text-indigo-700 py-1 px-2 rounded-md text-xs font-medium">
                          {habit.data.filter(d => d.value !== null).length}/7 days
                        </span>
                      </div>

                      {/* Progress bar with glow */}
                      <div className="relative">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${(habit.data.filter(d => d.value !== null).length / 7) * 100}%`,
                              boxShadow: '0 2px 8px -1px rgba(99, 102, 241, 0.3)'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between mt-4">
                        {habit.data.map((day, index) => (
                          <div
                            key={index}
                            className="flex flex-col items-center group relative"
                            data-tooltip={`${day.value !== null ? `${day.value} ${habit.unit}` : 'Not logged'}`}
                          >
                            <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">{day.day.substring(0, 1)}</span>
                            <div className={`
                    w-3 h-3 rounded-full mt-2 transition-all
                    ${day.value !== null ?
                                (day.value >= habit.goal ?
                                  'bg-green-400 shadow-green-200/50' :
                                  'bg-amber-400 shadow-amber-200/50') :
                                'bg-gray-200'}
                    group-hover:scale-125
                  `}></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Streak badge */}
                    {habit.streak > 0 && (
                      <div className="absolute top-4 right-4 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-200/50">
                        🔥 {habit.streak} day streak
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === "stats" && (
            <div className="space-y-8">
              {/* Performance Overview */}
              <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Performance Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pie Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Goal Achievement Rate</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={performanceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {performanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Consistency by Day</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={consistencyData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" />
                          <YAxis label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Bar dataKey="completion" fill="#6366F1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Detailed Analysis</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Radar Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Habit Performance Map</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius={90} data={[radarData[0]]}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          {habits.map((habit, index) => (
                            <Radar
                              key={habit.id}
                              name={habit.name}
                              dataKey={(value) => value}
                              stroke={COLORS[index % COLORS.length]}
                              fill={COLORS[index % COLORS.length]}
                              fillOpacity={0.3}
                            />
                          ))}
                          <Tooltip />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Streak Leaders */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Streak Leaders</h3>
                    <div className="space-y-4">
                      {habits
                        .sort((a, b) => b.streak - a.streak)
                        .map(habit => (
                          <div key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              {iconMap[habit.icon as keyof typeof iconMap]}
                              <span className="ml-3 font-medium text-gray-800">{habit.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Award className="text-amber-500 mr-2" size={18} />
                              <span className="font-bold">{habit.streak} day streak</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add New Habit</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Habit Name</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Exercise, Reading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Goal</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    value={newHabitGoal}
                    onChange={(e) => setNewHabitGoal(parseInt(e.target.value) || 1)}
                    className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <select
                    value={newHabitUnit}
                    onChange={(e) => setNewHabitUnit(e.target.value as "times" | "hours" | "glasses" | "pages" | "minutes")}
                    className="ml-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="times">times</option>
                    <option value="hours">hours</option>
                    <option value="glasses">glasses</option>
                    <option value="pages">pages</option>
                    <option value="minutes">minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(iconMap).map(iconKey => (
                    <button
                      key={iconKey}
                      className={`p-3 rounded-lg flex items-center justify-center ${newHabitIcon === iconKey ? 'bg-indigo-100 border-2 border-indigo-300' : 'bg-gray-100 hover:bg-gray-200'}`}
                      onClick={() => setNewHabitIcon(iconKey as "award" | "sleep" | "water" | "screen" | "trending" | "reading" | "workout" | "coffee" | "energy")}
                    >
                      {iconMap[iconKey as keyof typeof iconMap]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleAddHabit}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md"
                >
                  Create Habit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCheckInModal && selectedHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Log {selectedHabit.name}</h3>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="p-4 bg-indigo-100 rounded-full">
                  {iconMap[selectedHabit.icon as keyof typeof iconMap]}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How many {selectedHabit.unit} of {selectedHabit.name} today?
                </label>
                <input
                  type="number"
                  min="0"
                  step={selectedHabit.unit === "hours" || selectedHabit.unit === "minutes" ? "0.1" : "1"}
                  value={checkInValue}
                  onChange={(e) => setCheckInValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-xl"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Goal: {selectedHabit.goal} {selectedHabit.unit}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCheckIn}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && reminderHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Set Reminder for {reminderHabit.name}</h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="p-4 bg-amber-100 rounded-full">
                  <Bell size={24} className="text-amber-600" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-center text-xl"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSetReminder}
                  className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-all shadow-md"
                >
                  Set Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );


};
