import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, increment, set, get } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain: "zo-tinder.firebaseapp.com",
    databaseURL: "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zo-tinder",
    storageBucket: "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId: "1:866061631708:web:f2c70a3989032095803419"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/duj2rx73z/image/upload";
const CLOUDINARY_PRESET = "Zo-Tinder";
const CYCLE_MS = 24 * 60 * 60 * 1000; // 24 Hours

let currentUid = null;
let profileData = {};
let targetPopUid = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUid = user.uid;
        get(ref(db, `users/${user.uid}`)).then(snap => {
            profileData = snap.val() || {};
            startBattle();
        });
    }
});
async function checkAndArchiveWinner(prevMatchId) {
    const archiveRef = ref(db, `battle_history/${prevMatchId}`);
    const archiveSnap = await get(archiveRef);
    
    // If already recorded, don't do it again
    if (archiveSnap.exists()) return;

    const prevMatchRef = ref(db, `battles/${prevMatchId}/photos`);
    const matchSnap = await get(prevMatchRef);
    
    if (matchSnap.exists()) {
        const data = matchSnap.val();
        const players = Object.entries(data).map(([id, v]) => ({ uid: id, ...v }))
                        .sort((a, b) => (b.photo_likes || 0) - (a.photo_likes || 0));
        
        const winner = players[0];
        if (winner && (winner.photo_likes > 0)) {
            const updates = {};
            updates[`battle_history/${prevMatchId}`] = {
                uid: winner.uid,
                username: winner.username,
                photo_url: winner.photo_url,
                likes: winner.photo_likes,
                timestamp: Date.now()
            };
            updates[`users/${winner.uid}/battleWins`] = increment(1);
            await update(ref(db), updates);
        }
    }
}


function startBattle() {
    const matchId = `match_${Math.floor(Date.now() / CYCLE_MS)}`;
        const currentCycleIdx = Math.floor(Date.now() / CYCLE_MS);
    const prevMatchId = `match_${currentCycleIdx - 1}`;
    checkAndArchiveWinner(prevMatchId);


    // 24hr Timer Fix
    setInterval(() => {
        const now = Date.now();
        const nextCycle = (Math.floor(now / CYCLE_MS) + 1) * CYCLE_MS;
        const timeLeft = nextCycle - now;
        const h = Math.floor(timeLeft / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        const s = Math.floor((timeLeft % 60000) / 1000);
        document.getElementById('battleTimer').innerText = `${h}h ${m}m ${s}s`;
    }, 1000);

    onValue(ref(db, `battles/${matchId}/photos`), (snap) => {
        const data = snap.val();
        if (data && data[currentUid]) document.getElementById('joinBtn').classList.add('hidden');
        if (!data) return;

        const players = Object.entries(data).map(([id, v]) => ({ uid: id, ...v }))
                        .sort((a, b) => (b.photo_likes || 0) - (a.photo_likes || 0));
        
        renderUI(players);
    });
}

function renderUI(players) {
    document.getElementById('mainFeed').innerHTML = players.map(p => {
        const hasVoted = p.voters && p.voters[currentUid] ? 'voted' : '';
        return `
        <div class="battle-card" id="card-${p.uid}">
            <div class="card-header">
                <img src="${p.photoURL || ''}" class="p-avatar" onclick="openPop('${p.uid}','${p.username}','${p.bio}','${p.photoURL}')">
                <span style="font-weight:800;">${p.username}</span>
            </div>
            <img src="${p.photo_url}" class="battle-photo">
            <div class="card-content">
                <button class="btn-action ${hasVoted}" onclick="vote('${p.uid}')">❤️ ${p.photo_likes || 0}</button>
                <button class="btn-action" onclick="shareMe('${p.username}')">🔗 SHARE</button>
            </div>
        </div>`;
    }).join('');

    for (let i = 0; i < 3; i++) {
        const p = players[i];
        if (p) {
            document.getElementById(`rank${i+1}-img`).src = p.photo_url;
            document.getElementById(`rank${i+1}-name`).innerText = p.username;
            document.getElementById(`rank${i+1}-likes`).innerText = `${p.photo_likes || 0} Lks`;
        }
    }

    const myIdx = players.findIndex(p => p.uid === currentUid);
    if (myIdx !== -1) {
        document.getElementById('myStickyBar').style.display = 'flex';
        document.getElementById('myThumb').src = players[myIdx].photoURL || '';
        document.getElementById('myRankDisplay').innerText = `Rank: #${myIdx + 1}`;
        document.getElementById('myLikesDisplay').innerText = `Likes: ${players[myIdx].photo_likes || 0}`;
    }
}

document.getElementById('fileInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('joinBtn').innerText = "⏳ UPLOADING...";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const cloud = await res.json();
    const matchId = `match_${Math.floor(Date.now() / CYCLE_MS)}`;
    await set(ref(db, `battles/${matchId}/photos/${currentUid}`), {
        username: profileData.username || "User",
        photoURL: profileData.photoURL || "",
        bio: profileData.bio || "",
        photo_url: cloud.secure_url,
        photo_likes: 0
    });
    location.reload();
};

window.vote = async (id) => {
    const matchId = `match_${Math.floor(Date.now() / CYCLE_MS)}`;
    const voteRef = ref(db, `battles/${matchId}/photos/${id}/voters/${currentUid}`);
    const snap = await get(voteRef);
    if (snap.exists()) return;
    const updates = {};
    updates[`battles/${matchId}/photos/${id}/voters/${currentUid}`] = true;
    updates[`battles/${matchId}/photos/${id}/photo_likes`] = increment(1);
    updates[`users/${id}/profileLikes`] = increment(1);
    update(ref(db), updates);
};

window.shareMe = (name) => {
    const text = `Vote for ${name} in the Battle!`;
    if (navigator.share) {
        navigator.share({ title: 'Zo-Chatbox', text: text, url: window.location.href });
    } else {
        navigator.clipboard.writeText(`${text} ${window.location.href}`);
        alert("Link copied!");
    }
};

window.openPop = (uid, n, b, a) => {
    targetPopUid = uid;
    document.getElementById('popName').innerText = n;
    document.getElementById('popBio').innerText = b;
    document.getElementById('popAvatar').src = a || '';
    document.getElementById('viewProfileBtn').onclick = () => { window.location.href = `view-profile.html?uid=${uid}`; };
    document.getElementById('userModal').style.display = 'flex';
};

window.followUser = async () => {
    if (!targetPopUid || targetPopUid === currentUid) return alert("I in-follow thei hleinem!");
    const updates = {};
    updates[`users/${currentUid}/following/${targetPopUid}`] = true;
    updates[`users/${targetPopUid}/followers/${currentUid}`] = true;
    await update(ref(db), updates);
    alert("Followed!");
};

window.closePopup = () => document.getElementById('userModal').style.display = 'none';
window.scrollToMe = () => document.getElementById(`card-${currentUid}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
