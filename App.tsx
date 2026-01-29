// App.tsx
import React, { useState, useEffect } from 'react';
import { Machine, MachineStatus, User, LaundryTip } from './types';
import MachineCard from './components/MachineCard';
import { listenToMachines, initializeMachines, startMachine as startMachineOnFirebase, resetMachine as resetMachineOnFirebase } from './machineService';
import { loginUserAnonymously } from './authService';

const INITIAL_MACHINES: Machine[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  status: MachineStatus.FREE,
  endTime: null,
  totalDuration: null,
  currentUser: null
}));

const STATIC_TIPS: LaundryTip[] = [
  { title: "Peak Hours", content: "Laundry is usually busiest on Sunday evenings. Try Tuesday mornings for zero wait time!" },
  { title: "Fabric Care", content: "Wash your hoodies and jeans inside out to prevent color fading and protect the fabric surface." },
  { title: "Detergent Tip", content: "Don't overfill the detergent. Too much soap can leave residue and actually make clothes less clean." }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem('dormo_machines');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });
  const [authInput, setAuthInput] = useState({ name: '', room: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Theme Management
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Initialize Firebase on first load
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Initialize machines in Firebase
        await initializeMachines(INITIAL_MACHINES);
        setIsFirebaseConnected(true);
        console.log('Firebase initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        setErrorMsg('Failed to connect to server. Using local mode.');
      }
    };

    initFirebase();
  }, []);

  // Listen to Firebase real-time updates
  useEffect(() => {
    if (!isFirebaseConnected) return;

    const unsubscribe = listenToMachines((firebaseMachines) => {
      if (firebaseMachines.length > 0) {
        setMachines(firebaseMachines);
        // Store in localStorage as backup
        localStorage.setItem('dormo_machines', JSON.stringify(firebaseMachines));
      }
    });

    // Cleanup listener on unmount
    return unsubscribe;
  }, [isFirebaseConnected]);

  // Fallback to localStorage if Firebase fails
  useEffect(() => {
    if (!isFirebaseConnected && machines.length === 0) {
      const saved = localStorage.getItem('dormo_machines');
      if (saved) {
        setMachines(JSON.parse(saved));
      }
    }
  }, [isFirebaseConnected]);

  // Auth recovery
  useEffect(() => {
    const savedUser = localStorage.getItem('dormo_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('dormo_machines', JSON.stringify(machines));
  }, [machines]);

  // Monitor machine timers locally
  useEffect(() => {
    const interval = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.status === MachineStatus.RUNNING && m.endTime && Date.now() >= m.endTime) {
          return { ...m, status: MachineStatus.FINISHED };
        }
        return m;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const isNumeric = /^\d+$/.test(authInput.room);
    
    if (!authInput.name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (!isNumeric) {
      setErrorMsg("Please enter valid information / room number (digits only).");
      return;
    }

    // Login to Firebase anonymously (optional but recommended for tracking)
    if (isFirebaseConnected) {
      try {
        const userId = await loginUserAnonymously();
        if (userId) {
          console.log('User logged in anonymously with ID:', userId);
        }
      } catch (error) {
        console.warn('Anonymous login failed, continuing without Firebase auth');
      }
    }

    setUser(authInput);
    localStorage.setItem('dormo_user', JSON.stringify(authInput));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dormo_user');
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const startMachineHandler = async (id: number, duration: number) => {
    if (!user) return;
    
    if (isFirebaseConnected) {
      try {
        await startMachineOnFirebase(id, user, duration);
      } catch (error) {
        console.error('Failed to start machine on Firebase:', error);
        // Fallback to local update
        setMachines(prev => prev.map(m => 
          m.id === id ? { 
            ...m, 
            status: MachineStatus.RUNNING, 
            endTime: Date.now() + duration * 60 * 1000,
            totalDuration: duration,
            currentUser: user 
          } : m
        ));
      }
    } else {
      // Local update
      setMachines(prev => prev.map(m => 
        m.id === id ? { 
          ...m, 
          status: MachineStatus.RUNNING, 
          endTime: Date.now() + duration * 60 * 1000,
          totalDuration: duration,
          currentUser: user 
        } : m
      ));
    }
  };

  const collectLaundryHandler = async (id: number) => {
    if (isFirebaseConnected) {
      try {
        await resetMachineOnFirebase(id);
      } catch (error) {
        console.error('Failed to reset machine on Firebase:', error);
        // Fallback to local update
        setMachines(prev => prev.map(m => 
          m.id === id ? { 
            ...m, 
            status: MachineStatus.FREE, 
            endTime: null, 
            totalDuration: null, 
            currentUser: null 
          } : m
        ));
      }
    } else {
      // Local update
      setMachines(prev => prev.map(m => 
        m.id === id ? { 
          ...m, 
          status: MachineStatus.FREE, 
          endTime: null, 
          totalDuration: null, 
          currentUser: null 
        } : m
      ));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 transition-colors duration-500">
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="flex justify-end mb-6">
             <button 
                onClick={toggleTheme}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:scale-105"
              >
                {isDarkMode ? (
                  <><svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg> <span className="text-xs font-bold text-slate-400">Light Mode</span></>
                ) : (
                  <><svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg> <span className="text-xs font-bold text-slate-500">Dark Mode</span></>
                )}
             </button>
          </div>

          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white dark:border-slate-800 transition-all">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Dormo</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Smart Laundry Hub for Students</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={authInput.name}
                    onChange={(e) => setAuthInput(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900 outline-none transition-all placeholder:text-slate-300"
                    placeholder="e.g. Rahul Sharma"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Room Number</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={authInput.room}
                    onChange={(e) => {
                      setAuthInput(prev => ({ ...prev, room: e.target.value }));
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900 outline-none transition-all placeholder:text-slate-300"
                    placeholder="e.g. 204"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/30 animate-shake">
                   <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                   {errorMsg}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all transform hover:-translate-y-1 active:scale-95"
              >
                Access Dashboard
              </button>
            </form>
          </div>
          
          <p className="text-center mt-8 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">
            Dormo &bull; Simple & Smart
          </p>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; }
        `}</style>
      </div>
    );
  }

  const activeCount = machines.filter(m => m.status === MachineStatus.RUNNING).length;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 dark:bg-slate-950">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">D</div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white hidden sm:block tracking-tight">Dormo</h1>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">{activeCount} CYCLE{activeCount !== 1 ? 'S' : ''} ACTIVE</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block tracking-tighter">Night Mode</span>
              <button 
                onClick={toggleTheme}
                className={`relative w-14 h-7 rounded-full transition-all duration-500 p-1 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-500 flex items-center justify-center ${isDarkMode ? 'translate-x-7' : 'translate-x-0'}`}>
                   {isDarkMode ? (
                     <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                   ) : (
                     <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
                   )}
                </div>
              </button>
            </div>

            <div className="text-right hidden sm:block border-l border-slate-100 dark:border-slate-800 pl-6">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Room {user.room}</p>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-12">
        <section className="bg-white dark:bg-slate-900 p-1 sm:p-2 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="p-8 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{machines.filter(m => m.status === MachineStatus.FREE).length}</p>
              </div>
            </div>
            <div className="p-8 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                <svg className="w-7 h-7 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Use</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{machines.filter(m => m.status === MachineStatus.RUNNING).length}</p>
              </div>
            </div>
            <div className="p-8 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finished</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{machines.filter(m => m.status === MachineStatus.FINISHED).length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 dark:bg-slate-900 p-10 rounded-[2.5rem] text-white overflow-hidden relative border border-slate-800">
           <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Washing Intelligence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STATIC_TIPS.map((tip, idx) => (
                <div key={idx} className="group">
                  <h3 className="font-black text-lg mb-2 group-hover:text-blue-400 transition-colors">{tip.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{tip.content}</p>
                </div>
              ))}
            </div>
           </div>
           <div className="absolute top-0 right-0 -mr-40 -mt-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]"></div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Station Monitor</h2>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               Live Data
             </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 pb-10">
            {machines.map(machine => (
              <MachineCard 
                key={machine.id} 
                machine={machine} 
                onStart={startMachineHandler} 
                onCollect={collectLaundryHandler}
                currentUser={user}
              />
            ))}
          </div>
        </section>
      </main>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .time-estimate {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 600;
        }
        .dark .time-estimate {
          background: linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  );
};




export default App;