import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
    getDatabase, ref, get, set, push, onValue, remove, update
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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
const db   = getDatabase(app);

// ── APP OWNER ──────────────────────────────────────
const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";

// ── STATE ────────────────────────────────────────
let currentUser     = null;
let currentUserData = null;
let currentAppRole  = 'member';
let allGroups       = [];
let _activeCategory = 'all';

// ── BOOT ─────────────────────────────────────────
loadOfficialCard();

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;

    const userSnap = await get(ref(db, `users/${user.uid}`));
    if (userSnap.exists()) {
        currentUserData = userSnap.val();
        if (user.uid === OWNER_UID) {
            currentAppRole = 'owner';
            await set(ref(db, `users/${user.uid}/role`), 'owner');
        } else {
            currentAppRole = currentUserData.role || 'member';
        }
    }

    await autoJoinOfficial(user.uid);
    loadUserGroups(user.uid);
    loadRealNotifications(user.uid);
});

// ── AUTO JOIN OFFICIAL ────────────────────────────
async function autoJoinOfficial(uid) {
    const r = ref(db, `users/${uid}/groups/official_global`);
    const s = await get(r);
    if (!s.exists()) await set(r, true);
}

// ── OFFICIAL CARD ─────────────────────────────────
async function loadOfficialCard() {
    const metaEl  = document.getElementById('officialMeta');
    const lastEl  = document.getElementById('officialLastMsg');
    const timeEl  = document.getElementById('officialTime');
    const badgeEl = document.getElementById('officialBadge');
    try {
        const usersSnap = await get(ref(db, 'users'));
        let memberCount = 0;
        if (usersSnap.exists()) usersSnap.forEach(u => { if (u.val()?.groups?.official_global) memberCount++; });

        onValue(ref(db, 'messages/official_global'), snap => {
            const msgs = snap.exists() ? Object.values(snap.val()) : [];
            const last = msgs.sort((a,b) => (a.timestamp||0)-(b.timestamp||0)).pop();
            if (metaEl) metaEl.textContent = `${memberCount} member${memberCount!==1?'s':''} · Official`;
            if (lastEl) lastEl.innerHTML   = last ? `<em>${esc(last.senderName||'Zo')}:</em> ${esc(last.text||'')}` : 'Welcome to Zo-Tinder! 🎉';
            if (timeEl) timeEl.textContent = last?.timestamp ? timeAgo(last.timestamp) : '';
            if (badgeEl) badgeEl.style.display = 'none';
        });
    } catch(e) {
        if (metaEl) metaEl.textContent = 'Official Zo-Tinder channel';
    }
}

// ══════════════════════════════════════════════════
// ── LOAD USER GROUPS  ──────────────────────────
//
//  HOW IT WORKS:
//  - Watch users/{uid}/groups for the LIST of group IDs
//  - For EACH group ID, attach an individual onValue watcher on groups/{id}
//  - If that group node is deleted/null → instantly remove it from allGroups
//    and clean the dead ref from the user's record, then re-render
//  - If the group data updates (new message, name change etc) → update allGroups
//    entry and re-render
//  - Track active watchers so we don't double-attach them
// ══════════════════════════════════════════════════

const _groupWatchers = {}; // gid → unsubscribe function

function loadUserGroups(uid) {
    onValue(ref(db, `users/${uid}/groups`), snap => {
        const currentIds = snap.exists()
            ? Object.keys(snap.val()).filter(id => id !== 'official_global')
            : [];

        // ── Attach watchers for any NEW group IDs ──
        currentIds.forEach(gid => {
            if (_groupWatchers[gid]) return; // already watching
            attachGroupWatcher(uid, gid);
        });

        // ── Detach watchers for group IDs no longer in user's list ──
        Object.keys(_groupWatchers).forEach(gid => {
            if (!currentIds.includes(gid)) {
                _groupWatchers[gid](); // call unsubscribe
                delete _groupWatchers[gid];
                // Remove from allGroups and re-render
                allGroups = allGroups.filter(g => g.id !== gid);
                renderGroups(allGroups);
            }
        });

        // If user has no groups at all
        if (currentIds.length === 0) {
            allGroups = [];
            renderGroups([]);
        }
    });
}

function attachGroupWatcher(uid, gid) {
    // onValue returns an unsubscribe function in Firebase v9
    const unsub = onValue(ref(db, `groups/${gid}`), async snap => {

        // ── GROUP DELETED OR DISBANDED ──
        if (!snap.exists()) {
            // Remove dead ref from user's own data
            remove(ref(db, `users/${uid}/groups/${gid}`)).catch(()=>{});
            remove(ref(db, `users/${uid}/groupRoles/${gid}`)).catch(()=>{});
            remove(ref(db, `users/${uid}/hiddenGroups/${gid}`)).catch(()=>{});

            // Stop watching this group
            if (_groupWatchers[gid]) {
                _groupWatchers[gid]();
                delete _groupWatchers[gid];
            }

            // Remove from allGroups immediately and re-render
            allGroups = allGroups.filter(g => g.id !== gid);
            renderGroups(allGroups);
            return;
        }

        // ── GROUP EXISTS — update or add ──
        const data = snap.val();

        // Check hidden
        try {
            const hSnap = await get(ref(db, `users/${uid}/hiddenGroups/${gid}`));
            if (hSnap.exists()) {
                const hiddenAt = hSnap.val();
                if (!data.lastMessageAt || data.lastMessageAt <= hiddenAt) {
                    // Still hidden — make sure it's not in allGroups
                    allGroups = allGroups.filter(g => g.id !== gid);
                    renderGroups(allGroups);
                    return;
                }
                // New message after hide — unhide
                remove(ref(db, `users/${uid}/hiddenGroups/${gid}`)).catch(()=>{});
            }
        } catch(_) {}

        // Upsert into allGroups
        const entry = { id: gid, ...data };
        const idx   = allGroups.findIndex(g => g.id === gid);
        if (idx >= 0) {
            allGroups[idx] = entry;
        } else {
            allGroups.push(entry);
        }

        // Re-sort and re-render
        allGroups.sort((a, b) =>
            (b.lastMessageAt || b.createdAt || 0) - (a.lastMessageAt || a.createdAt || 0)
        );
        renderGroups(allGroups);
    });

    _groupWatchers[gid] = unsub;
}

// ── RENDER ────────────────────────────────────────
function renderGroups(groups) {
    const container  = document.getElementById('groupList');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    container.innerHTML = '';

    const q = (document.getElementById('groupSearch')?.value || '').toLowerCase().trim();

    const filtered = groups.filter(g => {
        const matchCat    = _activeCategory === 'all' || g.category === _activeCategory;
        const matchSearch = !q || (g.name || '').toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    emptyState?.classList.toggle('show', filtered.length === 0);
    filtered.forEach((group, i) => container.appendChild(createGroupCard(group, i)));
}

// ── GROUP CARD ────────────────────────────────────
function createGroupCard(group, index) {
    const card = document.createElement('div');
    card.className    = 'group-card';
    card.dataset.cat  = group.category || 'other';
    card.dataset.name = group.name || '';
    card.dataset.id   = group.id;
    card.style.animationDelay = `${index * 0.04}s`;

    const bg         = categoryBg(group.category);
    const lastMsg    = group.lastMessage  || 'Say hi to the group 👋';
    const lastSender = group.lastSender   || '';
    const time       = group.lastMessageAt ? timeAgo(group.lastMessageAt) : '';
    const unread     = group.unread || 0;

    card.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar-emoji" style="background:${bg};">${group.emoji || '💬'}</div>
            ${(group.onlineCount||0)>0 ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="group-info">
            <div class="group-name">
                ${esc(group.name || 'Group')}
                ${group.isPrivate ? '<span style="font-size:10px;opacity:0.5;margin-left:4px;">🔒</span>' : ''}
                ${group.readMode  ? '<span style="font-size:10px;opacity:0.5;margin-left:2px;">📢</span>' : ''}
            </div>
            <span class="member-info">↑ ${group.memberCount||1} member${(group.memberCount||1)!==1?'s':''}</span>
            <span class="last-msg">${lastSender?`<em>${esc(lastSender)}:</em> `:''}${esc(lastMsg)}</span>
        </div>
        <div class="card-right">
            <span class="card-time">${time}</span>
            ${unread>0?`<div class="notif-badge">${unread>99?'99+':unread}</div>`:''}
        </div>`;

    card.addEventListener('click', () => {
        location.href = `group-chat.html?id=${group.id}&name=${encodeURIComponent(group.name||'Group')}`;
    });

    let pressTimer;
    card.addEventListener('touchstart',  () => { pressTimer = setTimeout(() => window.openContext?.(card), 600); }, { passive:true });
    card.addEventListener('touchend',    () => clearTimeout(pressTimer));
    card.addEventListener('touchmove',   () => clearTimeout(pressTimer));
    card.addEventListener('contextmenu', e  => { e.preventDefault(); window.openContext?.(card); });

    return card;
}

// ══ REAL NOTIFICATIONS ════════════════════════════
function loadRealNotifications(uid) {
    // Listen realtime to user's group list
    onValue(ref(db, `users/${uid}/groups`), async snap => {
        if (!snap.exists()) return;

        const groupIds   = Object.keys(snap.val());
        const allNotifs  = [];

        // Fetch last messages from each group in parallel
        await Promise.allSettled(groupIds.map(async gid => {
            try {
                // Get group meta
                const metaSnap = await get(ref(db, `groups/${gid}`));
                const meta = metaSnap.exists() ? metaSnap.val() : null;
                const gName  = gid === 'official_global' ? 'Zo-Tinder Official' : (meta?.name  || 'Group');
                const gEmoji = gid === 'official_global' ? '🔥'                 : (meta?.emoji || '💬');
                const gBg    = gid === 'official_global' ? '#1a0a0a'             : categoryBg(meta?.category);

                // Get messages
                const msgsSnap = await get(ref(db, `messages/${gid}`));
                if (!msgsSnap.exists()) return;

                const msgs = [];
                msgsSnap.forEach(c => msgs.push({ ...c.val() }));
                msgs.sort((a,b) => (b.timestamp||0)-(a.timestamp||0));

                // Take last 3 messages, skip own messages
                msgs.slice(0, 5).forEach(msg => {
                    if (!msg.timestamp) return;
                    if (msg.uid === uid) return; // skip own messages
                    allNotifs.push({
                        gid, gName, gEmoji, gBg,
                        sender:    msg.senderName || 'Someone',
                        text:      msg.text || (msg.type==='image'?'📸 sent a photo':msg.type==='sticker'?'😄 sent a sticker':'...'),
                        timestamp: msg.timestamp,
                        isUnread:  msg.timestamp > (Date.now() - 10 * 60 * 1000), // within 10 min = unread
                    });
                });
            } catch(_) {}
        }));

        allNotifs.sort((a,b) => b.timestamp - a.timestamp);

        const notifList = document.getElementById('notifList');
        const notifDot  = document.getElementById('notifDot');

        if (!notifList) return;
        notifList.innerHTML = '';

        if (allNotifs.length === 0) {
            notifList.innerHTML = `<div style="padding:30px 20px;text-align:center;color:#444;font-size:13px;">No new notifications 👋</div>`;
            if (notifDot) notifDot.style.display = 'none';
            return;
        }

        const hasUnread = allNotifs.some(n => n.isUnread);
        if (notifDot) notifDot.style.display = hasUnread ? '' : 'none';

        allNotifs.slice(0, 25).forEach(n => {
            const item = document.createElement('div');
            item.className = 'notif-item' + (n.isUnread ? ' notif-unread' : '');
            item.innerHTML = `
                <div class="notif-av" style="background:${n.gBg};">${n.gEmoji}</div>
                <div class="notif-text">
                    <strong>${esc(n.gName)}</strong>
                    <span>${esc(n.sender)}: ${esc(n.text.substring(0,60))}${n.text.length>60?'…':''}</span>
                </div>
                <span class="notif-time">${timeAgo(n.timestamp)}</span>`;
            item.onclick = () => {
                document.getElementById('notifOverlay')?.classList.remove('show');
                location.href = `group-chat.html?id=${n.gid}&name=${encodeURIComponent(n.gName)}`;
            };
            notifList.appendChild(item);
        });
    });
}

// ── CREATE GROUP ──────────────────────────────────
window.saveGroupToFirebase = async function(name, category) {
    if (!currentUser) return null;
    const groupData = {
        name,
        category,
        emoji:         categoryEmoji(category),
        createdBy:     currentUser.uid,
        groupAdmin:    currentUser.uid,
        createdAt:     Date.now(),
        lastMessageAt: Date.now(),
        lastMessage:   'Group created 🎉',
        lastSender:    currentUserData?.username || 'You',
        memberCount:   1,
        isPublic:      true,
        isPrivate:     false,
        readMode:      false,
        onlineCount:   0,
        members:       { [currentUser.uid]: true },
        roles:         { [currentUser.uid]: 'admin' }
    };
    try {
        const newRef  = push(ref(db, 'groups'));
        await set(newRef, groupData);
        const groupId = newRef.key;
        await Promise.all([
            set(ref(db, `users/${currentUser.uid}/groups/${groupId}`),         true),
            set(ref(db, `users/${currentUser.uid}/groupRoles/${groupId}`),     'admin'),
        ]);
        return { id: groupId, ...groupData };
    } catch(e) { console.error('saveGroupToFirebase:', e); return null; }
};

// ── LEAVE GROUP ───────────────────────────────────
window.leaveGroupFirebase = async function(groupId, recordLeft = false) {
    if (!currentUser || !groupId) return;

    // ── Instantly remove from UI — don't wait for Firebase ──
    if (_groupWatchers[groupId]) {
        _groupWatchers[groupId](); // detach watcher
        delete _groupWatchers[groupId];
    }
    allGroups = allGroups.filter(g => g.id !== groupId);
    renderGroups(allGroups);

    try {
        const ops = [
            remove(ref(db, `users/${currentUser.uid}/groups/${groupId}`)),
            remove(ref(db, `users/${currentUser.uid}/groupRoles/${groupId}`)),
            set(ref(db, `groups/${groupId}/members/${currentUser.uid}`),   null),
            set(ref(db, `groups/${groupId}/roles/${currentUser.uid}`),     null),
        ];
        if (recordLeft) ops.push(set(ref(db, `groups/${groupId}/left/${currentUser.uid}`), { at: Date.now() }));
        await Promise.all(ops);
        const gSnap = await get(ref(db, `groups/${groupId}`));
        if (gSnap.exists()) {
            await set(ref(db, `groups/${groupId}/memberCount`), Math.max((gSnap.val().memberCount||1)-1, 0));
        }
    } catch(e) { console.error('leaveGroupFirebase:', e); }
};

// ── DELETE / DISBAND GROUP ────────────────────────
window.deleteGroupFirebase = async function(groupId) {
    if (!currentUser || !groupId) return false;

    // ── Step 1: Instantly remove from local UI and watchers ──
    // Do this FIRST — do not wait for Firebase at all
    if (_groupWatchers[groupId]) {
        _groupWatchers[groupId]();        // detach realtime watcher
        delete _groupWatchers[groupId];
    }
    allGroups = allGroups.filter(g => g.id !== groupId);
    renderGroups(allGroups);

    // ── Step 2: Delete from Firebase ──
    try {
        // Check if group still exists and user is authorized
        const gSnap = await get(ref(db, `groups/${groupId}`));

        if (gSnap.exists()) {
            const g = gSnap.val();
            // Creator, group admin, or app staff (owner/admin/mod) can delete
            const isCreator  = g.createdBy  === currentUser.uid;
            const isGAdmin   = g.groupAdmin === currentUser.uid || g.roles?.[currentUser.uid] === 'admin';
            const isAppStaff = ['owner','admin','mod'].includes(currentAppRole);

            if (!isCreator && !isGAdmin && !isAppStaff) {
                // Not authorized — but UI already removed, so re-fetch and re-render
                fetchAndRenderGroups(currentUser.uid, await get(ref(db, `users/${currentUser.uid}/groups`)).catch(()=>null) || { exists:()=>false });
                return false;
            }
        }
        // Whether it exists or not — delete everything
        await Promise.all([
            remove(ref(db, `groups/${groupId}`)),
            remove(ref(db, `messages/${groupId}`)),
            remove(ref(db, `posts/${groupId}`)),
        ]);

        // ── Step 3: Remove from ALL members' user records ──
        const usersSnap = await get(ref(db, 'users'));
        if (usersSnap.exists()) {
            const ops = [];
            usersSnap.forEach(c => {
                if (c.val()?.groups?.[groupId]) {
                    ops.push(remove(ref(db, `users/${c.key}/groups/${groupId}`)));
                    ops.push(remove(ref(db, `users/${c.key}/groupRoles/${groupId}`)));
                    ops.push(remove(ref(db, `users/${c.key}/hiddenGroups/${groupId}`)));
                }
            });
            await Promise.all(ops);
        }

        return true;
    } catch(e) {
        console.error('deleteGroupFirebase:', e);
        return false;
    }
};

// ── HIDE GROUP ────────────────────────────────────
window.hideGroupForUser = async function(groupId) {
    if (!currentUser || !groupId) return;
    await set(ref(db, `users/${currentUser.uid}/hiddenGroups/${groupId}`), Date.now()).catch(()=>{});
};

// ── FILTER / SEARCH ──────────────────────────────
window.setActiveCategory = cat => { _activeCategory = cat; renderGroups(allGroups); };
window.onGroupSearch     = ()  => { renderGroups(allGroups); };

// ── OFFICIAL CHAT ─────────────────────────────────
window.openOfficialChat = () => {
    location.href = `group-chat.html?id=official_global&name=${encodeURIComponent('Zo-Tinder Official')}`;
};

// ── EXPOSE TO HTML ────────────────────────────────
window.getCurrentUser     = () => currentUser;
window.getCurrentUserData = () => currentUserData;
window.getCurrentAppRole  = () => currentAppRole;
window.isAppStaff         = () => ['owner','admin','mod'].includes(currentAppRole);

// ── HELPERS ──────────────────────────────────────
function categoryEmoji(cat) {
    return { dating:'❤️', gaming:'🎮', fitness:'💪', food:'🍜', vibes:'🌙', other:'✨' }[cat] || '💬';
}
function categoryBg(cat) {
    return { dating:'#1f0a14', gaming:'#0a0f1f', fitness:'#0a1f14', food:'#1f1600', vibes:'#1a1030', other:'#1a1a1a' }[cat] || '#1a1a1a';
}
function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
    if (m < 1)  return 'Now';
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    if (dy===1) return 'Yesterday';
    return `${dy}d`;
}
function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
window.escapeHtml = esc;
