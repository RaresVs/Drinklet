import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import './App.css';

function App() {
    const [user, setUser] = useState(null);

    // Stari Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');

    // Stari Aplicatie
    const [counts, setCounts] = useState({ yellow: 0, red: 0, blue: 0, purple: 0 });
    const [leaderboard, setLeaderboard] = useState([]);
    const [tab, setTab] = useState('home');
    const [userName, setUserName] = useState('');

    // --- STARE NOUA: MODUL DE LUCRU (+ sau -) ---
    const [isAddMode, setIsAddMode] = useState(true); // true = Adaugam, false = Scadem

    // 1. VERIFICAM LOGAREA
    useEffect(() => {
        return onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
    }, []);

    // 2. ASCULTAM DATELE USERULUI
    useEffect(() => {
        if (user) {
            const docRef = doc(db, 'grupul_nostru', user.email.toLowerCase());
            const unsub = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCounts({
                        yellow: data.yellow || 0,
                        red: data.red || 0,
                        blue: data.blue || 0,
                        purple: data.purple || 0
                    });
                    setUserName(data.name || user.email.split('@')[0]);
                }
            });
            return () => unsub();
        }
    }, [user]);

    // 3. ASCULTAM CLASAMENTUL
    useEffect(() => {
        if (user && tab === 'top') {
            const unsub = onSnapshot(collection(db, 'grupul_nostru'), (snapshot) => {
                const list = [];
                snapshot.forEach((doc) => {
                    const d = doc.data();
                    const total = (d.yellow||0) + (d.red||0) + (d.blue||0) + (d.purple||0);
                    list.push({
                        id: doc.id,
                        name: d.name || 'Anonim',
                        total: total,
                        yellow: d.yellow||0, red: d.red||0, blue: d.blue||0, purple: d.purple||0
                    });
                });
                list.sort((a,b) => b.total - a.total);
                setLeaderboard(list);
            });
            return () => unsub();
        }
    }, [user, tab]);

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            if (isSignUp) {
                if(name.length < 2) { alert("Pune un nume!"); return; }
                await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'grupul_nostru', email.toLowerCase()), {
                    name: name, yellow:0, red:0, blue:0, purple:0, created_at: serverTimestamp()
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) { alert(err.message); }
    };

    // --- UPDATE INTELIGENT (VERIFICA BUTONUL MAGIC) ---
    const update = async (field, currentVal) => {
        if(!user) return;

        // Verificam in ce mod suntem: Daca e AddMode punem +1, altfel -1
        const amount = isAddMode ? 1 : -1;
        const newVal = currentVal + amount;

        // Protectie: Nu scadem sub 0
        if (newVal < 0) return;

        setCounts(prev => ({...prev, [field]: newVal}));

        await setDoc(doc(db, 'grupul_nostru', user.email.toLowerCase()), {
            [field]: newVal, last_update: serverTimestamp()
        }, { merge: true });
    }

    // ECRAN LOGARE
    if (!user) return (
        <div className="container login-box">
            <h1 style={{fontSize: '3rem', color: '#4CAF50', marginBottom: '0'}}>Drinklet 🍻</h1>
            <p style={{color: '#888', marginTop: '5px'}}>Official Party App</p>
            <h2 style={{marginTop: '40px'}}>{isSignUp ? 'Creează Cont' : 'Intră în Cont'}</h2>
            <form onSubmit={handleAuth}>
                {isSignUp && <input placeholder="Cum te cheamă?" value={name} onChange={e=>setName(e.target.value)} />}
                <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
                <input placeholder="Parola" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
                <button type="submit" className="btn-primary">{isSignUp ? 'ÎNREGISTRARE' : 'LOGARE'}</button>
            </form>
            <p onClick={() => setIsSignUp(!isSignUp)} className="link">
                {isSignUp ? 'Ai deja cont? Intră aici!' : 'Nu ai cont? Fă-ți unul aici!'}
            </p>
        </div>
    );

    // ECRAN PRINCIPAL
    return (
        <div className="container">
            <div className="header">
                <div>
                    <div style={{fontSize:'12px', color:'#4CAF50', fontWeight:'bold'}}>DRINKLET</div>
                    <div style={{fontSize:'20px', fontWeight:'bold'}}>{userName}</div>
                </div>
                <button onClick={() => signOut(auth)} className="btn-logout">Ieșire</button>
            </div>

            <div className="tabs">
                <button className={tab==='home'?'active':''} onClick={()=>setTab('home')}>🏠 ACASĂ</button>
                <button className={tab==='top'?'active':''} onClick={()=>setTab('top')}>🏆 TOP</button>
            </div>

            {tab === 'home' ? (
                <>

                    <div className="mode-switcher">
                        <button
                            className={`btn-mode ${isAddMode ? 'mode-plus' : 'mode-minus'}`}
                            onClick={() => setIsAddMode(!isAddMode)}
                        >
                            {isAddMode ? 'ADAUGĂ (+)' : 'SCADE (-)'}
                        </button>
                    </div>

                    <div className="grid">
                        <div className="card yellow" onClick={() => update('yellow', counts.yellow)}>
                            <h3>Suc</h3> <div className="score">{counts.yellow}</div>
                        </div>
                        <div className="card red" onClick={() => update('red', counts.red)}>
                            <h3>Lapte</h3> <div className="score">{counts.red}</div>
                        </div>
                        <div className="card blue" onClick={() => update('blue', counts.blue)}>
                            <h3>Apa</h3> <div className="score">{counts.blue}</div>
                        </div>
                        <div className="card purple" onClick={() => update('purple', counts.purple)}>
                            <h3>ALTELE</h3> <div className="score">{counts.purple}</div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="list">
                    {leaderboard.map((u, i) => (
                        <div key={u.id} className="row">
                            <div className="rank">#{i+1}</div>
                            <div className="info">
                                <div className="name">{u.name}</div>
                                <div className="details">Suc: {u.yellow} | Lapte: {u.red} | Apa: {u.blue}</div>
                            </div>
                            <div className="total">{u.total}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
