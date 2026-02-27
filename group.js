import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, remove, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ── CLOUDINARY ───────────────────────────────────
const CLOUDINARY_CLOUD  = "duj2rx73z";
const CLOUDINARY_PRESET = "Zo-Tinder";
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

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
let notifications = []; // live notifications list
let seenMsgKeys = new Set(); // track which messages we've already notified

// ── LOAD OFFICIAL CARD IMMEDIATELY (no auth needed) ──
loadOfficialCard();

// ── WAIT FOR AUTH ────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = user;

    // Get user data
    const userSnap = await get(ref(db, `users/${user.uid}`));
    if (userSnap.exists()) {
        currentUserData = userSnap.val();
    }

    // Make sure they are in official_global
    await autoJoinOfficial(user.uid);

    // Load their groups realtime
    loadUserGroups(user.uid);
});

// ── AUTO JOIN OFFICIAL GROUP ─────────────────────
async function autoJoinOfficial(uid) {
    const officialRef = ref(db, `users/${uid}/groups/official_global`);
    const snap = await get(officialRef);
    if (!snap.exists()) {
        await set(officialRef, true);
    }
}

// ── LOAD OFFICIAL CARD ───────────────────────────
async function loadOfficialCard() {
    const metaEl  = document.getElementById('officialMeta');
    const lastEl  = document.getElementById('officialLastMsg');
    const timeEl  = document.getElementById('officialTime');
    const badgeEl = document.getElementById('officialBadge');

    // Count real members from users node
    try {
        const usersSnap = await get(ref(db, 'users'));
        let memberCount = 0;
        if (usersSnap.exists()) {
            usersSnap.forEach(u => {
                if (u.val()?.groups?.official_global) memberCount++;
            });
        }

        // Listen realtime to messages/official_global for last message
        const msgsRef = ref(db, 'messages/official_global');
        onValue(msgsRef, (snap) => {
            if (!snap.exists()) {
                if (metaEl) metaEl.textContent = `↑ ${memberCount} members · Official channel`;
                if (lastEl) lastEl.innerHTML = 'Welcome to Zo-Tinder! 🎉';
                return;
            }

            const msgArray = Object.values(snap.val());

            // Get last message by timestamp
            const last = msgArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)).pop();

            if (metaEl) metaEl.textContent = `↑ ${memberCount} member${memberCount !== 1 ? 's' : ''} · Official channel`;
            if (lastEl) lastEl.innerHTML = last
                ? `<em>${escapeHtml(last.senderName || 'Zo')}:</em> ${escapeHtml(last.text || '')}`
                : 'Welcome to Zo-Tinder! 🎉';
            if (timeEl) timeEl.textContent = last?.timestamp ? timeAgo(last.timestamp) : '';
            if (badgeEl) badgeEl.style.display = 'none';
        });

    } catch (err) {
        console.error('Error loading official card:', err);
        if (metaEl) metaEl.textContent = 'Official Zo-Tinder channel';
    }
}

// ── LOAD USER GROUPS ─────────────────────────────
// Shows ALL groups from the groups/ node, not just ones in users/{uid}/groups
// This way groups you created or joined always appear
function loadUserGroups(uid) {
    const allGroupsRef = ref(db, 'groups');

    onValue(allGroupsRef, async (snap) => {
        if (!snap.exists()) {
            renderGroups([]);
            return;
        }

        // Load hidden timestamps
        const hiddenSnap = await get(ref(db, `users/${uid}/hiddenGroups`));
        const hidden = hiddenSnap.exists() ? hiddenSnap.val() : {};

        const groups = [];
        snap.forEach(child => {
            const groupId = child.key;
            const data    = child.val();
            if (!data || !data.name) return;

            // Show ALL public groups — not just ones user joined
            // Skip if user explicitly hid this group AND no new messages since hiding
            if (hidden[groupId] && (!data.lastMessageAt || data.lastMessageAt <= hidden[groupId])) {
                return;
            }
            // If new message after hiding — remove from hidden
            if (hidden[groupId] && data.lastMessageAt && data.lastMessageAt > hidden[groupId]) {
                set(ref(db, `users/${uid}/hiddenGroups/${groupId}`), null);
            }

            groups.push({ id: groupId, ...data });
        });

        // Sort newest message first
        groups.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

        allGroups = groups;
        renderGroups(groups);

        // Start live notifications now that we know user's groups
        startLiveNotifications(uid, groups.map(g => g.id));
    });
}

// ── RENDER GROUP CARDS ───────────────────────────
function renderGroups(groups) {
    const container = document.getElementById('groupList');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    container.innerHTML = '';

    const q = document.getElementById('groupSearch')?.value.toLowerCase().trim() || '';

    const filtered = groups.filter(g => {
        const matchCat = activeCategory === 'all' || g.category === activeCategory;
        const matchSearch = !q || g.name.toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
        emptyState?.classList.add('show');
    } else {
        emptyState?.classList.remove('show');
    }

    filtered.forEach((group, i) => {
        const card = createGroupCard(group, i);
        container.appendChild(card);
    });

    initCardEvents();
}

// ── CREATE GROUP CARD ELEMENT ────────────────────
function createGroupCard(group, index) {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.cat     = group.category || 'other';
    card.dataset.name    = group.name;
    card.dataset.id      = group.id;
    card.dataset.creator = group.createdBy || '';
    card.style.animationDelay = `${index * 0.04}s`;

    const emoji = group.emoji || '💬';
    const bg    = categoryBg(group.category);
    const lastMsg = group.lastMessage || 'Say hi to the group 👋';
    const lastSender = group.lastSender || '';
    const time = group.lastMessageAt ? timeAgo(group.lastMessageAt) : '';
    const unread = group.unread || 0;
    const isOnline = group.onlineCount > 0;

    const avatarHTML = group.avatarURL
        ? `<img src="${group.avatarURL}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
        : emoji;

    card.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar-emoji" style="background:${bg};">${avatarHTML}</div>
            ${isOnline ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="group-info">
            <div class="group-name">${escapeHtml(group.name)}</div>
            <span class="member-info">↑ ${group.memberCount || 1} member${group.memberCount !== 1 ? 's' : ''}</span>
            <span class="last-msg">${lastSender ? `<em>${escapeHtml(lastSender)}:</em> ` : ''}${escapeHtml(lastMsg)}</span>
        </div>
        <div class="card-right">
            <span class="card-time">${time}</span>
            ${unread > 0 ? `<div class="notif-badge">${unread > 99 ? '99+' : unread}</div>` : ''}
        </div>
    `;

    // Tap → open chat
    card.addEventListener('click', () => {
        location.href = `group-chat.html?id=${group.id}&name=${encodeURIComponent(group.name)}`;
    });

    // Long press → context menu
    let pressTimer;
    card.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
            if (typeof openContext === 'function') openContext(card);
        }, 600);
    });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    card.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (typeof openContext === 'function') openContext(card);
    });

    return card;
}

// ── CREATE GROUP → SAVE TO FIREBASE ─────────────
window.saveGroupToFirebase = async function(name, category, avatarFile = null) {
    if (!currentUser) return null;

    const emoji = categoryEmoji(category);

    // Upload avatar to Cloudinary if provided
    let avatarURL = null;
    if (avatarFile) {
        try {
            const fd = new FormData();
            fd.append('file', avatarFile);
            fd.append('upload_preset', CLOUDINARY_PRESET);
            fd.append('folder', 'group-avatars');
            const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.secure_url) avatarURL = data.secure_url;
        } catch(e) {
            console.error('avatar upload error:', e);
        }
    }

    const groupData = {
        name: name,
        category: category,
        emoji: emoji,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        lastMessage: 'Group created 🎉',
        lastSender: currentUserData?.username || 'You',
        memberCount: 1,
        isPublic: true,
        onlineCount: 0,
        ...(avatarURL ? { avatarURL } : {}),
        members: {
            [currentUser.uid]: true
        },
        roles: {
            [currentUser.uid]: 'groupAdmin'
        }
    };

    try {
        const newGroupRef = push(ref(db, 'groups'));
        await set(newGroupRef, groupData);

        const groupId = newGroupRef.key;

        // Add to user's groups
        await set(ref(db, `users/${currentUser.uid}/groups/${groupId}`), true);

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
            // Write to left list — blocks re-entry into this group
            ops.push(set(ref(db, `groups/${groupId}/left/${currentUser.uid}`), { at: Date.now() }));
            // Remove any group role
            ops.push(set(ref(db, `groups/${groupId}/roles/${currentUser.uid}`), null));
        }

        await Promise.all(ops);

        const groupSnap = await get(ref(db, `groups/${groupId}`));
        if (groupSnap.exists()) {
            const count = groupSnap.val().memberCount || 1;
            await set(ref(db, `groups/${groupId}/memberCount`), Math.max(count - 1, 0));
        }
    } catch (err) {
        console.error('Error leaving group:', err);
    }
};

// ── DELETE GROUP (creator only) ───────────────────────────────────────────
window.deleteGroupFirebase = async function(groupId) {
    if (!currentUser || !groupId) return;
    // Security check — only creator can delete
    try {
        const snap = await get(ref(db, `groups/${groupId}/createdBy`));
        if (snap.val() !== currentUser.uid) return; // not the creator
        await Promise.all([
            remove(ref(db, `groups/${groupId}`)),
            remove(ref(db, `messages/${groupId}`)),
            remove(ref(db, `posts/${groupId}`)),
        ]);
    } catch(err) { console.error('deleteGroup error:', err); }
};

// ── HIDE GROUP FROM USER VIEW (reappears on new message) ─────────────────────
window.hideGroupForUser = async function(groupId) {
    if (!currentUser || !groupId) return;
    try {
        // Store hidden timestamp — group.js will skip groups hidden until last message is newer
        await set(ref(db, `users/${currentUser.uid}/hiddenGroups/${groupId}`), Date.now());
    } catch(err) { console.error('hideGroupForUser error:', err); }
};

// ── FILTER CATEGORY (called from HTML chips) ─────
window.setActiveCategory = function(cat) {
    activeCategory = cat;
    renderGroups(allGroups);
};

// ── SEARCH (called from HTML input) ─────────────
window.onGroupSearch = function() {
    renderGroups(allGroups);
};

// ── LIVE NOTIFICATIONS ────────────────────────────
function startLiveNotifications(uid, groupIds) {
    // Listen to last message of each group the user is in
    groupIds.forEach(groupId => {
        if (groupId === 'official_global') return; // skip official

        const msgsRef = ref(db, `messages/${groupId}`);
        onValue(msgsRef, (snap) => {
            if (!snap.exists()) return;

            // Get last message
            const msgs = [];
            snap.forEach(child => msgs.push({ key: child.key, ...child.val() }));
            if (!msgs.length) return;

            const last = msgs[msgs.length - 1];

            // Don't notify for own messages or already seen
            if (last.uid === uid) return;
            if (seenMsgKeys.has(last.key)) return;
            seenMsgKeys.add(last.key);

            // Find group name
            const group = allGroups.find(g => g.id === groupId);
            const groupName = group?.name || 'Group';

            // Add to notifications list
            notifications.unshift({
                groupId,
                groupName,
                senderName: last.senderName || 'Someone',
                text:       last.text || (last.type === 'image' ? '📷 Image' : '💬 Message'),
                timestamp:  last.timestamp || Date.now(),
                emoji:      group?.emoji || '💬',
                bg:         categoryBg(group?.category),
            });

            // Keep max 30 notifications
            if (notifications.length > 30) notifications.length = 30;

            // Show red dot on bell
            const dot = document.getElementById('notifDot');
            if (dot) dot.style.display = 'block';
        });
    });

    // Also listen to official_global
    onValue(ref(db, 'messages/official_global'), (snap) => {
        if (!snap.exists()) return;
        const msgs = [];
        snap.forEach(child => msgs.push({ key: child.key, ...child.val() }));
        if (!msgs.length) return;
        const last = msgs[msgs.length - 1];
        if (last.uid === uid) return;
        if (seenMsgKeys.has(last.key)) return;
        seenMsgKeys.add(last.key);

        notifications.unshift({
            groupId:    'official_global',
            groupName:  'Zo-Tinder Official',
            senderName: last.senderName || 'Zo',
            text:       last.text || '💬 Message',
            timestamp:  last.timestamp || Date.now(),
            emoji:      '🔥',
            bg:         '#1a0a0a',
        });
        if (notifications.length > 30) notifications.length = 30;
        const dot = document.getElementById('notifDot');
        if (dot) dot.style.display = 'block';
    });
}

// ── RENDER NOTIFICATIONS ──────────────────────────
window.renderNotifications = function() {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (!notifications.length) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:#333;font-size:13px;">No new notifications</div>';
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notif-item notif-unread" onclick="goToGroup('${n.groupId}','${escapeHtml(n.groupName)}')">
            <div class="notif-av" style="background:${n.bg};">${n.emoji}</div>
            <div class="notif-text">
                <strong>${escapeHtml(n.groupName)}</strong>
                <span>${escapeHtml(n.senderName)}: ${escapeHtml(n.text.substring(0, 50))}</span>
            </div>
            <span class="notif-time">${timeAgo(n.timestamp)}</span>
        </div>
    `).join('');
};

window.goToGroup = function(groupId, groupName) {
    location.href = `group-chat.html?id=${groupId}&name=${encodeURIComponent(groupName)}`;
};

// ── OPEN OFFICIAL CHAT ───────────────────────────
window.openOfficialChat = function() {
    location.href = `group-chat.html?id=official_global&name=${encodeURIComponent('Zo-Tinder Official')}`;
};

// ── EXPOSE CURRENT USER FOR HTML ─────────────────
window.getCurrentUser = function() { return currentUser; };
window.getCurrentUserData = function() { return currentUserData; };

// ── HELPERS ──────────────────────────────────────
function categoryEmoji(cat) {
    const map = { dating:'❤️', gaming:'🎮', fitness:'💪', food:'🍜', vibes:'🌙', other:'✨' };
    return map[cat] || '💬';
}

function categoryBg(cat) {
    const map = { dating:'#1f0a14', gaming:'#0a0f1f', fitness:'#0a1f14', food:'#1f1600', vibes:'#1a1030', other:'#1a1a1a' };
    return map[cat] || '#1a1a1a';
}

function timeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
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
