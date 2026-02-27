import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
    getDatabase, ref, get, set, push, onValue, remove, update, query, orderByChild, limitToLast
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

// Set header immediately
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
let currentUser       = null;
let currentUserData   = null;
let currentUserRole   = 'member';  // app-level: owner | admin | mod | member
let currentGroupRole  = null;      // group-level: group_admin | group_mod | null
let isReadMode        = false;
let isPrivate         = false;
let notifOn           = true;
let replyingTo        = null;
let currentMsgTarget  = null;
let currentMsgType    = null;
let currentMsgKey     = null;
let activeTrayTab     = 'emoji';
let activeEmojiCat    = 'recent';
let longPressTimer    = null;
let postType          = 'post';
let selectedRoleOpt   = 'group_mod';
let selectedAdminOpt  = 'promote';
let selectedBanDur    = '1h';
let selectedMuteDur   = '1h';
let currentMemberTarget = null; // { name, role, uid }
let isRecording       = false;
let toastTimer        = null;

// ══ INIT ═════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;

    // Load user data + app role
    const snap = await get(ref(db, `users/${user.uid}`));
    if (snap.exists()) {
        currentUserData = snap.val();
        if (user.uid === OWNER_UID) {
            currentUserRole = 'owner';
            await set(ref(db, `users/${user.uid}/role`), 'owner');
        } else {
            currentUserRole = currentUserData.role || 'member';
        }
    }

    // ✅ Load group-level role
    if (GROUP_ID !== 'official_global') {
        const groleSnap = await get(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`));
        if (groleSnap.exists()) currentGroupRole = groleSnap.val();
    }

    // Block kicked/left members
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

    // ✅ Check if user is muted
    await checkMuteStatus();

    // Auto join group
    const memberRef = ref(db, `users/${user.uid}/groups/${GROUP_ID}`);
    const memberSnap = await get(memberRef);
    if (!memberSnap.exists()) await set(memberRef, true);

    // Mark as read
    await set(ref(db, `users/${user.uid}/lastRead/${GROUP_ID}`), Date.now());

    loadGroupMeta();
    listenMessages();
    buildWaveform('wv1');
    initSwipeToReply();
    loadMembers();
    listenPosts();
    updateSettingsUI();

    setTimeout(() => {
        const ti = document.getElementById('typingIndicator');
        if (ti) { ti.classList.add('show'); setTimeout(() => ti.classList.remove('show'), 3000); }
    }, 2000);
});

// ══ CHECK MUTE STATUS ════════════════════════════
let isMuted = false;
let muteByAdmin = false;
async function checkMuteStatus() {
    if (!currentUser || GROUP_ID === 'official_global') return;
    const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
    if (muteSnap.exists()) {
        const muteData = muteSnap.val();
        if (muteData.until > Date.now()) {
            isMuted = true;
            muteByAdmin = muteData.byRole === 'group_admin' || ['owner','admin'].includes(muteData.byRole);
            showMutedBanner(muteData.until);
        } else {
            // Mute expired — clean it up
            await remove(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
        }
    }
}

function showMutedBanner(until) {
    const inputArea = document.getElementById('inputArea');
    if (!inputArea) return;
    const remaining = Math.ceil((until - Date.now()) / 60000);
    inputArea.innerHTML = `<div style="padding:14px 16px;text-align:center;color:#ff7a00;font-size:13px;font-weight:700;">
        🔇 You are muted for ${remaining} more minute${remaining !== 1 ? 's' : ''}
    </div>`;
}

// ══ UPDATE SETTINGS UI BASED ON ROLE ═════════════
function updateSettingsUI() {
    const isAdmin  = canManageGroup();
    const isMod    = canModerateGroup();
    const isAppStaff = canModerate(); // app owner/admin/mod

    // Show/hide settings options
    const el = (id) => document.getElementById(id);
    if (el('readModeRow'))    el('readModeRow').style.display    = isAdmin ? '' : 'none';
    if (el('privateRow'))     el('privateRow').style.display     = isAdmin ? '' : 'none';
    if (el('editGroupRow'))   el('editGroupRow').style.display   = isAdmin ? '' : 'none';
    if (el('assignRoleRow'))  el('assignRoleRow').style.display  = isAdmin ? '' : 'none';
    if (el('addMemberRow'))   el('addMemberRow').style.display   = (isAdmin || (isMod && isPrivate)) ? '' : 'none';
    if (el('deleteGroupRow')) el('deleteGroupRow').style.display = isAdmin ? '' : 'none';
    if (el('disbandRow'))     el('disbandRow').style.display     = (isAppStaff && GROUP_ID !== 'official_global') ? '' : 'none';
    if (el('clearChatRow'))   el('clearChatRow').style.display   = isAdmin ? '' : 'none';
    if (el('leaveGroupBtn'))  el('leaveGroupBtn').style.display  = GROUP_ID === 'official_global' ? 'none' : '';
    if (el('leaveGroupDivider')) el('leaveGroupDivider').style.display = GROUP_ID === 'official_global' ? 'none' : '';
}

// ══ LOAD GROUP META ══════════════════════════════
async function loadGroupMeta() {
    try {
        const usersSnap = await get(ref(db, 'users'));
        let count = 0;
        if (usersSnap.exists()) {
            usersSnap.forEach(u => { if (u.val()?.groups?.[GROUP_ID]) count++; });
        }
        const mcEl = document.getElementById('memberCount');
        if (mcEl) mcEl.textContent = count;

        const pinnedSnap = await get(ref(db, `groups/${GROUP_ID}/pinned`));
        if (pinnedSnap.exists()) {
            const pt = document.getElementById('pinnedText');
            if (pt) pt.textContent = pinnedSnap.val();
        }

        if (GROUP_ID === 'official_global') {
            setHeader('Zo-Tinder Official', '🔥', '#1a0a0a', true);
            prefillEditModal('Zo-Tinder Official', 'The official Zo-Tinder community 🔥');
        } else {
            const metaSnap = await get(ref(db, `groups/${GROUP_ID}`));
            if (metaSnap.exists()) {
                const meta = metaSnap.val();
                const name   = meta.name   || GROUP_NAME_FROM_URL || 'Group Chat';
                const avatar = meta.avatarURL || meta.emoji || '💬';
                const bg     = meta.avatarBg  || '#1a1a1a';
                setHeader(name, avatar, bg, false);
                prefillEditModal(name, meta.description || '');
                if (meta.readMode) {
                    isReadMode = true;
                    document.getElementById('readModeToggle')?.classList.add('on');
                    document.getElementById('readModeBanner')?.classList.add('show');
                    if (!canSendInReadMode()) document.getElementById('inputArea').style.display = 'none';
                }
                if (meta.isPrivate) {
                    isPrivate = true;
                    document.getElementById('privateToggle')?.classList.add('on');
                }
            }
        }

        updateSettingsUI();
    } catch(e) { console.error('loadGroupMeta error:', e); }
}

function setHeader(name, avatarOrEmoji, bg, isOfficial) {
    const nameEl = document.getElementById('groupName');
    if (nameEl) nameEl.childNodes[0].textContent = name + ' ';
    document.getElementById('officialBadge')?.style && (document.getElementById('officialBadge').style.display = isOfficial ? '' : 'none');
    document.getElementById('officialLabel')?.style && (document.getElementById('officialLabel').style.display = isOfficial ? '' : 'none');
    const avEl = document.getElementById('groupAv');
    if (avEl) {
        if (bg) avEl.style.background = bg;
        if (avatarOrEmoji?.startsWith('http')) {
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
        if (!area.dataset.loaded) {
            area.innerHTML = `<div class="date-divider"><span>Today</span></div>`;
            area.dataset.loaded = '1';
        }
        snap.forEach(child => {
            if (document.getElementById('msg-' + child.key)) return;
            renderMessage(child.key, child.val(), area);
        });
        scrollBottom();
    });
}

// ══ RENDER A SINGLE MESSAGE ═══════════════════════
function renderMessage(key, msg, container) {
    const isOwn = msg.uid === currentUser?.uid;
    const role  = msg.senderRole || 'member';

    const row = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'own' : 'other'}`;
    row.id = 'msg-' + key;
    row.dataset.sender = msg.senderName || '';
    row.dataset.msg    = msg.text || '';
    row.dataset.key    = key;
    row.dataset.uid    = msg.uid || '';

    const roleBadgeHTML = getRoleBadgeHTML(role);
    let replyHTML = '';
    if (msg.replyTo) {
        replyHTML = `<div class="reply-preview"><strong>${esc(msg.replyTo.name)}</strong>${esc(msg.replyTo.text)}</div>`;
    }

    const initial = (msg.senderName || '?')[0].toUpperCase();
    const avatarHTML = isOwn ? '' : `
        <div class="msg-av" style="background:${msg.avatarBg || '#1a1030'};color:${msg.avatarColor || '#a78bfa'};"
             onclick="window.showUserProfile('${esc(msg.senderName)}','','','${initial}','${msg.avatarBg || '#1a1030'}','${role}','${msg.photoURL || ''}')">
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

    // ✅ Mute check
    if (isMuted) { showToast('🔇 You are muted and cannot send messages'); return; }

    // ✅ Read mode bypass: app staff always bypass, group admin bypasses, regular members cannot
    if (isReadMode && !canSendInReadMode()) { showToast('📢 Only admins can send messages'); return; }

    const role = currentUserRole;
    const msgData = {
        uid:         currentUser.uid,
        senderName:  currentUserData?.username || 'User',
        senderRole:  role,
        avatarBg:    '#1a1030',
        avatarColor: roleColor(role),
        photoURL:    currentUserData?.photoURL || '',
        text, type: 'text',
        timestamp:   Date.now(),
    };

    if (replyingTo) msgData.replyTo = { name: replyingTo.name, text: replyingTo.text };

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
    if (isMuted) { showToast('🔇 You are muted'); return; }
    closeStickerTray();
    const msgData = {
        uid: currentUser.uid, senderName: currentUserData?.username || 'User',
        senderRole: currentUserRole, text: em, type: 'sticker', timestamp: Date.now(),
        avatarBg: '#1a1030', avatarColor: roleColor(currentUserRole), photoURL: currentUserData?.photoURL || '',
    };
    try { await push(ref(db, `messages/${GROUP_ID}`), msgData); } catch(e) {}
}
window.sendSticker = sendSticker;

// ══ SEND IMAGE (Cloudinary) ═══════════════════════
async function uploadAndSendMedia(file) {
    if (isMuted) { showToast('🔇 You are muted'); return; }
    showToast('📤 Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    try {
        const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.secure_url) { showToast('❌ Upload failed'); return; }
        const msgData = {
            uid: currentUser.uid, senderName: currentUserData?.username || 'User',
            senderRole: currentUserRole, text: '', type: 'image', mediaURL: data.secure_url,
            timestamp: Date.now(), avatarBg: '#1a1030', avatarColor: roleColor(currentUserRole),
            photoURL: currentUserData?.photoURL || '',
        };
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        showToast('✅ Image sent!');
    } catch(e) { showToast('❌ Upload error'); }
}

// ══ SWIPE TO REPLY ════════════════════════════════
function initSwipeToReply() { document.querySelectorAll('.msg-row').forEach(row => attachSwipe(row)); }

function attachSwipe(row) {
    const inner = row.querySelector('.msg-inner');
    const icon  = row.querySelector('.swipe-reply-icon');
    if (!inner || !icon) return;
    let startX = 0, startY = 0, swiping = false, triggered = false;
    const isOwn = row.classList.contains('own');
    const threshold = 60;

    row.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        swiping = triggered = false; inner.style.transition = 'none';
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
            triggered = true; icon.classList.add('visible');
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

function closeReply() { replyingTo = null; document.getElementById('replyBar').classList.remove('show'); }
window.closeReply = closeReply;

// ══ MESSAGE MENU ══════════════════════════════════
function openMsgMenu(e, el, type, key) {
    if (e) e.preventDefault();
    clearTimeout(longPressTimer);
    currentMsgTarget = el; currentMsgType = type; currentMsgKey = key || null;

    const canDelete = type === 'own' || canModerateGroup();
    const canPin    = canModerateGroup();
    const targetRow = el.closest('.msg-row');
    const targetUid = targetRow?.dataset.uid || '';
    const canKick   = type === 'other' && canModerateGroup() && targetUid !== OWNER_UID;

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
    }
    if (action === 'pin') {
        if (!canModerateGroup()) { showToast('⛔ No permission'); return; }
        const text = (currentMsgTarget?.innerText?.trim() || '').substring(0, 80);
        document.getElementById('pinnedText').textContent = text;
        await set(ref(db, `groups/${GROUP_ID}/pinned`), text);
        showToast('📌 Message pinned!');
    }
    if (action === 'delete') {
        currentMsgTarget?.closest('.msg-row')?.remove();
        if (currentMsgKey) {
            try { await remove(ref(db, `messages/${GROUP_ID}/${currentMsgKey}`)); } catch(e) {}
        }
        showToast('🗑️ Deleted');
    }
    if (action === 'kick') {
        const row = currentMsgTarget?.closest('.msg-row');
        const uid = row?.dataset.uid;
        const name = row?.dataset.sender || 'User';
        if (!uid) return;
        if (uid === OWNER_UID) { showToast('⛔ Cannot kick app owner'); return; }
        try {
            await Promise.all([
                set(ref(db, `groups/${GROUP_ID}/kicked/${uid}`), { by: currentUser.uid, at: Date.now() }),
                remove(ref(db, `users/${uid}/groups/${GROUP_ID}`)),
                remove(ref(db, `groups/${GROUP_ID}/members/${uid}`)),
                remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`)),
            ]);
            showToast(`🚫 ${name} removed from group`);
            loadMembers();
        } catch(e) { showToast('❌ Failed to kick'); }
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
    updateSettingsUI();
    document.getElementById('settingsOverlay').classList.add('show');
}
window.openSettings = openSettings;
function closeSettings() { document.getElementById('settingsOverlay').classList.remove('show'); }
window.closeSettings = closeSettings;

async function toggleReadMode() {
    if (!canManageGroup()) { showToast('⛔ Group admins only'); return; }
    isReadMode = !isReadMode;
    document.getElementById('readModeToggle').classList.toggle('on', isReadMode);
    document.getElementById('readModeBanner').classList.toggle('show', isReadMode);
    document.getElementById('inputArea').style.display = (isReadMode && !canSendInReadMode()) ? 'none' : '';
    await update(ref(db, `groups/${GROUP_ID}`), { readMode: isReadMode });
    showToast(isReadMode ? '📢 Announcement mode ON' : '💬 Chat mode ON');
}
window.toggleReadMode = toggleReadMode;

async function togglePrivate() {
    if (!canManageGroup()) { showToast('⛔ Group admins only'); return; }
    isPrivate = !isPrivate;
    document.getElementById('privateToggle').classList.toggle('on', isPrivate);
    await update(ref(db, `groups/${GROUP_ID}`), { isPrivate });
    showToast(isPrivate ? '🔒 Group is now private' : '🌐 Group is now public');
    updateSettingsUI();
}
window.togglePrivate = togglePrivate;

function toggleNotif() {
    notifOn = !notifOn;
    document.getElementById('notifToggle').classList.toggle('on', notifOn);
    showToast(notifOn ? '🔔 Notifications ON' : '🔕 Notifications OFF');
}
window.toggleNotif = toggleNotif;

function editGroupInfo() { closeSettings(); document.getElementById('editGroupOverlay').classList.add('show'); }
window.editGroupInfo = editGroupInfo;
function closeEditGroup(e) {
    if (!e || e.target.id === 'editGroupOverlay') document.getElementById('editGroupOverlay').classList.remove('show');
}
window.closeEditGroup = closeEditGroup;

async function saveGroupEdit() {
    if (!canManageGroup()) { showToast('⛔ No permission'); return; }
    const name = document.getElementById('editGroupName').value.trim();
    const desc = document.getElementById('editGroupDesc').value.trim();
    if (!name) { showToast('⚠️ Name cannot be empty'); return; }
    setHeader(name, null, null, GROUP_ID === 'official_global');
    await update(ref(db, `groups/${GROUP_ID}`), { name, description: desc });
    closeEditGroup();
    showToast('✅ Group updated!');
}
window.saveGroupEdit = saveGroupEdit;

async function changeGroupAvatar() {
    if (!canManageGroup()) { showToast('⛔ No permission'); return; }
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

// ══ CLEAR CHAT ════════════════════════════════════
async function clearChat() {
    if (!canManageGroup()) { showToast('⛔ No permission'); return; }
    closeSettings();
    const confirmed = confirm('Clear all messages? This cannot be undone.');
    if (!confirmed) return;
    try {
        await remove(ref(db, `messages/${GROUP_ID}`));
        document.getElementById('messagesArea').innerHTML = '<div class="date-divider"><span>Today</span></div>';
        showToast('🗑️ Chat cleared');
    } catch(e) { showToast('❌ Failed to clear chat'); }
}
window.clearChat = clearChat;

// ══ ✅ DELETE GROUP (group admin only) ════════════
async function deleteGroup() {
    if (!canManageGroup()) { showToast('⛔ No permission'); return; }
    if (GROUP_ID === 'official_global') { showToast('⛔ Cannot delete official group'); return; }
    closeSettings();
    const confirmed = confirm('Delete this group permanently? This cannot be undone.');
    if (!confirmed) return;
    try {
        showToast('🗑️ Deleting group...');
        // Remove from all members' group lists
        const usersSnap = await get(ref(db, 'users'));
        const ops = [];
        if (usersSnap.exists()) {
            usersSnap.forEach(child => {
                if (child.val()?.groups?.[GROUP_ID]) {
                    ops.push(remove(ref(db, `users/${child.key}/groups/${GROUP_ID}`)));
                }
            });
        }
        ops.push(remove(ref(db, `groups/${GROUP_ID}`)));
        ops.push(remove(ref(db, `messages/${GROUP_ID}`)));
        ops.push(remove(ref(db, `posts/${GROUP_ID}`)));
        await Promise.all(ops);
        showToast('✅ Group deleted');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { console.error(e); showToast('❌ Failed to delete group'); }
}
window.deleteGroup = deleteGroup;

// ══ ✅ DISBAND GROUP (app staff) ══════════════════
async function disbandGroup() {
    if (!canModerate()) { showToast('⛔ App staff only'); return; }
    if (GROUP_ID === 'official_global') { showToast('⛔ Cannot disband official group'); return; }
    closeSettings();
    const confirmed = confirm('Disband this group? All members will be removed and it cannot be undone.');
    if (!confirmed) return;
    try {
        showToast('🔥 Disbanding group...');
        const usersSnap = await get(ref(db, 'users'));
        const ops = [];
        if (usersSnap.exists()) {
            usersSnap.forEach(child => {
                if (child.val()?.groups?.[GROUP_ID]) {
                    ops.push(remove(ref(db, `users/${child.key}/groups/${GROUP_ID}`)));
                }
            });
        }
        ops.push(remove(ref(db, `groups/${GROUP_ID}`)));
        ops.push(remove(ref(db, `messages/${GROUP_ID}`)));
        ops.push(remove(ref(db, `posts/${GROUP_ID}`)));
        await Promise.all(ops);
        showToast('✅ Group disbanded');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed to disband group'); }
}
window.disbandGroup = disbandGroup;

// ══ LEAVE GROUP ══════════════════════════════════
async function leaveGroup() {
    if (GROUP_ID === 'official_global') { showToast('⛔ You cannot leave the official group'); return; }
    closeSettings();
    const confirmed = confirm('Leave this group? You will not be able to rejoin.');
    if (!confirmed) return;
    try {
        await Promise.all([
            set(ref(db, `groups/${GROUP_ID}/left/${currentUser.uid}`), { at: Date.now() }),
            remove(ref(db, `users/${currentUser.uid}/groups/${GROUP_ID}`)),
            remove(ref(db, `groups/${GROUP_ID}/members/${currentUser.uid}`)),
            remove(ref(db, `groups/${GROUP_ID}/roles/${currentUser.uid}`)),
        ]);
        showToast('🚪 You left the group');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed to leave group'); }
}
window.leaveGroup = leaveGroup;

// ══ ✅ ASSIGN GROUP ROLE (group mod) ══════════════
function openAssignRole() {
    closeSettings();
    document.getElementById('assignRoleOverlay').classList.add('show');
}
window.openAssignRole = openAssignRole;
function closeAssignRole(e) {
    if (!e || e.target.id === 'assignRoleOverlay') document.getElementById('assignRoleOverlay').classList.remove('show');
}
window.closeAssignRole = closeAssignRole;
function selectRoleOpt(opt) {
    selectedRoleOpt = opt;
    document.getElementById('roleOpt-mod').classList.remove('selected','selected-mod');
    document.getElementById('roleOpt-member').classList.remove('selected','selected-mod');
    document.getElementById(`roleOpt-${opt}`).classList.add(opt === 'mod' ? 'selected-mod' : 'selected');
}
window.selectRoleOpt = selectRoleOpt;

async function confirmAssignRole() {
    if (!canManageGroup()) { showToast('⛔ No permission'); return; }
    const name = document.getElementById('roleTargetName').value.trim();
    if (!name) { showToast('⚠️ Enter a member name'); return; }
    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }
    if (uid === OWNER_UID) { showToast('⛔ Cannot change owner role'); return; }

    // ✅ Write to GROUP-LEVEL roles, not global user role
    if (selectedRoleOpt === 'mod') {
        await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), 'group_mod');
        showToast(`🛡️ ${name} is now a Group Moderator!`);
    } else {
        await remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`));
        showToast(`👤 ${name} role removed`);
    }
    closeAssignRole();
    loadMembers();
}
window.confirmAssignRole = confirmAssignRole;

// ══ ✅ ADD MEMBER ══════════════════════════════════
function openAddMember() {
    closeSettings();
    document.getElementById('addMemberOverlay').classList.add('show');
    document.getElementById('addMemberName').value = '';
}
window.openAddMember = openAddMember;
function closeAddMember(e) {
    if (!e || e.target.id === 'addMemberOverlay') document.getElementById('addMemberOverlay').classList.remove('show');
}
window.closeAddMember = closeAddMember;

async function confirmAddMember() {
    const canAdd = canManageGroup() || (canModerateGroup() && isPrivate);
    if (!canAdd) { showToast('⛔ No permission'); return; }
    const name = document.getElementById('addMemberName').value.trim();
    if (!name) { showToast('⚠️ Enter a username'); return; }
    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }
    try {
        // Remove from kicked/left if they were there
        await Promise.all([
            remove(ref(db, `groups/${GROUP_ID}/kicked/${uid}`)),
            remove(ref(db, `groups/${GROUP_ID}/left/${uid}`)),
            set(ref(db, `users/${uid}/groups/${GROUP_ID}`), true),
            set(ref(db, `groups/${GROUP_ID}/members/${uid}`), true),
        ]);
        // Update member count
        const gSnap = await get(ref(db, `groups/${GROUP_ID}/memberCount`));
        await set(ref(db, `groups/${GROUP_ID}/memberCount`), (gSnap.val() || 0) + 1);
        closeAddMember();
        showToast(`✅ ${name} added to group!`);
        loadMembers();
    } catch(e) { showToast('❌ Failed to add member'); }
}
window.confirmAddMember = confirmAddMember;

// ══ MAKE / REMOVE APP ADMIN (app owner only) ═════
function openPromoteAdmin() { closeSettings(); document.getElementById('promoteAdminOverlay').classList.add('show'); }
window.openPromoteAdmin = openPromoteAdmin;
function closePromoteAdmin(e) {
    if (!e || e.target.id === 'promoteAdminOverlay') document.getElementById('promoteAdminOverlay').classList.remove('show');
}
window.closePromoteAdmin = closePromoteAdmin;
function selectAdminOpt(opt) {
    selectedAdminOpt = opt;
    document.getElementById('adminOpt-promote').classList.remove('selected');
    document.getElementById('adminOpt-demote').classList.remove('selected');
    document.getElementById(`adminOpt-${opt}`).classList.add('selected');
}
window.selectAdminOpt = selectAdminOpt;

async function confirmAdminAction() {
    if (!isOwner()) { showToast('⛔ Owner only'); return; }
    const name = document.getElementById('adminTargetName').value.trim();
    if (!name) { showToast('⚠️ Enter a member name'); return; }
    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }
    const targetSnap = await get(ref(db, `users/${uid}/role`));
    if (targetSnap.val() === 'owner') { showToast('⛔ Cannot change owner role'); return; }
    const newRole = selectedAdminOpt === 'promote' ? 'admin' : 'member';
    await set(ref(db, `users/${uid}/role`), newRole);
    closePromoteAdmin();
    showToast(newRole === 'admin' ? `⚙️ ${name} is now an App Admin!` : `👤 ${name} removed as Admin`);
}
window.confirmAdminAction = confirmAdminAction;

// ══ MEMBER OPTIONS ════════════════════════════════
function openMemberOptions(e, name, role, uid) {
    e.stopPropagation();
    currentMemberTarget = { name, role, uid };
    document.getElementById('memberOptName').textContent = name;

    const isMod_   = role === 'group_mod' || role === 'mod';
    const isAdminR = role === 'group_admin' || role === 'admin';

    // Show/hide admin actions
    const adminSec = document.getElementById('adminActionsSection');
    if (adminSec) adminSec.style.display = canManageGroup() ? '' : 'none';

    document.getElementById('optMakeAdmin').style.display   = (!isAdminR && isOwner()) ? '' : 'none';
    document.getElementById('optRemoveAdmin').style.display = (isAdminR && isOwner())  ? '' : 'none';
    document.getElementById('optAssignMod').style.display   = (!isMod_ && canManageGroup()) ? '' : 'none';
    document.getElementById('optRemoveMod').style.display   = (isMod_ && canManageGroup())  ? '' : 'none';

    // Moderation section
    const modSec = document.getElementById('modActionsSection');
    if (modSec) modSec.style.display = canModerateGroup() ? '' : 'none';

    document.getElementById('memberOptOverlay').classList.add('show');
}
window.openMemberOptions = openMemberOptions;
function closeMemberOpts() { document.getElementById('memberOptOverlay').classList.remove('show'); }
window.closeMemberOpts = closeMemberOpts;

async function memberAction(action) {
    closeMemberOpts();
    const name = currentMemberTarget?.name || 'User';
    const uid  = currentMemberTarget?.uid  || await findUidByUsername(name);

    if (action === 'profile') { window.location.href = 'user-view.html'; return; }

    if (action === 'makeAdmin') {
        if (!isOwner()) { showToast('⛔ Owner only'); return; }
        if (uid) await set(ref(db, `users/${uid}/role`), 'admin');
        showToast(`⚙️ ${name} is now App Admin!`);
    }
    if (action === 'removeAdmin') {
        if (!isOwner()) { showToast('⛔ Owner only'); return; }
        if (uid) await set(ref(db, `users/${uid}/role`), 'member');
        showToast(`👤 ${name} removed as Admin`);
    }
    if (action === 'assignMod') {
        // ✅ Group-level mod, not global
        if (!canManageGroup()) { showToast('⛔ No permission'); return; }
        if (uid) await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), 'group_mod');
        showToast(`🛡️ ${name} is now a Group Moderator!`);
        loadMembers();
    }
    if (action === 'removeMod') {
        if (!canManageGroup()) { showToast('⛔ No permission'); return; }
        if (uid) await remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`));
        showToast(`👤 ${name} role removed`);
        loadMembers();
    }
    if (action === 'mute') { openMuteModal(name, uid); return; }
    if (action === 'warn') { showToast(`⚠️ Warning sent to ${name}`); }
    if (action === 'kick') {
        if (!canModerateGroup()) { showToast('⛔ No permission'); return; }
        if (!uid) { showToast('❌ User not found'); return; }
        if (uid === OWNER_UID) { showToast('⛔ Cannot kick app owner'); return; }
        // Group mod cannot kick group admin
        const targetRole = currentMemberTarget?.role;
        if ((targetRole === 'group_admin') && !canAdmin()) { showToast('⛔ Cannot kick group admin'); return; }
        try {
            await Promise.all([
                set(ref(db, `groups/${GROUP_ID}/kicked/${uid}`), { by: currentUser.uid, at: Date.now() }),
                remove(ref(db, `users/${uid}/groups/${GROUP_ID}`)),
                remove(ref(db, `groups/${GROUP_ID}/members/${uid}`)),
                remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`)),
            ]);
            showToast(`🚫 ${name} removed from group`);
            loadMembers();
        } catch(e) { showToast('❌ Failed to kick'); }
    }
}
window.memberAction = memberAction;

// ══ ✅ REAL MUTE MODAL ═════════════════════════════
let muteTargetName = '';
let muteTargetUid  = '';

function openMuteModal(name, uid) {
    muteTargetName = name;
    muteTargetUid  = uid;
    document.getElementById('muteTargetName').textContent = name;
    document.querySelectorAll('.mute-dur-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('.mute-dur-btn')?.classList.add('selected');
    selectedMuteDur = '30m';
    document.getElementById('muteOverlay').classList.add('show');
}
window.openMuteModal = openMuteModal;

function closeMuteModal(e) {
    if (!e || e.target.id === 'muteOverlay') document.getElementById('muteOverlay').classList.remove('show');
}
window.closeMuteModal = closeMuteModal;

function selectMuteDur(btn, dur) {
    document.querySelectorAll('.mute-dur-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMuteDur = dur;
}
window.selectMuteDur = selectMuteDur;

async function confirmMute() {
    if (!canModerateGroup()) { showToast('⛔ No permission'); return; }
    if (!muteTargetUid) { showToast('❌ User not found'); return; }

    const durMap = { '30m':1800000, '1h':3600000, '6h':21600000, '1d':86400000, '7d':604800000 };
    const muteUntil = Date.now() + (durMap[selectedMuteDur] || 3600000);

    // Determine byRole — used to restrict mod from lifting admin mutes
    const byRole = currentGroupRole || currentUserRole;

    await set(ref(db, `groups/${GROUP_ID}/muted/${muteTargetUid}`), {
        until: muteUntil,
        by:    currentUser.uid,
        byRole,
    });

    closeMuteModal();
    showToast(`🔇 ${muteTargetName} muted for ${selectedMuteDur}`);
}
window.confirmMute = confirmMute;

async function liftMute(name, uid) {
    if (!canModerateGroup()) { showToast('⛔ No permission'); return; }
    // ✅ Mod cannot lift mute set by group admin or app staff
    const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
    if (muteSnap.exists()) {
        const muteByRole = muteSnap.val().byRole;
        const isHigherMute = muteByRole === 'group_admin' || ['owner','admin'].includes(muteByRole);
        if (isHigherMute && !canAdmin()) {
            showToast('⛔ Cannot lift mute set by group admin');
            return;
        }
    }
    await remove(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
    showToast(`🔊 ${name} unmuted`);
    loadMembers();
}
window.liftMute = liftMute;

// ══ TEMP BAN ══════════════════════════════════════
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
    if (!canModerateGroup()) { showToast('⛔ No permission'); return; }
    const name   = currentMemberTarget?.name || 'User';
    const reason = document.getElementById('banReason').value.trim();
    const uid    = currentMemberTarget?.uid || await findUidByUsername(name);
    const durMap = { '1h':3600000, '6h':21600000, '1d':86400000, '3d':259200000, '7d':604800000 };
    const banUntil = Date.now() + (durMap[selectedBanDur] || 3600000);
    if (uid) {
        await update(ref(db, `users/${uid}`), {
            banned: true, banUntil, banReason: reason || 'Violation of community rules', bannedBy: currentUser.uid,
        });
    }
    closeTempBan();
    showToast(`⏱️ ${name} temp banned for ${selectedBanDur}`);
}
window.confirmTempBan = confirmTempBan;

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
        senderUid: currentUser.uid, senderName: currentUserData?.username || 'User',
        senderRole: currentUserRole, photoURL: currentUserData?.photoURL || '',
        text: c, type: postType, timestamp: Date.now(), likes: 0,
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
    opt.classList.add('voted'); showToast('✅ Vote recorded!');
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
        renderGifs(body);
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
function renderGifs(container) {
    container.innerHTML = '';
    const grid = document.createElement('div'); grid.className = 'gif-grid';
    ['🎬','🌊','🔥','😂','✨','💫','🎉','🌙','❤️','🚀','🌸','🎵'].forEach(p => {
        const item = document.createElement('div'); item.className = 'gif-item'; item.textContent = p;
        item.style.fontSize = '2.5rem';
        item.onclick = () => { sendSticker(p); showToast('🎬 Connect Giphy API for real GIFs!'); };
        grid.appendChild(item);
    });
    container.appendChild(grid);
}
function searchGif() { renderGifs(document.getElementById('trayBody')); }
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
function playVoice() { showToast('🎤 Voice messages coming soon!'); }
window.playVoice = playVoice;

// ══ USER PROFILE POPUP ════════════════════════════
function showUserProfile(name, age, location, initial, bg, role, photoURL) {
    const avEl = document.getElementById('ppAv');
    avEl.style.background = bg;
    if (photoURL) {
        avEl.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`;
    } else { avEl.textContent = initial; }
    document.getElementById('ppName').textContent = name;
    document.getElementById('ppMeta').textContent = [age, location].filter(Boolean).join(' · ');
    const badgeEl = document.getElementById('ppRoleBadge');
    if (badgeEl) badgeEl.innerHTML = getRoleBadgeHTML(role, true);
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

// ══ ✅ ROLE HELPERS ══════════════════════════════
function isOwner()      { return currentUserRole === 'owner'; }
function canAdmin()     { return ['owner','admin'].includes(currentUserRole); }
function canModerate()  { return ['owner','admin','mod'].includes(currentUserRole); } // app staff

// ✅ Group-level checks — app staff bypass all group rules
function canManageGroup()   {
    return canAdmin() || currentGroupRole === 'group_admin';
}
function canModerateGroup() {
    return canModerate() || ['group_admin','group_mod'].includes(currentGroupRole);
}
// ✅ Read mode: app staff + group admin can send even in read mode
function canSendInReadMode() {
    return canModerate() || currentGroupRole === 'group_admin';
}

function roleColor(role) {
    const map = { owner:'#ffd700', admin:'#ff3e1d', mod:'#a78bfa', group_admin:'#ff7a00', group_mod:'#c4b5fd', member:'#a78bfa' };
    return map[role] || '#a78bfa';
}

function getRoleBadgeHTML(role, large = false) {
    const size = large ? 'font-size:11px;padding:4px 10px;' : '';
    if (role === 'owner')       return `<span class="sender-role-badge owner" style="${size}">👑 Owner</span>`;
    if (role === 'admin')       return `<span class="sender-role-badge admin" style="${size}">⚙️ Admin</span>`;
    if (role === 'mod')         return `<span class="sender-role-badge mod" style="${size}">🛡️ Mod</span>`;
    if (role === 'group_admin') return `<span class="sender-role-badge admin" style="${size}">⭐ Group Admin</span>`;
    if (role === 'group_mod')   return `<span class="sender-role-badge mod" style="${size}">🔰 Group Mod</span>`;
    return '';
}

// ══ FIND USER BY USERNAME ════════════════════════
async function findUidByUsername(username) {
    try {
        const snap = await get(ref(db, 'users'));
        if (!snap.exists()) return null;
        let found = null;
        snap.forEach(child => {
            if ((child.val()?.username || '').toLowerCase() === username.toLowerCase()) found = child.key;
        });
        return found;
    } catch(e) { return null; }
}

// ══ LOAD MEMBERS FROM FIREBASE ═══════════════════
async function loadMembers() {
    const list = document.getElementById('membersList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">Loading members...</div>';
    try {
        const [usersSnap, rolesSnap, mutedSnap] = await Promise.all([
            get(ref(db, 'users')),
            GROUP_ID !== 'official_global' ? get(ref(db, `groups/${GROUP_ID}/roles`)) : Promise.resolve(null),
            GROUP_ID !== 'official_global' ? get(ref(db, `groups/${GROUP_ID}/muted`)) : Promise.resolve(null),
        ]);
        if (!usersSnap.exists()) { list.innerHTML = ''; return; }

        const groupRoles = rolesSnap?.val() || {};
        const mutedData  = mutedSnap?.val() || {};

        const buckets = { owner: [], app_staff: [], group_admin: [], group_mod: [], member: [] };
        let onlineCount = 0;

        usersSnap.forEach(child => {
            const u = child.val();
            if (!u?.groups?.[GROUP_ID]) return;
            const appRole   = child.key === OWNER_UID ? 'owner' : (u.role || 'member');
            const groupRole = groupRoles[child.key] || null;
            const isMutedNow = mutedData[child.key] && mutedData[child.key].until > Date.now();
            if (u.isOnline) onlineCount++;

            let bucket = 'member';
            if (appRole === 'owner') bucket = 'owner';
            else if (['admin','mod'].includes(appRole)) bucket = 'app_staff';
            else if (groupRole === 'group_admin') bucket = 'group_admin';
            else if (groupRole === 'group_mod')   bucket = 'group_mod';

            buckets[bucket].push({ uid: child.key, ...u, appRole, groupRole, isMutedNow });
        });

        const oc = document.getElementById('onlineCount');
        if (oc) oc.textContent = onlineCount;

        list.innerHTML = '';

        const sectionDefs = [
            { key: 'owner',       label: '👑 App Owner' },
            { key: 'app_staff',   label: '⚙️ App Staff' },
            { key: 'group_admin', label: '⭐ Group Admin' },
            { key: 'group_mod',   label: '🔰 Group Mods' },
            { key: 'member',      label: '👤 Members' },
        ];

        sectionDefs.forEach(({ key, label }) => {
            if (!buckets[key].length) return;
            const sectionLabel = document.createElement('div');
            sectionLabel.className = 'members-section-label';
            sectionLabel.style.marginTop = key !== 'owner' ? '14px' : '';
            sectionLabel.textContent = label;
            list.appendChild(sectionLabel);

            buckets[key].forEach(u => {
                const initial   = (u.username || '?')[0].toUpperCase();
                const displayRole = u.appRole !== 'member' ? u.appRole : (u.groupRole || 'member');
                const roleClass   = { owner:'role-owner', admin:'role-admin', mod:'role-mod', group_admin:'role-admin', group_mod:'role-mod', member:'' }[displayRole] || '';
                const roleBadge   = displayRole !== 'member'
                    ? `<span class="member-role ${roleClass}">${getRoleBadgeHTML(displayRole)}</span>` : '';
                const onlineDot   = u.isOnline ? '<div class="member-online-dot"></div>' : '';
                const mutedTag    = u.isMutedNow ? ' <span style="font-size:10px;color:#ff7a00;">🔇</span>' : '';
                const isOwnerRow  = u.uid === OWNER_UID;

                const row = document.createElement('div');
                row.className = 'member-row';
                row.innerHTML = `
                    <div class="member-av" style="background:${isOwnerRow ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : '#1a1030'};color:#fff;">
                        ${u.photoURL ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : initial}
                        ${onlineDot}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${esc(u.username || 'User')} ${roleBadge}${mutedTag}</div>
                        <div class="member-sub">${esc(u.khaw || '')}${u.age ? ' · ' + u.age : ''}</div>
                    </div>
                    <div class="member-more" id="more-${u.uid}">⋯</div>
                `;
                row.querySelector('.member-av').onclick = () =>
                    showUserProfile(u.username, u.age, u.khaw, initial, '#1a1030', displayRole, u.photoURL || '');
                row.querySelector(`#more-${u.uid}`).onclick = (e) => {
                    e.stopPropagation();
                    if (u.uid !== currentUser?.uid) {
                        // Pass UID directly
                        currentMemberTarget = { name: u.username, role: displayRole, uid: u.uid, isMuted: u.isMutedNow };
                        openMemberOptionsFromData(e, u);
                    }
                };
                list.appendChild(row);
            });
        });

        if (list.children.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">No members yet</div>';
        }
    } catch(e) { console.error('loadMembers error:', e); list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;">Failed to load members</div>'; }
}
window.loadMembers = loadMembers;

function openMemberOptionsFromData(e, u) {
    e.stopPropagation();
    const displayRole = u.appRole !== 'member' ? u.appRole : (u.groupRole || 'member');
    document.getElementById('memberOptName').textContent = u.username || 'User';

    const isMod_   = ['group_mod','mod'].includes(displayRole);
    const isAdminR = ['group_admin','admin','owner'].includes(displayRole);

    const adminSec = document.getElementById('adminActionsSection');
    if (adminSec) adminSec.style.display = (canManageGroup() || isOwner()) ? '' : 'none';

    document.getElementById('optMakeAdmin').style.display   = (!isAdminR && isOwner()) ? '' : 'none';
    document.getElementById('optRemoveAdmin').style.display = (isAdminR && !['owner'].includes(displayRole) && isOwner()) ? '' : 'none';
    document.getElementById('optAssignMod').style.display   = (!isMod_ && !isAdminR && canManageGroup()) ? '' : 'none';
    document.getElementById('optRemoveMod').style.display   = (isMod_ && canManageGroup()) ? '' : 'none';

    // Show mute or unmute
    const muteEl = document.getElementById('optMuteToggle');
    if (muteEl) {
        if (u.isMutedNow) {
            muteEl.innerHTML = '<span class="opt-icon">🔊</span>Unmute Member';
            muteEl.onclick = () => { closeMemberOpts(); liftMute(u.username, u.uid); };
        } else {
            muteEl.innerHTML = '<span class="opt-icon">🔇</span>Mute Member';
            muteEl.onclick = () => { closeMemberOpts(); openMuteModal(u.username, u.uid); };
        }
    }

    const modSec = document.getElementById('modActionsSection');
    if (modSec) modSec.style.display = canModerateGroup() ? '' : 'none';

    document.getElementById('memberOptOverlay').classList.add('show');
}

// ══ POSTS ════════════════════════════════════════
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
    const initial   = (post.senderName || '?')[0].toUpperCase();
    const roleBadge = getRoleBadgeHTML(post.senderRole || 'member');
    const timeStr   = post.timestamp ? timeAgo(post.timestamp) : '';
    const badgeMap  = { post:'', poll:'<span class="post-badge badge-poll">📊 POLL</span>', event:'<span class="post-badge badge-event">📅 EVENT</span>', announce:'<span class="post-badge badge-announce">📢 ANNOUNCE</span>' };
    const typeBadge = badgeMap[post.type] || '';
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
        const [month, day] = post.eventDate ? post.eventDate.split(' ') : ['', ''];
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

window.addEventListener('load', () => scrollBottom());
