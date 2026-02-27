import { initializeApp }            from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get }      from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function hideLoader() {
    const ol = document.getElementById('loadingOverlay');
    if (!ol) return;
    ol.style.opacity = '0';
    setTimeout(() => { ol.style.display = 'none'; }, 300);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const snap = await get(ref(db, `users/${user.uid}`));
        if (!snap.exists()) {
            hideLoader();
            showToast('⚠️ Profile data not found');
            return;
        }
        const data = snap.val();
        renderProfile(user.uid, data);
        await loadRankings(user.uid);
    } catch (e) {
        console.error('profile.js error:', e);
        showToast('❌ Failed to load profile');
    } finally {
        hideLoader();
    }
});

// ── RENDER PROFILE ─────────────────────────────────────────────────────────
function renderProfile(uid, data) {

    // ── Cover ──────────────────────────────────────────────────────────────
    if (data.coverVideoURL) {
        const vid = document.getElementById('coverVideo');
        if (vid) {
            vid.src           = data.coverVideoURL;
            vid.style.display = 'block';
        }
    } else if (data.coverImageURL) {
        const img = document.getElementById('coverImg');
        if (img) {
            img.src           = data.coverImageURL;
            img.style.display = 'block';
        }
    }
    // else: default animated gradient shows automatically

    // ── Avatar ─────────────────────────────────────────────────────────────
    if (data.photoURL) {
        const avatarImg   = document.getElementById('avatarImg');
        const placeholder = document.getElementById('avatarPlaceholder');
        if (avatarImg) {
            avatarImg.src           = data.photoURL;
            avatarImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
    }

    // ── Online dot ─────────────────────────────────────────────────────────
    const dot = document.getElementById('onlineDot');
    if (dot) dot.style.display = data.isOnline ? 'block' : 'none';

    // ── Frame — role overrides equipped frame ──────────────────────────────
    const wrap = document.getElementById('avatarWrap');
    if (wrap) {
        let frameClass = 'frame-none';
        const role = (uid === OWNER_UID) ? 'owner' : (data.role || 'member');

        if (role === 'owner')        frameClass = 'frame-owner';
        else if (role === 'admin')   frameClass = 'frame-admin';
        else if (role === 'mod')     frameClass = 'frame-mod';
        else if (data.equippedFrame) frameClass = data.equippedFrame;

        wrap.className = `avatar-wrap ${frameClass}`;
    }

    // ── Name ───────────────────────────────────────────────────────────────
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = data.username || 'User';

    // ── Role badge ─────────────────────────────────────────────────────────
    const badge = document.getElementById('roleBadge');
    if (badge) {
        const role = (uid === OWNER_UID) ? 'owner' : (data.role || '');
        if (role === 'owner') {
            badge.innerHTML     = '👑 Owner';
            badge.className     = 'role-badge owner';
            badge.style.display = 'inline-flex';
        } else if (role === 'admin') {
            badge.innerHTML     = '⚙️ Admin';
            badge.className     = 'role-badge admin';
            badge.style.display = 'inline-flex';
        } else if (role === 'mod') {
            badge.innerHTML     = '🛡️ Mod';
            badge.className     = 'role-badge mod';
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Location: khaw, veng ───────────────────────────────────────────────
    const locWrap = document.getElementById('profileLocation');
    const locText = document.getElementById('locationText');
    if (locWrap && locText) {
        const parts = [data.khaw, data.veng].filter(Boolean);
        if (parts.length) {
            locText.textContent   = parts.join(', ');
            locWrap.style.display = 'flex';
        }
    }

    // ── Currency ───────────────────────────────────────────────────────────
    const coinEl    = document.getElementById('coinAmount');
    const diamondEl = document.getElementById('diamondAmount');
    if (coinEl)    coinEl.textContent    = (data.coins    || 0).toLocaleString();
    if (diamondEl) diamondEl.textContent = (data.diamonds || 0).toLocaleString();

    // ── Stats ──────────────────────────────────────────────────────────────
    const followersEl = document.getElementById('statFollowers');
    const followingEl = document.getElementById('statFollowing');
    const likesEl     = document.getElementById('statLikes');
    if (followersEl) followersEl.textContent = (data.followersCount || 0).toLocaleString();
    if (followingEl) followingEl.textContent = (data.followingCount || 0).toLocaleString();
    if (likesEl)     likesEl.textContent     = (data.total_likes    || 0).toLocaleString();

    // ── Interests ──────────────────────────────────────────────────────────
    const interestsEl = document.getElementById('interestsList');
    if (interestsEl) {
        const raw = data.interests;
        const interests = Array.isArray(raw)
            ? raw
            : (raw && typeof raw === 'object' ? Object.values(raw) : []);

        if (interests.length) {
            interestsEl.innerHTML = interests
                .map(i => `<div class="interest-tag">${esc(i)}</div>`)
                .join('');
        }
    }

    // ── Bio ────────────────────────────────────────────────────────────────
    const bioEl = document.getElementById('bioText');
    if (bioEl && data.bio) {
        bioEl.textContent = data.bio;
    }

    // ── Achievements ───────────────────────────────────────────────────────
    renderAchievements(data.achievements || {});
}

// ── ACHIEVEMENTS ───────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = {
    leaderboard_1:  { icon: '🥇', label: '#1 Leaderboard', tier: 'gold'   },
    leaderboard_3:  { icon: '🥈', label: 'Top 3',          tier: 'silver' },
    leaderboard_10: { icon: '🥉', label: 'Top 10',         tier: 'bronze' },
    // add more here as app grows
};

function renderAchievements(achievements) {
    const el = document.getElementById('achievementsList');
    if (!el) return;

    const earned = Object.keys(achievements).filter(k => achievements[k]);
    if (!earned.length) return; // "No achievements yet" default stays

    el.innerHTML = earned.map(key => {
        const def = ACHIEVEMENT_DEFS[key];
        if (!def) return '';
        return `
            <div class="achievement-badge ${def.tier}">
                <div class="achievement-icon">${def.icon}</div>
                <div class="achievement-label">${esc(def.label)}</div>
            </div>`;
    }).filter(Boolean).join('');
}

// ── ACHIEVEMENTS + LIVE RANKINGS ───────────────────────────────────────────
// Renders leaderboard positions + badge achievements all inside achievementsList
async function loadRankings(uid) {
    const el = document.getElementById('achievementsList');
    if (!el) return;

    try {
        const usersSnap = await get(ref(db, 'users'));
        if (!usersSnap.exists()) {
            el.innerHTML = '<span class="achievements-empty">No data yet</span>';
            return;
        }

        const users = [];
        usersSnap.forEach(child => {
            const d = child.val();
            if (d && d.username) users.push({ uid: child.key, ...d });
        });

        const me = users.find(u => u.uid === uid) || {};

        // ── Sort each leaderboard ──────────────────────────────────────────
        const byFollowers    = [...users].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
        const byProfileLikes = [...users].sort((a, b) => (b.profileLikes  || 0) - (a.profileLikes  || 0));
        const byTotalLikes   = [...users].sort((a, b) => (b.total_likes   || 0) - (a.total_likes   || 0));

        // ── Find positions (1-based) ───────────────────────────────────────
        const posFollowers    = byFollowers.findIndex(u => u.uid === uid) + 1;
        const posProfileLikes = byProfileLikes.findIndex(u => u.uid === uid) + 1;
        const posTotalLikes   = byTotalLikes.findIndex(u => u.uid === uid) + 1;

        const boards = [
            {
                icon:  '🌐',
                label: 'Most Followed',
                sub:   'Top Influencers',
                pos:   posFollowers,
                value: me.followersCount || 0,
                unit:  'followers',
                href:  'most-followed.html'
            },
            {
                icon:  '💖',
                label: 'Profile Stars',
                sub:   'Most Liked Profiles',
                pos:   posProfileLikes,
                value: me.profileLikes || 0,
                unit:  'likes',
                href:  'profilelike_leaderboard.html'
            },
            {
                icon:  '🏆',
                label: 'Battle Kings',
                sub:   'Hall of Fame',
                pos:   posTotalLikes,
                value: me.total_likes || 0,
                unit:  'total likes',
                href:'battle-leaderboard.html'
            },
        ];

        // ── Rank rows ──────────────────────────────────────────────────────
        const rankRows = boards.map(b => {
            const posClass = b.pos === 1 ? 'gold' : b.pos === 2 ? 'silver' : b.pos === 3 ? 'bronze' : 'normal';
            const posLabel = b.pos > 0 ? `#${b.pos}` : '—';
            return `
                <a class="rank-row" href="${b.href}">
                    <div class="rank-left">
                        <div class="rank-icon">${b.icon}</div>
                        <div class="rank-info">
                            <div class="rank-label">${b.label}</div>
                            <div class="rank-sub">${b.sub} · ${b.value.toLocaleString()} ${b.unit}</div>
                        </div>
                    </div>
                    <div class="rank-position ${posClass}">${posLabel}</div>
                </a>`;
        }).join('');

        // ── Badge achievements (battleWins etc) ────────────────────────────
        let badgeHTML = '';
        if (me.battleWins > 0) {
            badgeHTML += `
                <div class="badge-grid">
                    <div class="achievement-badge gold">
                        <div class="achievement-icon">🏆</div>
                        <div class="achievement-label">Battle Wins ×${me.battleWins}</div>
                    </div>
                </div>`;
        }

        el.innerHTML = rankRows + badgeHTML ||
            '<span class="achievements-empty">No achievements yet</span>';

    } catch(e) {
        console.error('loadRankings error:', e);
        el.innerHTML = '<span class="achievements-empty">Could not load achievements</span>';
    }
}
