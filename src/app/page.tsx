'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import Image from "next/image";
import { signOut } from 'next-auth/react';
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine,
  ReferenceArea,
  Area
} from 'recharts';
import {
  Bell, Check, AlertCircle, Droplet, Monitor, Moon, Plus, X,
  Award, TrendingUp, Zap, BookOpen, Dumbbell, Coffee,
  ArrowRight, Lock,
  User,
  Mail,
  LogOut
} from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useNotifications from '../hooks/useNotifications';
import './globals.css';
import {
  Habit, Notification, PerformanceData, ConsistencyData,
  RadarData, AuthFormData, AuthMode, ActiveTab, HabitIcon, HabitUnit, RadarDataPoint
} from '../types/habit';

// Constants
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const sampleData = [
  { name: "Week 1", progress: 35 },
  { name: "Week 2", progress: 60 },
  { name: "Week 3", progress: 85 },
  { name: "Week 4", progress: 95 },
];

const userAvatars = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
];

const iconMap: Record<HabitIcon, JSX.Element> = {
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

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HabitTracker() {
  const { data: session , status} = useSession();
  const router = useRouter();
  const { notifications, addNotification, dismissNotification } = useNotifications();

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form states
  const [newHabitName, setNewHabitName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newHabitGoal, setNewHabitGoal] = useState(1);
  const [newHabitUnit, setNewHabitUnit] = useState<HabitUnit>("times");
  const [newHabitIcon, setNewHabitIcon] = useState<HabitIcon>("award");
  const [checkInValue, setCheckInValue] = useState(0);
  const [reminderHabit, setReminderHabit] = useState<Habit | null>(null);
  const [reminderTime, setReminderTime] = useState("09:00");

  // Auth states
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const performanceData: PerformanceData[] = [
    { name: 'Achieved', value: 70 },
    { name: 'Missed', value: 30 },
  ];

  const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);

  // Get all unique days from the data
  const days = radarData.length > 0
    ? Object.keys(radarData[0]).filter(key => key !== 'name')
    : [];

  // Fetch habits data
  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/habits", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch habits: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setHabits(data);
        if (data.length > 0) setSelectedHabit(data[0]);
      } else {
        throw new Error("Invalid habits data format");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError(error instanceof Error ? error.message : "Error fetching habits");
      toast.error("Failed to load habits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      } else {
        // Scrolling down
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (session?.user) {
      fetchHabits();
    }
  }, [session, fetchHabits]);

  // Check for missing entries
  useEffect(() => {
    const checkMissingEntries = () => {
      const today = new Date().getDay();
      const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentDay = dayMap[today];

      habits.forEach((habit) => {
        const dayData = habit.data.find(d => d.day === currentDay);
        if (dayData && dayData.value === null) {
          addNotification({
            id: habit.id,
            name: habit.name,
          });
        }
      });
    };

    const intervalId = setInterval(checkMissingEntries, 3600000);
    checkMissingEntries();
    return () => clearInterval(intervalId);
  }, [habits, addNotification]);

  // Auth handlers
  const toggleAuthMode = () => {
    setAuthMode(prev => prev === "login" ? "signup" : "login");
    setAuthError("");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      if (authMode === "login") {
        const result = await signIn("credentials", {
          email: authEmail,
          password: authPassword,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        toast.success("Logged in successfully!");
        setShowAuthModal(false);
        router.refresh();
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authName,
            email: authEmail,
            password: authPassword
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Signup failed');
        }

        const loginResult = await signIn("credentials", {
          email: authEmail,
          password: authPassword,
          redirect: false,
        });

        if (loginResult?.error) {
          throw new Error(loginResult.error);
        }

        toast.success("Account created and logged in!");
        setShowAuthModal(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim() || newHabitGoal <= 0) {
      toast.error('Please provide valid habit details');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHabitName.trim(),
          icon: newHabitIcon,
          goal: newHabitGoal,
          unit: newHabitUnit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add habit');
      }

      const newHabit = await response.json();
      setHabits(prev => [...prev, newHabit]);
      setShowAddModal(false);
      resetHabitForm();
      toast.success('Habit created!');
    } catch (error) {
      console.error('Add habit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add habit');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/habits?id=${habitId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete habit');
      }

      // Update local state
      setHabits(prev => prev.filter(h => h.id !== habitId));

      // If we're deleting the currently selected habit, clear it
      if (selectedHabit?.id === habitId) {
        setSelectedHabit(null);
      }

      toast.success('Habit deleted successfully');
    } catch (error) {
      console.error('Delete habit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete habit');
    } finally {
      setLoading(false);
    }
  };

  const resetHabitForm = () => {
    setNewHabitName("");
    setNewHabitGoal(1);
    setNewHabitUnit("times");
    setNewHabitIcon("award");
  };

  const handleSetReminder = async () => {
    if (!reminderHabit) {
      console.error('No habit selected for reminder');
      return;
    }

    try {
      console.log('Attempting to set reminder:', {
        habitId: reminderHabit.id,
        time: reminderTime
      });

      const response = await fetch('/api/notifications/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          habitId: reminderHabit.id,
          time: reminderTime,
        }),
      });

      // First read the response as text to handle empty responses
      const responseText = await response.text();
      let responseData;

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        throw new Error(`Invalid server response: ${responseText.slice(0, 100)}`);
      }

      console.log('Reminder set successfully:', responseData);

      addNotification(
        { id: reminderHabit.id, name: reminderHabit.name },
        `Reminder set for ${reminderHabit.name} at ${reminderTime}`,
        'reminder'
      );

      setShowReminderModal(false);
      setReminderHabit(null);
      toast.success('Reminder set successfully!');

    } catch (error) {
      console.error('Full error details:', {
        error,
        name: error instanceof Error ? error.name : undefined,
        message: error instanceof Error ? error.message : undefined,
        stack: error instanceof Error ? error.stack : undefined
      });

      toast.error(
        error instanceof Error ? error.message : 'Failed to set reminder'
      );
    }
  };

  // Helper functions
  const getCurrentDayData = (habit: Habit) => {
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayName = dayNames[today.getDay()];
    return habit.data.find(d => d.day === currentDayName) || { day: currentDayName, value: null };
  };

  const handleCheckInSubmit = async () => {
    if (!selectedHabit || checkInValue == null) {
      toast.error('Please select a habit and enter a value');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const response = await fetch('/api/habits/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId: selectedHabit.id,
          value: Number(checkInValue),
          date: today.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update habit');
      }

      const updatedHabit = await response.json();

      setHabits(prev => prev.map(h => {
        if (h.id === updatedHabit.id) {
          return {
            ...h,
            ...updatedHabit,
            data: updatedHabit.data || h.data
          };
        }
        return h;
      }));

      setShowCheckInModal(false);
      setCheckInValue(0);
      toast.success('Check-in recorded successfully!');

    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record check-in');
    }
  };

  const prepareChartData = (habit: Habit) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Create a complete week's data structure
    return dayNames.map(dayName => {
      const existingData = habit.data.find(d => d.day === dayName);
      return {
        day: dayName,
        value: existingData?.value !== null ? Number(existingData?.value) : null,
        goal: habit.goal,
        // Additional properties for conditional styling
        isToday: dayName === dayNames[new Date().getDay()],
        isCompleted: existingData?.value != null && (existingData?.value ?? 0) >= habit.goal
      };
    });
  };

  const calculateCompletionPercentage = (habit: Habit) => {
    const validDays = habit.data.filter(d => d.value !== null).length;
    return Math.round((validDays / 7) * 100);
  };

  const getTodaysValue = (habit: Habit) => {
    if (!Array.isArray(habit.data)) return null;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    const todayName = dayNames[todayIndex];

    const todayEntry = habit.data.find(entry => entry.day === todayName);
    return todayEntry?.value ?? null;
  };

  const getProgressPercentage = (habit: Habit) => {
    const value = getTodaysValue(habit);
    if (value === null || habit.goal <= 0) return 0;
    console.log(value)
    return Math.round((value / habit.goal) * 100);
  };

  const getProgressWidth = (habit: Habit) => {
    const value = getTodaysValue(habit);
    if (value === null || habit.goal <= 0) return 0;
    return Math.min((value / habit.goal) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans">

      <header className="bg-black text-white p-5 shadow-lg border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 group cursor-pointer">
            {/* Animated lightning bolt with gradient */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black to-neutral-950 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Zap
                size={28}
                className="text-indigo-400"
                strokeWidth={2.5}
              />
            </div>

            {/* Text with gradient and tracking */}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
              Habitat
              {/* Subtle animated underline */}
              <span className="block h-0.5 w-0 bg-gradient-to-r from-indigo-400 to-amber-400 group-hover:w-full transition-all duration-300 origin-left"></span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <div className="relative">
                  <button className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 hover:text-black transition-all">
                    <Bell size={24} />
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* User dropdown/logout section */}
                <div className="relative group">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold cursor-pointer">
                    {session.user?.name?.charAt(0).toUpperCase()}
                  </div>

                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-900 rounded-md shadow-lg border border-gray-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-200 border-b border-gray-800">
                        {session.user?.name || session.user?.email}
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-opacity-90 hover:border-white transition-all cursor-pointer border border-gray-800"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-black">
        <div className="container mx-auto min-h-[calc(70vh-100px)]">
        
          {!session ? (
            <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            className="bg-neutral-950 p-10 rounded-2xl shadow-lg text-center max-w-6xl mx-auto border border-gray-800 relative overflow-hidden"
          >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,white_0.5px,transparent_0.5px),linear-gradient(white_0.5px,transparent_0.5px)] bg-[size:14px_14px]"></div>
              </div>

              {/* Decorative elements */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                  transition: { duration: 30, repeat: Infinity, ease: "linear" },
                }}
                className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-900/30 rounded-full blur-xl"
              />

              <motion.div
                animate={{
                  rotate: [360, 0],
                  transition: { duration: 40, repeat: Infinity, ease: "linear" },
                }}
                className="absolute -left-20 -bottom-20 w-72 h-72 bg-purple-900/20 rounded-full blur-xl"
              />

              <div className="relative z-10">
                <motion.h2
                  variants={fadeIn}
                  className="text-4xl md:text-5xl font-extrabold text-white mb-6 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent"
                >
                  Transform Your Life <br /> One Habit at a Time
                </motion.h2>

                <motion.p
                  variants={fadeIn}
                  className="text-gray-300 mb-8 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto"
                >
                  With <span className="text-indigo-400 font-semibold">Habitat</span>,
                  you'll build sustainable habits through science-backed tracking,
                  motivational tools, and personalized insights. Our users see an average
                  <span className="text-green-400 font-medium"> 300% improvement </span>
                  in habit consistency within 30 days.
                </motion.p>

                {/* Mini progress chart */}
                <motion.div
                  variants={fadeIn}
                  className="h-64 w-full max-w-2xl mx-auto mb-8"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sampleData}>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tick={{ fill: '#9CA3AF' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tick={{ fill: '#9CA3AF' }}
                      />
                      <Bar
                        dataKey="progress"
                        fill="#6366F1"
                        radius={[4, 4, 0, 0]}
                        animationDuration={2000}
                      >
                        {sampleData.map((entry, index) => (
                          <text
                            x={index * 100 + 25}
                            y={250 - entry.progress * 2 - 5}
                            textAnchor="middle"
                            fill="#E5E7EB"
                            fontSize={12}
                          >
                            {entry.progress}%
                          </text>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* User testimonials */}
                <motion.div
                  variants={fadeIn}
                  className="flex justify-center items-center mb-8 space-x-4"
                >
                  <div className="flex -space-x-3">
                    {/* {userAvatars.map((avatar, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="relative h-12 w-12"
                      >
                        <Image
                          src={avatar}
                          alt="User avatar"
                          width={48}
                          height={48}
                          className="rounded-full border-2 border-indigo-500"
                        />
                        {index === 0 && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-neutral-950"></div>
                        )}
                      </motion.div>
                    ))} */}
                  </div>
                  <div className="text-left">
                    <p className="text-gray-300 text-sm">
                      Join <span className="text-white font-medium">4,382+</span> users
                    </p>
                    <p className="text-gray-400 text-xs">
                      Average rating: <span className="text-yellow-400">4.9/5</span>
                    </p>
                  </div>
                </motion.div>

                {/* Feature highlights */}
                <motion.div
                  variants={fadeIn}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                >
                  {[
                    { icon: "📊", title: "Smart Tracking", desc: "Real-time analytics" },
                    { icon: "🔔", title: "Reminders", desc: "Never miss a day" },
                    { icon: "🏆", title: "Streaks", desc: "Build momentum" },
                    { icon: "📱", title: "Mobile Ready", desc: "Use anywhere" },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ y: -5 }}
                      className="bg-neutral-900/50 p-4 rounded-lg border border-gray-800/50"
                    >
                      <div className="text-2xl mb-2">{feature.icon}</div>
                      <h3 className="text-white font-medium">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.button
                  variants={fadeIn}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuthModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg relative overflow-hidden group"
                >
                  <span className="relative z-10">Start Your Journey — It's Free</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </motion.button>

                <motion.p
                  variants={fadeIn}
                  className="text-gray-500 text-sm mt-4"
                >
                  {/* No credit card required · 7-day free trial */}
                </motion.p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2 text-white">Notifications</h2>
                  <div className="space-y-2">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-amber-500 flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <AlertCircle className="text-amber-500 mr-2" size={20} />
                          <span>{notification.message}</span>
                        </div>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Dismiss notification"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-gray-800 mb-8 relative">
                {/* Animated underline */}
                <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all duration-300 ease-out"
                  style={{
                    width: activeTab === "dashboard" ? '88px' :
                      activeTab === "habits" ? '84px' : '88px',
                    transform: activeTab === "dashboard" ? 'translateX(24px)' :
                      activeTab === "habits" ? 'translateX(124px)' : 'translateX(228px)'
                  }}>
                </div>

                <button
                  className={`px-6 py-4 font-medium text-sm transition-all relative group ${activeTab === "dashboard"
                    ? "text-indigo-400"
                    : "text-gray-400 hover:text-gray-300"
                    }`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  Dashboard
                  {activeTab === "dashboard" && (
                    <div className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                  )}
                  <div className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                <button
                  className={`px-6 py-4 font-medium text-sm transition-all relative group ${activeTab === "habits"
                    ? "text-indigo-400"
                    : "text-gray-400 hover:text-gray-300"
                    }`}
                  onClick={() => setActiveTab("habits")}
                >
                  My Habits
                  {activeTab === "habits" && (
                    <div className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                  )}
                  <div className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                <button
                  className={`px-6 py-4 font-medium text-sm transition-all relative group ${activeTab === "stats"
                    ? "text-indigo-400"
                    : "text-gray-400 hover:text-gray-300"
                    }`}
                  onClick={() => setActiveTab("stats")}
                >
                  Statistics
                  {activeTab === "stats" && (
                    <div className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                  )}
                  <div className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>

              {/* Dashboard Tab */}
              {activeTab === "dashboard" && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 ">
                    {habits.map((habit, index) => (
                      <div
                        key={habit.id || index}
                        className="bg-neutral-950 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-white/50 hover:border-white group relative overflow-hidden"
                        onClick={() => {
                          setSelectedHabit({
                            ...habit,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          });
                          setShowCheckInModal(true);
                        }}
                      >

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHabit(habit);
                            setShowDeleteConfirm(true);
                          }}
                          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 transition-colors z-20"
                          aria-label="Delete habit"
                        >
                          <X size={18} />
                        </button>

                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 to-violet-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                        {/* Subtle grid texture with WHITE lines */}
                        <div className="absolute inset-0 opacity-5 [mask-image:linear-gradient(180deg,white,transparent)]">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,white_0.5px,transparent_0.5px),linear-gradient(white_0.5px,transparent_0.5px)] bg-[size:14px_14px]"></div>
                        </div>

                        <div className="flex justify-between items-start mb-5 relative z-10">
                          <div className="flex items-start">
                            <div className="p-3 rounded-lg bg-gray-800 text-indigo-400 border border-gray-700 shadow-xs">
                              {iconMap[habit.icon as keyof typeof iconMap] || <Award className="text-indigo-400" />}
                            </div>
                            <div className="ml-4">
                              <h3 className="font-bold text-gray-100 text-lg">{habit.name}</h3>
                            </div>
                          </div>
                          <span className="text-xs font-semibold bg-gray-800 text-indigo-300 py-1.5 px-3 rounded-full whitespace-nowrap border border-gray-700">
                            Goal: {habit.goal} {habit.unit}
                          </span>
                        </div>

                        {/* Progress bar with glow */}
                        <div className="mb-6 relative z-10">
                          <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>Progress</span>
                            <span>
                              {getProgressPercentage(habit)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${getProgressWidth(habit)}%`,
                                boxShadow: '0 0 8px 0 rgba(99, 102, 241, 0.4)'
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Stats footer */}
                        <div className="flex justify-between items-center relative z-10">
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/30 mr-3">
                              <Award size={16} className="text-amber-400" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">Streak</div>
                              <div className="font-bold text-gray-100">{habit.streak} day{habit.streak !== 1 ? 's' : ''}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">Today</div>
                            {Array.isArray(habit.data) && habit.data.length > 6 && habit.data[6].value !== null ? (
                              <div className="flex items-center justify-end">
                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_6px_0_rgba(74,222,128,0.5)]"></div>
                                <span className="font-medium text-gray-100">
                                  {habit.data[6].value} {habit.unit}
                                </span>
                                <button
                                  className="ml-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1 px-2 rounded-lg font-medium shadow-xs hover:shadow-sm transition-all border border-indigo-500/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHabit(habit);
                                    setCheckInValue(habit.data[6].value ?? 0);
                                    setShowCheckInModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <button
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-lg font-medium shadow-xs hover:shadow-sm transition-all border border-indigo-500/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHabit(habit);
                                  setCheckInValue(habit.goal); // Pre-fill with goal value or 0
                                  setShowCheckInModal(true);
                                }}
                              >
                                Check in
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add New Habit Card - Dark Version */}
                    <div
                      className="bg-gradient-to-br from-gray-900 to-gray-900/80 p-6 rounded-xl shadow-sm border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-indigo-500/40 transition-all group"
                      onClick={() => setShowAddModal(true)}
                    >
                      <div className="w-14 h-14 bg-gray-800 rounded-full shadow-xs flex items-center justify-center mb-4 group-hover:shadow-sm transition-all border border-gray-700">
                        <Plus size={28} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                      </div>
                      <h3 className="text-indigo-300 font-semibold text-lg mb-1">Add New Habit</h3>
                      <p className="text-sm text-gray-400 text-center max-w-[160px]">Track a new daily activity</p>
                    </div>
                  </div>

                  <div className="bg-black p-6 rounded-2xl shadow-sm border border-white/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Performance</h2>
                        {selectedHabit && (
                          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                            Goal: <span className="font-medium text-indigo-600">{selectedHabit.goal} {selectedHabit.unit}/day</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {habits.map((habit, index) => (
                          <button
                            key={habit.id || index}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${selectedHabit?.id === habit.id
                              ? 'bg-indigo-700 text-black shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                              }`}
                            onClick={() => setSelectedHabit({
                              ...habit,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            })}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${selectedHabit?.id === habit.id ? 'bg-white' : 'bg-white'
                                }`}></div>
                              {habit.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-80 w-full bg-white p-6 rounded-lg shadow-md border border-gray-100 dark:bg-neutral-950 dark:border-white">
                      {selectedHabit ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={selectedHabit.data.map(day => ({
                              day: day.day,
                              value: day.value !== null ? Number(day.value) : 0,
                              goal: selectedHabit.goal,
                            }))}
                            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                          >
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                              </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />

                            <XAxis
                              dataKey="day"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#4B5563', fontSize: 12 }} // Dark gray color
                            />

                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#4B5563', fontSize: 12 }} // Dark gray color
                              width={40}
                            />

                            <Tooltip
                              contentStyle={{
                                background: 'rgba(255, 255, 255, 0.96)',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                padding: '12px',
                              }}
                              formatter={(value, name) => [
                                `${value} ${selectedHabit.unit}`,
                                name === 'goal' ? 'Daily Goal' : name,
                              ]}
                              labelFormatter={(day) => `Day: ${day}`}
                            />

                            <Line
                              type="monotone"
                              dataKey="value"
                              name={selectedHabit.name}
                              stroke="#6366F1" // Indigo color
                              strokeWidth={3}
                              dot={{
                                stroke: '#6366F1', // Indigo color
                                strokeWidth: 2,
                                fill: '#FFFFFF',
                                r: 4,
                              }}
                              activeDot={{
                                r: 6,
                                stroke: '#6366F1', // Indigo color
                                strokeWidth: 2,
                                fill: '#FFFFFF',
                              }}
                              fill="url(#chartGradient)"
                            />

                            <Line
                              type="monotone"
                              dataKey="goal"
                              name="goal"
                              stroke="#10B981" // Green color
                              strokeDasharray="5 5"
                              strokeWidth={2}
                              dot={false}
                              activeDot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                          Select a habit to view chart
                        </div>
                      )}
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
                <div className="bg-black p-6 rounded-2xl shadow-sm border border-gray-100/50">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">My Habits</h2>
                    <button
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-indigo-700 shadow-sm transition-all duration-200 hover:shadow-md group"
                      onClick={() => setShowAddModal(true)}
                      disabled={loading}
                    >
                      <Plus size={18} className="mr-2 transition-transform group-hover:rotate-90" />
                      <span className="font-medium">Add Habit</span>
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center py-12 bg-black">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="text-red-500 mr-2" size={20} />
                        <div>
                          <h3 className="text-sm font-medium text-red-800">Error loading habits</h3>
                          <p className="text-sm text-red-700">{error}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : habits.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <Award className="text-indigo-500" size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No habits yet</h3>
                      <p className="text-gray-500 mb-6">Get started by adding your first habit</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md"
                      >
                        Add Your First Habit
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                      {habits.map(habit => {
                        const validDays = (habit.data || []).filter((d: { value: any }) => d.value !== null && d.value !== undefined).length;
                        const completionPercentage = Math.round((validDays / 7) * 100);
                        const today = new Date();
                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const currentDayName = dayNames[today.getDay()];
                        const currentDayData = (habit.data || []).find((d: { day: string }) => d.day === currentDayName);

                        return (
                          <div
                            key={habit.id}
                            className="bg-neutral-950 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-white/50 hover:border-white group relative overflow-hidden"
                          >
                            {/* Background elements - responsive */}
                            <div className="absolute inset-0 opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]">
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_0.5px,transparent_0.5px),linear-gradient(#000_0.5px,transparent_0.5px)] bg-[size:14px_14px]"></div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                            {/* Main content container */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start relative z-10 gap-4">
                              {/* Habit info - responsive layout */}
                              <div className="flex flex-col xs:flex-row gap-4">
                                <div className="p-2 sm:p-3 bg-gray-900 rounded-xl border border-gray-800 shadow-sm flex-shrink-0">
                                  {iconMap[habit.icon as keyof typeof iconMap] || <Award className="text-indigo-400 w-5 h-5 sm:w-6 sm:h-6" />}
                                </div>

                                <div>
                                  <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                                    <h3 className="font-semibold text-base sm:text-lg text-gray-100 line-clamp-1">
                                      {habit.name || 'Unnamed Habit'}
                                    </h3>
                                    {habit.streak > 0 && (
                                      <div className="flex items-center bg-gray-800/80 text-amber-300 text-xs font-medium px-2 py-0.5 rounded-full border border-amber-800/50 w-fit">
                                        <span className="text-amber-400 mr-1">🔥</span>
                                        {habit.streak} day{habit.streak !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                    Daily goal: <span className="font-medium text-gray-300">{habit.goal || 0} {habit.unit || 'times'}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Action buttons - responsive layout */}
                              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
                                <button
                                  className="text-amber-400 hover:text-amber-300 font-medium px-3 py-1.5 border border-amber-900 rounded-lg hover:bg-amber-900/20 transition-all text-xs sm:text-sm shadow-xs hover:shadow-sm backdrop-blur-sm w-full sm:w-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReminderHabit(habit);
                                    setShowReminderModal(true);
                                  }}
                                >
                                  Remind Me
                                </button>
                                <button
                                  className="text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 border border-indigo-900 rounded-lg hover:bg-indigo-900/20 transition-all text-xs sm:text-sm shadow-xs hover:shadow-sm backdrop-blur-sm w-full sm:w-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHabit(habit);
                                    setShowCheckInModal(true);
                                  }}
                                >
                                  {currentDayData?.value !== null && currentDayData?.value !== undefined ? 'Update' : 'Check In'}
                                </button>
                              </div>
                            </div>

                            {/* Progress section - responsive */}
                            <div className="mt-4 sm:mt-5 relative z-10">
                              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                                <span className="font-medium text-gray-300">This week</span>
                                <span className="bg-gray-800 text-indigo-300 py-1 px-2 rounded-md text-xs font-medium border border-gray-700">
                                  {validDays}/7 days
                                </span>
                              </div>

                              <div className="relative">
                                <div className="w-full bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${completionPercentage}%`,
                                      boxShadow: '0 0 8px 0 rgba(99, 102, 241, 0.3)'
                                    }}
                                  ></div>
                                </div>
                              </div>

                              {/* Weekday indicators - responsive */}
                              <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-3 sm:mt-4">
                                {dayNames.map((dayName, index) => {
                                  const dayData = (habit.data || []).find((d: { day: string }) => d.day === dayName);
                                  const value = dayData?.value;
                                  const isToday = dayName === currentDayName;

                                  return (
                                    <div
                                      key={dayName}
                                      className="flex flex-col items-center group relative"
                                      data-tooltip={`${dayName}: ${value !== null && value !== undefined ? `${value} ${habit.unit || 'times'}` : 'Not logged'}`}
                                    >
                                      <span className={`text-[10px] xs:text-xs ${isToday ? 'text-indigo-400 font-bold' : 'text-gray-500'} group-hover:text-gray-300 transition-colors`}>
                                        {dayName.substring(0, 1)}
                                      </span>
                                      <div className={`
              w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-1 sm:mt-2 transition-all
              ${value !== null && value !== undefined ?
                                          (value >= (habit.goal || 0) ?
                                            'bg-green-500 shadow-[0_0_6px_0] shadow-green-500/30' :
                                            'bg-amber-500 shadow-[0_0_6px_0] shadow-amber-500/30') :
                                          'bg-gray-700'}
              ${isToday ? 'ring-1 sm:ring-2 ring-indigo-500/80' : ''}
              group-hover:scale-125
            `}></div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  )}
                </div>
              )}

              {/* Statistics Tab - completed*/}
              {activeTab === "stats" && (
                <div className="space-y-8">
                  {/* Performance Overview */}
                  <div className="bg-black p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-xl font-bold text-white mb-6">Performance Overview</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Pie Chart */}
                      <div className="h-80 bg-neutral-950 rounded-2xl shadow-lg p-4 flex items-center justify-center border border-white/20 hover:border-white">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart width={400} height={400}>
                            <Pie
                              data={performanceData}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              innerRadius={50}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {performanceData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                  stroke="#1f2937"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>

                            <Tooltip
                              formatter={(value, name, props) => {
                                const total = performanceData.reduce((sum, item) => sum + item.value, 0);
                                const percentage = ((Number(value) / Number(total)) * 100).toFixed(1);
                                return [`${value} (${percentage}%)`, name];
                              }}
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                                borderRadius: '8px',
                                color: 'white',
                                padding: '12px'
                              }}
                            />

                            <Legend
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{
                                paddingTop: '20px'
                              }}
                              formatter={(value, entry, index) => (
                                <span className="text-white">
                                  {value}: {performanceData[index].value}
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Line Chart */}
                      <div className="h-80 w-full bg-neutral-950 p-4 rounded-xl shadow-lg border border-white/20 hover:border-white">
                        {selectedHabit ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={selectedHabit.data.map((day) => ({
                                ...day,
                                value: day.value !== null ? Number(day.value) : 0,
                                goal: selectedHabit.goal,
                              }))}
                              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                            >
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                </linearGradient>
                              </defs>

                              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#374151" />

                              <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                              />

                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                                width={40}
                              />

                              <Tooltip
                                contentStyle={{
                                  background: '#1F2937',
                                  border: '1px solid #4B5563',
                                  borderRadius: '0.5rem',
                                  color: '#F9FAFB',
                                  padding: '12px',
                                }}
                                labelStyle={{ color: '#D1D5DB', fontWeight: 'bold' }}
                                formatter={(value, name) => [
                                  `${value} ${selectedHabit.unit}`,
                                  name === 'goal' ? 'Daily Goal' : name,
                                ]}
                                labelFormatter={(day) => `Day: ${day}`}
                              />

                              <Line
                                type="monotone"
                                dataKey="value"
                                name={selectedHabit.name}
                                stroke="#6366F1"
                                strokeWidth={3}
                                dot={{
                                  stroke: '#6366F1',
                                  strokeWidth: 2,
                                  fill: '#FFFFFF',
                                  r: 4,
                                }}
                                activeDot={{
                                  r: 6,
                                  stroke: '#6366F1',
                                  strokeWidth: 2,
                                  fill: '#FFFFFF',
                                }}
                                fill="url(#chartGradient)"
                              />

                              <Line
                                type="monotone"
                                dataKey="goal"
                                name="Goal"
                                stroke="#10B981"
                                strokeDasharray="6 4"
                                strokeWidth={2}
                                dot={false}
                                activeDot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">
                            Select a habit to view chart
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  <div className="bg-black p-8 rounded-xl shadow-md border border-white/50">
                    <div className="bg-neutral-950 p-8 rounded-xl shadow-md border border-white/20 hover:border-white">
                      <h2 className="text-xl font-bold text-white mb-6">Detailed Analysis</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-4">Streak Leaders</h3>
                          <div className="space-y-3">
                            {habits
                              .sort((a, b) => b.streak - a.streak)
                              .map(habit => (
                                <div
                                  key={habit.id}
                                  className="flex items-center justify-between p-4 rounded-lg border border-gray-800 hover:bg-gray-800/50 transition-colors duration-200 group relative overflow-hidden"
                                >
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{
                                      boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)'
                                    }}
                                  ></div>

                                  <div className="flex items-center">
                                    <div className="p-1 rounded-lg bg-gray-800 border border-gray-700 text-indigo-400">
                                      {iconMap[habit.icon as keyof typeof iconMap] || <Award className="text-amber-400" />}
                                    </div>
                                    <span className="ml-3 font-medium text-gray-100 group-hover:text-white transition-colors">
                                      {habit.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center">
                                    <div className="relative">
                                      <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                      <Award className="text-amber-400 relative z-10" size={18} />
                                    </div>
                                    <span className="ml-1 text-amber-200">
                                      {habit.streak} day{habit.streak !== 1 ? 's' : ''} streak
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Section */}
        <motion.footer
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative bg-black text-white border-t border-gray-800 mt-10"
        >
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center pointer-events-none"
            style={{
              backgroundImage: "url('https://source.unsplash.com/1600x400/?habits,nature')",
            }}
          ></div>

          <div className="relative container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              {/* Brand */}
              <div>
                <div className="flex items-center space-x-3">
                  <Zap size={28} className="text-indigo-400 animate-pulse" />
                  <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-amber-300 bg-clip-text text-transparent">
                    Habitat
                  </span>
                </div>
                <p className="text-gray-400 mt-3 text-sm max-w-xs">
                  Build better habits, one day at a time. Track, grow, and thrive.
                </p>
              </div>

              {/* Links */}
              {/* <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </div> */}
            </div>

            <div className="mt-10 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} Habitat. All rights reserved.
            </div>
          </div>
        </motion.footer>
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How many {selectedHabit?.unit} of {selectedHabit?.name} today?
                </label>
                <input
                  type="number"
                  min="0"
                  step={selectedHabit?.unit === "hours" || selectedHabit?.unit === "minutes" ? "0.1" : "1"}
                  value={checkInValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCheckInValue(value === '' ? 0 : Number(value));
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckInSubmit()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-xl"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Goal: {selectedHabit?.goal} {selectedHabit?.unit}
                </p>
              </div>

              <button
                onClick={handleCheckInSubmit}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save Check-In
              </button>
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

      {showAuthModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {authMode === "login" ? "Welcome back" : "Create your account"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {authMode === "login"
                    ? "Sign in to continue your journey"
                    : "Start building better habits today"}
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {authError && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-start border border-red-200 dark:border-red-800/50"
                >
                  <AlertCircle className="flex-shrink-0 mt-0.5 mr-2" size={16} />
                  <span className="text-sm">{authError}</span>
                </motion.div>
              )}

              {authMode === "signup" && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600 dark:focus:border-indigo-600 transition-all text-white"
                      required
                      placeholder="John Doe"
                    />
                    <User className="absolute right-3 top-3.5 text-gray-400" size={18} />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600 dark:focus:border-indigo-600 transition-all text-white"
                    required
                    placeholder="your@email.com"
                  />
                  <Mail className="absolute right-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600 dark:focus:border-indigo-600 transition-all text-white"
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-3 top-3.5 text-gray-400" size={18} />
                </div>
                {authMode === "signup" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Minimum 6 characters with at least 1 number
                  </p>
                )}
              </div>

              {authMode === "signup" && (
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      aria-describedby="terms"
                      type="checkbox"
                      className="w-4 h-4 border border-gray-300 rounded bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 text-indigo-600 dark:text-indigo-500"
                      required
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-light text-gray-600 dark:text-gray-400">
                      I agree to the{" "}
                      <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Terms & Conditions
                      </a>{" "}
                      and{" "}
                      <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-700 dark:to-indigo-600 text-white py-3.5 rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center shadow-indigo-500/20"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {authMode === "login" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {authMode === "login" ? "Sign In" : "Get Started"}
                      <ArrowRight className="ml-2" size={18} />
                    </>
                  )}
                </motion.button>
              </div>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                {authMode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={toggleAuthMode}
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={toggleAuthMode}
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>

            {authMode === "login" && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    {/* <div className="w-full border-t border-gray-300 dark:border-gray-700"></div> */}
                  </div>
                  {/* <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                      Or continue with
                    </span>
                  </div> */}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {/* <button
                    type="button"
                    onClick={() => signIn("google")}
                    className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.784-1.664-4.141-2.675-6.735-2.675-5.522 0-10 4.477-10 10s4.478 10 10 10c8.396 0 10-7.496 10-10 0-0.67-0.069-1.325-0.201-1.955h-9.799z" />
                    </svg>
                  </button> */}

                  {/* <button
                    type="button"
                    onClick={() => signIn("github")}
                    className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </button> */}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {showDeleteConfirm && selectedHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Delete Habit</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-semibold">"{selectedHabit.name}"</span>?
                This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteHabit(selectedHabit.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all shadow-md"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Habit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

