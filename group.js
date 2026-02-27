import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ── FIREBASE CONFIG ──────────────────────────────
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

// ── STATE ────────────────────────────────────────
let currentUser = null;
let currentUserData = null;
let allGroups = [];
let activeCategory = 'all';
let activeSearch = '';
let lastReadMap = {}; // { groupId: timestamp }

// ── LOAD OFFICIAL CARD IMMEDIATELY ──
loadOfficialCard();

// ── WAIT FOR AUTH ────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;
    const userSnap = await get(ref(db, `users/${user.uid}`));
    if (userSnap.exists()) currentUserData = userSnap.val();
    await autoJoinOfficial(user.uid);

    // Load lastRead map
    const lrSnap = await get(ref(db, `users/${user.uid}/lastRead`));
    if (lrSnap.exists()) lastReadMap = lrSnap.val();

    loadUserGroups(user.uid);
    listenNotifications(user.uid);
});

// ── AUTO JOIN OFFICIAL ───────────────────────────
async function autoJoinOfficial(uid) {
    const officialRef = ref(db, `users/${uid}/groups/official_global`);
    const snap = await get(officialRef);
    if (!snap.exists()) await set(officialRef, true);
}

// ── LOAD OFFICIAL CARD ───────────────────────────
async function loadOfficialCard() {
    const metaEl  = document.getElementById('officialMeta');
    const lastEl  = document.getElementById('officialLastMsg');
    const timeEl  = document.getElementById('officialTime');
    const badgeEl = document.getElementById('officialBadge');

    try {
        const usersSnap = await get(ref(db, 'users'));
        let memberCount = 0;
        if (usersSnap.exists()) {
            usersSnap.forEach(u => { if (u.val()?.groups?.official_global) memberCount++; });
        }

        onValue(ref(db, 'messages/official_global'), (snap) => {
            if (!snap.exists()) {
                if (metaEl) metaEl.textContent = `↑ ${memberCount} members · Official channel`;
                if (lastEl) lastEl.innerHTML = 'Welcome to Zo-Tinder! 🎉';
                return;
            }
            const msgArray = Object.values(snap.val());
            const last = msgArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)).pop();
            if (metaEl) metaEl.textContent = `↑ ${memberCount} member${memberCount !== 1 ? 's' : ''} · Official channel`;
            if (lastEl) lastEl.innerHTML = last
                ? `<em>${escapeHtml(last.senderName || 'Zo')}:</em> ${escapeHtml(last.text || '')}`
                : 'Welcome to Zo-Tinder! 🎉';
            if (timeEl) timeEl.textContent = last?.timestamp ? timeAgo(last.timestamp) : '';

            // Unread badge for official group
            const lastRead = lastReadMap['official_global'] || 0;
            if (last?.timestamp && last.timestamp > lastRead && badgeEl) {
                badgeEl.style.display = '';
                badgeEl.textContent = '●';
            }
        });
    } catch (err) {
        console.error('Error loading official card:', err);
        if (metaEl) metaEl.textContent = 'Official Zo-Tinder channel';
    }
}

// ── LOAD USER GROUPS ─────────────────────────────
function loadUserGroups(uid) {
    onValue(ref(db, `users/${uid}/groups`), async (snap) => {
        if (!snap.exists()) { allGroups = []; renderGroups(); return; }

        const groupIds = Object.keys(snap.val()).filter(id => id !== 'official_global');
        const hiddenSnap = await get(ref(db, `users/${uid}/hiddenGroups`));
        const hidden = hiddenSnap.exists() ? hiddenSnap.val() : {};

        const groupPromises = groupIds.map(async (groupId) => {
            const groupSnap = await get(ref(db, `groups/${groupId}`));
            if (!groupSnap.exists()) return null;
            const data = groupSnap.val();
            if (hidden[groupId] && (!data.lastMessageAt || data.lastMessageAt <= hidden[groupId])) return null;
            if (hidden[groupId] && data.lastMessageAt && data.lastMessageAt > hidden[groupId]) {
                set(ref(db, `users/${uid}/hiddenGroups/${groupId}`), null);
            }
            // Calculate unread count
            const lastRead = lastReadMap[groupId] || 0;
            const unread = data.lastMessageAt && data.lastMessageAt > lastRead ? 1 : 0;
            return { id: groupId, ...data, unread };
        });

        const groups = (await Promise.all(groupPromises)).filter(Boolean);
        groups.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
        allGroups = groups;
        renderGroups();
    });
}

// ── RENDER GROUP CARDS ───────────────────────────
function renderGroups() {
    const container = document.getElementById('groupList');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    container.innerHTML = '';

    const q = activeSearch.toLowerCase().trim();
    const filtered = allGroups.filter(g => {
        const matchCat = activeCategory === 'all' || g.category === activeCategory;
        const matchSearch = !q || (g.name || '').toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    emptyState?.classList.toggle('show', filtered.length === 0);

    filtered.forEach((group, i) => {
        const card = createGroupCard(group, i);
        container.appendChild(card);
    });
}

// ── CREATE GROUP CARD ELEMENT ────────────────────
function createGroupCard(group, index) {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.cat = group.category || 'other';
    card.dataset.name = group.name || '';
    card.dataset.id = group.id;
    card.style.animationDelay = `${index * 0.04}s`;

    const emoji = group.emoji || '💬';
    const bg = categoryBg(group.category);
    const lastMsg = group.lastMessage || 'Say hi to the group 👋';
    const lastSender = group.lastSender || '';
    const time = group.lastMessageAt ? timeAgo(group.lastMessageAt) : '';
    const unread = group.unread || 0;

    card.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar-emoji" style="background:${bg};">${emoji}</div>
        </div>
        <div class="group-info">
            <div class="group-name">${escapeHtml(group.name)}</div>
            <span class="member-info">↑ ${group.memberCount || 1} member${group.memberCount !== 1 ? 's' : ''}</span>
            <span class="last-msg">${lastSender ? `<em>${escapeHtml(lastSender)}:</em> ` : ''}${escapeHtml(lastMsg)}</span>
        </div>
        <div class="card-right">
            <span class="card-time">${time}</span>
            ${unread > 0 ? `<div class="notif-badge">●</div>` : ''}
        </div>
    `;

    card.addEventListener('click', () => {
        // Mark as read when opening
        if (currentUser) {
            lastReadMap[group.id] = Date.now();
            set(ref(db, `users/${currentUser.uid}/lastRead/${group.id}`), Date.now());
        }
        location.href = `group-chat.html?id=${group.id}&name=${encodeURIComponent(group.name)}`;
    });

    let pressTimer;
    card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openContext(card), 600); });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    card.addEventListener('contextmenu', e => { e.preventDefault(); openContext(card); });

    return card;
}

// ── REAL NOTIFICATIONS ──────────────────────────
function listenNotifications(uid) {
    // Listen to all groups for new messages
    onValue(ref(db, `users/${uid}/groups`), (snap) => {
        if (!snap.exists()) return;
        const groupIds = Object.keys(snap.val());
        groupIds.forEach(groupId => {
            onValue(ref(db, `groups/${groupId}`), (gSnap) => {
                if (!gSnap.exists()) return;
                const gData = gSnap.val();
                const lastRead = lastReadMap[groupId] || 0;
                if (gData.lastMessageAt && gData.lastMessageAt > lastRead) {
                    showNotifDot();
                    addNotifItem(groupId, gData);
                }
            });
        });
    });
}

function showNotifDot() {
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = '';
}

function addNotifItem(groupId, gData) {
    const list = document.getElementById('notifList');
    if (!list) return;
    // Avoid duplicates
    if (document.getElementById('notif-' + groupId)) {
        const existing = document.getElementById('notif-' + groupId);
        existing.querySelector('.notif-text span').textContent =
            `${gData.lastSender ? gData.lastSender + ': ' : ''}${gData.lastMessage || ''}`;
        existing.querySelector('.notif-time').textContent = gData.lastMessageAt ? timeAgo(gData.lastMessageAt) : '';
        existing.classList.add('notif-unread');
        return;
    }
    const item = document.createElement('div');
    item.className = 'notif-item notif-unread';
    item.id = 'notif-' + groupId;
    const emoji = gData.emoji || '💬';
    const bg = categoryBg(gData.category);
    item.innerHTML = `
        <div class="notif-av" style="background:${bg};">${emoji}</div>
        <div class="notif-text">
            <strong>${escapeHtml(gData.name || 'Group')}</strong>
            <span>${escapeHtml(gData.lastSender ? gData.lastSender + ': ' : '')}${escapeHtml(gData.lastMessage || 'New message')}</span>
        </div>
        <span class="notif-time">${gData.lastMessageAt ? timeAgo(gData.lastMessageAt) : ''}</span>
    `;
    item.onclick = () => {
        closeNotif();
        location.href = `group-chat.html?id=${groupId}&name=${encodeURIComponent(gData.name || 'Group')}`;
    };
    list.prepend(item);
}

// ── CREATE GROUP → SAVE TO FIREBASE ─────────────
window.saveGroupToFirebase = async function(name, category) {
    if (!currentUser) return null;
    const emoji = categoryEmoji(category);

    const groupData = {
        name, category, emoji,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        lastMessage: 'Group created 🎉',
        lastSender: currentUserData?.username || 'You',
        memberCount: 1,
        isPublic: true,
        onlineCount: 0,
        members: { [currentUser.uid]: true }
    };

    try {
        const newGroupRef = push(ref(db, 'groups'));
        await set(newGroupRef, groupData);
        const groupId = newGroupRef.key;

        // Add to user's groups
        await set(ref(db, `users/${currentUser.uid}/groups/${groupId}`), true);

        // ✅ Creator automatically becomes group admin
        await set(ref(db, `groups/${groupId}/roles/${currentUser.uid}`), 'group_admin');

        return { id: groupId, ...groupData };
    } catch (err) {
        console.error('Error creating group:', err);
        return null;
    }
};

// ── LEAVE GROUP ──────────────────────────────────
window.leaveGroupFirebase = async function(groupId, recordLeft = false) {
    if (!currentUser || !groupId) return;
    try {
        const ops = [
            set(ref(db, `users/${currentUser.uid}/groups/${groupId}`), null),
            set(ref(db, `groups/${groupId}/members/${currentUser.uid}`), null),
        ];
        if (recordLeft) {
            ops.push(set(ref(db, `groups/${groupId}/left/${currentUser.uid}`), { at: Date.now() }));
            ops.push(set(ref(db, `groups/${groupId}/roles/${currentUser.uid}`), null));
        }
        await Promise.all(ops);
        const groupSnap = await get(ref(db, `groups/${groupId}`));
        if (groupSnap.exists()) {
            const count = groupSnap.val().memberCount || 1;
            await set(ref(db, `groups/${groupId}/memberCount`), Math.max(count - 1, 0));
        }
    } catch (err) { console.error('Error leaving group:', err); }
};

// ── HIDE GROUP ────────────────────────────────────
window.hideGroupForUser = async function(groupId) {
    if (!currentUser || !groupId) return;
    try { await set(ref(db, `users/${currentUser.uid}/hiddenGroups/${groupId}`), Date.now()); }
    catch(err) { console.error('hideGroupForUser error:', err); }
};

// ── MARK NOTIFICATIONS READ ───────────────────────
window.markAllNotifsRead = async function() {
    if (!currentUser) return;
    const updates = {};
    allGroups.forEach(g => { updates[g.id] = Date.now(); lastReadMap[g.id] = Date.now(); });
    updates['official_global'] = Date.now();
    lastReadMap['official_global'] = Date.now();
    await update(ref(db, `users/${currentUser.uid}/lastRead`), updates);
    // Hide all unread badges
    document.querySelectorAll('.notif-unread').forEach(el => el.classList.remove('notif-unread'));
    document.getElementById('officialBadge').style.display = 'none';
    renderGroups();
};

// ── FILTER EXPOSED TO HTML ────────────────────────
window.setActiveCategory = function(cat) {
    activeCategory = cat;
    renderGroups();
};
window.onGroupSearch = function() {
    activeSearch = document.getElementById('groupSearch')?.value || '';
    renderGroups();
};

// ── CONTEXT MENU EXPOSE ───────────────────────────
window.openContext = function(card) {
    const contextTarget = card;
    document.getElementById('contextName').textContent = card.dataset.name || 'Group';
    document.getElementById('contextOverlay').classList.add('show');
    window._contextCard = card;
};

// ── LEAVE FROM CONTEXT ────────────────────────────
window.doLeaveFromContext = async function() {
    const card = window._contextCard;
    if (!card) return;
    const groupId = card.dataset.id;
    card.style.transition = '0.3s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(-20px)';
    setTimeout(() => card.remove(), 300);
    if (groupId && typeof leaveGroupFirebase === 'function') {
        await window.leaveGroupFirebase(groupId, true);
    }
};

// ── HELPERS ──────────────────────────────────────
window.getCurrentUser = function() { return currentUser; };
window.getCurrentUserData = function() { return currentUserData; };

// ── OPEN OFFICIAL CHAT ───────────────────────────
window.openOfficialChat = function() {
    if (currentUser) {
        lastReadMap['official_global'] = Date.now();
        set(ref(db, `users/${currentUser.uid}/lastRead/official_global`), Date.now());
    }
    location.href = `group-chat.html?id=official_global&name=${encodeURIComponent('Zo-Tinder Official')}`;
};

function categoryEmoji(cat) {
    const map = { dating:'❤️', gaming:'🎮', fitness:'💪', food:'🍜', vibes:'🌙', other:'✨' };
    return map[cat] || '💬';
}

function categoryBg(cat) {
    const map = { dating:'#1f0a14', gaming:'#0a0f1f', fitness:'#0a1f14', food:'#1f1600', vibes:'#1a1030', other:'#1a1a1a' };
    return map[cat] || '#1a1a1a';
}

function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    return `${days}d`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
