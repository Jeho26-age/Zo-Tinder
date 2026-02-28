import { initializeApp }                                      from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }                       from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, onValue, push, increment } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

// ── State ──────────────────────────────────────────────────────────────────
let myUID       = null;
let allNotifs   = [];   // full list sorted newest first
let usersCache  = {};

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function hideLoader() {
    const ol = document.getElementById('loadingOverlay');
    if (!ol) return;
    ol.style.opacity = '0';
    setTimeout(() => ol.style.display = 'none', 300);
}

function formatTime(ts) {
    if (!ts) return '';
    const now  = Date.now();
    const diff = now - ts;
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hrs  < 24)  return `${hrs}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
}

async function fetchUser(uid) {
    if (usersCache[uid]) return usersCache[uid];
    const snap = await get(ref(db, `users/${uid}`));
    const data = snap.exists() ? snap.val() : {};
    usersCache[uid] = data;
    return data;
}

// ── Notification type config ───────────────────────────────────────────────
const TYPE_CONFIG = {
    follow:           { icon: '👤', bg: 'follow',      tab: 'social'  },
    follow_back:      { icon: '👤', bg: 'follow',      tab: 'social'  },
    profile_like:     { icon: '❤️', bg: 'like',        tab: 'social'  },
    message:          { icon: '💬', bg: 'message',     tab: 'social'  },
    message_request:  { icon: '📩', bg: 'message',     tab: 'social'  },
    message_reaction: { icon: '😊', bg: 'message',     tab: 'social'  },
    view_once_opened: { icon: '👁️', bg: 'message',     tab: 'social'  },
    battle_end:       { icon: '🏆', bg: 'battle',      tab: 'battle'  },
    battle_like:      { icon: '❤️', bg: 'battle',      tab: 'battle'  },
    battle_challenge: { icon: '⚔️', bg: 'battle',      tab: 'battle'  },
    leaderboard_top10:{ icon: '🏅', bg: 'leaderboard', tab: 'system'  },
    leaderboard_rank: { icon: '📈', bg: 'leaderboard', tab: 'system'  },
    temp_ban:         { icon: '⏳', bg: 'mod',         tab: 'system'  },
    perm_ban:         { icon: '🔨', bg: 'mod',         tab: 'system'  },
    role_update:      { icon: '🛡️', bg: 'mod',         tab: 'system'  },
    welcome:          { icon: '🎉', bg: 'system',      tab: 'system'  },
    purchase:         { icon: '🛍️', bg: 'system',      tab: 'system'  },
    achievement:      { icon: '🏅', bg: 'system',      tab: 'system'  },
};

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    myUID = user.uid;

    // Mark all as read when page opens
    markAllRead();

    // Listen to notifications in real time
    listenNotifications();

    // Setup clear button
    setupClear();
});

// ── LISTEN NOTIFICATIONS ───────────────────────────────────────────────────
function listenNotifications() {
    const notifRef = ref(db, `notifications/${myUID}`);

    onValue(notifRef, async (snap) => {
        allNotifs = [];

        if (!snap.exists()) {
            hideLoader();
            renderAll();
            return;
        }

        // Collect all
        const raw = [];
        snap.forEach(child => {
            raw.push({ id: child.key, ...child.val() });
        });

        // Sort newest first
        raw.sort((a, b) => (b.time || 0) - (a.time || 0));

        // Fetch sender user data for each notif that has a 'from' uid
        const uidsNeeded = [...new Set(raw.map(n => n.from).filter(Boolean))];
        await Promise.all(uidsNeeded.map(uid => fetchUser(uid)));

        allNotifs = raw;

        hideLoader();
        renderAll();
        updateClearBtn();
    });
}

// ── RENDER ALL TABS ────────────────────────────────────────────────────────
function renderAll() {
    const social  = allNotifs.filter(n => TYPE_CONFIG[n.type]?.tab === 'social');
    const battle  = allNotifs.filter(n => TYPE_CONFIG[n.type]?.tab === 'battle');
    const system  = allNotifs.filter(n => TYPE_CONFIG[n.type]?.tab === 'system');

    renderList('all',    allNotifs);
    renderList('social', social);
    renderList('battle', battle);
    renderList('system', system);

    // Unread badge on All tab
    const unreadCount = allNotifs.filter(n => !n.read).length;
    const badge = document.getElementById('badge-all');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent   = unreadCount > 200 ? '200+' : unreadCount;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderList(tab, notifs) {
    const list  = document.getElementById(`list-${tab}`);
    const empty = document.getElementById(`empty-${tab}`);
    if (!list) return;

    if (notifs.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }

    if (empty) empty.style.display = 'none';

    // Group by date section
    let lastSection = '';
    let html = '';

    notifs.forEach(notif => {
        const section = getSectionLabel(notif.time);
        if (section !== lastSection) {
            lastSection = section;
            html += `<div class="section-label">${esc(section)}</div>`;
        }
        html += buildNotifRow(notif);
    });

    list.innerHTML = html;

    // Attach click handlers
    list.querySelectorAll('.notif-row').forEach(row => {
        row.addEventListener('click', () => handleNotifClick(row.dataset.id, row.dataset.type, row.dataset.target));
    });

    // Attach follow-back buttons
    list.querySelectorAll('.follow-back-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const uid = btn.dataset.uid;
            await toggleFollowBack(uid, btn);
        });
    });
}

// ── SECTION LABEL ──────────────────────────────────────────────────────────
function getSectionLabel(ts) {
    if (!ts) return 'Older';
    const diff = Math.floor((Date.now() - ts) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)   return 'This Week';
    if (diff < 30)  return 'This Month';
    return 'Older';
}

// ── BUILD NOTIFICATION ROW HTML ────────────────────────────────────────────
function buildNotifRow(notif) {
    const cfg      = TYPE_CONFIG[notif.type] || { icon: '🔔', bg: 'system', tab: 'system' };
    const sender   = notif.from ? (usersCache[notif.from] || {}) : {};
    const isUnread = !notif.read;

    // Avatar
    const avatarInner = sender.photoURL
        ? `<img src="${esc(sender.photoURL)}" alt="">`
        : `<span style="font-size:1.3rem;">${getSystemIcon(notif.type)}</span>`;

    // Notification text
    const text = buildNotifText(notif, sender);

    // Extra card (battle, leaderboard, system info)
    const extraCard = buildExtraCard(notif, sender);

    // Follow back button (only for follow notifications)
    let followBackBtn = '';
    if ((notif.type === 'follow' || notif.type === 'follow_back') && notif.from) {
        const isFollowing = false; // JS will update this dynamically
        followBackBtn = `
            <button class="follow-back-btn" data-uid="${esc(notif.from)}" id="fb-${esc(notif.id)}">
                ➕ Follow Back
            </button>`;
    }

    // Navigate target
    const target = getNavTarget(notif);

    return `
        <div class="notif-row ${isUnread ? 'unread' : ''}"
             data-id="${esc(notif.id)}"
             data-type="${esc(notif.type)}"
             data-target="${esc(target)}">
            <div class="notif-avatar-wrap">
                <div class="notif-avatar">${avatarInner}</div>
                <div class="notif-type-icon ${cfg.bg}">${cfg.icon}</div>
            </div>
            <div class="notif-info">
                <div class="notif-text">${text}</div>
                ${extraCard}
                ${followBackBtn}
                <div class="notif-time">${formatTime(notif.time)}</div>
            </div>
        </div>`;
}

// ── NOTIFICATION TEXT ──────────────────────────────────────────────────────
function buildNotifText(notif, sender) {
    const name = sender.username ? `<strong>${esc(sender.username)}</strong>` : '<strong>Someone</strong>';
    const d    = notif.data || {};

    switch (notif.type) {
        case 'follow':
            return `${name} started following you`;
        case 'follow_back':
            return `${name} followed you back! 🎉`;
        case 'profile_like':
            return `${name} liked your profile ❤️`;
        case 'message':
            return `${name} sent you a message`;
        case 'message_request':
            return `${name} sent you a message request`;
        case 'message_reaction':
            return `${name} reacted ${esc(d.emoji || '😊')} to your message`;
        case 'view_once_opened':
            return `${name} opened your view-once ${d.mediaType === 'video' ? 'video' : 'photo'} 👁️`;
        case 'battle_end':
            return `Your photo battle has ended!`;
        case 'battle_like':
            return `${name} liked your battle photo ❤️`;
        case 'battle_challenge':
            return `${name} challenged you to a photo battle ⚔️`;
        case 'leaderboard_top10':
            return `You entered the <strong>Top 10</strong> on ${esc(d.board || 'leaderboard')}! 🏅`;
        case 'leaderboard_rank':
            return `Your rank improved to <strong>#${esc(String(d.rank || ''))}</strong> on ${esc(d.board || 'leaderboard')} 📈`;
        case 'temp_ban':
            return `You have been temporarily banned for <strong>${esc(String(d.hours || '?'))} hour${d.hours > 1 ? 's' : ''}</strong>`;
        case 'perm_ban':
            return `Your account has been <strong>permanently banned</strong> 🔨`;
        case 'role_update':
            return `Your role has been updated to <strong>${esc(d.role || 'Moderator')}</strong> 🛡️`;
        case 'welcome':
            return `<strong>Welcome to Zo-Tinder!</strong> 🎉 Your profile is live`;
        case 'purchase':
            return `Purchase successful! <strong>${esc(d.item || 'Item')}</strong> is now in your collection 🛍️`;
        case 'achievement':
            return `New achievement unlocked: <strong>${esc(d.achievement || '')}</strong> 🏅`;
        default:
            return notif.text || 'You have a new notification';
    }
}

// ── EXTRA CARD (battle result, leaderboard etc) ────────────────────────────
function buildExtraCard(notif, sender) {
    const d = notif.data || {};

    if (notif.type === 'battle_end') {
        const myLikes    = d.myLikes    || 0;
        const theirLikes = d.theirLikes || 0;
        const result     = myLikes > theirLikes ? 'win' : myLikes < theirLikes ? 'loss' : 'draw';
        const resultLabel = result === 'win' ? '🏆 Victory' : result === 'loss' ? '💀 Defeat' : '🤝 Draw';
        const opponentName = sender.username || 'Opponent';

        return `
            <div class="battle-result-card">
                <div class="battle-result-top">
                    <div class="battle-result-label">Battle Result</div>
                    <div class="battle-result-badge ${result}">${resultLabel}</div>
                </div>
                <div class="battle-scores">
                    <div class="battle-score-side">
                        <div class="battle-score-name">You</div>
                        <div class="battle-score-num mine">${myLikes.toLocaleString()}</div>
                    </div>
                    <div class="battle-vs">VS</div>
                    <div class="battle-score-side">
                        <div class="battle-score-name">${esc(opponentName)}</div>
                        <div class="battle-score-num theirs">${theirLikes.toLocaleString()}</div>
                    </div>
                </div>
                <div class="battle-rank-row">
                    <div class="battle-rank-label">Your rank</div>
                    <div class="battle-rank-val">#${d.rank || '?'}</div>
                    <div class="battle-rank-label" style="margin-left:8px;">· Total ❤️ ${myLikes.toLocaleString()}</div>
                </div>
            </div>`;
    }

    if (notif.type === 'leaderboard_top10' || notif.type === 'leaderboard_rank') {
        const rank = d.rank || 1;
        const rankClass = rank === 1 ? 'gold' : rank <= 3 ? 'silver' : rank <= 5 ? 'bronze' : 'normal';
        return `
            <div class="leaderboard-card">
                <div class="leaderboard-rank-big ${rankClass}">#${rank}</div>
                <div>
                    <div class="leaderboard-info-label">${esc(d.board || 'Leaderboard')}</div>
                    <div class="leaderboard-info-sub">${(d.value || 0).toLocaleString()} ${esc(d.unit || 'points')}</div>
                </div>
            </div>`;
    }

    if (notif.type === 'temp_ban') {
        const until = d.until ? new Date(d.until).toLocaleString() : '';
        return `
            <div class="system-card">
                ⏳ Ban expires: <strong>${until}</strong><br>
                During this time you cannot use the app.
            </div>`;
    }

    if (notif.type === 'perm_ban') {
        return `
            <div class="system-card">
                🔨 This action was taken by our moderation team.<br>
                If you believe this is a mistake, please contact support.
            </div>`;
    }

    if (notif.type === 'role_update') {
        return `
            <div class="system-card">
                🛡️ You now have moderation powers. Use them responsibly!
            </div>`;
    }

    return '';
}

// ── SYSTEM ICON (for notifs without a real user avatar) ────────────────────
function getSystemIcon(type) {
    const map = {
        welcome:           '🎉',
        purchase:          '🛍️',
        achievement:       '🏅',
        temp_ban:          '⏳',
        perm_ban:          '🔨',
        role_update:       '🛡️',
        leaderboard_top10: '🏅',
        leaderboard_rank:  '📈',
    };
    return map[type] || '🔔';
}

// ── NAV TARGET ─────────────────────────────────────────────────────────────
function getNavTarget(notif) {
    const d = notif.data || {};
    switch (notif.type) {
        case 'follow':
        case 'follow_back':
        case 'profile_like':
            return notif.from ? `user-view.html?uid=${notif.from}` : '';
        case 'message':
        case 'message_request':
        case 'message_reaction':
        case 'view_once_opened':
            return notif.from ? `chat.html?uid=${notif.from}` : 'messages.html';
        case 'battle_end':
        case 'battle_like':
        case 'battle_challenge':
            return d.battleID ? `photo-battle.html?id=${d.battleID}` : 'photo-battle.html';
        case 'leaderboard_top10':
        case 'leaderboard_rank':
            return d.boardURL || 'leaderboard.html';
        default:
            return '';
    }
}

// ── HANDLE NOTIF CLICK ─────────────────────────────────────────────────────
async function handleNotifClick(notifID, type, target) {
    // Mark as read
    try {
        await update(ref(db, `notifications/${myUID}/${notifID}`), { read: true });
    } catch(e) { /* silently */ }

    // Navigate
    if (target) window.location.href = target;
}

// ── MARK ALL READ ──────────────────────────────────────────────────────────
async function markAllRead() {
    try {
        const snap = await get(ref(db, `notifications/${myUID}`));
        if (!snap.exists()) return;
        const updates = {};
        snap.forEach(child => {
            if (!child.val().read) {
                updates[`notifications/${myUID}/${child.key}/read`] = true;
            }
        });
        if (Object.keys(updates).length) await update(ref(db), updates);
    } catch(e) { /* silently */ }
}

// ── FOLLOW BACK TOGGLE ─────────────────────────────────────────────────────
async function toggleFollowBack(targetUID, btn) {
    try {
        const snap       = await get(ref(db, `users/${myUID}/following/${targetUID}`));
        const isFollowing = snap.exists();

        if (isFollowing) {
            await Promise.all([
                remove(ref(db, `users/${myUID}/following/${targetUID}`)),
                remove(ref(db, `users/${targetUID}/followers/${myUID}`)),
                update(ref(db, `users/${myUID}`),    { followingCount: increment(-1) }),
                update(ref(db, `users/${targetUID}`), { followersCount: increment(-1) })
            ]);
            btn.textContent = '➕ Follow Back';
            btn.className   = 'follow-back-btn';
            showToast('Unfollowed');
        } else {
            await Promise.all([
                set(ref(db, `users/${myUID}/following/${targetUID}`), true),
                set(ref(db, `users/${targetUID}/followers/${myUID}`), true),
                update(ref(db, `users/${myUID}`),    { followingCount: increment(1) }),
                update(ref(db, `users/${targetUID}`), { followersCount: increment(1) })
            ]);

            // Send follow-back notification to them
            await push(ref(db, `notifications/${targetUID}`), {
                type:  'follow_back',
                from:  myUID,
                time:  Date.now(),
                read:  false,
                data:  {}
            });

            // Create mutual chat
            const chatID = [myUID, targetUID].sort().join('_');
            const chatSnap = await get(ref(db, `chats/${chatID}`));
            if (!chatSnap.exists()) {
                await set(ref(db, `chats/${chatID}`), {
                    participants: { [myUID]: true, [targetUID]: true },
                    isRequest:   false,
                    createdAt:   Date.now(),
                    lastMessage: '',
                    lastTime:    Date.now(),
                    lastFrom:    myUID,
                });
            } else {
                // Update existing request chat to mutual
                await update(ref(db, `chats/${chatID}`), { isRequest: false });
            }

            btn.textContent = '✓ Following';
            btn.className   = 'follow-back-btn following';
            showToast('Following back! 🎉');
        }
    } catch(e) {
        console.error('followBack error:', e);
        showToast('❌ Failed');
    }
}

// Update follow-back button states after render
async function updateFollowBtns() {
    const btns = document.querySelectorAll('.follow-back-btn');
    for (const btn of btns) {
        const uid  = btn.dataset.uid;
        if (!uid) continue;
        const snap = await get(ref(db, `users/${myUID}/following/${uid}`));
        if (snap.exists()) {
            btn.textContent = '✓ Following';
            btn.className   = 'follow-back-btn following';
        }
    }
}

// ── CLEAR ALL ──────────────────────────────────────────────────────────────
function setupClear() {
    document.getElementById('confirmClearBtn')?.addEventListener('click', async () => {
        try {
            await remove(ref(db, `notifications/${myUID}`));
            document.getElementById('clearOverlay').classList.remove('open');
            showToast('🗑️ All notifications cleared');
        } catch(e) {
            showToast('❌ Failed to clear');
        }
    });
}

function updateClearBtn() {
    const btn = document.getElementById('clearBtn');
    if (!btn) return;
    btn.classList.toggle('show', allNotifs.length > 0);
}

// ── TAB SWITCHING (also update follow btn states) ──────────────────────────
const origSwitchTab = window.switchTab;
window.switchTab = function(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    document.getElementById('panel-' + tab)?.classList.add('active');
    setTimeout(updateFollowBtns, 100);
};

// ── EXPORTED: Write notification helper ───────────────────────────────────
// Call this from other pages (home.js, user-view.js etc) to create notifications
window.writeNotification = async function(targetUID, type, fromUID, data = {}) {
    if (!targetUID || !type) return;
    try {
        await push(ref(db, `notifications/${targetUID}`), {
            type,
            from: fromUID || null,
            time: Date.now(),
            read: false,
            data
        });
    } catch(e) {
        console.error('writeNotification error:', e);
    }
};
