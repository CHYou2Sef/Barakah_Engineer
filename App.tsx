
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Settings, 
  Moon, 
  Sun, 
  Zap, 
  Activity, 
  Coffee, 
  Book, 
  Dumbbell, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Brain,
  Sparkles,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Globe,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Edit2,
  FileText,
  Camera,
  Loader2
} from 'lucide-react';
import { AppMode, TaskCategory, ScheduleTask, Priority, Language, PrayerTimes } from './types';
import { PRO_SCHEDULE, SIMPLE_SCHEDULE, WORKOUT_SPLITS } from './constants';
import { GoogleGenAI } from "@google/genai";

const CATEGORY_ICONS = {
  [TaskCategory.PRAYER]: <Sparkles className="w-5 h-5 text-amber-400" />,
  [TaskCategory.MEAL]: <Coffee className="w-5 h-5 text-emerald-400" />,
  [TaskCategory.WORK]: <Brain className="w-5 h-5 text-blue-400" />,
  [TaskCategory.TRAINING]: <Dumbbell className="w-5 h-5 text-rose-400" />,
  [TaskCategory.REST]: <Moon className="w-5 h-5 text-indigo-400" />,
  [TaskCategory.OTHER]: <Zap className="w-5 h-5 text-slate-400" />,
};

const PRIORITY_COLORS = {
  [Priority.HIGH]: 'border-rose-500/50 text-rose-500 bg-rose-500/10',
  [Priority.MEDIUM]: 'border-amber-500/50 text-amber-500 bg-amber-500/10',
  [Priority.LOW]: 'border-blue-500/50 text-blue-500 bg-blue-500/10',
};

const TRANSLATIONS = {
  [Language.EN]: { schedule: "Schedule", progress: "Daily Progress", tip: "Engineering Barakah Tip", add: "Add Task", ai: "AI Sync", prayers: "Prayer Times", cal: "Calendar", edit: "Edit Task", save: "Save Mission", upload: "Upload Schedule", aiPrompt: "Paste text or upload image/PDF" },
  [Language.AR]: { schedule: "الجدول", progress: "التقدم اليومي", tip: "نصيحة البركة", add: "إضافة مهمة", ai: "مزامنة الذكاء", prayers: "مواقيت الصلاة", cal: "التقويم", edit: "تعديل المهمة", save: "حفظ المهمة", upload: "رفع الجدول", aiPrompt: "ألصق نصاً أو ارفع صورة/PDF" },
  [Language.FR]: { schedule: "Emploi du temps", progress: "Progrès Quotidien", tip: "Conseil Barakah", add: "Ajouter", ai: "Sync IA", prayers: "Heures de Prière", cal: "Calendrier", edit: "Modifier", save: "Enregistrer", upload: "Charger Calendrier", aiPrompt: "Coller texte ou image/PDF" },
};

const App: React.FC = () => {
  // --- STATE ---
  const [mode, setMode] = useState<AppMode>(AppMode.PRO);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<Language>(Language.EN);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTip, setCurrentTip] = useState("Aligning your intentions...");
  const [view, setView] = useState<'daily' | 'calendar'>('daily');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New/Edit Task Form State
  const [taskForm, setTaskForm] = useState<Partial<ScheduleTask>>({
    title: '', time: '09:00', priority: Priority.MEDIUM, category: TaskCategory.WORK, description: ''
  });

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('barakah_tasks_v2');
    if (saved) {
      setTasks(JSON.parse(saved));
    } else {
      setTasks(mode === AppMode.PRO ? PRO_SCHEDULE : SIMPLE_SCHEDULE);
    }
  }, [mode]);

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('barakah_tasks_v2', JSON.stringify(tasks));
    }
  }, [tasks]);

  // --- API CALLS ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&method=4`);
          const data = await res.json();
          setPrayerTimes(data.data.timings);
        } catch (e) { console.error("Prayer fetch failed", e); }
      });
    }
  }, []);

  const fetchDailyTip = useCallback(async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Give a powerful one-sentence productivity tip in ${lang} for a Muslim Software Engineer focusing on muscle gain and discipline. Under 20 words.`,
      });
      setCurrentTip(response.text || "Discipline is the key.");
    } catch (err) {
      setCurrentTip("Strength comes from faith and focus.");
    } finally {
      setIsAiLoading(false);
    }
  }, [lang]);

  // --- TASK ACTIONS ---
  const toggleTask = (id: string) => {
    const isNowCompleted = !tasks.find(t => t.id === id)?.isCompleted;
    if (isNowCompleted) {
      setJustCompletedId(id);
      setTimeout(() => setJustCompletedId(null), 1000);
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: isNowCompleted } : t));
  };

  const deleteTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleEditClick = (e: React.MouseEvent, task: ScheduleTask) => {
    e.stopPropagation();
    setEditingTask(task);
    setTaskForm(task);
    setShowTaskModal(true);
  };

  const saveTask = () => {
    if (!taskForm.title) return;
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskForm } as ScheduleTask : t).sort((a,b) => a.time.localeCompare(b.time)));
    } else {
      const task: ScheduleTask = { ...taskForm as ScheduleTask, id: Date.now().toString(), isCompleted: false };
      setTasks(prev => [...prev, task].sort((a, b) => a.time.localeCompare(b.time)));
    }
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskForm({ title: '', time: '09:00', priority: Priority.MEDIUM, category: TaskCategory.WORK, description: '' });
  };

  const syncWithAi = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      let contents: any[] = [];
      const file = selectedFile;

      if (file) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        contents = [
          { text: `Extract the schedule from this document/image. Merge it with existing Barakah Engineer routines (Fajr, Breakfast, Workouts). Return a JSON array of objects with keys: id, title, time (HH:MM), description, category (PRAYER, MEAL, WORK, TRAINING, REST), priority (HIGH, MEDIUM, LOW).` },
          { inlineData: { mimeType: file.type, data: base64 } }
        ];
      } else {
        contents = [{ text: `I have the following school/work calendar: "${aiInput}". Merge this into a JSON array for a Barakah Engineer. Keys: id, title, time, description, category, priority. Use categories: PRAYER, MEAL, WORK, TRAINING, REST. Priorities: HIGH, MEDIUM, LOW. Include essential routines like Fajr, Breakfast, and Post-work training.` }];
      }

      const response = await ai.models.generateContent({
        model: file ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview',
        contents: { parts: contents },
        config: { responseMimeType: "application/json" }
      });

      const newTasks = JSON.parse(response.text);
      setTasks(newTasks.sort((a:any, b:any) => a.time.localeCompare(b.time)));
      setShowAiModal(false);
      setSelectedFile(null);
      setAiInput("");
    } catch (e) {
      alert("AI Sync failed.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100);
  }, [tasks]);

  const t = TRANSLATIONS[lang];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 shadow-xl' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Zap className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-950' : 'text-white'}`} />
            </div>
            <div className="hidden sm:block">
              <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Barakah Engineer</h1>
              <p className="text-xs text-slate-400 font-medium">Growth • Discipline • Focus</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center bg-slate-800/20 p-1 rounded-full border border-slate-700/30">
              {(Object.keys(Language) as Array<keyof typeof Language>).map(l => (
                <button key={l} onClick={() => setLang(Language[l])} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${lang === Language[l] ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl hover:bg-slate-800/20 transition-colors">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
            <div className="hidden xs:flex bg-slate-800/20 p-1 rounded-full">
              <button onClick={() => setMode(AppMode.PRO)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === AppMode.PRO ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}>PRO</button>
              <button onClick={() => setMode(AppMode.SIMPLE)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === AppMode.SIMPLE ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}>SIMPLE</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* Tip & Prayers Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-md'} border rounded-3xl p-6 md:col-span-2 group`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-xs uppercase tracking-widest font-black flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> {t.tip}
              </h3>
              <button onClick={fetchDailyTip} disabled={isAiLoading}>
                <Activity className={`w-4 h-4 text-slate-500 hover:text-emerald-400 transition-all ${isAiLoading ? 'animate-spin' : 'group-hover:scale-110'}`} />
              </button>
            </div>
            <p className="text-xl italic font-semibold leading-relaxed">"{currentTip}"</p>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} border rounded-3xl p-6 flex flex-col justify-center shadow-lg`}>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black mb-3 opacity-70 flex items-center gap-2">
              <Globe className="w-3 h-3" /> {t.prayers}
            </h3>
            {prayerTimes ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-black">
                <div className="flex justify-between border-b border-current/10 pb-1"><span>Fajr</span><span>{prayerTimes.Fajr}</span></div>
                <div className="flex justify-between border-b border-current/10 pb-1"><span>Dhuhr</span><span>{prayerTimes.Dhuhr}</span></div>
                <div className="flex justify-between border-b border-current/10 pb-1"><span>Asr</span><span>{prayerTimes.Asr}</span></div>
                <div className="flex justify-between border-b border-current/10 pb-1"><span>Maghrib</span><span>{prayerTimes.Maghrib}</span></div>
                <div className="flex justify-between border-b border-current/10 pb-1 text-emerald-500"><span>Isha</span><span>{prayerTimes.Isha}</span></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs opacity-50"><Loader2 className="w-3 h-3 animate-spin" /> Detecting location...</div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button onClick={() => setView('daily')} className={`flex items-center gap-2 px-6 py-2 rounded-2xl font-bold transition-all ${view === 'daily' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'}`}>
            <Clock className="w-4 h-4" /> {t.schedule}
          </button>
          <button onClick={() => setView('calendar')} className={`flex items-center gap-2 px-6 py-2 rounded-2xl font-bold transition-all ${view === 'calendar' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'}`}>
            <CalendarIcon className="w-4 h-4" /> {t.cal}
          </button>
        </div>

        {view === 'daily' ? (
          <>
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-black flex items-center gap-3">
                 <Flame className="w-6 h-6 text-rose-500" /> {t.progress}
               </h2>
               <div className="flex gap-2">
                 <button onClick={() => { setEditingTask(null); setTaskForm({ title: '', time: '09:00', priority: Priority.MEDIUM, category: TaskCategory.WORK, description: '' }); setShowTaskModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">
                   <Plus className="w-4 h-4" /> {t.add}
                 </button>
                 <button onClick={() => setShowAiModal(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5">
                   <Upload className="w-4 h-4" /> {t.ai}
                 </button>
               </div>
            </div>

            <div className="mb-12 h-3 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
            </div>

            <div className="space-y-4">
              {tasks.length > 0 ? tasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`group relative p-5 rounded-3xl border transition-all duration-500 flex items-start gap-4 cursor-pointer overflow-hidden ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm'} ${task.isCompleted ? 'opacity-40 grayscale animate-completion' : 'hover:border-emerald-500/50 hover:translate-x-2'}`}
                >
                  {/* Completion Ring Effect */}
                  {justCompletedId === task.id && <div className="completion-ring absolute left-[2.25rem] top-[2.25rem]" />}

                  <div className={`mt-1 relative w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 z-10 ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white animate-checkmark scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-slate-700 group-hover:border-emerald-500 group-hover:scale-105'}`}>
                    {task.isCompleted && <CheckCircle2 className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 z-10">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-black tracking-tighter transition-colors duration-500 ${task.isCompleted ? 'text-slate-600' : 'text-slate-500'}`}>{task.time}</span>
                        <div className={`text-[9px] font-black px-2 py-0.5 rounded-full border tracking-wider transition-all duration-500 ${task.isCompleted ? 'opacity-30' : ''} ${PRIORITY_COLORS[task.priority || Priority.MEDIUM]}`}>
                          {(task.priority || Priority.MEDIUM).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => handleEditClick(e, task)} className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => deleteTask(e, task.id)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`transition-all duration-500 ${task.isCompleted ? 'scale-75 opacity-50' : 'group-hover:scale-110'}`}>
                        {CATEGORY_ICONS[task.category]}
                      </div>
                      <h4 className={`text-lg font-bold leading-tight transition-all duration-500 relative ${task.isCompleted ? 'text-slate-500 strikethrough-animate translate-x-2' : 'text-inherit'}`}>
                        {task.title}
                      </h4>
                    </div>
                    {task.description && (
                      <p className={`text-sm mt-1 line-clamp-2 transition-all duration-500 ${task.isCompleted ? 'opacity-30 translate-x-2' : 'text-slate-400'}`}>
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl opacity-50">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                  <p className="font-bold">No missions for today. Start fresh.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-md'} border rounded-3xl p-8`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black">Barakah Consistency</h3>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
                <span className="font-bold text-sm tracking-widest uppercase">{new Date().toLocaleString(lang === Language.EN ? 'en' : lang === Language.FR ? 'fr' : 'ar', { month: 'long', year: 'numeric' })}</span>
                <button className="p-2 hover:bg-slate-800 rounded-lg"><ChevronRight className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-500 pb-4">{d}</div>)}
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${i+1 === new Date().getDate() ? 'bg-emerald-500 text-white border-emerald-500 shadow-xl scale-110 ring-4 ring-emerald-500/20' : 'border-slate-800 hover:bg-slate-800 cursor-pointer'}`}>
                  <span className="text-sm font-bold">{i + 1}</span>
                  {i+1 < new Date().getDate() && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <section className="mt-12 bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 shadow-inner relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Dumbbell className="w-7 h-7 text-rose-500" /> Hypertrophy Protocol</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.entries(WORKOUT_SPLITS).map(([key, val]) => (
                <div key={key} className={`${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-100 border-slate-200'} rounded-3xl p-6 border group hover:border-emerald-500/30 transition-all`}>
                  <h4 className="font-black text-lg mb-4 flex items-center justify-between">
                    {val.name}
                    <Activity className="w-4 h-4 text-emerald-500 group-hover:scale-125 transition-transform" />
                  </h4>
                  <div className="space-y-2">
                    {val.exercises.map((ex, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold border-b border-slate-700/20 pb-2">
                        <span className="text-slate-400">{ex.name}</span>
                        <span className="text-white">{ex.sets} x {ex.reps}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* MODALS */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-[2rem] p-8 w-full max-w-md shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] mx-4`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">{editingTask ? t.edit : "Establish Mission"}</h3>
              <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-slate-800 rounded-full"><X /></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Title</label>
                <input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Focus session, Meal #1, etc." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Time</label>
                  <input type="time" value={taskForm.time} onChange={e => setTaskForm({...taskForm, time: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 outline-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Priority})} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold appearance-none">
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Category</label>
                <select value={taskForm.category} onChange={e => setTaskForm({...taskForm, category: e.target.value as TaskCategory})} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold">
                  {Object.values(TaskCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Technical details or notes..." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 min-h-[120px] outline-none text-sm leading-relaxed" />
              <button onClick={saveTask} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-[2rem] p-8 w-full max-w-lg shadow-[0_0_60px_-15px_rgba(147,51,234,0.4)]`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black flex items-center gap-3"><Sparkles className="text-purple-500" /> Dynamic AI Sync</h3>
              <button onClick={() => setShowAiModal(false)}><X /></button>
            </div>
            
            <div className="space-y-6">
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-purple-500/5 ${selectedFile ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800'}`}>
                <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-12 h-12 text-purple-500 mb-2" />
                    <span className="font-bold text-sm text-white">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-purple-600/20 p-4 rounded-full"><Camera className="w-8 h-8 text-purple-500" /></div>
                    <div className="text-center"><p className="font-black text-sm">{t.upload}</p></div>
                  </>
                )}
              </div>
              <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder={t.aiPrompt} className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 min-h-[120px] outline-none font-mono text-xs focus:border-purple-500 transition-all" />
              <button onClick={syncWithAi} disabled={isAiLoading || (!aiInput && !selectedFile)} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-purple-500/30 transition-all active:scale-95">
                {isAiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5" />}
                {isAiLoading ? "ANALYZING..." : "OPTIMIZE DAY"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none flex justify-center">
         <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-2xl border border-white/5 px-10 py-5 rounded-full shadow-2xl flex items-center gap-10 text-white animate-in slide-in-from-bottom-10">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-black opacity-40 leading-none mb-1 tracking-tighter">Progress</span>
              <span className="text-2xl font-black text-emerald-400 leading-none">{progress}%</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <button onClick={() => setView(view === 'daily' ? 'calendar' : 'daily')} className="bg-emerald-500 p-4 rounded-full hover:scale-110 hover:-rotate-6 transition-all active:scale-95 shadow-2xl shadow-emerald-500/40 -mt-2 -mb-2">
              {view === 'daily' ? <CalendarIcon className="text-slate-950 w-6 h-6" /> : <Clock className="text-slate-950 w-6 h-6" />}
            </button>
         </div>
      </div>
    </div>
  );
};

export default App;
