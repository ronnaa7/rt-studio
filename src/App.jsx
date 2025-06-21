!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>R.T Studio - אפליקציית כושר חכמה</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, query, getDocs, updateDoc, arrayUnion, Timestamp, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Home, ClipboardList, LineChart, User, Flame, Plus, Save, Video, BrainCircuit, UtensilsCrossed, X, Award, Trophy, ShieldCheck, Weight, Sparkles, Bot, Palette, Zap, ThumbsUp, ThumbsDown, Clock3, ShoppingCart, Copy, Sailboat } from 'lucide-react';

// --- Firebase Configuration ---
// This now uses environment variables, which is safer for deployment.
// You will need to set these in your Netlify deployment settings.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};
const appId = firebaseConfig.appId;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Gemini API Call Function ---
async function callGemini(prompt) {
    const apiKey = ""; // This will be provided by the Canvas environment for the AI features.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, topP: 0.9 } };
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) {
            console.error("Gemini API Error:", result);
            const errorMessage = result?.error?.message || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Gemini API returned no candidates or empty content:", result);
            const blockReason = result?.promptFeedback?.blockReason;
            if (blockReason) return `הבקשה נחסמה מסיבות בטיחות: ${blockReason}. נסה לנסח את הבקשה מחדש.`;
            return "ה-AI לא החזיר תשובה. נסה שוב מאוחר יותר.";
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return `אירעה שגיאת תקשורת עם שירות ה-AI. נסה שוב בעוד מספר רגעים. (${error.message})`;
    }
}

// --- Gamification Data & Helper Functions ---
const allBadges = {
    welcome_aboard: { name: 'ברוך הבא!', description: 'התחלת את המסע שלך לעבר המטרה!', icon: <Sailboat size={32}/>, color: 'var(--color-accent)' },
    first_workout: { name: 'אימון ראשון', description: 'השלמת את האימון הראשון שלך!', icon: <Trophy size={32}/>, color: 'var(--color-badge-trophy)' },
    one_week_streak: { name: 'שבוע של התמדה', description: 'התאמנת 7 ימים ברציפות!', icon: <Flame size={32}/>, color: 'var(--color-badge-streak)' },
    first_5kg_lost: { name: 'ירידה של 5 ק"ג', description: 'ירדת את 5 הקילוגרמים הראשונים!', icon: <Weight size={32}/>, color: 'var(--color-badge-weight)' },
    consistency_10_workouts: { name: '10 אימונים', description: 'השלמת 10 אימונים בסך הכל!', icon: <Award size={32}/>, color: 'var(--color-badge-consistency)' },
    plan_saved: { name: 'תוכנית אישית', description: 'שמרת את תוכנית האימונים שלך!', icon: <ShieldCheck size={32}/>, color: 'var(--color-badge-plan)' },
};

const initialPlan = {
    workout: [ { id: 1, name: 'לחיצת רגליים', sets: 3, reps: '12', weight: '' }, { id: 2, name: 'פולי עליון', sets: 3, reps: '12', weight: '' }, { id: 3, name: 'לחיצת חזה', sets: 3, reps: '12', weight: '' }, { id: 4, name: 'חתירה בישיבה', sets: 3, reps: '12', weight: '' }, { id: 5, name: 'לחיצת כתפיים', sets: 3, reps: '12', weight: '' }, { id: 6, name: 'פשיטת מרפקים', sets: 3, reps: '15', weight: '' }, { id: 7, name: 'כפיפת מרפקים', sets: 3, reps: '15', weight: '' }, { id: 8, name: 'פלאנק', sets: 3, reps: '30-45 שנ\'', weight: '' } ],
    nutrition: {
        breakfast: { title: "ארוחת בוקר", time: "08:00", proteins: ["2 ביצים", "יוגורט פרו", "אבקת חלבון", "גבינה 5%"], carbs: ["לחם מלא", "שיבולת שועל", "בננה", "פריכיות אורז"], fats: ["אגוזים", "טחינה", "אבוקדו", "ירקות"], targets: { calories: 450, protein: 30, carbs: 45, fat: 18 } },
        lunch: { title: "ארוחת צהריים", time: "13:00-14:00", proteins: ["חזה עוף", "פרגית", "דג סלמון", "קציצות בקר"], carbs: ["אורז מלא", "קינואה", "בטטה", "פסטה מלאה"], fats: ["סלט ירקות", "ירקות מבושלים", "שמן זית"], targets: { calories: 650, protein: 50, carbs: 60, fat: 22 } },
        dinner: { title: "ארוחת ערב", time: "20:00", proteins: ["טונה במים", "חזה עוף", "חביתה", "בולגרית 5%"], carbs: ["לחם קל", "תפוח אדמה", "פריכיות", "תירס"], fats: ["סלט ירקות", "אבוקדו/טחינה", "ירקות חתוכים"], targets: { calories: 550, protein: 40, carbs: 50, fat: 20 } }
    }
};

const mockWeightData = [ { name: 'שבוע 1', weight: 131 }, { name: 'שבוע 2', weight: 130 }, { name: 'שבוע 3', weight: 129.5 }, { name: 'שבוע 4', weight: 128 }, { name: 'שבוע 5', weight: 127 } ];

const shortVictoryWorkout = [
    { name: "סיבובי כתפיים", duration: "30 שניות" },
    { name: "מתיחת חזה בחיבוק", duration: "30 שניות" },
    { name: "סקווט משקל גוף", duration: "10 חזרות" },
    { name: "פלאנק", duration: "20 שניות" },
];

const awardBadge = async (userId, badgeId, showModal) => {
    const userDocRef = doc(db, 'artifacts', appId, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if(docSnap.exists() && docSnap.data().badges?.includes(badgeId)) return;
    await updateDoc(userDocRef, { badges: arrayUnion(badgeId) });
    const badge = allBadges[badgeId];
    showModal('🏆 הישג חדש נפתח! 🏆', <div className="text-center animate-pop-in"><div className={`inline-block p-4 bg-neutral-700/50 rounded-full`} style={{color: badge.color}}>{badge.icon}</div><h3 className="text-2xl font-bold mt-4">{badge.name}</h3><p className="text-neutral-300 mt-1">{badge.description}</p></div>);
};

const checkAndAwardBadges = async (userId, userData, showModal) => {
    if (!userData) return;
    const { badges = [], profile, streaks } = userData;
    if (!badges.includes('first_workout')) {
        const logRef = collection(db, 'artifacts', appId, 'users', userId, 'workoutLog');
        if ((await getDocs(query(logRef))).size >= 1) await awardBadge(userId, 'first_workout', showModal);
    }
    if (!badges.includes('one_week_streak') && streaks?.current >= 7) await awardBadge(userId, 'one_week_streak', showModal);
    if (!badges.includes('consistency_10_workouts')) {
        const logRef = collection(db, 'artifacts', appId, 'users', userId, 'workoutLog');
        if ((await getDocs(query(logRef))).size >= 10) await awardBadge(userId, 'consistency_10_workouts', showModal);
    }
    if (!badges.includes('first_5kg_lost') && profile?.initialWeight) {
        const logRef = collection(db, 'artifacts', appId, 'users', userId, 'weightLog');
        const logData = (await getDocs(query(logRef))).docs.map(d => d.data());
        if (logData.length > 0) {
            const lastWeight = logData.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds)[0].weight;
            if (profile.initialWeight - lastWeight >= 5) await awardBadge(userId, 'first_5kg_lost', showModal);
        }
    }
};

// --- Main App Component ---
export default function App() {
    const [activeTab, setActiveTab] = useState('today');
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, title: '', content: null });
    const [theme, setTheme] = useState('dark');
    const [showConfetti, setShowConfetti] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);

    const triggerConfetti = () => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); };
    const showModal = (title, content) => setModal({ isOpen: true, title, content });
    const hideModal = () => setModal({ isOpen: false, title: '', content: null });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'artifacts', appId, 'users', currentUser.uid);
                const unsub = onSnapshot(userDocRef, async (docSnap) => {
                    if (!docSnap.exists()) {
                        await setDoc(userDocRef, {
                            profile: { name: '', goal: '', initialWeight: 0, theme: 'dark', onboardingComplete: false },
                            plan: initialPlan, streaks: { current: 0, lastWorkoutDate: null }, badges: [], createdAt: Timestamp.now()
                        });
                         setIsOnboarding(true);
                    } else {
                        const data = docSnap.data();
                        setUserData(data);
                        setTheme(data.profile?.theme || 'dark');
                        if (!data.profile?.onboardingComplete) {
                           setIsOnboarding(true);
                        } else {
                           setIsOnboarding(false);
                        }
                    }
                });
                setLoading(false);
                return () => unsub();
            } else {
                signInAnonymously(auth).catch(error => console.error("Anonymous sign in failed:", error));
            }
        });
        return () => unsubscribe();
    }, []);

    const completeOnboarding = async (name, goal) => {
        if (!user) return;
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await updateDoc(userDocRef, {
            "profile.name": name,
            "profile.goal": goal,
            "profile.onboardingComplete": true,
        });
        
        const welcomePrompt = `Act as a friendly and motivating personal coach. A new user named "${name}" just joined with the goal of "${goal}". Write a short, exciting, and personalized welcome message in Hebrew to appear in the app. Make them feel seen and ready to start their journey.`;
        const welcomeMessage = await callGemini(welcomePrompt);
        
        showModal(`ברוך הבא, ${name}!`, <div><p>{welcomeMessage}</p></div>);
        await awardBadge(user.uid, 'welcome_aboard', showModal);

        setIsOnboarding(false);
    };
    
    const handleSetTheme = async (newTheme) => {
        if (!user) return;
        setTheme(newTheme);
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await updateDoc(userDocRef, { "profile.theme": newTheme });
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><LoadingSpinner/></div>;
        if (isOnboarding) return <OnboardingView onComplete={completeOnboarding} />;

        const props = { user, userData, showModal, setModal, triggerConfetti, handleSetTheme };
        switch (activeTab) {
            case 'today': return <TodayView {...props} />;
            case 'plan': return <PlanView {...props} plan={userData?.plan} />;
            case 'progress': return <ProgressView {...props} />;
            case 'profile': return <ProfileView {...props} />;
            default: return <TodayView {...props} />;
        }
    };
    
    return (
         <div className={`theme-${theme} font-sans min-h-screen flex flex-col`} dir="rtl" style={{backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)'}}>
            {showConfetti && <Confetti />}
            <header className="p-4 text-center"><h1 className="text-3xl font-bold" style={{color: 'var(--color-header)'}}>R.T studio</h1></header>
            <main className="flex-grow p-4 overflow-y-auto pb-24">{renderContent()}</main>
            {!isOnboarding && (
                 <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t grid grid-cols-4 gap-2 p-2 z-10" style={{backgroundColor: 'var(--color-nav-bg)', borderColor: 'var(--color-border)'}}>
                    <TabButton icon={<Home />} label="היום" name="today" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton icon={<ClipboardList />} label="תוכנית" name="plan" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton icon={<LineChart />} label="התקדמות" name="progress" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton icon={<User />} label="פרופיל" name="profile" activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>
            )}
            <Modal {...modal} onClose={hideModal} />
            <ThemeStyles />
        </div>
    );
}

// --- Onboarding Component ---
function OnboardingView({ onComplete }) {
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name && goal) {
            onComplete(name, goal);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Sailboat size={64} className="mb-4" style={{ color: 'var(--color-primary)' }}/>
            <h1 className="text-3xl font-bold mb-2">ברוך הבא למסע!</h1>
            <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>בוא נגדיר יחד את נקודת ההתחלה.</p>
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
                <div>
                    <label htmlFor="name" className="block text-right mb-2 font-semibold">מה השם שלך?</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required
                           className="w-full p-3 rounded-lg border-2" style={{backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border)'}}/>
                </div>
                 <div>
                    <label htmlFor="goal" className="block text-right mb-2 font-semibold">מה המטרה המרכזית שלך?</label>
                    <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} required
                           className="w-full p-3 rounded-lg border-2" style={{backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border)'}}>
                        <option value="" disabled>בחר מטרה...</option>
                        <option value="ירידה במשקל">ירידה במשקל</option>
                        <option value="עלייה במסת שריר">עלייה במסת שריר</option>
                        <option value="חיטוב הגוף">חיטוב הגוף</option>
                        <option value="שיפור כושר כללי">שיפור כושר כללי</option>
                    </select>
                </div>
                <button type="submit" className="w-full font-bold py-4 rounded-lg text-lg flex items-center justify-center gap-2 transition hover:opacity-90" style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)'}}>
                    יוצאים לדרך!
                </button>
            </form>
        </div>
    )
}

// --- Other View Components (Today, Plan, Progress, Profile) ---
function TodayView({ user, userData, showModal, setModal, triggerConfetti }) {
    if (!userData) return <LoadingSpinner />;

    const handleCompleteWorkout = async (isMiniWorkout = false) => {
        if(!user) return;
        triggerConfetti();
        const today = new Date(); today.setHours(0,0,0,0);
        const workoutLogRef = collection(db, 'artifacts', appId, 'users', user.uid, 'workoutLog');
        await addDoc(workoutLogRef, { completedAt: Timestamp.now(), type: isMiniWorkout ? 'mini' : 'full' });
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const lastWorkoutDate = userData.streaks?.lastWorkoutDate?.toDate();
        let newStreak = 1;
        if (lastWorkoutDate) {
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            if (lastWorkoutDate.getTime() === yesterday.getTime()) newStreak = (userData.streaks.current || 0) + 1;
            else if(lastWorkoutDate.getTime() !== today.getTime()) newStreak = 1;
            else newStreak = userData.streaks.current;
        }
        await updateDoc(userDocRef, { streaks: { current: newStreak, lastWorkoutDate: Timestamp.now() } });
        const updatedDoc = await getDoc(userDocRef);
        await checkAndAwardBadges(user.uid, updatedDoc.data(), showModal);
    };
    
    const handleVictoryWorkout = () => {
        const VictoryWorkoutModal = () => (
            <div className="space-y-4">
                <p>כל הכבוד על הצעד הראשון! בוא נניע את הגוף ונתחיל את היום בניצחון קטן.</p>
                <ul className="list-disc list-inside space-y-2">
                    {shortVictoryWorkout.map(ex => <li key={ex.name}><strong>{ex.name}:</strong> {ex.duration}</li>)}
                </ul>
                <button onClick={() => { handleCompleteWorkout(true); setModal({isOpen: false}); }} className="w-full font-bold py-3 rounded-lg text-lg flex items-center justify-center gap-2 transition hover:opacity-90" style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)'}}>
                    <Trophy size={20}/> סיימתי את הניצחון!
                </button>
            </div>
        );
        showModal("⚡️ 5 דקות של ניצחון", <VictoryWorkoutModal />);
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>היום שלך, {userData.profile.name}</h2>
             <button onClick={() => handleCompleteWorkout(false)} className="w-full font-bold py-4 rounded-lg text-lg flex items-center justify-center gap-2 transition hover:opacity-90" style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)'}}>
                <Sparkles /> סיימתי את האימון המלא!
            </button>
             <button onClick={handleVictoryWorkout} className="w-full font-semibold py-3 rounded-lg text-md flex items-center justify-center gap-2 transition hover:opacity-90 border" style={{borderColor: 'var(--color-primary)', color: 'var(--color-primary)'}}>
                <Zap /> אין כוח? נצח ב-5 דקות!
            </button>
            <Card title="המוטיבציה שלך">
                 <div className="flex justify-around items-center text-center">
                     <div><Flame style={{color: 'var(--color-badge-streak)'}} className="mx-auto" size={32}/><p className="mt-1 text-2xl font-bold">{userData.streaks?.current || 0}</p><p className="text-sm" style={{color: 'var(--color-text-muted)'}}>ימי רצף</p></div>
                     <div><Award style={{color: 'var(--color-primary)'}} className="mx-auto" size={32}/><p className="mt-1 text-2xl font-bold">{userData.badges?.length || 0}</p><p className="text-sm" style={{color: 'var(--color-text-muted)'}}>הישגים</p></div>
                 </div>
            </Card>
        </div>
    );
}

const fetchPreferences = async (userId) => {
    const likedRef = collection(db, 'artifacts', appId, 'users', userId, 'likedSuggestions');
    const dislikedRef = collection(db, 'artifacts', appId, 'users', userId, 'dislikedSuggestions');
    const likedQuery = query(likedRef, orderBy('createdAt', 'desc'), limit(5));
    const dislikedQuery = query(dislikedRef, orderBy('createdAt', 'desc'), limit(5));
    const [likedSnapshot, dislikedSnapshot] = await Promise.all([getDocs(likedQuery), getDocs(dislikedQuery)]);
    const liked = likedSnapshot.docs.map(doc => doc.data().suggestionText);
    const disliked = dislikedSnapshot.docs.map(doc => doc.data().suggestionText);
    return { liked, disliked };
};

const AIFeedbackResponse = ({ suggestion, userId }) => {
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const handleFeedback = async (type) => {
        const collectionName = type === 'like' ? 'likedSuggestions' : 'dislikedSuggestions';
        const feedbackRef = collection(db, 'artifacts', appId, 'users', userId, collectionName);
        await addDoc(feedbackRef, { suggestionText: suggestion, createdAt: Timestamp.now() });
        setFeedbackGiven(true);
    };
    return (
        <div>
            <div className="whitespace-pre-wrap">{suggestion}</div>
            {!feedbackGiven ? (
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{borderColor: 'var(--color-border)'}}>
                    <button onClick={() => handleFeedback('dislike')} className="p-2 rounded-full transition hover:bg-red-500/20"><ThumbsDown className="text-red-400"/></button>
                    <button onClick={() => handleFeedback('like')} className="p-2 rounded-full transition hover:bg-green-500/20"><ThumbsUp className="text-green-400"/></button>
                </div>
            ) : (<p className="text-center text-sm mt-4 pt-4 border-t" style={{color: 'var(--color-accent)', borderColor: 'var(--color-border)'}}>תודה על המשוב!</p>)}
        </div>
    );
};

function PlanView({ user, plan, showModal, setModal }) {
    const [currentPlan, setCurrentPlan] = useState(plan);
    useEffect(() => { setCurrentPlan(plan); }, [plan]);

    if (!currentPlan) return <LoadingSpinner />;

    const handleWeightChange = (exId, w) => setCurrentPlan({...currentPlan, workout: currentPlan.workout.map(ex => ex.id === exId ? {...ex, weight: w} : ex)});
    
    const saveWorkoutPlan = async () => {
        if (!user || !currentPlan) return;
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        try {
            await updateDoc(userDocRef, { plan: currentPlan });
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.data().badges?.includes('plan_saved')) {
                await awardBadge(user.uid, 'plan_saved', showModal);
            } else {
                showModal('שמירה', 'התוכנית עודכנה בהצלחה!');
            }
        } catch (e) { showModal('שגיאה', 'שגיאה בשמירת התוכנית.'); }
    };
    
    const generateAIMeal = async (meal, type) => {
        const title = type === 'recipe' ? `✨ מכין מתכון ל${meal.title}...` : `⚡️ מחפש פתרון מהיר...`;
        setModal({ isOpen: true, title: title, content: <LoadingSpinner/> });
        
        const { liked, disliked } = await fetchPreferences(user.uid);
        const { calories, protein, carbs, fat } = meal.targets;

        let preferencesPrompt = "";
        if (liked.length > 0) preferencesPrompt += `\nFor context, the user LIKES these suggestions, so try to find similar ideas:\n- ${liked.join('\n- ')}`;
        if (disliked.length > 0) preferencesPrompt += `\n\nThe user DISLIKES these, so provide something different:\n- ${disliked.join('\n- ')}`;

        let basePrompt;
        if (type === 'recipe') {
            basePrompt = `Act as a creative chef for a weight loss diet. Generate a new, interesting, healthy recipe in Hebrew for ${meal.title}. The recipe must be as close as possible to these targets: ${calories} kcal and ${protein}g of protein. Provide a creative title, description, ingredients, step-by-step instructions, and a "Pro Tip".`;
        } else { // quick solution
            basePrompt = `Act as a personal nutritionist for someone short on time in Israel. For an upcoming ${meal.title}, suggest 2-3 very fast, no-cook meal alternatives in Hebrew that can be bought in a supermarket or assembled in minutes. The alternatives must be as close as possible to these nutritional targets:
- Calories: approximately ${calories} kcal
- Protein: approximately ${protein}g
- Carbohydrates: approximately ${carbs}g
- Fat: approximately ${fat}g
The suggestions should be healthy and align with a weight-loss plan. Format the response as a simple, clear list of ideas, and briefly explain why each option fits the nutritional profile.`;
        }
        
        const finalPrompt = basePrompt + preferencesPrompt + "\n\nMake sure the new suggestion is unique and not one of the examples provided.";
        
        const response = await callGemini(finalPrompt);
        const modalTitle = type === 'recipe' ? `✨ מתכון ל${meal.title}` : `⚡️ פתרונות מהירים ל${meal.title}`;
        showModal(modalTitle, <AIFeedbackResponse suggestion={response} userId={user.uid} />);
    };

    const handleShowVideo = (exerciseName) => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`איך לבצע ${exerciseName} טכניקה נכונה`)}`, '_blank');
    const handleSuggestAlternative = (exerciseName) => {
        const EquipmentSelector = () => {
            const equipmentOptions = ["משקל גוף", "משקולות חופשיות", "מכונות כושר", "גומיות התנגדות"];
            const handleSelection = async (equipment) => {
                setModal({ isOpen: true, title: `✨ מחפש חלופה...`, content: <LoadingSpinner/> });
                const prompt = `Suggest a safe gym exercise alternative in Hebrew for "${exerciseName}", using only "${equipment}". The user has history of shoulder/knee injuries, prioritize safety. Structure: alternative name, then '---', then explanation of muscle, why it's a good alternative, and how to perform safely.`;
                const response = await callGemini(prompt);
                showModal(`✨ חלופה ל${exerciseName}`, <div className="whitespace-pre-wrap">{response}</div>);
            };
            return (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{equipmentOptions.map(eq => <button key={eq} onClick={() => handleSelection(eq)} className="w-full p-3 rounded-lg font-semibold transition" style={{backgroundColor: 'var(--color-border)', color:'var(--color-text-main)'}}>{eq}</button>)}</div>);
        };
        showModal(`בחר ציוד זמין`, <EquipmentSelector />);
    };
    
    const handleGenerateShoppingList = () => {
        const categories = {
            'חלבונים': new Set(), 'פחמימות': new Set(), 'שומנים': new Set(), 'ירקות ופירות': new Set(), 'שונות': new Set(),
        };
        const itemToCategory = {
            'ביצים': 'חלבונים', 'יוגורט פרו': 'חלבונים', 'אבקת חלבון': 'חלבונים', 'גבינה 5%': 'חלבונים','חזה עוף': 'חלבונים', 'פרגית': 'חלבונים', 'דג סלמון': 'חלבונים', 'קציצות בקר': 'חלבונים', 'טונה במים': 'חלבונים','חביתה': 'חלבונים', 'בולגרית 5%': 'חלבונים',
            'לחם מלא': 'פחמימות', 'שיבולת שועל': 'פחמימות', 'פריכיות אורז': 'פחמימות', 'אורז מלא': 'פחמימות','קינואה': 'פחמימות', 'פסטה מלאה': 'פחמימות', 'לחם קל': 'פחמימות', 'תפוח אדמה': 'פחמימות', 'תירס': 'פחמימות',
            'בננה': 'ירקות ופירות', 'בטטה': 'ירקות ופירות', 'אבוקדו': 'ירקות ופירות', 'ירקות': 'ירקות ופירות', 'סלט ירקות': 'ירקות ופירות','ירקות מבושלים': 'ירקות ופירות',
            'אגוזים': 'שומנים', 'טחינה': 'שומנים', 'שמן זית': 'שומנים'
        };
        Object.values(currentPlan.nutrition).forEach(meal => {
            [...meal.proteins, ...meal.carbs, ...meal.fats].forEach(item => {
                const cleanedItem = item.replace(/[\d.-]+ .?גר' |^[\d.]+\s|כף |כוס |במים |קל |מלא /g, '').replace(/ים$/, 'י').split('/')[0].trim();
                const category = Object.keys(itemToCategory).find(key => cleanedItem.includes(key)) || 'שונות';
                categories[itemToCategory[category] || 'שונות'].add(cleanedItem);
            });
        });
        const ShoppingListComponent = () => {
            const listText = Object.entries(categories).filter(([_, items]) => items.size > 0).map(([category, items]) => `*${category}*\n${Array.from(items).map(item => `- ${item}`).join('\n')}`).join('\n\n');
            const copyToClipboard = () => {
                const textarea = document.createElement('textarea');
                textarea.value = listText; document.body.appendChild(textarea);
                textarea.select(); document.execCommand('copy');
                document.body.removeChild(textarea); 
                showModal("הצלחה", "הרשימה הועתקה ללוח!");
            };
            return (
                <div className="space-y-4">
                    {Object.entries(categories).map(([category, items]) => items.size > 0 && (
                        <div key={category}>
                            <h4 className="font-bold text-lg mb-2" style={{color: 'var(--color-primary)'}}>{category}</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {Array.from(items).map(item => <li key={item}>{item}</li>)}
                            </ul>
                        </div>
                    ))}
                    <button onClick={copyToClipboard} className="w-full mt-6 font-bold py-3 rounded-lg text-lg flex items-center justify-center gap-2 transition hover:opacity-90" style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)'}}>
                        <Copy size={20} /> העתק רשימה
                    </button>
                </div>
            );
        };
        showModal("🛒 רשימת קניות שבועית", <ShoppingListComponent />);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>תוכנית אימונים ותזונה</h2>
                <div className="flex gap-2">
                    <button onClick={handleGenerateShoppingList} className="p-2 rounded-full transition hover:opacity-80" style={{backgroundColor: 'var(--color-badge-consistency)', color: 'var(--color-bg)'}}><ShoppingCart size={20} /></button>
                    <button onClick={saveWorkoutPlan} className="p-2 rounded-full transition hover:opacity-80" style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)'}}><Save size={20} /></button>
                </div>
            </div>
             <Card title="אימוני כוח (FBW)">
                <div className="space-y-4">
                    {currentPlan.workout.map((ex) => (
                        <div key={ex.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-sm border-b pb-3 last:border-b-0" style={{borderColor: 'var(--color-border)'}}>
                           <div className="md:col-span-1"><span className="font-semibold">{ex.name}</span><span className="mr-2" style={{color: 'var(--color-text-muted)'}}>{ex.sets}x{ex.reps}</span></div>
                           <div className="flex items-center gap-2"><input type="number" placeholder="משקל" value={ex.weight} onChange={(e) => handleWeightChange(ex.id, e.target.value)} className="w-full bg-transparent text-center rounded p-1 border" style={{borderColor: 'var(--color-border)'}} /><span className="text-xs" style={{color: 'var(--color-text-muted)'}}>ק"ג</span></div>
                           <div className="flex gap-2 justify-center md:justify-end">
                               <button onClick={() => handleShowVideo(ex.name)} className="p-2 rounded-lg" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}><Video size={16}/></button>
                               <button onClick={() => handleSuggestAlternative(ex.name)} className="p-2 rounded-lg" style={{backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#c084fc'}}><BrainCircuit size={16}/></button>
                           </div>
                        </div>
                    ))}
                </div>
            </Card>
             {Object.values(currentPlan.nutrition).map(meal => (
                <Card key={meal.title}>
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <h3 className="text-xl font-semibold">{`${meal.title} (${meal.time})`}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => generateAIMeal(meal, 'quick')} className="flex items-center gap-1 text-sm px-3 py-1 rounded-lg font-semibold transition" style={{backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308'}}><Zap size={14}/> פתרון מהיר</button>
                            <button onClick={() => generateAIMeal(meal, 'recipe')} className="flex items-center gap-1 text-sm px-3 py-1 rounded-lg font-semibold transition" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-primary)'}}><UtensilsCrossed size={14}/> הפק מתכון</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"><MealCategory title="חלבון" items={meal.proteins} /><MealCategory title="פחמימה" items={meal.carbs} /><MealCategory title="שומן/תוספות" items={meal.fats} /></div>
                </Card>
            ))}
        </div>
    );
}
function ProgressView({ user, userData, showModal }) {
    const [weightLog, setWeightLog] = useState([]);
    const [newWeight, setNewWeight] = useState("");

    const fetchWeightLog = useCallback(async () => {
        if (!user) return;
        const logRef = collection(db, 'artifacts', appId, 'users', user.uid, 'weightLog');
        const snapshot = await getDocs(query(logRef, orderBy("timestamp", "asc")));
        const logData = snapshot.docs.map(d => ({ ...d.data(), name: new Date(d.data().timestamp.seconds*1000).toLocaleDateString('he-IL')}));
        
        if (logData.length === 0 && userData?.profile?.initialWeight) {
             setWeightLog([{ name: 'התחלה', weight: userData.profile.initialWeight }]);
        } else {
             setWeightLog(logData);
        }
    }, [user, userData]);

    useEffect(() => { fetchWeightLog(); }, [fetchWeightLog]);

    const addWeightEntry = async () => {
        if (!user || !newWeight) return;
        const logRef = collection(db, 'artifacts', appId, 'users', user.uid, 'weightLog');
        await addDoc(logRef, { weight: Number(newWeight), timestamp: Timestamp.now() });
        setNewWeight("");
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        await checkAndAwardBadges(user.uid, docSnap.data(), showModal);
        fetchWeightLog();
    };

    if (!userData) return <LoadingSpinner />;
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>מעקב התקדמות</h2>
            <Card title="ההישגים שלך">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {Object.keys(allBadges).map(badgeId => {
                        const badge = allBadges[badgeId];
                        const isEarned = userData.badges?.includes(badgeId);
                        return <div key={badgeId} className={`flex flex-col items-center text-center transition-opacity ${isEarned ? 'opacity-100' : 'opacity-30'}`} title={badge.description}>
                            <div className={`p-3 rounded-full`} style={{color: isEarned ? badge.color : 'var(--color-text-muted)', backgroundColor: 'rgba(125,125,125,0.1)'}}>{badge.icon}</div>
                            <p className="text-xs mt-2 font-semibold">{badge.name}</p>
                        </div>
                    })}
                </div>
            </Card>
            <Card title="גרף משקל">
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={weightLog.length > 0 ? weightLog : mockWeightData}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="name" stroke="var(--color-text-muted)" /><YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="var(--color-text-muted)" /><Tooltip contentStyle={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }} /><Legend /><Bar dataKey="weight" name="משקל (קג)" fill="var(--color-primary)" /></BarChart></ResponsiveContainer></div>
                 <div className="mt-4 flex gap-2"><input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="הזן משקל נוכחי" className="flex-grow bg-transparent text-center rounded p-2 border" style={{borderColor: 'var(--color-border)'}} /><button onClick={addWeightEntry} className="p-2 rounded transition hover:opacity-80 flex items-center gap-1" style={{backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)'}}><Plus size={16} /> הוסף</button></div>
            </Card>
        </div>
    );
}
function ProfileView({ user, userData, handleSetTheme }) {
    if (!user || !userData?.profile) return <LoadingSpinner />;
    const themes = [ { id: 'dark', name: 'חשכה', color: '#f59e0b'}, { id: 'energy', name: 'אנרגיה', color: '#ef4444'}, { id: 'calm', name: 'רוגע', color: '#3b82f6'} ];
    return (
        <div className="space-y-6 text-center">
             <h2 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>פרופיל אישי</h2>
             <Card>
                 <User size={64} className="mx-auto" style={{color: 'var(--color-text-muted)'}} />
                 <h3 className="text-3xl font-bold mt-4">{userData.profile.name}</h3>
                 <p style={{color: 'var(--color-primary)'}}>{userData.profile.goal}</p>
                 <div className="mt-4 text-sm" style={{color: 'var(--color-text-muted)'}}><p>משתמש מאז: {new Date(user.metadata.creationTime).toLocaleDateString('he-IL')}</p><p className="break-all text-xs">מזהה: {user.uid}</p></div>
             </Card>
             <Card title="בחר ערכת נושא">
                <div className="flex justify-center gap-4">
                    {themes.map(theme => (<button key={theme.id} onClick={() => handleSetTheme(theme.id)} className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-full border-2" style={{backgroundColor: theme.color, borderColor: userData.profile.theme === theme.id ? 'var(--color-accent)' : 'transparent'}}></div><p className="text-sm">{theme.name}</p></button>))}
                </div>
             </Card>
             <button onClick={() => auth.signOut()} className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg font-semibold transition">התנתק</button>
        </div>
    );
}

// --- Reusable UI Components ---
const TabButton = ({ icon, label, name, activeTab, setActiveTab }) => (<button onClick={() => setActiveTab(name)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 ${activeTab === name ? 'active-tab' : ''}`} style={{color: activeTab !== name ? 'var(--color-text-muted)' : ''}}><span className="tab-icon">{icon}</span><span className="text-xs mt-1">{label}</span></button>);
const Card = ({ title, children }) => (<div className="p-4 sm:p-6 rounded-2xl border" style={{backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border)'}}>{title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}{children}</div>);
const LoadingSpinner = () => <div className="flex justify-center items-center h-24"><div className="loader"></div></div>;
const MealCategory = ({ title, items }) => (<div><h4 className="font-semibold mb-2 border-b pb-1" style={{borderColor: 'var(--color-border)', color: 'var(--color-text-main)'}}>{title}</h4><ul className="list-disc list-inside space-y-1" style={{color: 'var(--color-text-muted)'}}>{items.map(item => <li key={item}>{item}</li>)}</ul></div>);
const Modal = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="rounded-2xl border w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()} style={{backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border)'}}><div className="flex justify-between items-center p-4 border-b" style={{borderColor: 'var(--color-border)'}}><h3 className="text-xl font-semibold">{title}</h3><button onClick={onClose} className="hover:opacity-80"><X/></button></div><div className="p-6 overflow-y-auto" style={{color: 'var(--color-text-main)'}}>{content}</div></div></div>);
};
const Confetti = () => (<div className="confetti-container">{Array.from({ length: 100 }).map((_, i) => (<div key={i} className="confetti-piece" style={{left: `${Math.random()*100}%`, animationDuration: `${Math.random()*2+3}s`, animationDelay: `${Math.random()*1}s`, backgroundColor: `hsl(${Math.random()*360}, 100%, 50%)`}}></div>))}</div>);
const ThemeStyles = () => (
    <style>{`
        :root { --ease-out: cubic-bezier(0.25, 1, 0.5, 1); }
        .theme-dark { --color-bg: #171717; --color-card-bg: #262626; --color-nav-bg: rgba(38,38,38,0.8); --color-text-main: #e5e5e5; --color-text-muted: #a3a3a3; --color-border: #404040; --color-header: #e5e5e5; --color-primary: #f59e0b; --color-accent: #16a34a; --color-accent-text: #f0fdf4; --color-badge-trophy: #f59e0b; --color-badge-streak: #f97316; --color-badge-weight: #22c55e; --color-badge-consistency: #3b82f6; --color-badge-plan: #a855f7; }
        .theme-energy { --color-bg: #111827; --color-card-bg: #1f2937; --color-nav-bg: rgba(31,41,55,0.8); --color-text-main: #f9fafb; --color-text-muted: #9ca3af; --color-border: #374151; --color-header: #f87171; --color-primary: #f87171; --color-accent: #fb923c; --color-accent-text: #1f2937; --color-badge-trophy: #facc15; --color-badge-streak: #f97316; --color-badge-weight: #4ade80; --color-badge-consistency: #60a5fa; --color-badge-plan: #c084fc; }
        .theme-calm { --color-bg: #f0f9ff; --color-card-bg: #ffffff; --color-nav-bg: rgba(255,255,255,0.8); --color-text-main: #0c4a6e; --color-text-muted: #38bdf8; --color-border: #e0f2fe; --color-header: #0369a1; --color-primary: #0ea5e9; --color-accent: #14b8a6; --color-accent-text: #ffffff; --color-badge-trophy: #eab308; --color-badge-streak: #f59e0b; --color-badge-weight: #16a34a; --color-badge-consistency: #2563eb; --color-badge-plan: #9333ea; }
        .active-tab { background-color: var(--color-primary); color: var(--color-accent-text) !important; }
        .active-tab .tab-icon { transform: scale(1.2); color: var(--color-accent-text) !important; }
        .tab-icon { transition: transform 0.2s var(--ease-out); }
        .loader{border:4px solid rgba(125,125,125,0.2);border-top-color:var(--color-primary);border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite} @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes pop-in { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } } .animate-pop-in { animation: pop-in 0.5s var(--ease-out) forwards; }
        .confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; }
        .confetti-piece { position: absolute; width: 8px; height: 16px; top: -20px; opacity: 0; animation: drop-confetti 5s linear forwards; }
        @keyframes drop-confetti { 0% { transform: translateY(0vh) rotateZ(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotateZ(360deg); opacity: 0; } }
    `}</style>
)
