import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
    getDatabase, ref, get, set, push, onValue, remove, update, serverTimestamp, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ══ FIREBASE CONFIG ══════════════════════════════
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

// ══ CLOUDINARY CONFIG ════════════════════════════
const CLOUDINARY_CLOUD  = "duj2rx73z";
const CLOUDINARY_PRESET = "Zo-Tinder";
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`;

// ══ GROUP ID ═════════════════════════════════════
const _params             = new URLSearchParams(window.location.search);
const GROUP_ID            = _params.get('id')   || 'official_global';
const GROUP_NAME_FROM_URL = decodeURIComponent(_params.get('name') || '');

// Set header immediately so it never shows wrong name
(function initHeader() {
    const isOfficial = GROUP_ID === 'official_global';
    const name = isOfficial ? 'Zo-Tinder Official' : (GROUP_NAME_FROM_URL || 'Group Chat');
    const nameEl = document.getElementById('groupName');
    if (nameEl) nameEl.childNodes[0].textContent = name + ' ';
    const badge = document.getElementById('officialBadge');
    if (badge) badge.style.display = isOfficial ? '' : 'none';
    const label = document.getElementById('officialLabel');
    if (label) label.style.display = isOfficial ? '' : 'none';
    const avEl = document.getElementById('groupAv');
    if (avEl) avEl.textContent = isOfficial ? '🔥' : '💬';
    document.title = name + ' | Zo-Tinder';
})();

// ══ APP OWNER UID ════════════════════════════════
// This account is always app owner — highest authority everywhere
const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";

// ══ EMOJI DATA ═══════════════════════════════════
const EMOJIS = {
    recent: ['😂','❤️','🔥','😭','✨','🥺','😍','🙏','💀','😊','🤣','💕','🥰','😅','👀','😩','💯','🙄','😤','🤔'],
    faces:  ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','☺️','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
    hands:  ['👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','💪'],
    nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🦆','🦅','🦉','🦇','🐺','🦄','🐝','🦋','🐌','🐞','🐜','🐢','🦎','🐍','🐲','🦕','🦈','🐊','🐅','🐆','🦏','🦒','🦓','🦍','🦧','🐘'],
    food:   ['🍕','🍔','🌭','🍟','🌮','🌯','🥙','🥚','🍳','🥘','🍲','🍱','🍣','🍜','🍝','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹'],
    travel: ['🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🚌','🏍️','🛵','🚲','✈️','🚁','🛸','🌍','🌎','🌏','🗺️','🏔️','🌋','🏕️','🏖️','🏜️','🏝️','🏛️','🗼','🗽','⛩️','🎡','🎢','🎠'],
    activity:['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🥊','🥋','🎿','⛷️','🏂','🏋️','🤸','🏆','🥇','🥈','🥉','🎖️','🎭','🎨','🎬','🎤','🎧','🎮','🎲','🎯'],
};

const ZO_STICKERS = [
    {em:'🔥',l:'Hot'},{em:'❤️‍🔥',l:'Love'},{em:'💀',l:'Dead'},{em:'✨',l:'Vibe'},
    {em:'🫂',l:'Hug'},{em:'🥺',l:'Plead'},{em:'😈',l:'Devil'},{em:'🤙',l:'Chill'},
    {em:'💅',l:'Slay'},{em:'🙈',l:'Shy'},{em:'🫦',l:'Sus'},{em:'🌙',l:'Night'}
];

// ══ STATE ════════════════════════════════════════
let currentUser        = null;
let currentUserData    = null;
let currentAppRole     = 'member';  // app-level: owner | admin | mod | member
let currentGroupRole   = 'member';  // THIS group's role: admin | mod | member
let isGroupAdmin       = false;     // true if user created/is admin of THIS group
let groupData          = null;      // full group meta from Firebase
let isReadMode         = false;
let isPrivate          = false;
let notifOn            = true;
let replyingTo         = null;
let currentMsgTarget   = null;
let currentMsgType     = null;
let currentMsgKey      = null;
let activeTrayTab      = 'emoji';
let activeEmojiCat     = 'recent';
let longPressTimer     = null;
let postType           = 'post';
let selectedRoleOpt    = 'mod';
let selectedAdminOpt   = 'promote';
let selectedBanDur     = '1h';
let currentMemberTarget = null; // { name, role, uid }
let isRecording        = false;
let toastTimer         = null;
let mutedMembers       = {};    // { uid: unmuteTimestamp }

// ══ INIT ═════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;

    // ── Load user data
    const snap = await get(ref(db, `users/${user.uid}`));
    if (snap.exists()) {
        currentUserData = snap.val();
        // App-level role
        if (user.uid === OWNER_UID) {
            currentAppRole = 'owner';
            await set(ref(db, `users/${user.uid}/role`), 'owner');
        } else {
            currentAppRole = currentUserData.role || 'member';
        }
    }

    // ── Block kicked/left members (official group is always open)
    if (GROUP_ID !== 'official_global') {
        const kickedSnap = await get(ref(db, `groups/${GROUP_ID}/kicked/${user.uid}`));
        const leftSnap   = await get(ref(db, `groups/${GROUP_ID}/left/${user.uid}`));
        if (kickedSnap.exists() || leftSnap.exists()) {
            document.body.innerHTML = `
                <div style="height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
                            background:#080808;color:white;font-family:'Nunito',sans-serif;gap:16px;padding:24px;text-align:center;">
                    <div style="font-size:3rem;">${kickedSnap.exists() ? '🚫' : '🚪'}</div>
                    <div style="font-size:1.1rem;font-weight:900;">${kickedSnap.exists() ? 'You were removed from this group' : 'You left this group'}</div>
                    <div style="font-size:13px;color:#555;">You can no longer access this group.</div>
                    <button onclick="window.location.href='group.html'"
                        style="margin-top:8px;padding:12px 28px;background:#ff3e1d;border:none;border-radius:14px;
                               color:white;font-weight:900;font-size:14px;cursor:pointer;">← Go Back</button>
                </div>`;
            return;
        }
    }

    // ── Auto join group
    const memberRef  = ref(db, `users/${user.uid}/groups/${GROUP_ID}`);
    const memberSnap = await get(memberRef);
    if (!memberSnap.exists()) await set(memberRef, true);

    // ── Load group meta (sets groupData, currentGroupRole, isGroupAdmin, isReadMode, isPrivate)
    await loadGroupMeta();

    // ── Apply input area visibility based on roles + read mode
    applyInputVisibility();

    // ── Apply settings panel visibility based on roles
    applySettingsVisibility();

    // ── Listen to messages realtime
    listenMessages();

    // ── Build waveform
    buildWaveform('wv1');

    // ── Init swipe to reply
    initSwipeToReply();

    // ── Load real members and posts
    loadMembers();
    listenPosts();

    // ── Typing indicator demo
    setTimeout(() => {
        const ti = document.getElementById('typingIndicator');
        if (ti) { ti.classList.add('show'); setTimeout(() => ti.classList.remove('show'), 3000); }
    }, 2000);
});

// ══ LOAD GROUP META ══════════════════════════════
async function loadGroupMeta() {
    try {
        // Member count
        const usersSnap = await get(ref(db, 'users'));
        let count = 0;
        if (usersSnap.exists()) {
            usersSnap.forEach(u => { if (u.val()?.groups?.[GROUP_ID]) count++; });

            // Also load muted members for this group
            const groupMutedSnap = await get(ref(db, `groups/${GROUP_ID}/muted`));
            if (groupMutedSnap.exists()) {
                mutedMembers = groupMutedSnap.val() || {};
            }
        }
        const mcEl = document.getElementById('memberCount');
        if (mcEl) mcEl.textContent = count;

        // Pinned message
        const pinnedSnap = await get(ref(db, `groups/${GROUP_ID}/pinned`));
        if (pinnedSnap.exists()) {
            const pt = document.getElementById('pinnedText');
            if (pt) pt.textContent = pinnedSnap.val();
        }

        // Group meta — name, avatar, readMode, isPrivate, roles
        if (GROUP_ID === 'official_global') {
            setHeader('Zo-Tinder Official', '🔥', '#1a0a0a', true);
            prefillEditModal('Zo-Tinder Official', 'The official Zo-Tinder community 🔥');
            // Official group: only app staff can send in readMode
            currentGroupRole = 'member';
            isGroupAdmin = false;
        } else {
            const metaSnap = await get(ref(db, `groups/${GROUP_ID}`));
            if (metaSnap.exists()) {
                groupData = metaSnap.val();
                const name   = groupData.name   || GROUP_NAME_FROM_URL || 'Group Chat';
                const avatar = groupData.avatarURL || groupData.emoji || '💬';
                const bg     = groupData.avatarBg  || '#1a1a1a';

                setHeader(name, avatar, bg, false);
                prefillEditModal(name, groupData.description || '');

                // ── Determine this user's role WITHIN this group
                // Priority: group roles node > user's groupRoles node > default member
                const groupRoleSnap = await get(ref(db, `groups/${GROUP_ID}/roles/${currentUser.uid}`));
                if (groupRoleSnap.exists()) {
                    currentGroupRole = groupRoleSnap.val();
                } else {
                    const userGroupRoleSnap = await get(ref(db, `users/${currentUser.uid}/groupRoles/${GROUP_ID}`));
                    currentGroupRole = userGroupRoleSnap.exists() ? userGroupRoleSnap.val() : 'member';
                }

                // Creator is always group admin
                isGroupAdmin = (groupData.groupAdmin === currentUser.uid) || currentGroupRole === 'admin';

                // Sync group role to 'admin' if they're the creator
                if (isGroupAdmin && currentGroupRole !== 'admin') {
                    currentGroupRole = 'admin';
                }

                // Read mode
                if (groupData.readMode) {
                    isReadMode = true;
                    document.getElementById('readModeToggle')?.classList.add('on');
                    document.getElementById('readModeBanner')?.classList.add('show');
                }
                // Private mode
                if (groupData.isPrivate) {
                    isPrivate = true;
                    document.getElementById('privateToggle')?.classList.add('on');
                }
            }
        }
    } catch(e) { console.error('loadGroupMeta error:', e); }
}

// ══ APPLY INPUT VISIBILITY ════════════════════════
function applyInputVisibility() {
    const inputArea = document.getElementById('inputArea');
    if (!inputArea) return;

    if (isReadMode && !canSendMessage()) {
        inputArea.style.display = 'none';
    } else {
        // Check if current user is muted in this group
        const muteEntry = mutedMembers[currentUser?.uid];
        if (muteEntry && muteEntry.until > Date.now() && !isAppStaff()) {
            inputArea.style.display = 'none';
            showToast('🔇 You are muted in this group');
        } else {
            inputArea.style.display = '';
        }
    }
}

// ══ APPLY SETTINGS PANEL VISIBILITY ══════════════
function applySettingsVisibility() {
    // Show admin-only options only to group admin / app staff
    const adminOnly = document.querySelectorAll('.admin-only-setting');
    const modOnly   = document.querySelectorAll('.mod-only-setting');
    const showAdmin = canManageGroup();
    const showMod   = canModerateGroup();

    adminOnly.forEach(el => el.style.display = showAdmin ? '' : 'none');
    modOnly.forEach(el   => el.style.display = showMod   ? '' : 'none');
}

function setHeader(name, avatarOrEmoji, bg, isOfficial) {
    const nameEl = document.getElementById('groupName');
    if (nameEl) nameEl.childNodes[0].textContent = name + ' ';
    const badge = document.getElementById('officialBadge');
    if (badge) badge.style.display = isOfficial ? '' : 'none';
    const label = document.getElementById('officialLabel');
    if (label) label.style.display = isOfficial ? '' : 'none';
    const avEl = document.getElementById('groupAv');
    if (avEl) {
        if (bg) avEl.style.background = bg;
        if (avatarOrEmoji && avatarOrEmoji.startsWith('http')) {
            avEl.innerHTML = `<img src="${avatarOrEmoji}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
        } else if (avatarOrEmoji) {
            avEl.textContent = avatarOrEmoji;
        }
    }
    document.title = name + ' | Zo-Tinder';
}

function prefillEditModal(name, desc) {
    const n = document.getElementById('editGroupName');
    const d = document.getElementById('editGroupDesc');
    if (n) n.value = name;
    if (d) d.value = desc;
}

// ══ MESSAGES — REALTIME LISTENER ═════════════════
function listenMessages() {
    const msgsRef = query(ref(db, `messages/${GROUP_ID}`), orderByChild('timestamp'), limitToLast(50));
    onValue(msgsRef, (snap) => {
        if (!snap.exists()) return;
        const area = document.getElementById('messagesArea');
        if (!area) return;

        // Clear demo messages on first load
        if (!area.dataset.loaded) {
            area.innerHTML = `<div class="date-divider"><span>Today</span></div>`;
            area.dataset.loaded = '1';
        }

        // Render any new messages not yet in DOM
        snap.forEach(child => {
            const key = child.key;
            const msg = child.val();
            if (document.getElementById('msg-' + key)) return; // already rendered
            renderMessage(key, msg, area);
        });

        scrollBottom();
    });
}

// ══ RENDER A SINGLE MESSAGE ═══════════════════════
function renderMessage(key, msg, container) {
    const isOwn = msg.uid === currentUser?.uid;
    // Determine the role badge to show — use group role if this is a group-level chat
    const role  = msg.senderGroupRole || msg.senderRole || 'member';

    const row = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'own' : 'other'}`;
    row.id = 'msg-' + key;
    row.dataset.sender = msg.senderName || '';
    row.dataset.msg    = msg.text || '';
    row.dataset.uid    = msg.uid || '';
    row.dataset.key    = key;

    const roleBadgeHTML = getRoleBadgeHTML(role);

    let replyHTML = '';
    if (msg.replyTo) {
        replyHTML = `<div class="reply-preview"><strong>${esc(msg.replyTo.name)}</strong>${esc(msg.replyTo.text)}</div>`;
    }

    const initial = (msg.senderName || '?')[0].toUpperCase();
    const avatarHTML = isOwn ? '' : `
        <div class="msg-av" style="background:${msg.avatarBg || '#1a1030'};color:${msg.avatarColor || '#a78bfa'};"
             onclick="window.showUserProfile('${esc(msg.senderName)}','','','${initial}','${msg.avatarBg || '#1a1030'}','${role}','${msg.photoURL || ''}','${msg.uid || ''}')">
             ${msg.photoURL ? `<img src="${msg.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : initial}
        </div>`;

    const senderHTML = isOwn ? '' : `<div class="msg-sender" style="color:${msg.avatarColor || '#a78bfa'};">${esc(msg.senderName)} ${roleBadgeHTML}</div>`;

    let bubbleContent = '';
    if (msg.type === 'image') {
        bubbleContent = `<div class="bubble ${isOwn ? 'own' : 'other'} img-bubble"
            oncontextmenu="window.openMsgMenu(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchstart="window.startMsgPress(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()">
            <img src="${msg.mediaURL}" alt="image">
        </div>`;
    } else if (msg.type === 'sticker') {
        bubbleContent = `<div style="font-size:3rem;margin-bottom:2px;">${msg.text}</div>`;
    } else if (msg.senderUid === OWNER_UID) {
        bubbleContent = `
        <div class="bubble-owner"
            oncontextmenu="window.openMsgMenu(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchstart="window.startMsgPress(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()">
            <span class="crown-stamp">👑</span>
            <span class="orn orn-tl">❧</span>
            <span class="orn orn-bl">❧</span>
            <span class="orn orn-br">❧</span>
            <div class="bubble-content">${replyHTML}${esc(msg.text || '')}</div>
            <span class="gold-line"></span>
        </div>`;
    } else {
        bubbleContent = `<div class="bubble ${isOwn ? 'own' : 'other'}"
            oncontextmenu="window.openMsgMenu(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchstart="window.startMsgPress(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()">
            ${replyHTML}${esc(msg.text || '')}
        </div>`;
    }

    const time = msg.timestamp ? timeAgo(msg.timestamp) : 'just now';
    const timeHTML = `<div class="msg-time ${isOwn ? 'own' : ''}">${time}${isOwn ? ' ✓✓' : ''}</div>`;

    row.innerHTML = `
        <div class="msg-inner">
            ${avatarHTML}
            <div class="msg-col">
                ${senderHTML}
                ${bubbleContent}
                ${timeHTML}
            </div>
        </div>
        <div class="swipe-reply-icon">↩️</div>
    `;

    container.appendChild(row);
    attachSwipe(row);
}

// ══ SEND MESSAGE ══════════════════════════════════
async function sendMsg() {
    const input = document.getElementById('msgInput');
    const text  = input.value.trim();
    if (!text || !currentUser) return;

    // Read mode check: only group admin, group mod, and app staff can send
    if (isReadMode && !canSendMessage()) {
        showToast('📢 Only admins can send messages in announcement mode');
        return;
    }

    // Mute check
    const muteEntry = mutedMembers[currentUser.uid];
    if (muteEntry && muteEntry.until > Date.now() && !isAppStaff()) {
        const remaining = Math.ceil((muteEntry.until - Date.now()) / 60000);
        showToast(`🔇 You are muted for ${remaining} more minute${remaining !== 1 ? 's' : ''}`);
        return;
    }

    // Use effective role for badge display:
    // App staff get their app role shown; group admin/mod get group role shown
    const displayRole = getEffectiveDisplayRole();
    const avatarColor = roleColor(displayRole);

    const msgData = {
        uid:             currentUser.uid,
        senderName:      currentUserData?.username || 'User',
        senderRole:      currentAppRole,        // app-level role
        senderGroupRole: currentGroupRole,      // group-level role
        avatarBg:        '#1a1030',
        avatarColor:     avatarColor,
        photoURL:        currentUserData?.photoURL || '',
        text:            text,
        type:            'text',
        timestamp:       Date.now(),
    };

    if (replyingTo) {
        msgData.replyTo = { name: replyingTo.name, text: replyingTo.text };
    }

    try {
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        await update(ref(db, `groups/${GROUP_ID}`), {
            lastMessage:   text,
            lastSender:    currentUserData?.username || 'User',
            lastMessageAt: Date.now(),
        });
    } catch(e) { showToast('❌ Failed to send'); return; }

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').style.display  = 'none';
    document.getElementById('voiceBtn').style.display = 'flex';
    closeReply();
    closeStickerTray();
    scrollBottom();
}
window.sendMsg = sendMsg;

// ══ SEND STICKER / EMOJI ══════════════════════════
async function sendSticker(em) {
    if (!currentUser) return;
    closeStickerTray();

    if (isReadMode && !canSendMessage()) { showToast('📢 Announcement mode — admins only'); return; }

    const msgData = {
        uid:             currentUser.uid,
        senderName:      currentUserData?.username || 'User',
        senderRole:      currentAppRole,
        senderGroupRole: currentGroupRole,
        text:            em,
        type:            'sticker',
        timestamp:       Date.now(),
        avatarBg:        '#1a1030',
        avatarColor:     roleColor(getEffectiveDisplayRole()),
        photoURL:        currentUserData?.photoURL || '',
    };
    try { await push(ref(db, `messages/${GROUP_ID}`), msgData); } catch(e) {}
}
window.sendSticker = sendSticker;

// ══ SEND IMAGE (Cloudinary) ═══════════════════════
async function uploadAndSendMedia(file) {
    showToast('📤 Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.secure_url) { showToast('❌ Upload failed'); return; }

        const msgData = {
            uid:             currentUser.uid,
            senderName:      currentUserData?.username || 'User',
            senderRole:      currentAppRole,
            senderGroupRole: currentGroupRole,
            text:            '',
            type:            'image',
            mediaURL:        data.secure_url,
            timestamp:       Date.now(),
            avatarBg:        '#1a1030',
            avatarColor:     roleColor(getEffectiveDisplayRole()),
            photoURL:        currentUserData?.photoURL || '',
        };
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        showToast('✅ Image sent!');
    } catch(e) { showToast('❌ Upload error'); }
}

// ══ SWIPE TO REPLY ════════════════════════════════
function initSwipeToReply() {
    document.querySelectorAll('.msg-row').forEach(row => attachSwipe(row));
}

function attachSwipe(row) {
    const inner = row.querySelector('.msg-inner');
    const icon  = row.querySelector('.swipe-reply-icon');
    if (!inner || !icon) return;

    let startX = 0, startY = 0, swiping = false, triggered = false;
    const isOwn = row.classList.contains('own');
    const threshold = 60;

    row.addEventListener('touchstart', (e) => {
        startX    = e.touches[0].clientX;
        startY    = e.touches[0].clientY;
        swiping   = false;
        triggered = false;
        inner.style.transition = 'none';
    }, { passive: true });

    row.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (!swiping && Math.abs(dy) > Math.abs(dx)) return;
        swiping = true;
        const validSwipe = isOwn ? dx > 0 : dx < 0;
        if (!validSwipe) return;
        const move = Math.min(Math.abs(dx), threshold + 10);
        inner.style.transform = isOwn ? `translateX(${move}px)` : `translateX(-${move}px)`;
        if (Math.abs(dx) >= threshold && !triggered) {
            triggered = true;
            icon.classList.add('visible');
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }, { passive: true });

    row.addEventListener('touchend', () => {
        inner.style.transition = 'transform 0.2s ease';
        inner.style.transform  = '';
        icon.classList.remove('visible');
        if (triggered) {
            const sender = row.dataset.sender || 'User';
            const msg    = row.dataset.msg    || '';
            openReply(sender, msg);
        }
        swiping = triggered = false;
    });
}
window.initSwipeToReply = initSwipeToReply;

// ══ REPLY ════════════════════════════════════════
function openReply(name, text) {
    replyingTo = { name, text };
    document.getElementById('replyName').textContent = name;
    document.getElementById('replyText').textContent = text.substring(0, 60);
    document.getElementById('replyBar').classList.add('show');
    document.getElementById('msgInput').focus();
}
window.openReply = openReply;

function closeReply() {
    replyingTo = null;
    document.getElementById('replyBar').classList.remove('show');
}
window.closeReply = closeReply;

// ══ MESSAGE MENU ══════════════════════════════════
function openMsgMenu(e, el, type, key) {
    if (e) e.preventDefault();
    clearTimeout(longPressTimer);
    currentMsgTarget = el;
    currentMsgType   = type;
    currentMsgKey    = key || null;

    // Delete: own messages always; others' messages if can moderate
    const canDelete = type === 'own' || canModerateGroup();
    // Kick: only for other people's messages, and only if can moderate group
    const canKick   = type === 'other' && canModerateGroup();
    // Pin: only mods and above (group or app level)
    const canPin    = canModerateGroup();

    document.getElementById('msgDeleteOpt').style.display = canDelete ? '' : 'none';
    document.getElementById('msgKickOpt').style.display   = canKick   ? '' : 'none';
    document.getElementById('msgPinOpt') && (document.getElementById('msgPinOpt').style.display = canPin ? '' : 'none');

    document.getElementById('msgMenuOverlay').classList.add('show');
}
window.openMsgMenu = openMsgMenu;

function closeMsgMenu() { document.getElementById('msgMenuOverlay').classList.remove('show'); }
window.closeMsgMenu = closeMsgMenu;

function startMsgPress(e, el, type, key) { longPressTimer = setTimeout(() => openMsgMenu(e, el, type, key), 500); }
window.startMsgPress = startMsgPress;

function clearMsgPress() { clearTimeout(longPressTimer); }
window.clearMsgPress = clearMsgPress;

async function doMsgAction(action) {
    closeMsgMenu();

    if (action === 'react') { openReactPicker(); return; }

    if (action === 'reply') {
        const text = currentMsgTarget?.innerText?.trim() || '';
        const row  = currentMsgTarget?.closest('.msg-row');
        const name = currentMsgType === 'own' ? 'You' : (row?.dataset.sender || 'User');
        openReply(name, text); return;
    }

    if (action === 'copy') {
        navigator.clipboard?.writeText(currentMsgTarget?.innerText?.trim() || '');
        showToast('📋 Copied!');
        return;
    }

    if (action === 'pin') {
        if (!canModerateGroup()) { showToast('⛔ Mods only'); return; }
        const text = (currentMsgTarget?.innerText?.trim() || '').substring(0, 80);
        document.getElementById('pinnedText').textContent = text;
        await set(ref(db, `groups/${GROUP_ID}/pinned`), text);
        showToast('📌 Message pinned!');
        return;
    }

    if (action === 'delete') {
        const row = currentMsgTarget?.closest('.msg-row');
        // Can delete own messages, or others' if moderator
        if (currentMsgType !== 'own' && !canModerateGroup()) {
            showToast('⛔ Not authorized'); return;
        }
        row?.remove();
        if (currentMsgKey) {
            try { await remove(ref(db, `messages/${GROUP_ID}/${currentMsgKey}`)); } catch(e) {}
        }
        showToast('🗑️ Deleted');
        return;
    }

    if (action === 'kick') {
        if (!canModerateGroup()) { showToast('⛔ Mods only'); return; }
        const row = currentMsgTarget?.closest('.msg-row');
        const uid = row?.dataset.uid || '';
        if (!uid) { showToast('❌ Could not identify user'); return; }
        if (uid === OWNER_UID) { showToast('⛔ Cannot kick app owner'); return; }
        // Group admin cannot be kicked by group mod (only group admin or app staff can kick group admin)
        const targetGroupRole = await getGroupRole(uid);
        if (targetGroupRole === 'admin' && !canManageGroup()) {
            showToast('⛔ Group mods cannot kick group admins'); return;
        }
        try {
            await Promise.all([
                set(ref(db, `groups/${GROUP_ID}/kicked/${uid}`), { by: currentUser.uid, at: Date.now() }),
                remove(ref(db, `users/${uid}/groups/${GROUP_ID}`)),
                remove(ref(db, `groups/${GROUP_ID}/members/${uid}`)),
                remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`)),
                remove(ref(db, `users/${uid}/groupRoles/${GROUP_ID}`)),
            ]);
            row?.remove();
            showToast('🚫 User removed from group');
            loadMembers();
        } catch(e) { showToast('❌ Failed to remove user'); }
    }
}
window.doMsgAction = doMsgAction;

// ══ REACT PICKER ══════════════════════════════════
function openReactPicker() {
    document.getElementById('reactOverlay').classList.add('show');
    setTimeout(() => {
        const b = document.getElementById('reactBox');
        b.style.transform = 'scale(1)'; b.style.opacity = '1';
    }, 10);
}
window.openReactPicker = openReactPicker;

function closeReactPicker() {
    document.getElementById('reactOverlay').classList.remove('show');
    const b = document.getElementById('reactBox');
    b.style.transform = 'scale(0.88)'; b.style.opacity = '0';
}
window.closeReactPicker = closeReactPicker;

function pickReact(emoji) {
    closeReactPicker();
    if (currentMsgTarget) {
        const col = currentMsgTarget.closest('.msg-col');
        let r = col?.querySelector('.msg-reactions');
        if (!r) { r = document.createElement('div'); r.className = 'msg-reactions'; currentMsgTarget.after(r); }
        const p = document.createElement('span');
        p.className = 'react-pill own-react';
        p.textContent = emoji + ' 1';
        p.onclick = function() { toggleReact(this); };
        r.appendChild(p);
    }
    showToast(emoji + ' Reaction added!');
}
window.pickReact = pickReact;

function toggleReact(pill) { pill.classList.toggle('own-react'); }
window.toggleReact = toggleReact;

// ══ SETTINGS ══════════════════════════════════════
function openSettings() {
    const isOfficial = GROUP_ID === 'official_global';

    // Leave Group — hide in official group
    const leaveBtn      = document.getElementById('leaveGroupBtn');
    const leaveDivider  = document.getElementById('leaveGroupDivider');
    if (leaveBtn)    leaveBtn.style.display    = isOfficial ? 'none' : '';
    if (leaveDivider) leaveDivider.style.display = isOfficial ? 'none' : '';

    // Apply role-based visibility
    applySettingsVisibility();

    document.getElementById('settingsOverlay').classList.add('show');
}
window.openSettings = openSettings;

function closeSettings() { document.getElementById('settingsOverlay').classList.remove('show'); }
window.closeSettings = closeSettings;

// ── Read Mode Toggle (group admin or app staff) ──
async function toggleReadMode() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    isReadMode = !isReadMode;
    document.getElementById('readModeToggle').classList.toggle('on', isReadMode);
    document.getElementById('readModeBanner').classList.toggle('show', isReadMode);
    applyInputVisibility();
    await update(ref(db, `groups/${GROUP_ID}`), { readMode: isReadMode });
    showToast(isReadMode ? '📢 Announcement mode ON — only admins can send' : '💬 Chat mode ON');
}
window.toggleReadMode = toggleReadMode;

// ── Private Toggle (group admin or app staff) ──
async function togglePrivate() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    isPrivate = !isPrivate;
    document.getElementById('privateToggle').classList.toggle('on', isPrivate);
    await update(ref(db, `groups/${GROUP_ID}`), { isPrivate });
    showToast(isPrivate ? '🔒 Group is now private' : '🌐 Group is now public');
}
window.togglePrivate = togglePrivate;

function toggleNotif() {
    notifOn = !notifOn;
    document.getElementById('notifToggle').classList.toggle('on', notifOn);
    showToast(notifOn ? '🔔 Notifications ON' : '🔕 Notifications OFF');
}
window.toggleNotif = toggleNotif;

// ── Edit Group Info (group admin or app staff) ──
function editGroupInfo() { closeSettings(); document.getElementById('editGroupOverlay').classList.add('show'); }
window.editGroupInfo = editGroupInfo;

function closeEditGroup(e) {
    if (!e || e.target.id === 'editGroupOverlay') document.getElementById('editGroupOverlay').classList.remove('show');
}
window.closeEditGroup = closeEditGroup;

async function saveGroupEdit() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    const name = document.getElementById('editGroupName').value.trim();
    const desc = document.getElementById('editGroupDesc').value.trim();
    if (!name) { showToast('⚠️ Name cannot be empty'); return; }
    setHeader(name, null, null, GROUP_ID === 'official_global');
    await update(ref(db, `groups/${GROUP_ID}`), { name, description: desc });
    closeEditGroup();
    showToast('✅ Group updated!');
}
window.saveGroupEdit = saveGroupEdit;

// ── Change Group Avatar (group admin or app staff) ──
async function changeGroupAvatar() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        showToast('⬆️ Uploading avatar...'); closeSettings();
        try {
            const fd = new FormData();
            fd.append('file', file); fd.append('upload_preset', CLOUDINARY_PRESET); fd.append('folder', 'group-avatars');
            const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:fd });
            const data = await res.json();
            if (!data.secure_url) { showToast('❌ Upload failed'); return; }
            await update(ref(db, `groups/${GROUP_ID}`), { avatarURL: data.secure_url });
            setHeader(null, data.secure_url, '#1a1a1a', GROUP_ID === 'official_global');
            showToast('✅ Avatar updated!');
        } catch(err) { showToast('❌ Upload failed'); }
    };
    input.click();
}
window.changeGroupAvatar = changeGroupAvatar;

// ── Clear Chat (group admin or app staff) ──
async function clearChat() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    closeSettings();
    if (!confirm('Clear all messages for everyone? This cannot be undone.')) return;
    try {
        await remove(ref(db, `messages/${GROUP_ID}`));
        document.getElementById('messagesArea').innerHTML =
            '<div class="date-divider"><span>Today</span></div>';
        showToast('🗑️ Chat cleared');
    } catch(e) { showToast('❌ Failed to clear chat'); }
}
window.clearChat = clearChat;

// ── Delete Group (group admin or app staff) ──
async function deleteGroup() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    closeSettings();
    if (!confirm('Delete this group permanently? This cannot be undone.')) return;
    showToast('🗑️ Deleting group...');

    try {
        // Remove group data
        await Promise.all([
            remove(ref(db, `groups/${GROUP_ID}`)),
            remove(ref(db, `messages/${GROUP_ID}`)),
            remove(ref(db, `posts/${GROUP_ID}`)),
        ]);
        // Remove from all users' group lists
        const usersSnap = await get(ref(db, 'users'));
        if (usersSnap.exists()) {
            const ops = [];
            usersSnap.forEach(child => {
                if (child.val()?.groups?.[GROUP_ID]) {
                    ops.push(set(ref(db, `users/${child.key}/groups/${GROUP_ID}`), null));
                    ops.push(set(ref(db, `users/${child.key}/groupRoles/${GROUP_ID}`), null));
                }
            });
            await Promise.all(ops);
        }
        showToast('✅ Group deleted');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed to delete group'); }
}
window.deleteGroup = deleteGroup;

// ── Leave Group ──
async function leaveGroup() {
    if (GROUP_ID === 'official_global') { showToast('⛔ Cannot leave the official group'); return; }
    closeSettings();
    if (!confirm('Leave this group? You will not be able to rejoin.')) return;

    try {
        await Promise.all([
            set(ref(db, `groups/${GROUP_ID}/left/${currentUser.uid}`), { at: Date.now() }),
            remove(ref(db, `users/${currentUser.uid}/groups/${GROUP_ID}`)),
            remove(ref(db, `groups/${GROUP_ID}/members/${currentUser.uid}`)),
            remove(ref(db, `groups/${GROUP_ID}/roles/${currentUser.uid}`)),
            remove(ref(db, `users/${currentUser.uid}/groupRoles/${GROUP_ID}`)),
        ]);
        showToast('🚪 You left the group');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed to leave group'); }
}
window.leaveGroup = leaveGroup;

// ══ MEMBER OPTIONS ════════════════════════════════
function openMemberOptions(e, name, role, uid) {
    e.stopPropagation();
    currentMemberTarget = { name, role, uid };

    document.getElementById('memberOptName').textContent = name;

    const isGroupAdminTarget = role === 'admin';
    const isGroupModTarget   = role === 'mod';
    const targetUid          = uid;

    // Promote to group admin — only existing group admin or app owner can do this
    const canMakeGroupAdmin   = (isGroupAdmin || currentAppRole === 'owner') && !isGroupAdminTarget;
    const canRemoveGroupAdmin = currentAppRole === 'owner' && isGroupAdminTarget && targetUid !== OWNER_UID;

    // Assign/remove group mod — group admin or app admin/owner can do this
    const canAssignGroupMod  = canManageGroup() && !isGroupModTarget && !isGroupAdminTarget;
    const canRemoveGroupMod  = canManageGroup() && isGroupModTarget;

    // App-level promotions — app owner only
    const canMakeAppAdmin   = currentAppRole === 'owner';
    const canRemoveAppAdmin = currentAppRole === 'owner';

    const el = (id) => document.getElementById(id);
    if (el('optMakeGroupAdmin'))   el('optMakeGroupAdmin').style.display   = canMakeGroupAdmin   ? '' : 'none';
    if (el('optRemoveGroupAdmin')) el('optRemoveGroupAdmin').style.display  = canRemoveGroupAdmin  ? '' : 'none';
    if (el('optAssignGroupMod'))   el('optAssignGroupMod').style.display   = canAssignGroupMod   ? '' : 'none';
    if (el('optRemoveGroupMod'))   el('optRemoveGroupMod').style.display   = canRemoveGroupMod   ? '' : 'none';
    if (el('optMakeAdmin'))        el('optMakeAdmin').style.display        = canMakeAppAdmin     ? '' : 'none';
    if (el('optRemoveAdmin'))      el('optRemoveAdmin').style.display      = canRemoveAppAdmin && role === 'app_admin' ? '' : 'none';

    // Mod section: visible to group mod+, group admin+, app staff
    if (el('modActionsSection'))   el('modActionsSection').style.display   = canModerateGroup()  ? '' : 'none';
    // Admin section: visible to group admin, app staff
    if (el('adminActionsSection')) el('adminActionsSection').style.display = canManageGroup()    ? '' : 'none';

    document.getElementById('memberOptOverlay').classList.add('show');
}
window.openMemberOptions = openMemberOptions;

function closeMemberOpts() { document.getElementById('memberOptOverlay').classList.remove('show'); }
window.closeMemberOpts = closeMemberOpts;

async function memberAction(action) {
    closeMemberOpts();
    const name = currentMemberTarget?.name || 'User';
    const uid  = currentMemberTarget?.uid || await findUidByUsername(name);

    if (action === 'profile') { window.location.href = 'user-view.html'; return; }

    // ── Group-level role management ──
    if (action === 'makeGroupAdmin') {
        if (!isGroupAdmin && currentAppRole !== 'owner') { showToast('⛔ Group Admin only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        if (uid === OWNER_UID) { showToast('⛔ App owner already has all powers'); return; }
        await setGroupRole(uid, 'admin');
        showToast(`👑 ${name} is now Group Admin!`);
        loadMembers();
        return;
    }

    if (action === 'removeGroupAdmin') {
        if (currentAppRole !== 'owner') { showToast('⛔ App Owner only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await setGroupRole(uid, 'member');
        showToast(`👤 ${name} removed as Group Admin`);
        loadMembers();
        return;
    }

    if (action === 'assignGroupMod') {
        if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await setGroupRole(uid, 'mod');
        showToast(`🛡️ ${name} is now Group Moderator!`);
        loadMembers();
        return;
    }

    if (action === 'removeGroupMod') {
        if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await setGroupRole(uid, 'member');
        showToast(`👤 ${name} role removed`);
        loadMembers();
        return;
    }

    // ── App-level role management (app owner only) ──
    if (action === 'makeAdmin') {
        if (currentAppRole !== 'owner') { showToast('⛔ App Owner only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await set(ref(db, `users/${uid}/role`), 'admin');
        showToast(`⚙️ ${name} is now App Admin!`);
        return;
    }
    if (action === 'removeAdmin') {
        if (currentAppRole !== 'owner') { showToast('⛔ App Owner only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await set(ref(db, `users/${uid}/role`), 'member');
        showToast(`👤 ${name} removed as App Admin`);
        return;
    }
    if (action === 'assignMod') {
        if (!isAppAdmin()) { showToast('⛔ App Admins only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await set(ref(db, `users/${uid}/role`), 'mod');
        showToast(`🛡️ ${name} is now App Moderator!`);
        return;
    }
    if (action === 'removeMod') {
        if (!isAppAdmin()) { showToast('⛔ App Admins only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        await set(ref(db, `users/${uid}/role`), 'member');
        showToast(`👤 ${name} removed as App Mod`);
        return;
    }

    // ── Warn ──
    if (action === 'warn') { showToast(`⚠️ Warning sent to ${name}`); return; }

    // ── Kick from group ──
    if (action === 'kick') {
        if (!canModerateGroup()) { showToast('⛔ Mods only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        if (uid === OWNER_UID) { showToast('⛔ Cannot kick app owner'); return; }

        // Group mod cannot kick group admin
        const targetGroupRole = await getGroupRole(uid);
        if (targetGroupRole === 'admin' && !canManageGroup()) {
            showToast('⛔ Group Mods cannot kick Group Admins'); return;
        }

        try {
            await Promise.all([
                set(ref(db, `groups/${GROUP_ID}/kicked/${uid}`), { by: currentUser.uid, at: Date.now() }),
                remove(ref(db, `users/${uid}/groups/${GROUP_ID}`)),
                remove(ref(db, `groups/${GROUP_ID}/members/${uid}`)),
                remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`)),
                remove(ref(db, `users/${uid}/groupRoles/${GROUP_ID}`)),
            ]);
            showToast(`🚫 ${name} removed from group`);
            loadMembers();
        } catch(e) { showToast('❌ Failed to kick'); }
        return;
    }

    // ── Add member (if group is private, only group admin/mod or app staff) ──
    if (action === 'addMember') {
        if (isPrivate && !canModerateGroup()) { showToast('⛔ Private group — mods only'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        try {
            await set(ref(db, `users/${uid}/groups/${GROUP_ID}`), true);
            await set(ref(db, `groups/${GROUP_ID}/members/${uid}`), true);
            const groupSnap = await get(ref(db, `groups/${GROUP_ID}`));
            if (groupSnap.exists()) {
                const count = groupSnap.val().memberCount || 0;
                await set(ref(db, `groups/${GROUP_ID}/memberCount`), count + 1);
            }
            showToast(`✅ ${name} added to group`);
            loadMembers();
        } catch(e) { showToast('❌ Failed to add member'); }
        return;
    }
}
window.memberAction = memberAction;

// ══ TEMP MUTE (group mod+, app staff) ═════════════
function openTempBan() {
    closeMemberOpts();
    document.getElementById('banTargetName').textContent = currentMemberTarget?.name || 'this user';
    document.querySelectorAll('.ban-dur-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('.ban-dur-btn')?.classList.add('selected');
    selectedBanDur = '1h';
    document.getElementById('banReason').value = '';
    document.getElementById('tempBanOverlay').classList.add('show');
}
window.openTempBan = openTempBan;

function closeTempBan(e) {
    if (!e || e.target.id === 'tempBanOverlay') document.getElementById('tempBanOverlay').classList.remove('show');
}
window.closeTempBan = closeTempBan;

function selectBanDur(btn, dur) {
    document.querySelectorAll('.ban-dur-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedBanDur = dur;
}
window.selectBanDur = selectBanDur;

async function confirmTempBan() {
    if (!canModerateGroup()) { showToast('⛔ Mods only'); return; }

    const name   = currentMemberTarget?.name || 'User';
    const uid    = currentMemberTarget?.uid || await findUidByUsername(name);
    const reason = document.getElementById('banReason').value.trim();

    if (!uid) { showToast('❌ User not found'); return; }
    if (uid === OWNER_UID) { showToast('⛔ Cannot mute app owner'); return; }

    // Group mod cannot mute group admin
    const targetGroupRole = await getGroupRole(uid);
    if (targetGroupRole === 'admin' && !canManageGroup()) {
        showToast('⛔ Group mods cannot mute Group Admins'); closeTempBan(); return;
    }

    const durMap = { '1h':3600000, '6h':21600000, '1d':86400000, '3d':259200000, '7d':604800000 };
    const muteUntil = Date.now() + (durMap[selectedBanDur] || 3600000);

    try {
        // Store mute in group node (group-specific mute)
        await set(ref(db, `groups/${GROUP_ID}/muted/${uid}`), {
            until:     muteUntil,
            reason:    reason || 'Violation of group rules',
            mutedBy:   currentUser.uid,
            mutedAt:   Date.now(),
        });

        // Update local state
        mutedMembers[uid] = { until: muteUntil };

        closeTempBan();
        showToast(`🔇 ${name} muted for ${selectedBanDur}`);
        loadMembers();
    } catch(e) { showToast('❌ Failed to mute user'); }
}
window.confirmTempBan = confirmTempBan;

// ── Lift mute ──
async function liftMute(uid, name) {
    // Group mod can lift mutes they applied; group admin can lift all mutes
    // Group mod CANNOT lift mutes applied by group admin
    if (!canModerateGroup()) { showToast('⛔ Mods only'); return; }

    const muteEntry = mutedMembers[uid];
    if (!muteEntry) { showToast('ℹ️ User is not muted'); return; }

    // Check if the mute was applied by group admin — mods cannot remove those
    const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
    if (muteSnap.exists()) {
        const muteData = muteSnap.val();
        if (muteData.mutedBy) {
            const muterRole = await getGroupRole(muteData.mutedBy);
            if ((muterRole === 'admin' || muteData.mutedBy === groupData?.groupAdmin) && !canManageGroup() && !isAppStaff()) {
                showToast('⛔ Cannot lift mute set by Group Admin'); return;
            }
        }
    }

    try {
        await remove(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
        delete mutedMembers[uid];
        showToast(`🔊 ${name || 'User'} unmuted`);
        loadMembers();
    } catch(e) { showToast('❌ Failed to lift mute'); }
}
window.liftMute = liftMute;

// ══ ASSIGN ROLE (legacy panel, now uses group roles) ══
function openAssignRole() { closeSettings(); document.getElementById('assignRoleOverlay').classList.add('show'); }
window.openAssignRole = openAssignRole;

function closeAssignRole(e) {
    if (!e || e.target.id === 'assignRoleOverlay') document.getElementById('assignRoleOverlay').classList.remove('show');
}
window.closeAssignRole = closeAssignRole;

function selectRoleOpt(opt) {
    selectedRoleOpt = opt;
    document.getElementById('roleOpt-mod')?.classList.remove('selected', 'selected-mod');
    document.getElementById('roleOpt-member')?.classList.remove('selected', 'selected-mod');
    document.getElementById(`roleOpt-${opt}`)?.classList.add(opt === 'mod' ? 'selected-mod' : 'selected');
}
window.selectRoleOpt = selectRoleOpt;

async function confirmAssignRole() {
    if (!canManageGroup()) { showToast('⛔ Group Admin only'); return; }
    const name = document.getElementById('roleTargetName').value.trim();
    if (!name) { showToast('⚠️ Enter a member name'); return; }

    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }

    const newRole = selectedRoleOpt === 'mod' ? 'mod' : 'member';
    await setGroupRole(uid, newRole);
    closeAssignRole();
    showToast(newRole === 'mod' ? `🛡️ ${name} is now Group Moderator!` : `👤 ${name} role removed`);
    loadMembers();
}
window.confirmAssignRole = confirmAssignRole;

// ══ PROMOTE ADMIN (app owner only) ═══════════════
function openPromoteAdmin() { closeSettings(); document.getElementById('promoteAdminOverlay').classList.add('show'); }
window.openPromoteAdmin = openPromoteAdmin;

function closePromoteAdmin(e) {
    if (!e || e.target.id === 'promoteAdminOverlay') document.getElementById('promoteAdminOverlay').classList.remove('show');
}
window.closePromoteAdmin = closePromoteAdmin;

function selectAdminOpt(opt) {
    selectedAdminOpt = opt;
    document.getElementById('adminOpt-promote')?.classList.remove('selected');
    document.getElementById('adminOpt-demote')?.classList.remove('selected');
    document.getElementById(`adminOpt-${opt}`)?.classList.add('selected');
}
window.selectAdminOpt = selectAdminOpt;

async function confirmAdminAction() {
    if (currentAppRole !== 'owner') { showToast('⛔ App Owner only'); return; }
    const name = document.getElementById('adminTargetName').value.trim();
    if (!name) { showToast('⚠️ Enter a member name'); return; }

    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }
    if (uid === OWNER_UID) { showToast('⛔ Cannot change owner role'); return; }

    const newRole = selectedAdminOpt === 'promote' ? 'admin' : 'member';
    await set(ref(db, `users/${uid}/role`), newRole);
    closePromoteAdmin();
    showToast(newRole === 'admin' ? `⚙️ ${name} is now App Admin!` : `👤 ${name} removed as Admin`);
}
window.confirmAdminAction = confirmAdminAction;

// ══ CREATE POST ════════════════════════════════════
function openCreatePost(type = 'post') {
    postType = type;
    const titles = { post:'Create Post', poll:'Create Poll', event:'Create Event', announce:'Announcement' };
    document.getElementById('createPostTitle').textContent = titles[type] || 'Create Post';
    document.getElementById('pollOptions').style.display  = type === 'poll'  ? '' : 'none';
    document.getElementById('eventFields').style.display  = type === 'event' ? '' : 'none';
    document.getElementById('createPostOverlay').classList.add('show');
}
window.openCreatePost = openCreatePost;

function closeCreatePost(e) {
    if (!e || e.target.id === 'createPostOverlay') {
        document.getElementById('createPostOverlay').classList.remove('show');
        document.getElementById('postContent').value = '';
    }
}
window.closeCreatePost = closeCreatePost;

async function submitPost() {
    const c = document.getElementById('postContent').value.trim();
    if (!c && postType !== 'event') { showToast('⚠️ Write something first'); return; }

    const postData = {
        senderUid:       currentUser.uid,
        senderName:      currentUserData?.username || 'User',
        senderRole:      currentAppRole,
        senderGroupRole: currentGroupRole,
        photoURL:        currentUserData?.photoURL || '',
        text:            c,
        type:            postType,
        timestamp:       Date.now(),
        likes:           0,
    };

    if (postType === 'poll') {
        const opts = [
            document.getElementById('pollOpt1')?.value.trim(),
            document.getElementById('pollOpt2')?.value.trim(),
            document.getElementById('pollOpt3')?.value.trim(),
        ].filter(Boolean);
        if (opts.length < 2) { showToast('⚠️ Add at least 2 options'); return; }
        postData.options = opts;
    }

    if (postType === 'event') {
        postData.eventTitle = document.getElementById('eventTitle')?.value.trim();
        postData.eventLoc   = document.getElementById('eventLoc')?.value.trim();
        postData.eventDate  = document.getElementById('eventDate')?.value.trim();
    }

    try {
        await push(ref(db, `posts/${GROUP_ID}`), postData);
        closeCreatePost();
        showToast('🚀 Post published!');
    } catch(e) { showToast('❌ Failed to post'); }
}
window.submitPost = submitPost;

function likePost(btn) {
    btn.classList.toggle('liked');
    const s = btn.querySelector('span');
    if (s) { const n = parseInt(s.textContent) || 0; s.textContent = btn.classList.contains('liked') ? n+1 : Math.max(n-1,0); }
}
window.likePost = likePost;

function votePoll(opt) {
    document.querySelectorAll('.poll-option').forEach(o => o.classList.remove('voted'));
    opt.classList.add('voted');
    showToast('✅ Vote recorded!');
}
window.votePoll = votePoll;

function joinEvent(btn) {
    const going = btn.textContent === 'Join';
    btn.textContent = going ? '✓ Going' : 'Join';
    showToast(going ? "✅ You're going!" : '❌ Cancelled RSVP');
}
window.joinEvent = joinEvent;

// ══ STICKER TRAY ══════════════════════════════════
function toggleSticker() {
    const tray = document.getElementById('stickerTray');
    const bd   = document.getElementById('trayBackdrop');
    if (tray.classList.contains('show')) { closeStickerTray(); }
    else { tray.classList.add('show'); bd.classList.add('show'); renderTray('emoji'); }
}
window.toggleSticker = toggleSticker;

function closeStickerTray() {
    document.getElementById('stickerTray').classList.remove('show');
    document.getElementById('trayBackdrop').classList.remove('show');
}
window.closeStickerTray = closeStickerTray;

function switchTray(tab) {
    document.querySelectorAll('.tray-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tt-' + tab).classList.add('active');
    activeTrayTab = tab;
    document.getElementById('traySearch').classList.toggle('show', tab === 'gif');
    renderTray(tab);
}
window.switchTray = switchTray;

function renderTray(tab) {
    const body = document.getElementById('trayBody');
    body.innerHTML = '';
    if (tab === 'emoji') {
        const cats = document.createElement('div'); cats.className = 'emoji-cats';
        [{ key:'recent',icon:'🕐' },{ key:'faces',icon:'😀' },{ key:'hearts',icon:'❤️' },
         { key:'hands',icon:'👍' },{ key:'nature',icon:'🐶' },{ key:'food',icon:'🍕' },
         { key:'travel',icon:'✈️' },{ key:'activity',icon:'⚽' }].forEach(c => {
            const el = document.createElement('div');
            el.className = 'emoji-cat' + (activeEmojiCat === c.key ? ' active' : '');
            el.textContent = c.icon;
            el.onclick = () => {
                activeEmojiCat = c.key;
                document.querySelectorAll('.emoji-cat').forEach(x => x.classList.remove('active'));
                el.classList.add('active');
                renderEmojiGrid(body, EMOJIS[c.key] || []);
            };
            cats.appendChild(el);
        });
        body.appendChild(cats);
        renderEmojiGrid(body, EMOJIS[activeEmojiCat] || EMOJIS.recent);
    } else if (tab === 'stickers') {
        const grid = document.createElement('div'); grid.className = 'sticker-grid';
        ZO_STICKERS.forEach(s => {
            const item = document.createElement('div'); item.className = 'sticker-item';
            item.textContent = s.em; item.onclick = () => sendSticker(s.em); grid.appendChild(item);
        });
        body.appendChild(grid);
    } else if (tab === 'gif') {
        renderGifs(body, '');
    } else if (tab === 'mine') {
        const grid = document.createElement('div'); grid.className = 'sticker-grid';
        const add  = document.createElement('div'); add.className = 'add-sticker-btn';
        add.innerHTML = '➕<span>Add Sticker</span>'; add.onclick = () => showToast('🖼️ Upload sticker coming soon!');
        grid.appendChild(add);
        body.appendChild(grid);
        const e = document.createElement('div'); e.className = 'tray-empty';
        e.innerHTML = '<div style="font-size:2rem;margin-bottom:8px;">🎭</div><p>No custom stickers yet.<br>Tap + to add!</p>';
        body.appendChild(e);
    }
}

function renderEmojiGrid(container, emojis) {
    let g = container.querySelector('.emoji-grid'); if (g) g.remove();
    g = document.createElement('div'); g.className = 'emoji-grid';
    emojis.forEach(em => {
        const i = document.createElement('div'); i.className = 'emoji-item';
        i.textContent = em; i.onclick = () => sendEmojiToInput(em); g.appendChild(i);
    });
    container.appendChild(g);
}

function renderGifs(container, q) {
    container.innerHTML = '';
    const grid = document.createElement('div'); grid.className = 'gif-grid';
    ['🎬','🌊','🔥','😂','✨','💫','🎉','🌙','❤️','🚀','🌸','🎵'].forEach(p => {
        const item = document.createElement('div'); item.className = 'gif-item'; item.textContent = p;
        item.style.fontSize = '2.5rem';
        item.onclick = () => { sendSticker(p); showToast('🎬 Connect Giphy API for real GIFs!'); };
        grid.appendChild(item);
    });
    container.appendChild(grid);
    const note = document.createElement('div'); note.className = 'tray-empty';
    note.innerHTML = '<p style="color:#333;font-size:11px;">Connect Giphy API in group-chat.js for real GIFs 🎬</p>';
    container.appendChild(note);
}

function searchGif(q) { renderGifs(document.getElementById('trayBody'), q); }
window.searchGif = searchGif;

function sendEmojiToInput(em) {
    const i = document.getElementById('msgInput'); i.value += em; onInput(i); i.focus();
}

// ══ ATTACH ════════════════════════════════════════
function openAttach() { document.getElementById('attachOverlay').classList.add('show'); }
window.openAttach = openAttach;

function closeAttach() { document.getElementById('attachOverlay').classList.remove('show'); }
window.closeAttach = closeAttach;

function attachAction(type) {
    closeAttach();
    if (type === 'sticker') { toggleSticker(); switchTray('stickers'); return; }
    if (type === 'image' || type === 'camera') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        if (type === 'camera') input.capture = 'environment';
        input.onchange = async (e) => { if (e.target.files[0]) await uploadAndSendMedia(e.target.files[0]); };
        input.click(); return;
    }
    if (type === 'video') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'video/*';
        input.onchange = async (e) => { if (e.target.files[0]) await uploadAndSendMedia(e.target.files[0]); };
        input.click(); return;
    }
    showToast('📎 Coming soon!');
}
window.attachAction = attachAction;

// ══ VOICE ════════════════════════════════════════
function startRecording() { showToast('🎤 Voice messages coming soon!'); }
window.startRecording = startRecording;
function stopRecording() {}
window.stopRecording = stopRecording;
function playVoice(btn) { showToast('🎤 Voice messages coming soon!'); }
window.playVoice = playVoice;

// ══ USER PROFILE POPUP ════════════════════════════
function showUserProfile(name, age, location, initial, bg, role, photoURL, uid) {
    const avEl = document.getElementById('ppAv');
    avEl.style.background = bg;
    if (photoURL) {
        avEl.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`;
    } else {
        avEl.textContent = initial;
    }
    document.getElementById('ppName').textContent = name;
    document.getElementById('ppMeta').textContent = [age, location].filter(Boolean).join(' · ');
    const badgeEl = document.getElementById('ppRoleBadge');
    if (badgeEl) badgeEl.innerHTML = getRoleBadgeHTML(role, true);
    // Store for actions
    if (uid) document.getElementById('profilePopupOverlay').dataset.uid = uid;
    document.getElementById('profilePopupOverlay').classList.add('show');
}
window.showUserProfile = showUserProfile;

function closeProfilePopup() { document.getElementById('profilePopupOverlay').classList.remove('show'); }
window.closeProfilePopup = closeProfilePopup;

function followUser() { closeProfilePopup(); showToast('✅ Following!'); }
window.followUser = followUser;

function viewProfile() { closeProfilePopup(); window.location.href = 'user-view.html'; }
window.viewProfile = viewProfile;

// ══ MEMBERS FILTER ════════════════════════════════
function filterMembers(q) {
    document.querySelectorAll('.member-row').forEach(r => {
        const name = r.querySelector('.member-name')?.textContent || '';
        r.style.display = name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
}
window.filterMembers = filterMembers;

// ══ TABS ══════════════════════════════════════════
function switchTab(t) {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    document.getElementById('tab-' + t).classList.add('active');
    document.getElementById('content-' + t).classList.add('active');
    closeStickerTray();
}
window.switchTab = switchTab;

// ══ INPUT ════════════════════════════════════════
function onInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    const has = el.value.trim().length > 0;
    document.getElementById('sendBtn').style.display  = has ? 'flex' : 'none';
    document.getElementById('voiceBtn').style.display = has ? 'none' : 'flex';
}
window.onInput = onInput;

// ══ MISC ══════════════════════════════════════════
function scrollBottom() {
    const a = document.getElementById('messagesArea');
    if (a) setTimeout(() => { a.scrollTop = a.scrollHeight; }, 50);
}

function scrollToPinned() { showToast('📌 Scrolled to pinned message'); }
window.scrollToPinned = scrollToPinned;

function goBack() { window.location.href = 'group.html'; }
window.goBack = goBack;

function buildWaveform(id) {
    const el = document.getElementById(id); if (!el) return;
    [4,8,14,10,18,12,20,16,8,12,16,10,14,8,6,12,18,10,14,8].forEach(h => {
        const b = document.createElement('div'); b.className = 'waveform-bar'; b.style.height = h + 'px'; el.appendChild(b);
    });
}

// ══ LOAD MEMBERS FROM FIREBASE ═══════════════════
async function loadMembers() {
    const list = document.getElementById('membersList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">Loading members...</div>';

    try {
        const [usersSnap, groupRolesSnap, mutedSnap] = await Promise.all([
            get(ref(db, 'users')),
            get(ref(db, `groups/${GROUP_ID}/roles`)),
            get(ref(db, `groups/${GROUP_ID}/muted`)),
        ]);

        if (!usersSnap.exists()) { list.innerHTML = ''; return; }

        const groupRoles = groupRolesSnap.exists() ? groupRolesSnap.val() : {};
        const muted      = mutedSnap.exists() ? mutedSnap.val() : {};
        mutedMembers     = muted; // keep global in sync

        // Buckets: group admin > group mod > member (within this group)
        const buckets = { group_admin: [], group_mod: [], member: [] };
        let onlineCount = 0;

        usersSnap.forEach(child => {
            const u = child.val();
            if (!u?.groups?.[GROUP_ID]) return;
            if (u.isOnline) onlineCount++;

            // App owner has all powers everywhere
            let bucket = 'member';
            if (child.key === OWNER_UID) {
                bucket = 'group_admin';
            } else {
                const gr = groupRoles[child.key];
                if (gr === 'admin') bucket = 'group_admin';
                else if (gr === 'mod') bucket = 'group_mod';
                else bucket = 'member';
            }

            const isMuted = muted[child.key] && muted[child.key].until > Date.now();
            buckets[bucket]?.push({ uid: child.key, ...u, groupRole: bucket === 'group_admin' ? 'admin' : (bucket === 'group_mod' ? 'mod' : 'member'), isMuted });
        });

        const oc = document.getElementById('onlineCount');
        if (oc) oc.textContent = onlineCount;

        list.innerHTML = '';

        const sectionDefs = [
            { key: 'group_admin', label: '👑 Group Admin' },
            { key: 'group_mod',   label: '🛡️ Moderators' },
            { key: 'member',      label: '👤 Members' },
        ];

        sectionDefs.forEach(({ key, label }) => {
            if (!buckets[key].length) return;

            const sectionLabel = document.createElement('div');
            sectionLabel.className = 'members-section-label';
            sectionLabel.style.marginTop = key !== 'group_admin' ? '14px' : '';
            sectionLabel.textContent = label;
            list.appendChild(sectionLabel);

            buckets[key].forEach(u => {
                const initial    = (u.username || '?')[0].toUpperCase();
                const roleClass  = { admin:'role-owner', mod:'role-mod', member:'' }[u.groupRole] || '';
                const roleBadge  = u.groupRole !== 'member'
                    ? `<span class="member-role ${roleClass}">${getGroupRoleBadgeHTML(u.groupRole)}</span>` : '';
                // App-level badge
                const appBadge   = u.role && u.role !== 'member'
                    ? `<span class="member-role role-admin" style="margin-left:4px;font-size:9px;">${u.role === 'owner' ? '👑 App Owner' : u.role === 'admin' ? '⚙️ App Admin' : '🛡️ App Mod'}</span>` : '';
                const onlineDot  = u.isOnline ? '<div class="member-online-dot"></div>' : '';
                const mutedBadge = u.isMuted  ? '<span style="font-size:9px;color:#ff3e1d;margin-left:4px;">🔇</span>' : '';
                const isOwnerRow = u.uid === OWNER_UID;

                const row = document.createElement('div');
                row.className = 'member-row';
                row.innerHTML = `
                    <div class="member-av" style="background:${isOwnerRow ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : '#1a1030'};color:#fff;">
                        ${u.photoURL ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : initial}
                        ${onlineDot}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${esc(u.username || 'User')} ${roleBadge}${appBadge}${mutedBadge}</div>
                        <div class="member-sub">${esc(u.khaw || '')}${u.age ? ' · ' + u.age : ''}${u.isMuted ? ' · Muted' : ''}</div>
                    </div>
                    <div class="member-more" id="more-${u.uid}">⋯</div>
                `;
                row.querySelector('.member-av').onclick = () =>
                    showUserProfile(u.username, u.age, u.khaw, initial, '#1a1030', u.groupRole, u.photoURL || '', u.uid);
                row.querySelector(`#more-${u.uid}`).onclick = (e) => {
                    e.stopPropagation();
                    if (u.uid !== OWNER_UID || currentUser?.uid === OWNER_UID) {
                        openMemberOptions(e, u.username, u.groupRole, u.uid);
                    }
                };
                list.appendChild(row);
            });
        });

        if (list.children.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">No members yet</div>';
        }
    } catch(e) {
        console.error('loadMembers error:', e);
        list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;">Failed to load members</div>';
    }
}
window.loadMembers = loadMembers;

// ══ POSTS ═════════════════════════════════════════
function listenPosts() {
    const postsRef = query(ref(db, `posts/${GROUP_ID}`), orderByChild('timestamp'), limitToLast(30));
    onValue(postsRef, (snap) => {
        const area = document.getElementById('postsArea');
        if (!area) return;
        area.querySelectorAll('.post-card').forEach(c => c.remove());
        if (!snap.exists()) return;
        const posts = [];
        snap.forEach(child => posts.push({ key: child.key, ...child.val() }));
        posts.reverse();
        posts.forEach(post => { const card = buildPostCard(post); area.appendChild(card); });
    });
}

function buildPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = 'post-' + post.key;

    const initial    = (post.senderName || '?')[0].toUpperCase();
    const roleBadge  = getGroupRoleBadgeHTML(post.senderGroupRole || post.senderRole || 'member');
    const timeStr    = post.timestamp ? timeAgo(post.timestamp) : '';
    const badgeMap   = {
        post:'',
        poll:'<span class="post-badge badge-poll">📊 POLL</span>',
        event:'<span class="post-badge badge-event">📅 EVENT</span>',
        announce:'<span class="post-badge badge-announce">📢 ANNOUNCE</span>'
    };
    const typeBadge  = badgeMap[post.type] || '';

    let bodyHTML = `<div class="post-text">${esc(post.text || '')}</div>`;

    if (post.type === 'poll' && post.options) {
        const total = Object.values(post.votes || {}).length || 1;
        bodyHTML += post.options.map((opt, i) => {
            const votes = Object.values(post.votes || {}).filter(v => v === i).length;
            const pct   = Math.round((votes / total) * 100);
            return `<div class="poll-option" onclick="votePoll(this)">
                <div class="poll-bar" style="width:${pct}%"></div>
                <div class="poll-label"><span>${esc(opt)}</span><span class="poll-pct">${pct}%</span></div>
            </div>`;
        }).join('');
    }

    if (post.type === 'event' && post.eventTitle) {
        const [month, day] = post.eventDate ? post.eventDate.split(' ') : ['',''];
        bodyHTML += `<div class="event-card">
            <div class="event-date-box"><div class="event-month">${esc(month)}</div><div class="event-day">${esc(day)}</div></div>
            <div class="event-info"><div class="event-title">${esc(post.eventTitle)}</div><div class="event-sub">📍 ${esc(post.eventLoc || '')}</div></div>
            <div class="event-join" onclick="joinEvent(this)">Join</div>
        </div>`;
    }

    const avatarStyle = post.senderUid === OWNER_UID
        ? 'background:linear-gradient(135deg,var(--accent),var(--accent2));'
        : 'background:#1a1030;color:#a78bfa;';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-av" style="${avatarStyle}">
                ${post.photoURL ? `<img src="${post.photoURL}" style="width:100%;height:100%;object-fit:cover;">` : initial}
            </div>
            <div class="post-meta">
                <div class="post-author">${esc(post.senderName || 'User')} ${roleBadge}</div>
                <div class="post-time">${timeStr}</div>
            </div>
            ${typeBadge}
        </div>
        <div class="post-body">${bodyHTML}</div>
        <div class="post-actions">
            <div class="post-action" onclick="likePost(this)">❤️ Like <span>${post.likes || 0}</span></div>
            <div class="post-action" onclick="showToast('💬 Comments coming soon!')">💬 Comment</div>
            <div class="post-action" onclick="showToast('🔗 Link copied!')">🔗 Share</div>
        </div>
    `;
    return card;
}

// ══ ROLE HELPERS ══════════════════════════════════
// App-level checks
function isAppOwner()  { return currentAppRole === 'owner'; }
function isAppAdmin()  { return ['owner','admin'].includes(currentAppRole); }
function isAppStaff()  { return ['owner','admin','mod'].includes(currentAppRole); }

// Group-level checks (within THIS group)
function isGroupAdminLocal()  { return isGroupAdmin || currentGroupRole === 'admin'; }
function isGroupModLocal()    { return ['admin','mod'].includes(currentGroupRole); }

// Combined: can MANAGE group (change settings, name, kick, delete, toggle modes, add admin/mod)
// = group admin of THIS group OR app staff (app owner/admin/mod bypass all individual group rules)
function canManageGroup() { return isGroupAdminLocal() || isAppStaff(); }

// Combined: can MODERATE group (mute, pin, delete others' messages)
// = group mod+ of THIS group OR app staff
function canModerateGroup() { return isGroupModLocal() || isAppStaff(); }

// Can send a message in this group (considering read mode)
// In read mode: only group admin, group mod, and app staff can send
function canSendMessage() {
    if (!isReadMode) return true;
    return isGroupModLocal() || isAppStaff();
}

// Get the display role for badge in messages
// App staff get their app role; group admin/mod get their group role
function getEffectiveDisplayRole() {
    if (isAppOwner()) return 'owner';
    if (isGroupAdminLocal()) return 'admin'; // group admin badge
    if (isGroupModLocal()) return 'mod';     // group mod badge
    return 'member';
}

function getGroupRole(uid) {
    return new Promise(async (resolve) => {
        try {
            const snap = await get(ref(db, `groups/${GROUP_ID}/roles/${uid}`));
            resolve(snap.exists() ? snap.val() : 'member');
        } catch { resolve('member'); }
    });
}

async function setGroupRole(uid, role) {
    await Promise.all([
        set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), role),
        set(ref(db, `users/${uid}/groupRoles/${GROUP_ID}`), role),
    ]);
}

function roleColor(role) {
    const map = { owner:'#ffd700', admin:'#ff3e1d', mod:'#a78bfa', member:'#a78bfa' };
    return map[role] || '#a78bfa';
}

function getRoleBadgeHTML(role, large = false) {
    const size = large ? 'font-size:11px;padding:4px 10px;' : '';
    if (role === 'owner') return `<span class="sender-role-badge owner" style="${size}">👑 Owner</span>`;
    if (role === 'admin') return `<span class="sender-role-badge admin" style="${size}">⚙️ Admin</span>`;
    if (role === 'mod')   return `<span class="sender-role-badge mod"   style="${size}">🛡️ Mod</span>`;
    return '';
}

function getGroupRoleBadgeHTML(role) {
    if (role === 'admin') return `<span class="sender-role-badge admin">👑 Admin</span>`;
    if (role === 'mod')   return `<span class="sender-role-badge mod">🛡️ Mod</span>`;
    return '';
}

// ══ FIND USER BY USERNAME ════════════════════════
async function findUidByUsername(username) {
    try {
        const snap = await get(ref(db, 'users'));
        if (!snap.exists()) return null;
        let found = null;
        snap.forEach(child => {
            if ((child.val()?.username || '').toLowerCase() === username.toLowerCase()) {
                found = child.key;
            }
        });
        return found;
    } catch(e) { return null; }
}

// ══ TOAST ════════════════════════════════════════
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
window.showToast = showToast;

// ══ HELPERS ══════════════════════════════════════
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function timeAgo(timestamp) {
    const diff  = Date.now() - timestamp;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Now';
    if (mins < 60)  return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    return `${days}d`;
}

// ══ SCROLL TO BOTTOM ON LOAD ══════════════════════
window.addEventListener('load', () => scrollBottom());
