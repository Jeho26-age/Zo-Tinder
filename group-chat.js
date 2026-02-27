import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
    getDatabase, ref, get, set, push, onValue, remove, update, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain: "zo-tinder.firebaseapp.com",
    databaseURL: "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zo-tinder",
    storageBucket: "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId: "1:866061631708:web:f2c70a3989032095803419"
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

const CLOUDINARY_CLOUD  = "duj2rx73z";
const CLOUDINARY_PRESET = "Zo-Tinder";

const _params             = new URLSearchParams(window.location.search);
const GROUP_ID            = _params.get('id')   || 'official_global';
const GROUP_NAME_FROM_URL = decodeURIComponent(_params.get('name') || '');
const OWNER_UID           = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";

// Instant header
(function() {
    const isOff = GROUP_ID === 'official_global';
    const name  = isOff ? 'Zo-Tinder Official' : (GROUP_NAME_FROM_URL || 'Group Chat');
    const nameEl = document.getElementById('groupName');
    if (nameEl) {
        const tn = nameEl.childNodes[0];
        if (tn && tn.nodeType === 3) tn.textContent = name + ' ';
    }
    document.title = name + ' | Zo-Tinder';
})();

const EMOJIS = {
    recent:   ['😂','❤️','🔥','😭','✨','🥺','😍','🙏','💀','😊','🤣','💕','🥰','😅','👀','😩','💯','🙄','😤','🤔'],
    faces:    ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈'],
    hearts:   ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
    hands:    ['👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','💪'],
    nature:   ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🦆','🦅','🦉','🦇','🐺','🦄','🐝','🦋','🐌','🐞','🐜','🐢','🦎','🐍','🐲','🦕','🦈','🐊','🐅','🐆','🦏','🦒','🦓','🦍','🦧','🐘'],
    food:     ['🍕','🍔','🌭','🍟','🌮','🌯','🥙','🥚','🍳','🥘','🍲','🍱','🍣','🍜','🍝','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧃','🥤','🧋'],
    activity: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🥊','🥋','🎿','⛷️','🏂','🏋️','🤸','🏆','🥇','🥈','🥉','🎖️','🎭','🎨','🎬','🎤','🎧','🎮','🎲','🎯'],
};
const ZO_STICKERS = [
    {em:'🔥',l:'Hot'},{em:'❤️‍🔥',l:'Love'},{em:'💀',l:'Dead'},{em:'✨',l:'Vibe'},
    {em:'🫂',l:'Hug'},{em:'🥺',l:'Plead'},{em:'😈',l:'Devil'},{em:'🤙',l:'Chill'},
    {em:'💅',l:'Slay'},{em:'🙈',l:'Shy'},{em:'🫦',l:'Sus'},{em:'🌙',l:'Night'}
];

// ══ STATE ════════════════════════════════════════
let currentUser        = null;
let currentUserData    = null;
let currentUserRole    = 'member';
let currentGroupRole   = 'member';
let isGhostMode        = false;
let isReadMode         = false;
let isPrivate          = false;
let notifOn            = true;
let replyingTo         = null;
let currentMsgTarget   = null;
let currentMsgType     = null;
let currentMsgKey      = null;
let currentMsgSenderUid = null;
let activeTrayTab      = 'emoji';
let activeEmojiCat     = 'recent';
let longPressTimer     = null;
let postType_          = 'post';
let selectedBanDur     = '1h';
let selectedMuteDur    = 60;
let muteTargetUid      = null;
let muteTargetName     = null;
let currentMemberTarget = null;
let toastTimer         = null;
let muteCheckTimer     = null;

// ══ ROLE HELPERS ══════════════════════════════════
function isAppStaff()  { return ['owner','admin','mod'].includes(currentUserRole); }
function isGrpAdmin()  { return currentGroupRole === 'groupAdmin'; }
function isGrpMod()    { return ['groupAdmin','groupMod'].includes(currentGroupRole); }
function canAdmin()    { return isGrpAdmin() || isAppStaff(); }
function canModerate() { return isGrpMod()   || isAppStaff(); }
function canDisband()  { return isAppStaff() || isGrpAdmin(); }
function canSendMessage() { return !isReadMode || canAdmin(); }

function roleColor(role) {
    return { owner:'#ffd700', admin:'#ff3e1d', mod:'#a78bfa', groupAdmin:'#ff7a00', groupMod:'#60a5fa', member:'#a78bfa' }[role] || '#a78bfa';
}
function getRoleBadgeHTML(appRole, gRole, large) {
    const sz = large ? 'font-size:11px;padding:4px 10px;' : '';
    if (appRole === 'owner')       return `<span class="sender-role-badge owner" style="${sz}">👑 Owner</span>`;
    if (appRole === 'admin')       return `<span class="sender-role-badge admin" style="${sz}">⚙️ Admin</span>`;
    if (appRole === 'mod')         return `<span class="sender-role-badge mod" style="${sz}">🛡️ Mod</span>`;
    if (gRole   === 'groupAdmin')  return `<span class="sender-role-badge" style="background:rgba(255,122,0,0.15);color:#ff7a00;${sz}">🏠 G.Admin</span>`;
    if (gRole   === 'groupMod')    return `<span class="sender-role-badge" style="background:rgba(96,165,250,0.15);color:#60a5fa;${sz}">🔰 G.Mod</span>`;
    return '';
}

// ══ AUTH INIT ════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;

    const snap = await get(ref(db, `users/${user.uid}`));
    if (snap.exists()) {
        currentUserData = snap.val();
        currentUserRole = (user.uid === OWNER_UID) ? 'owner' : (currentUserData.role || 'member');
        if (user.uid === OWNER_UID) set(ref(db, `users/${user.uid}/role`), 'owner');
    }

    if (GROUP_ID === 'official_global') {
        currentGroupRole = isAppStaff() ? 'groupAdmin' : 'member';
        await ensureMembership(user.uid);
        finishInit();
        return;
    }

    if (isAppStaff()) {
        // App staff: ghost mode if ?ghost=1 in URL
        const wantsGhost = _params.get('ghost') === '1';
        const alreadyMember = (await get(ref(db, `users/${user.uid}/groups/${GROUP_ID}`))).exists();
        if (wantsGhost && !alreadyMember) {
            isGhostMode = true;
            currentGroupRole = 'groupAdmin';
            showGhostBanner();
        } else {
            await ensureMembership(user.uid);
            currentGroupRole = 'groupAdmin';
            set(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`), 'groupAdmin');
        }
    } else {
        // Regular user — check kicked
        const kickedSnap = await get(ref(db, `groups/${GROUP_ID}/kicked/${user.uid}`));
        if (kickedSnap.exists()) {
            showBlockedScreen('🚫', 'You were removed from this group', 'You can no longer access this group.');
            return;
        }
        // Load or assign group role
        const roleSnap = await get(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`));
        if (roleSnap.exists()) {
            currentGroupRole = roleSnap.val();
        } else {
            const creatorSnap = await get(ref(db, `groups/${GROUP_ID}/createdBy`));
            if (creatorSnap.exists() && creatorSnap.val() === user.uid) {
                currentGroupRole = 'groupAdmin';
                set(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`), 'groupAdmin');
            } else {
                currentGroupRole = 'member';
                set(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`), 'member');
            }
        }
        await ensureMembership(user.uid);
        await checkAndShowMute();
    }

    await loadGroupMeta();
    finishInit();
});

async function ensureMembership(uid) {
    const r = ref(db, `users/${uid}/groups/${GROUP_ID}`);
    if (!(await get(r)).exists()) {
        await set(r, true);
        await set(ref(db, `groups/${GROUP_ID}/members/${uid}`), true);
        const cs = await get(ref(db, `groups/${GROUP_ID}/memberCount`));
        set(ref(db, `groups/${GROUP_ID}/memberCount`), (cs.val() || 0) + 1);
    }
}

async function checkAndShowMute() {
    if (!currentUser || isAppStaff()) return;
    const ms = await get(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
    if (!ms.exists()) return;
    const m = ms.val();
    if (m.until && Date.now() >= m.until) { remove(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`)); return; }
    const left = m.until ? Math.ceil((m.until - Date.now()) / 60000) : 0;
    const ia = document.getElementById('inputArea');
    if (ia) ia.style.display = 'none';
    const notice = document.createElement('div');
    notice.id = 'muteNotice';
    notice.style.cssText = 'text-align:center;padding:16px;color:#555;font-size:13px;font-weight:700;';
    notice.textContent = `🔇 You are muted${left ? ` for ${left} more min` : ''}`;
    document.querySelector('#content-chat')?.appendChild(notice);
    if (m.until) { clearTimeout(muteCheckTimer); muteCheckTimer = setTimeout(() => { remove(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`)); if (ia) ia.style.display = ''; document.getElementById('muteNotice')?.remove(); }, m.until - Date.now() + 500); }
}

function showGhostBanner() {
    const b = document.createElement('div');
    b.id = 'ghostBanner';
    b.style.cssText = 'background:rgba(167,139,250,0.12);border-bottom:1px solid rgba(167,139,250,0.2);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;color:#a78bfa;flex-shrink:0;';
    b.innerHTML = `<span>👻 Ghost Mode — invisible to members</span><button onclick="joinFromGhost()" style="padding:5px 12px;background:rgba(167,139,250,0.2);border:1px solid rgba(167,139,250,0.3);border-radius:8px;color:#a78bfa;font-family:'Nunito',sans-serif;font-size:11px;font-weight:800;cursor:pointer;">Join Visibly</button>`;
    document.querySelector('.tabs')?.insertAdjacentElement('beforebegin', b);
}
window.joinFromGhost = async function() {
    isGhostMode = false;
    await ensureMembership(currentUser.uid);
    set(ref(db, `groups/${GROUP_ID}/roles/${currentUser.uid}`), 'groupAdmin');
    document.getElementById('ghostBanner')?.remove();
    showToast('✅ Joined as Staff');
    loadMembers();
};

function showBlockedScreen(icon, title, sub) {
    document.body.innerHTML = `<div style="height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#080808;color:white;font-family:'Nunito',sans-serif;gap:16px;padding:24px;text-align:center;"><div style="font-size:3rem;">${icon}</div><div style="font-size:1.1rem;font-weight:900;">${title}</div><div style="font-size:13px;color:#555;">${sub}</div><button onclick="window.location.href='group.html'" style="margin-top:8px;padding:12px 28px;background:#ff3e1d;border:none;border-radius:14px;color:white;font-weight:900;font-size:14px;cursor:pointer;">← Go Back</button></div>`;
}

function finishInit() {
    listenMessages();
    buildWaveform('wv1');
    initSwipeToReply();
    loadMembers();
    listenPosts();
    updateSettingsUI();
    setTimeout(() => { const ti = document.getElementById('typingIndicator'); if (ti) { ti.classList.add('show'); setTimeout(() => ti.classList.remove('show'), 3000); } }, 2000);
}

function updateSettingsUI() {
    document.querySelectorAll('.admin-only-setting').forEach(el => el.style.display = canAdmin() ? '' : 'none');
    const db_ = document.getElementById('disbandGroupBtn');
    if (db_) db_.style.display = canDisband() ? '' : 'none';
    const lb  = document.getElementById('leaveGroupBtn');
    const ld  = document.getElementById('leaveGroupDivider');
    const isOff = GROUP_ID === 'official_global';
    if (lb) lb.style.display  = (isOff || isGhostMode) ? 'none' : '';
    if (ld) ld.style.display  = (isOff || isGhostMode) ? 'none' : '';
    const gb = document.getElementById('ghostJoinBtn');
    if (gb) gb.style.display  = (isGhostMode && isAppStaff()) ? '' : 'none';
}

// ══ LOAD GROUP META ═══════════════════════════════
async function loadGroupMeta() {
    try {
        const usersSnap = await get(ref(db, 'users'));
        let count = 0;
        if (usersSnap.exists()) usersSnap.forEach(u => { if (u.val()?.groups?.[GROUP_ID]) count++; });
        const mc = document.getElementById('memberCount');
        if (mc) mc.textContent = count;

        const ps = await get(ref(db, `groups/${GROUP_ID}/pinned`));
        if (ps.exists()) { const pt = document.getElementById('pinnedText'); if (pt) pt.textContent = ps.val(); }

        if (GROUP_ID === 'official_global') { setHeader('Zo-Tinder Official', '🔥', '#1a0a0a', true); return; }

        const ms = await get(ref(db, `groups/${GROUP_ID}`));
        if (ms.exists()) {
            const meta = ms.val();
            setHeader(meta.name || GROUP_NAME_FROM_URL || 'Group Chat', meta.avatarURL || meta.emoji || '💬', meta.avatarBg || '#1a1a1a', false);
            prefillEditModal(meta.name || '', meta.description || '');
            if (meta.readMode)  { isReadMode = true;  document.getElementById('readModeToggle')?.classList.add('on');  document.getElementById('readModeBanner')?.classList.add('show');  if (!canSendMessage()) { const ia = document.getElementById('inputArea'); if (ia) ia.style.display = 'none'; } }
            if (meta.isPrivate) { isPrivate  = true;  document.getElementById('privateToggle')?.classList.add('on'); }
        }
    } catch(e) { console.error(e); }
}

function setHeader(name, av, bg, isOff) {
    if (name != null) {
        const el = document.getElementById('groupName');
        if (el) { const tn = el.childNodes[0]; if (tn && tn.nodeType === 3) tn.textContent = name + ' '; else el.textContent = name + ' '; }
        document.title = name + ' | Zo-Tinder';
    }
    if (isOff != null) {
        const b = document.getElementById('officialBadge'); if (b) b.style.display = isOff ? '' : 'none';
        const l = document.getElementById('officialLabel'); if (l) l.style.display = isOff ? '' : 'none';
    }
    const ae = document.getElementById('groupAv');
    if (ae) {
        if (bg != null) ae.style.background = bg;
        if (av != null) { if (av.startsWith('http')) { ae.innerHTML = `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`; } else { ae.textContent = av; } }
    }
}
function prefillEditModal(name, desc) {
    const n = document.getElementById('editGroupName'); if (n) n.value = name;
    const d = document.getElementById('editGroupDesc');  if (d) d.value = desc;
}

// ══ MESSAGES ══════════════════════════════════════
function listenMessages() {
    const msgsRef = query(ref(db, `messages/${GROUP_ID}`), orderByChild('timestamp'), limitToLast(50));
    onValue(msgsRef, (snap) => {
        if (!snap.exists()) return;
        const area = document.getElementById('messagesArea');
        if (!area) return;
        if (!area.dataset.loaded) { area.innerHTML = `<div class="date-divider"><span>Today</span></div>`; area.dataset.loaded = '1'; }
        snap.forEach(child => { if (!document.getElementById('msg-' + child.key)) renderMessage(child.key, child.val(), area); });
        scrollBottom();
    });
}

function renderMessage(key, msg, container) {
    const isOwn = msg.uid === currentUser?.uid;
    const row = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'own' : 'other'}`;
    row.id = 'msg-' + key;
    row.dataset.sender    = msg.senderName || '';
    row.dataset.msg       = msg.text || '';
    row.dataset.key       = key;
    row.dataset.senderUid = msg.uid || '';

    const rBadge = getRoleBadgeHTML(msg.senderRole || 'member', msg.senderGroupRole || 'member');
    const replyHTML = msg.replyTo ? `<div class="reply-preview"><strong>${esc(msg.replyTo.name)}</strong>${esc(msg.replyTo.text)}</div>` : '';
    const initial  = (msg.senderName || '?')[0].toUpperCase();
    const avBg     = msg.avatarBg || '#1a1030';
    const avCol    = msg.avatarColor || '#a78bfa';

    const avHTML = isOwn ? '' : `<div class="msg-av" style="background:${avBg};color:${avCol};" onclick="window.showUserProfile('${esc(msg.senderName)}','','','${initial}','${avBg}','${msg.senderRole||'member'}','${msg.senderGroupRole||'member'}','${msg.photoURL||''}','${msg.uid||''}')">${msg.photoURL ? `<img src="${msg.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : initial}</div>`;
    const snHTML = isOwn ? '' : `<div class="msg-sender" style="color:${avCol};">${esc(msg.senderName)} ${rBadge}</div>`;

    const om = `window.openMsgMenu(event,this,'${isOwn?'own':'other'}','${key}','${msg.uid||''}')`;
    const tp = `window.startMsgPress(event,this,'${isOwn?'own':'other'}','${key}','${msg.uid||''}')`;
    let bubble = '';
    if (msg.type === 'image') {
        bubble = `<div class="bubble ${isOwn?'own':'other'} img-bubble" oncontextmenu="${om}" ontouchstart="${tp}" ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()"><img src="${msg.mediaURL}" alt="image"></div>`;
    } else if (msg.type === 'video') {
        bubble = `<div class="bubble ${isOwn?'own':'other'}" oncontextmenu="${om}" ontouchstart="${tp}" ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()"><video src="${msg.mediaURL}" controls style="max-width:100%;border-radius:8px;"></video></div>`;
    } else if (msg.type === 'sticker') {
        bubble = `<div style="font-size:3rem;margin-bottom:2px;">${msg.text}</div>`;
    } else {
        bubble = `<div class="bubble ${isOwn?'own':'other'}" oncontextmenu="${om}" ontouchstart="${tp}" ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()">${replyHTML}${esc(msg.text||'')}</div>`;
    }

    row.innerHTML = `<div class="msg-inner">${avHTML}<div class="msg-col">${snHTML}${bubble}<div class="msg-time ${isOwn?'own':''}">${timeAgo(msg.timestamp||0)}${isOwn?' ✓✓':''}</div></div></div><div class="swipe-reply-icon">↩️</div>`;
    container.appendChild(row);
    attachSwipe(row);
}

async function sendMsg() {
    const input = document.getElementById('msgInput');
    const text  = input?.value.trim();
    if (!text || !currentUser) return;

    if (!isAppStaff()) {
        const ms = await get(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
        if (ms.exists()) {
            const m = ms.val();
            if (!m.until || Date.now() < m.until) { showToast(`🔇 You are muted`); return; }
            remove(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
        }
    }
    if (isReadMode && !canSendMessage()) { showToast('📢 Announcement mode — only admins can send'); return; }

    const col = currentUserRole !== 'member' ? roleColor(currentUserRole) : roleColor(currentGroupRole);
    const msgData = {
        uid: currentUser.uid, senderName: currentUserData?.username || 'User',
        senderRole: currentUserRole, senderGroupRole: currentGroupRole,
        avatarBg: '#1a1030', avatarColor: col,
        photoURL: currentUserData?.photoURL || '',
        text, type: 'text', timestamp: Date.now(),
    };
    if (replyingTo) msgData.replyTo = { name: replyingTo.name, text: replyingTo.text };
    try {
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        await update(ref(db, `groups/${GROUP_ID}`), { lastMessage: text, lastSender: currentUserData?.username || 'User', lastMessageAt: Date.now() });
    } catch(e) { showToast('❌ Failed to send'); return; }
    input.value = ''; input.style.height = 'auto';
    document.getElementById('sendBtn').style.display  = 'none';
    document.getElementById('voiceBtn').style.display = 'flex';
    closeReply(); closeStickerTray();
}
window.sendMsg = sendMsg;

async function uploadAndSendMedia(file) {
    if (!currentUser) return;
    const isVid = file.type.startsWith('video/');
    showToast(`⬆️ Uploading ${isVid ? 'video' : 'photo'}...`);
    try {
        const fd = new FormData();
        fd.append('file', file); fd.append('upload_preset', CLOUDINARY_PRESET); fd.append('folder', 'group-media');
        const ep = isVid ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload` : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
        const res = await fetch(ep, { method:'POST', body:fd }); const data = await res.json();
        if (!data.secure_url) { showToast('❌ Upload failed'); return; }
        const col = roleColor(currentUserRole !== 'member' ? currentUserRole : currentGroupRole);
        const msgData = { uid: currentUser.uid, senderName: currentUserData?.username||'User', senderRole: currentUserRole, senderGroupRole: currentGroupRole, avatarBg:'#1a1030', avatarColor: col, photoURL: currentUserData?.photoURL||'', text: isVid?'🎬 Video':'🖼️ Photo', mediaURL: data.secure_url, type: isVid?'video':'image', timestamp: Date.now() };
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        await update(ref(db, `groups/${GROUP_ID}`), { lastMessage: msgData.text, lastSender: currentUserData?.username||'User', lastMessageAt: Date.now() });
        showToast(`✅ ${isVid?'Video':'Photo'} sent!`);
    } catch(e) { console.error(e); showToast('❌ Upload failed'); }
}

// ══ MESSAGE MENU ══════════════════════════════════
function openMsgMenu(e, el, type, key, senderUid) {
    e.stopPropagation?.();
    currentMsgTarget = el; currentMsgType = type; currentMsgKey = key; currentMsgSenderUid = senderUid || '';
    const isOwn = type === 'own';
    document.getElementById('msgDeleteOpt').style.display = (isOwn || canModerate()) ? '' : 'none';
    document.getElementById('msgPinOpt').style.display    = canModerate() ? '' : 'none';
    document.getElementById('msgKickOpt').style.display   = (!isOwn && canAdmin() && senderUid && senderUid !== OWNER_UID) ? '' : 'none';
    document.getElementById('msgMenuOverlay').classList.add('show');
}
window.openMsgMenu = openMsgMenu;

function closeMsgMenu() { document.getElementById('msgMenuOverlay').classList.remove('show'); }
window.closeMsgMenu = closeMsgMenu;

function startMsgPress(e, el, type, key, senderUid) { longPressTimer = setTimeout(() => openMsgMenu(e, el, type, key, senderUid), 500); }
window.startMsgPress = startMsgPress;
function clearMsgPress() { clearTimeout(longPressTimer); }
window.clearMsgPress = clearMsgPress;

async function doMsgAction(action) {
    closeMsgMenu();
    if (action === 'react') { openReactPicker(); return; }
    if (action === 'reply') {
        const text = currentMsgTarget?.innerText?.trim() || '';
        const row  = currentMsgTarget?.closest('.msg-row');
        openReply(currentMsgType === 'own' ? 'You' : (row?.dataset.sender || 'User'), text); return;
    }
    if (action === 'copy') { navigator.clipboard?.writeText(currentMsgTarget?.innerText?.trim() || ''); showToast('📋 Copied!'); }
    if (action === 'pin') {
        if (!canModerate()) { showToast('⛔ Mods only'); return; }
        const text = (currentMsgTarget?.innerText?.trim() || '').substring(0,80);
        document.getElementById('pinnedText').textContent = text;
        await set(ref(db, `groups/${GROUP_ID}/pinned`), text);
        showToast('📌 Pinned!');
    }
    if (action === 'delete') {
        if (!canModerate() && currentMsgType !== 'own') { showToast('⛔ No permission'); return; }
        currentMsgTarget?.closest('.msg-row')?.remove();
        if (currentMsgKey) try { await remove(ref(db, `messages/${GROUP_ID}/${currentMsgKey}`)); } catch(e) {}
        showToast('🗑️ Deleted');
    }
    if (action === 'kick') {
        if (!canAdmin()) { showToast('⛔ Group Admins only'); return; }
        const uid = currentMsgSenderUid;
        if (!uid || uid === OWNER_UID) { showToast('⛔ Cannot kick'); return; }
        const tSnap = await get(ref(db, `users/${uid}/role`));
        if (['owner','admin','mod'].includes(tSnap.val()) && !isAppStaff()) { showToast('⛔ Cannot kick app staff'); return; }
        const row = currentMsgTarget?.closest('.msg-row');
        const name = row?.dataset.sender || 'User';
        if (confirm(`Remove ${name} from this group?`)) kickMember(uid, name);
    }
}
window.doMsgAction = doMsgAction;

async function kickMember(uid, name) {
    try {
        await Promise.all([
            set(ref(db, `groups/${GROUP_ID}/kicked/${uid}`), { by: currentUser.uid, at: Date.now() }),
            remove(ref(db, `users/${uid}/groups/${GROUP_ID}`)),
            remove(ref(db, `groups/${GROUP_ID}/members/${uid}`)),
            remove(ref(db, `groups/${GROUP_ID}/roles/${uid}`)),
        ]);
        const cs = await get(ref(db, `groups/${GROUP_ID}/memberCount`));
        set(ref(db, `groups/${GROUP_ID}/memberCount`), Math.max((cs.val()||1) - 1, 0));
        showToast(`🚫 ${name} removed`);
        loadMembers();
    } catch(e) { showToast('❌ Failed'); }
}

// ══ REACT ═════════════════════════════════════════
function openReactPicker() {
    document.getElementById('reactOverlay').classList.add('show');
    setTimeout(() => { const b = document.getElementById('reactBox'); if (b) { b.style.transform = 'scale(1)'; b.style.opacity = '1'; } }, 10);
}
window.openReactPicker = openReactPicker;
function closeReactPicker() {
    document.getElementById('reactOverlay').classList.remove('show');
    const b = document.getElementById('reactBox'); if (b) { b.style.transform = 'scale(0.88)'; b.style.opacity = '0'; }
}
window.closeReactPicker = closeReactPicker;
function pickReact(em) {
    closeReactPicker();
    if (currentMsgTarget) {
        const col = currentMsgTarget.closest('.msg-col');
        let r = col?.querySelector('.msg-reactions');
        if (!r) { r = document.createElement('div'); r.className = 'msg-reactions'; currentMsgTarget.after(r); }
        const p = document.createElement('span'); p.className = 'react-pill own-react'; p.textContent = em + ' 1';
        p.onclick = () => p.classList.toggle('own-react'); r.appendChild(p);
    }
    showToast(em + ' Reaction added!');
}
window.pickReact = pickReact;

// ══ SETTINGS ══════════════════════════════════════
function openSettings() { updateSettingsUI(); document.getElementById('settingsOverlay').classList.add('show'); }
window.openSettings = openSettings;
function closeSettings() { document.getElementById('settingsOverlay').classList.remove('show'); }
window.closeSettings = closeSettings;

async function toggleReadMode() {
    if (!canAdmin()) { showToast('⛔ Group Admins only'); return; }
    isReadMode = !isReadMode;
    document.getElementById('readModeToggle')?.classList.toggle('on', isReadMode);
    document.getElementById('readModeBanner')?.classList.toggle('show', isReadMode);
    const ia = document.getElementById('inputArea');
    if (ia) ia.style.display = (isReadMode && !canSendMessage()) ? 'none' : '';
    await update(ref(db, `groups/${GROUP_ID}`), { readMode: isReadMode });
    showToast(isReadMode ? '📢 Announcement mode ON' : '💬 Chat mode ON');
}
window.toggleReadMode = toggleReadMode;

async function togglePrivate() {
    if (!canAdmin()) { showToast('⛔ Group Admins only'); return; }
    isPrivate = !isPrivate;
    document.getElementById('privateToggle')?.classList.toggle('on', isPrivate);
    await update(ref(db, `groups/${GROUP_ID}`), { isPrivate });
    showToast(isPrivate ? '🔒 Group is now private' : '🌐 Group is now public');
}
window.togglePrivate = togglePrivate;

function toggleNotif() {
    notifOn = !notifOn;
    document.getElementById('notifToggle')?.classList.toggle('on', notifOn);
    showToast(notifOn ? '🔔 Notifications ON' : '🔕 Notifications OFF');
}
window.toggleNotif = toggleNotif;

function editGroupInfo() { if (!canAdmin()) { showToast('⛔ Group Admins only'); return; } closeSettings(); document.getElementById('editGroupOverlay').classList.add('show'); }
window.editGroupInfo = editGroupInfo;
function closeEditGroup(e) { if (!e || e.target.id === 'editGroupOverlay') document.getElementById('editGroupOverlay').classList.remove('show'); }
window.closeEditGroup = closeEditGroup;

async function saveGroupEdit() {
    if (!canAdmin()) { showToast('⛔ Group Admins only'); return; }
    const name = document.getElementById('editGroupName').value.trim();
    const desc = document.getElementById('editGroupDesc').value.trim();
    if (!name) { showToast('⚠️ Name cannot be empty'); return; }
    setHeader(name, null, null, GROUP_ID === 'official_global');
    await update(ref(db, `groups/${GROUP_ID}`), { name, description: desc });
    closeEditGroup(); showToast('✅ Group updated!');
}
window.saveGroupEdit = saveGroupEdit;

async function changeGroupAvatar() {
    if (!canAdmin()) { showToast('⛔ Group Admins only'); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(input);
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (document.body.contains(input)) document.body.removeChild(input);
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('⚠️ Image too large (max 5MB)'); return; }
        showToast('⬆️ Uploading...'); closeSettings();
        try {
            const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLOUDINARY_PRESET); fd.append('folder', 'group-avatars');
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:fd });
            const data = await res.json();
            if (data.error) { showToast('❌ ' + (data.error.message || 'Upload failed')); return; }
            if (!data.secure_url) { showToast('❌ Upload failed'); return; }
            await update(ref(db, `groups/${GROUP_ID}`), { avatarURL: data.secure_url });
            setHeader(null, data.secure_url, null, null);
            showToast('✅ Icon updated!');
        } catch(e) { console.error(e); showToast('❌ Upload error'); }
    };
    input.addEventListener('cancel', () => { if (document.body.contains(input)) document.body.removeChild(input); });
    input.click();
}
window.changeGroupAvatar = changeGroupAvatar;

async function clearChat() {
    if (!canAdmin()) { showToast('⛔ Group Admins only'); return; }
    closeSettings();
    if (!confirm('Clear all messages? Cannot be undone.')) return;
    try { await remove(ref(db, `messages/${GROUP_ID}`)); document.getElementById('messagesArea').innerHTML = '<div class="date-divider"><span>Today</span></div>'; showToast('🗑️ Chat cleared'); }
    catch(e) { showToast('❌ Failed'); }
}
window.clearChat = clearChat;

// ══ DISBAND GROUP ═════════════════════════════════
async function disbandGroup() {
    if (!canDisband()) { showToast('⛔ No permission to disband'); return; }
    closeSettings();
    if (!confirm('DISBAND this group permanently?\n\nAll messages, posts, and member data will be deleted forever.')) return;
    showToast('💥 Disbanding...');
    try {
        await Promise.all([
            set(ref(db, `groups/${GROUP_ID}`), null),
            set(ref(db, `messages/${GROUP_ID}`), null),
            set(ref(db, `posts/${GROUP_ID}`), null),
        ]);
        const us = await get(ref(db, 'users'));
        if (us.exists()) {
            const ops = [];
            us.forEach(c => { if (c.val()?.groups?.[GROUP_ID]) ops.push(set(ref(db, `users/${c.key}/groups/${GROUP_ID}`), null)); });
            await Promise.all(ops);
        }
        showToast('💥 Group disbanded');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { console.error(e); showToast('❌ Failed to disband'); }
}
window.disbandGroup = disbandGroup;

async function leaveGroup() {
    if (GROUP_ID === 'official_global') { showToast('⛔ Cannot leave the official group'); return; }
    if (isGhostMode) { showToast('👻 Ghost mode — nothing to leave'); return; }
    closeSettings();
    if (!confirm('Leave this group?')) return;
    try {
        await Promise.all([
            set(ref(db, `groups/${GROUP_ID}/left/${currentUser.uid}`), { at: Date.now() }),
            remove(ref(db, `users/${currentUser.uid}/groups/${GROUP_ID}`)),
            remove(ref(db, `groups/${GROUP_ID}/members/${currentUser.uid}`)),
            remove(ref(db, `groups/${GROUP_ID}/roles/${currentUser.uid}`)),
        ]);
        const cs = await get(ref(db, `groups/${GROUP_ID}/memberCount`));
        set(ref(db, `groups/${GROUP_ID}/memberCount`), Math.max((cs.val()||1) - 1, 0));
        showToast('🚪 Left group');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed'); }
}
window.leaveGroup = leaveGroup;

// ══ MEMBER OPTIONS ════════════════════════════════
function openMemberOptions(e, memberData) {
    e.stopPropagation();
    currentMemberTarget = memberData;
    const { uid, name, appRole, groupRole: gRole } = memberData;
    document.getElementById('memberOptName').textContent = name;
    const isSelf      = uid === currentUser?.uid;
    const isOwnerUid  = uid === OWNER_UID;
    const targetStaff = ['owner','admin','mod'].includes(appRole);
    const canManage   = !isSelf && !isOwnerUid && (isAppStaff() || !targetStaff);

    ['groupAdminActionsSection','groupModActionsSection','kickSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (canManage) {
        if (canAdmin()) {
            const gas = document.getElementById('groupAdminActionsSection');
            if (gas) gas.style.display = '';
            document.getElementById('optMakeGroupAdmin')?.style && (document.getElementById('optMakeGroupAdmin').style.display   = gRole !== 'groupAdmin' ? '' : 'none');
            document.getElementById('optRemoveGroupAdmin')?.style && (document.getElementById('optRemoveGroupAdmin').style.display = gRole === 'groupAdmin' ? '' : 'none');
            document.getElementById('optMakeGroupMod')?.style && (document.getElementById('optMakeGroupMod').style.display     = (gRole !== 'groupMod' && gRole !== 'groupAdmin') ? '' : 'none');
            document.getElementById('optRemoveGroupMod')?.style && (document.getElementById('optRemoveGroupMod').style.display   = gRole === 'groupMod' ? '' : 'none');
            const ks = document.getElementById('kickSection'); if (ks) ks.style.display = '';
        }
        if (canModerate()) {
            const gms = document.getElementById('groupModActionsSection'); if (gms) gms.style.display = '';
            // Async check mute
            checkTargetMute(uid);
        }
    }
    document.getElementById('memberOptOverlay').classList.add('show');
}
window.openMemberOptions = openMemberOptions;

async function checkTargetMute(uid) {
    const ms = await get(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
    const isMuted = ms.exists() && (!ms.val().until || Date.now() < ms.val().until);
    const muteBtn   = document.getElementById('optMuteMember');
    const unmuteBtn = document.getElementById('optUnmuteMember');
    if (muteBtn)   muteBtn.style.display   = !isMuted ? '' : 'none';
    if (unmuteBtn) unmuteBtn.style.display = isMuted  ? '' : 'none';
}

function closeMemberOpts() { document.getElementById('memberOptOverlay').classList.remove('show'); }
window.closeMemberOpts = closeMemberOpts;

async function memberAction(action) {
    closeMemberOpts();
    const target = currentMemberTarget;
    if (!target) return;
    const { uid, name } = target;

    if (action === 'profile') {
        window.location.href = `user-view.html?uid=${uid}&name=${encodeURIComponent(name)}`;
        return;
    }
    if (action === 'makeGroupAdmin') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), 'groupAdmin');
        showToast(`🏠 ${name} is now Group Admin!`); loadMembers();
    }
    if (action === 'removeGroupAdmin') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), 'member');
        showToast(`👤 ${name} removed as Group Admin`); loadMembers();
    }
    if (action === 'makeGroupMod') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), 'groupMod');
        showToast(`🔰 ${name} is now Group Mod!`); loadMembers();
    }
    if (action === 'removeGroupMod') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), 'member');
        showToast(`👤 ${name} removed as Mod`); loadMembers();
    }
    if (action === 'mute')   openMuteMemberModal(uid, name);
    if (action === 'unmute') handleUnmute(uid, name);
    if (action === 'kick') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        if (uid === OWNER_UID) { showToast('⛔ Cannot kick owner'); return; }
        const ts = await get(ref(db, `users/${uid}/role`));
        if (['owner','admin','mod'].includes(ts.val()) && !isAppStaff()) { showToast('⛔ Cannot kick app staff'); return; }
        if (confirm(`Remove ${name} from this group?`)) kickMember(uid, name);
    }
}
window.memberAction = memberAction;

// ══ MUTE SYSTEM ═══════════════════════════════════
function openMuteMemberModal(uid, name) {
    muteTargetUid = uid; muteTargetName = name; selectedMuteDur = 60;
    document.getElementById('muteTargetLabel').textContent = name;
    document.querySelectorAll('.mute-dur-btn').forEach((b,i) => b.classList.toggle('selected', i === 1));
    document.getElementById('muteMemberOverlay').classList.add('show');
}
function closeMuteMember(e) { if (!e || e.target.id === 'muteMemberOverlay') document.getElementById('muteMemberOverlay').classList.remove('show'); }
window.closeMuteMember = closeMuteMember;
function selectMuteDur(btn, mins) {
    selectedMuteDur = mins;
    document.querySelectorAll('.mute-dur-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}
window.selectMuteDur = selectMuteDur;
async function confirmMuteMember() {
    if (!muteTargetUid || !canModerate()) { showToast('⛔ No permission'); return; }
    document.getElementById('muteMemberOverlay').classList.remove('show');
    const until = Date.now() + selectedMuteDur * 60000;
    await set(ref(db, `groups/${GROUP_ID}/muted/${muteTargetUid}`), { until, by: currentUser.uid, byAppRole: currentUserRole, byGroupRole: currentGroupRole, at: Date.now() });
    const label = selectedMuteDur >= 1440 ? `${selectedMuteDur/1440}d` : selectedMuteDur >= 60 ? `${selectedMuteDur/60}h` : `${selectedMuteDur}m`;
    showToast(`🔇 ${muteTargetName} muted for ${label}`); loadMembers();
}
window.confirmMuteMember = confirmMuteMember;
async function handleUnmute(uid, name) {
    if (!canModerate()) { showToast('⛔ No permission'); return; }
    const ms = await get(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
    if (!ms.exists()) { showToast('ℹ️ Not muted'); return; }
    const m = ms.val();
    if (!canAdmin()) {
        if (m.byGroupRole === 'groupAdmin' || ['owner','admin','mod'].includes(m.byAppRole)) { showToast('⛔ Cannot lift admin mute'); return; }
    }
    await remove(ref(db, `groups/${GROUP_ID}/muted/${uid}`));
    showToast(`🔊 ${name} unmuted`); loadMembers();
}

// ══ LOAD MEMBERS ══════════════════════════════════
async function loadMembers() {
    const list = document.getElementById('membersList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">Loading...</div>';
    try {
        const [rolesSnap, mutedSnap, usersSnap] = await Promise.all([
            get(ref(db, `groups/${GROUP_ID}/roles`)),
            get(ref(db, `groups/${GROUP_ID}/muted`)),
            get(ref(db, 'users')),
        ]);
        const groupRoles = rolesSnap.exists() ? rolesSnap.val() : {};
        const mutedData  = mutedSnap.exists() ? mutedSnap.val() : {};
        if (!usersSnap.exists()) { list.innerHTML = ''; return; }

        const buckets = { appOwner:[], appAdmin:[], appMod:[], groupAdmin:[], groupMod:[], member:[] };
        let online = 0;

        usersSnap.forEach(child => {
            const u = child.val(); const uid = child.key;
            const inGroup = u?.groups?.[GROUP_ID];
            const hasRole = groupRoles[uid];
            if (!inGroup && !hasRole) return;
            if (u?.isOnline) online++;
            const aRole = (uid === OWNER_UID) ? 'owner' : (u?.role || 'member');
            const gRole = groupRoles[uid] || 'member';
            const isMuted = mutedData[uid] && (!mutedData[uid].until || Date.now() < mutedData[uid].until);
            const m = { uid, ...u, appRole: aRole, groupRole: gRole, isMuted };
            if (uid === OWNER_UID)       buckets.appOwner.push(m);
            else if (aRole === 'admin')  buckets.appAdmin.push(m);
            else if (aRole === 'mod')    buckets.appMod.push(m);
            else if (gRole === 'groupAdmin') buckets.groupAdmin.push(m);
            else if (gRole === 'groupMod')   buckets.groupMod.push(m);
            else                             buckets.member.push(m);
        });

        const oc = document.getElementById('onlineCount'); if (oc) oc.textContent = online;
        list.innerHTML = '';

        [
            { key:'appOwner', label:'👑 App Owner' },
            { key:'appAdmin', label:'⚙️ App Admins' },
            { key:'appMod',   label:'🛡️ App Mods' },
            { key:'groupAdmin', label:'🏠 Group Admins' },
            { key:'groupMod',   label:'🔰 Group Mods' },
            { key:'member',     label:'👤 Members' },
        ].forEach(({ key, label }) => {
            if (!buckets[key].length) return;
            const sl = document.createElement('div');
            sl.className = 'members-section-label';
            if (key !== 'appOwner') sl.style.marginTop = '14px';
            sl.textContent = label;
            list.appendChild(sl);

            buckets[key].forEach(u => {
                const initial   = (u.username || '?')[0].toUpperCase();
                const isOwnerRow = u.uid === OWNER_UID;
                const avBg = isOwnerRow ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : '#1a1030';
                const badge = getRoleBadgeHTML(u.appRole, u.groupRole);
                const onlineDot = u.isOnline ? '<div class="member-online-dot"></div>' : '';
                const muteTag = u.isMuted ? ' <span style="font-size:10px;color:#555;">🔇</span>' : '';

                const row = document.createElement('div');
                row.className = 'member-row';
                row.innerHTML = `
                    <div class="member-av" style="background:${avBg};color:#fff;">
                        ${u.photoURL ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : initial}
                        ${onlineDot}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${esc(u.username||'User')} ${badge}${muteTag}</div>
                        <div class="member-sub">${esc(u.khaw||'')}${u.age?' · '+u.age:''}</div>
                    </div>
                    <div class="member-more" id="more-${u.uid}">⋯</div>`;

                row.querySelector('.member-av').onclick = () =>
                    showUserProfile(u.username, u.age, u.khaw, initial, avBg === 'linear-gradient(135deg,var(--accent),var(--accent2))' ? '#ff3e1d' : '#1a1030', u.appRole, u.groupRole, u.photoURL||'', u.uid);

                const moreBtn = row.querySelector(`#more-${u.uid}`);
                if (moreBtn) moreBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (u.uid !== OWNER_UID && u.uid !== currentUser?.uid) {
                        openMemberOptions(e, { uid: u.uid, name: u.username||'User', appRole: u.appRole, groupRole: u.groupRole });
                    }
                };
                list.appendChild(row);
            });
        });
        if (!list.children.length) list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">No members yet</div>';
    } catch(e) { console.error(e); list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;">Failed to load members</div>'; }
}
window.loadMembers = loadMembers;

// ══ POSTS ═════════════════════════════════════════
function listenPosts() {
    onValue(query(ref(db, `posts/${GROUP_ID}`), orderByChild('timestamp'), limitToLast(30)), (snap) => {
        const area = document.getElementById('postsArea');
        if (!area) return;
        area.querySelectorAll('.post-card').forEach(c => c.remove());
        if (!snap.exists()) return;
        const posts = [];
        snap.forEach(child => posts.push({ key: child.key, ...child.val() }));
        posts.reverse().forEach(p => area.appendChild(buildPostCard(p)));
    });
}

function buildPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card'; card.id = 'post-' + post.key;
    const initial  = (post.senderName||'?')[0].toUpperCase();
    const badge    = getRoleBadgeHTML(post.senderRole||'member', post.senderGroupRole||'member');
    const timeStr  = post.timestamp ? timeAgo(post.timestamp) : '';
    const typeMap  = { poll:'<span class="post-badge badge-poll">📊 POLL</span>', event:'<span class="post-badge badge-event">📅 EVENT</span>', announce:'<span class="post-badge badge-announce">📢 ANNOUNCE</span>' };
    let body = `<div class="post-text">${esc(post.text||'')}</div>`;
    if (post.type === 'poll' && post.options) {
        const total = Object.values(post.votes||{}).length || 1;
        body += post.options.map((opt,i) => { const v = Object.values(post.votes||{}).filter(x=>x===i).length; const pct=Math.round(v/total*100); return `<div class="poll-option" onclick="votePoll(this)"><div class="poll-bar" style="width:${pct}%"></div><div class="poll-label"><span>${esc(opt)}</span><span class="poll-pct">${pct}%</span></div></div>`; }).join('');
    }
    if (post.type === 'event' && post.eventTitle) {
        const [mo,dy] = post.eventDate ? post.eventDate.split(' ') : ['',''];
        body += `<div class="event-card"><div class="event-date-box"><div class="event-month">${esc(mo)}</div><div class="event-day">${esc(dy)}</div></div><div class="event-info"><div class="event-title">${esc(post.eventTitle)}</div><div class="event-sub">📍 ${esc(post.eventLoc||'')}</div></div><div class="event-join" onclick="joinEvent(this)">Join</div></div>`;
    }
    const avStyle = post.senderUid === OWNER_UID ? 'background:linear-gradient(135deg,var(--accent),var(--accent2));' : 'background:#1a1030;color:#a78bfa;';
    card.innerHTML = `<div class="post-header"><div class="post-av" style="${avStyle}">${post.photoURL?`<img src="${post.photoURL}" style="width:100%;height:100%;object-fit:cover;">`:initial}</div><div class="post-meta"><div class="post-author">${esc(post.senderName||'User')} ${badge}</div><div class="post-time">${timeStr}</div></div>${typeMap[post.type]||''}</div><div class="post-body">${body}</div><div class="post-actions"><div class="post-action" onclick="likePost(this)">❤️ Like <span>${post.likes||0}</span></div><div class="post-action" onclick="showToast('💬 Comments coming soon!')">💬 Comment</div><div class="post-action" onclick="showToast('🔗 Link copied!')">🔗 Share</div></div>`;
    return card;
}

function openCreatePost(type='post') {
    postType_ = type;
    const titles = { post:'Create Post', poll:'Create Poll', event:'Create Event', announce:'Announcement' };
    document.getElementById('createPostTitle').textContent = titles[type]||'Post';
    document.getElementById('pollOptions').style.display  = type==='poll'  ?'':'none';
    document.getElementById('eventFields').style.display  = type==='event' ?'':'none';
    document.getElementById('createPostOverlay').classList.add('show');
}
window.openCreatePost = openCreatePost;
function closeCreatePost(e) { if (!e||e.target.id==='createPostOverlay') document.getElementById('createPostOverlay').classList.remove('show'); }
window.closeCreatePost = closeCreatePost;
async function submitPost() {
    const text = document.getElementById('postContent').value.trim();
    if (!text) { showToast('⚠️ Write something'); return; }
    const pd = { type:postType_, text, senderName:currentUserData?.username||'User', senderUid:currentUser?.uid||'', senderRole:currentUserRole, senderGroupRole:currentGroupRole, photoURL:currentUserData?.photoURL||'', timestamp:Date.now(), likes:0 };
    if (postType_==='poll') { const opts=[document.getElementById('pollOpt1')?.value.trim(),document.getElementById('pollOpt2')?.value.trim(),document.getElementById('pollOpt3')?.value.trim()].filter(Boolean); if(opts.length<2){showToast('⚠️ Add at least 2 options');return;} pd.options=opts; }
    if (postType_==='event') { pd.eventTitle=document.getElementById('eventTitle')?.value.trim()||''; pd.eventLoc=document.getElementById('eventLoc')?.value.trim()||''; pd.eventDate=document.getElementById('eventDate')?.value.trim()||''; }
    try { await push(ref(db,`posts/${GROUP_ID}`),pd); document.getElementById('postContent').value=''; closeCreatePost(); showToast('✅ Posted!'); }
    catch(e) { showToast('❌ Failed to post'); }
}
window.submitPost = submitPost;
function likePost(btn) { const s=btn.querySelector('span'); s.textContent=(parseInt(s.textContent)||0)+1; btn.style.color='var(--accent)'; }
window.likePost = likePost;
function votePoll(opt) { opt.closest('.post-body')?.querySelectorAll('.poll-option').forEach(o=>o.classList.remove('voted')); opt.classList.add('voted'); showToast('✅ Vote cast!'); }
window.votePoll = votePoll;
function joinEvent(btn) { btn.textContent='Joined ✓'; btn.style.background='rgba(16,185,129,0.2)'; showToast('✅ Joined event!'); }
window.joinEvent = joinEvent;

// ══ PROFILE POPUP ═════════════════════════════════
function showUserProfile(name, age, loc, initial, bg, appRole, gRole, photoURL, uid) {
    const av = document.getElementById('ppAv');
    av.style.background = bg;
    av.innerHTML = photoURL ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">` : initial;
    document.getElementById('ppName').textContent = name;
    document.getElementById('ppMeta').textContent = [age, loc].filter(Boolean).join(' · ');
    const be = document.getElementById('ppRoleBadge'); if (be) be.innerHTML = getRoleBadgeHTML(appRole, gRole, true);
    const ov = document.getElementById('profilePopupOverlay');
    if (ov) { ov.dataset.uid = uid||''; ov.classList.add('show'); }
}
window.showUserProfile = showUserProfile;
function closeProfilePopup() { document.getElementById('profilePopupOverlay').classList.remove('show'); }
window.closeProfilePopup = closeProfilePopup;
function followUser() { closeProfilePopup(); showToast('✅ Following!'); }
window.followUser = followUser;
function viewProfile() {
    const uid  = document.getElementById('profilePopupOverlay')?.dataset.uid || '';
    const name = encodeURIComponent(document.getElementById('ppName')?.textContent||'');
    closeProfilePopup();
    window.location.href = uid ? `user-view.html?uid=${uid}&name=${name}` : `user-view.html?name=${name}`;
}
window.viewProfile = viewProfile;

// ══ STICKER TRAY ══════════════════════════════════
function toggleSticker() {
    const t = document.getElementById('stickerTray'); const bd = document.getElementById('trayBackdrop');
    if (t.classList.contains('show')) closeStickerTray();
    else { t.classList.add('show'); bd.classList.add('show'); switchTray('emoji'); }
}
window.toggleSticker = toggleSticker;
function closeStickerTray() { document.getElementById('stickerTray')?.classList.remove('show'); document.getElementById('trayBackdrop')?.classList.remove('show'); }
window.closeStickerTray = closeStickerTray;
function switchTray(tab) {
    activeTrayTab = tab;
    document.querySelectorAll('.tray-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('tt-'+tab)?.classList.add('active');
    const search = document.getElementById('traySearch'); if (search) search.classList.toggle('show', tab==='gif');
    const body = document.getElementById('trayBody'); if (!body) return;
    body.innerHTML = '';
    if (tab==='emoji')    renderEmojiTray(body);
    if (tab==='stickers') renderStickerTray(body);
    if (tab==='gif')      renderGifs(body);
    if (tab==='mine')     { const n=document.createElement('div'); n.className='tray-empty'; n.innerHTML='<p>No custom stickers yet</p>'; body.appendChild(n); }
}
window.switchTray = switchTray;
function renderEmojiTray(c) {
    const cats = document.createElement('div'); cats.className = 'emoji-cats';
    Object.keys(EMOJIS).forEach(k => {
        const btn = document.createElement('div'); btn.className = 'emoji-cat'+(k===activeEmojiCat?' active':'');
        btn.textContent = {recent:'🕐',faces:'😊',hearts:'❤️',hands:'👏',nature:'🐶',food:'🍕',activity:'⚽'}[k]||k;
        btn.onclick = () => { activeEmojiCat=k; c.innerHTML=''; renderEmojiTray(c); };
        cats.appendChild(btn);
    });
    c.appendChild(cats);
    const grid = document.createElement('div'); grid.className = 'emoji-grid';
    (EMOJIS[activeEmojiCat]||[]).forEach(em => { const item=document.createElement('div'); item.className='emoji-item'; item.textContent=em; item.onclick=()=>sendEmojiToInput(em); grid.appendChild(item); });
    c.appendChild(grid);
}
function renderStickerTray(c) {
    const grid = document.createElement('div'); grid.className = 'sticker-grid';
    ZO_STICKERS.forEach(s => { const item=document.createElement('div'); item.className='sticker-item'; item.innerHTML=`<span style="font-size:2.2rem;">${s.em}</span>`; item.onclick=()=>sendSticker(s.em); grid.appendChild(item); });
    const add=document.createElement('div'); add.className='add-sticker-btn'; add.innerHTML='➕<span>Add</span>'; add.onclick=()=>showToast('🎭 Custom stickers coming soon!');
    grid.appendChild(add); c.appendChild(grid);
}
function renderGifs(c) {
    const grid=document.createElement('div'); grid.className='gif-grid';
    ['🎬','🎥','📽️','🎞️','🎭','🎪','🎨','🎠'].forEach(p=>{ const item=document.createElement('div'); item.className='gif-item'; item.textContent=p; item.style.fontSize='2.5rem'; item.onclick=()=>showToast('🎬 Connect Giphy API!'); grid.appendChild(item); });
    c.appendChild(grid);
}
function searchGif(q) { renderGifs(document.getElementById('trayBody')); }
window.searchGif = searchGif;
async function sendSticker(em) {
    closeStickerTray();
    if (!currentUser) return;
    const col = roleColor(currentUserRole !== 'member' ? currentUserRole : currentGroupRole);
    const md = { uid:currentUser.uid, senderName:currentUserData?.username||'User', senderRole:currentUserRole, senderGroupRole:currentGroupRole, avatarBg:'#1a1030', avatarColor:col, photoURL:currentUserData?.photoURL||'', text:em, type:'sticker', timestamp:Date.now() };
    await push(ref(db,`messages/${GROUP_ID}`), md);
    await update(ref(db,`groups/${GROUP_ID}`), { lastMessage:em, lastSender:currentUserData?.username||'User', lastMessageAt:Date.now() });
}
window.sendSticker = sendSticker;
function sendEmojiToInput(em) { const i=document.getElementById('msgInput'); i.value+=em; onInput(i); i.focus(); }

// ══ ATTACH ════════════════════════════════════════
function openAttach() { document.getElementById('attachOverlay').classList.add('show'); }
window.openAttach = openAttach;
function closeAttach() { document.getElementById('attachOverlay').classList.remove('show'); }
window.closeAttach = closeAttach;
function attachAction(type) {
    closeAttach();
    if (type==='sticker') { toggleSticker(); switchTray('stickers'); return; }
    if (type==='image'||type==='camera'||type==='video') {
        const input=document.createElement('input');
        input.type='file';
        input.accept = type==='video' ? 'video/*' : 'image/*';
        if (type==='camera') input.capture='environment';
        input.style.cssText='position:fixed;top:-9999px;';
        document.body.appendChild(input);
        input.onchange = async (e) => { if(e.target.files[0]) await uploadAndSendMedia(e.target.files[0]); document.body.removeChild(input); };
        input.click(); return;
    }
    showToast('📎 Coming soon!');
}
window.attachAction = attachAction;

function startRecording() { showToast('🎤 Voice messages coming soon!'); }
window.startRecording = startRecording;
function stopRecording() {}
window.stopRecording = stopRecording;
function playVoice() { showToast('🎤 Voice messages coming soon!'); }
window.playVoice = playVoice;

// ══ MEMBERS FILTER ════════════════════════════════
function filterMembers(q) {
    document.querySelectorAll('.member-row').forEach(r => {
        r.style.display = (r.querySelector('.member-name')?.textContent||'').toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
}
window.filterMembers = filterMembers;

// ══ TABS ══════════════════════════════════════════
function switchTab(t) {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
    document.getElementById('tab-'+t)?.classList.add('active');
    document.getElementById('content-'+t)?.classList.add('active');
    closeStickerTray();
}
window.switchTab = switchTab;

// ══ INPUT ═════════════════════════════════════════
function onInput(el) {
    el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,100)+'px';
    const has=el.value.trim().length>0;
    document.getElementById('sendBtn').style.display  = has?'flex':'none';
    document.getElementById('voiceBtn').style.display = has?'none':'flex';
}
window.onInput = onInput;

function openReply(name, text) {
    replyingTo = { name, text };
    document.getElementById('replyName').textContent = name;
    document.getElementById('replyText').textContent = ' ' + text.substring(0,60);
    document.getElementById('replyBar').style.display = 'flex';
    document.getElementById('msgInput')?.focus();
}
window.openReply = openReply;
function closeReply() {
    replyingTo = null;
    document.getElementById('replyBar').style.display = 'none';
}
window.closeReply = closeReply;

// ══ SWIPE TO REPLY ════════════════════════════════
function initSwipeToReply() {}
function attachSwipe(row) {
    let sx=0, sy=0, drag=false, triggered=false;
    row.addEventListener('touchstart', e => { sx=e.touches[0].clientX; sy=e.touches[0].clientY; drag=true; triggered=false; }, { passive:true });
    row.addEventListener('touchmove', e => {
        if (!drag) return;
        const dx=e.touches[0].clientX-sx; const dy=Math.abs(e.touches[0].clientY-sy);
        if (dy>10) { drag=false; return; }
        const isOwn=row.classList.contains('own');
        if ((isOwn?dx<-40:dx>40) && !triggered) {
            triggered=true;
            openReply(row.dataset.sender||'User', row.dataset.msg||'');
            row.style.transition='transform 0.2s'; row.style.transform=`translateX(${isOwn?'-':''}6px)`;
            setTimeout(()=>{row.style.transform='';},200);
        }
    }, { passive:true });
    row.addEventListener('touchend', ()=>{ drag=false; });
}

// ══ MISC ══════════════════════════════════════════
function scrollBottom() { const a=document.getElementById('messagesArea'); if(a) setTimeout(()=>{a.scrollTop=a.scrollHeight;},50); }
function scrollToPinned() { showToast('📌 Scrolled to pinned'); }
window.scrollToPinned = scrollToPinned;
function goBack() { window.location.href='group.html'; }
window.goBack = goBack;
function buildWaveform(id) {
    const el=document.getElementById(id); if(!el) return;
    [4,8,14,10,18,12,20,16,8,12,16,10,14,8,6,12,18,10,14,8].forEach(h=>{ const b=document.createElement('div'); b.className='waveform-bar'; b.style.height=h+'px'; el.appendChild(b); });
}

function showToast(msg) {
    const t=document.getElementById('toast'); if(!t) return;
    t.textContent=msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2500);
}
window.showToast = showToast;

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function timeAgo(ts) {
    const d=Date.now()-ts; const m=Math.floor(d/60000); const h=Math.floor(d/3600000); const dy=Math.floor(d/86400000);
    if(m<1) return 'Now'; if(m<60) return m+'m'; if(h<24) return h+'h'; if(dy===1) return 'Yesterday'; return dy+'d';
}
window.addEventListener('load', ()=>scrollBottom());
