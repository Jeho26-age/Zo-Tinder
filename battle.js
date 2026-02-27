import { initializeApp }            from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, increment, set, get, remove }
                                        from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ── Firebase config ────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain:        "zo-tinder.firebaseapp.com",
    databaseURL:       "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "zo-tinder",
    storageBucket:     "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId:             "1:866061631708:web:f2c70a3989032095803419"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

const CLOUDINARY_URL    = "https://api.cloudinary.com/v1_1/duj2rx73z/image/upload";
const CLOUDINARY_PRESET = "Zo-Tinder";

// ── 3 days per match ───────────────────────────────────────────────────────
const CYCLE_MS = 72 * 60 * 60 * 1000; // 259,200,000 ms = 3 days

let currentUid  = null;
let profileData = {};
let targetPopUid = null;

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUid = user.uid;
        get(ref(db, `users/${user.uid}`)).then(snap => {
            profileData = snap.val() || {};
            startBattle();
        });
    }
});

// ── CHECK AND ARCHIVE WINNER ───────────────────────────────────────────────
// Runs on load — looks at the previous match, records the winner, cleans up
async function checkAndArchiveWinner(prevMatchId) {
    // Already archived? Skip
    const archiveSnap = await get(ref(db, `battle_history/${prevMatchId}`));
    if (archiveSnap.exists()) return;

    const matchSnap = await get(ref(db, `battles/${prevMatchId}/photos`));
    if (!matchSnap.exists()) return;

    const data    = matchSnap.val();
    const players = Object.entries(data)
        .map(([id, v]) => ({ uid: id, ...v }))
        .sort((a, b) => (b.photo_likes || 0) - (a.photo_likes || 0));

    const winner = players[0];

    // Only record if winner had at least 1 like
    if (winner && (winner.photo_likes > 0)) {
        const updates = {};

        // Save winner to battle_history
        updates[`battle_history/${prevMatchId}`] = {
            uid:       winner.uid,
            username:  winner.username,
            photo_url: winner.photo_url,
            likes:     winner.photo_likes,
            timestamp: Date.now()
        };

        // Give winner +1 battleWins
        updates[`users/${winner.uid}/battleWins`] = increment(1);

        await update(ref(db), updates);
    }

    // ── Clean up old match data — page starts fresh ────────────────────────
    await remove(ref(db, `battles/${prevMatchId}`));
}

// ── START BATTLE ───────────────────────────────────────────────────────────
function startBattle() {
    const currentCycleIdx = Math.floor(Date.now() / CYCLE_MS);
    const matchId         = `match_${currentCycleIdx}`;
    const prevMatchId     = `match_${currentCycleIdx - 1}`;

    // Archive previous match winner + clean up old data
    checkAndArchiveWinner(prevMatchId);

    // ── Countdown timer ────────────────────────────────────────────────────
    setInterval(() => {
        const now       = Date.now();
        const nextCycle = (Math.floor(now / CYCLE_MS) + 1) * CYCLE_MS;
        const timeLeft  = nextCycle - now;
        const h = Math.floor(timeLeft / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        const s = Math.floor((timeLeft % 60000) / 1000);
        const timerEl = document.getElementById('battleTimer');
        if (timerEl) timerEl.innerText = `${h}h ${m}m ${s}s`;
    }, 1000);

    // ── Live match listener ────────────────────────────────────────────────
    onValue(ref(db, `battles/${matchId}/photos`), (snap) => {
        const data = snap.val();

        // If current user already joined — hide join button
        if (data && data[currentUid]) {
            document.getElementById('joinBtn')?.classList.add('hidden');
        }

        if (!data) return;

        const players = Object.entries(data)
            .map(([id, v]) => ({ uid: id, ...v }))
            .sort((a, b) => (b.photo_likes || 0) - (a.photo_likes || 0));

        renderUI(players);
    });
}

// ── RENDER UI ──────────────────────────────────────────────────────────────
function renderUI(players) {
    const feed = document.getElementById('mainFeed');
    if (feed) {
        feed.innerHTML = players.map(p => {
            const hasVoted = p.voters && p.voters[currentUid] ? 'voted' : '';
            return `
            <div class="battle-card" id="card-${p.uid}">
                <div class="card-header">
                    <img src="${p.photoURL || ''}" class="p-avatar"
                         onclick="openPop('${p.uid}','${p.username}','${p.bio || ''}','${p.photoURL || ''}')">
                    <span style="font-weight:800;">${p.username}</span>
                </div>
                <img src="${p.photo_url}" class="battle-photo">
                <div class="card-content">
                    <button class="btn-action ${hasVoted}" onclick="vote('${p.uid}')">
                        ❤️ ${p.photo_likes || 0}
                    </button>
                    <button class="btn-action" onclick="shareMe('${p.username}')">🔗 SHARE</button>
                </div>
            </div>`;
        }).join('');
    }

    // Top 3 podium
    for (let i = 0; i < 3; i++) {
        const p = players[i];
        if (p) {
            const imgEl   = document.getElementById(`rank${i + 1}-img`);
            const nameEl  = document.getElementById(`rank${i + 1}-name`);
            const likesEl = document.getElementById(`rank${i + 1}-likes`);
            if (imgEl)   imgEl.src          = p.photo_url;
            if (nameEl)  nameEl.innerText   = p.username;
            if (likesEl) likesEl.innerText  = `${p.photo_likes || 0} Lks`;
        }
    }

    // Sticky bar for current user
    const myIdx = players.findIndex(p => p.uid === currentUid);
    if (myIdx !== -1) {
        const stickyBar = document.getElementById('myStickyBar');
        const myThumb   = document.getElementById('myThumb');
        const myRank    = document.getElementById('myRankDisplay');
        const myLikes   = document.getElementById('myLikesDisplay');
        if (stickyBar) stickyBar.style.display = 'flex';
        if (myThumb)   myThumb.src             = players[myIdx].photoURL || '';
        if (myRank)    myRank.innerText         = `Rank: #${myIdx + 1}`;
        if (myLikes)   myLikes.innerText        = `Likes: ${players[myIdx].photo_likes || 0}`;
    }
}

// ── FILE UPLOAD — JOIN BATTLE ──────────────────────────────────────────────
const fileInput = document.getElementById('fileInput');
if (fileInput) {
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const joinBtn = document.getElementById('joinBtn');
        if (joinBtn) joinBtn.innerText = "⏳ UPLOADING...";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_PRESET);

        try {
            const res   = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
            const cloud = await res.json();

            if (!cloud.secure_url) {
                if (joinBtn) joinBtn.innerText = "JOIN BATTLE";
                alert("Upload failed. Try again.");
                return;
            }

            const matchId = `match_${Math.floor(Date.now() / CYCLE_MS)}`;
            await set(ref(db, `battles/${matchId}/photos/${currentUid}`), {
                username:   profileData.username  || "User",
                photoURL:   profileData.photoURL  || "",
                bio:        profileData.bio       || "",
                photo_url:  cloud.secure_url,
                photo_likes: 0
            });

            location.reload();
        } catch (err) {
            console.error('Upload error:', err);
            if (joinBtn) joinBtn.innerText = "JOIN BATTLE";
            alert("Upload failed. Try again.");
        }
    };
}

// ── VOTE ───────────────────────────────────────────────────────────────────
// Increments total_likes (all time) — NOT profileLikes
window.vote = async (id) => {
    const matchId = `match_${Math.floor(Date.now() / CYCLE_MS)}`;
    const voteRef = ref(db, `battles/${matchId}/photos/${id}/voters/${currentUid}`);

    const snap = await get(voteRef);
    if (snap.exists()) return; // already voted

    const updates = {};
    // Record vote
    updates[`battles/${matchId}/photos/${id}/voters/${currentUid}`] = true;
    // Increment match likes
    updates[`battles/${matchId}/photos/${id}/photo_likes`]          = increment(1);
    // Increment all-time total likes — this is what leaderboard uses
    updates[`users/${id}/total_likes`]                              = increment(1);
    // Note: profileLikes is NOT incremented here — that's for profile page likes only

    await update(ref(db), updates);
};

// ── SHARE ──────────────────────────────────────────────────────────────────
window.shareMe = (name) => {
    const text = `Vote for ${name} in the Zo-Tinder Battle!`;
    if (navigator.share) {
        navigator.share({ title: 'Zo-Tinder', text, url: window.location.href });
    } else {
        navigator.clipboard.writeText(`${text} ${window.location.href}`);
        alert("Link copied!");
    }
};

// ── PROFILE POPUP ──────────────────────────────────────────────────────────
window.openPop = (uid, name, bio, avatar) => {
    targetPopUid = uid;
    const popName   = document.getElementById('popName');
    const popBio    = document.getElementById('popBio');
    const popAvatar = document.getElementById('popAvatar');
    const viewBtn   = document.getElementById('viewProfileBtn');
    const modal     = document.getElementById('userModal');

    if (popName)   popName.innerText   = name;
    if (popBio)    popBio.innerText    = bio;
    if (popAvatar) popAvatar.src       = avatar || '';
    if (viewBtn)   viewBtn.onclick     = () => { window.location.href = `view-profile.html?uid=${uid}`; };
    if (modal)     modal.style.display = 'flex';
};

window.followUser = async () => {
    if (!targetPopUid || targetPopUid === currentUid) {
        alert("I in-follow thei hleinem!");
        return;
    }
    const updates = {};
    updates[`users/${currentUid}/following/${targetPopUid}`]  = true;
    updates[`users/${targetPopUid}/followers/${currentUid}`]  = true;
    await update(ref(db), updates);
    alert("Followed!");
};

window.closePopup    = () => { const m = document.getElementById('userModal'); if (m) m.style.display = 'none'; };
window.scrollToMe    = () => { const el = document.getElementById(`card-${currentUid}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
