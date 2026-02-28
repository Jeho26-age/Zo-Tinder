import { initializeApp }                          from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }             from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, remove, update, increment } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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
const ROLE_RANK = { owner: 4, admin: 3, mod: 2, member: 1 };

// ── Detect which page we're on ─────────────────────────────────────────────
const isFollowersPage = window.location.pathname.includes('user-followers');
const MODE            = isFollowersPage ? 'followers' : 'following';

// ── URL param ──────────────────────────────────────────────────────────────
const params    = new URLSearchParams(window.location.search);
const targetUID = params.get('uid') || params.get('id');

// ── State ──────────────────────────────────────────────────────────────────
let myUID      = null;
let isOwnPage  = false;   // viewing your own followers/following
let usersCache = {};      // uid → user data

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

async function fetchUser(uid) {
    if (usersCache[uid]) return usersCache[uid];
    const snap = await get(ref(db, `users/${uid}`));
    const data = snap.exists() ? snap.val() : {};
    usersCache[uid] = data;
    return data;
}

function getFrameClass(uid, data) {
    const role = (uid === OWNER_UID) ? 'owner' : (data?.role || 'member');
    if (role === 'owner') return 'cf-owner';
    if (role === 'admin') return 'cf-admin';
    if (role === 'mod')   return 'cf-mod';
    const eq = data?.equippedFrame || '';
    if (eq) return eq.replace('frame-', 'cf-');
    return 'cf-none';
}

function getStaffBadgeHTML(uid, data) {
    const role = (uid === OWNER_UID) ? 'owner' : (data?.role || '');
    if (role === 'owner') return `<span class="staff-badge owner">👑 Owner</span>`;
    if (role === 'admin') return `<span class="staff-badge admin">⚙️ Admin</span>`;
    if (role === 'mod')   return `<span class="staff-badge mod">🛡️ Mod</span>`;
    return '';
}

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }

    myUID     = user.uid;
    isOwnPage = !targetUID || targetUID === myUID;

    const viewUID = targetUID || myUID;

    try {
        // Fetch target user info for header
        const targetData = await fetchUser(viewUID);
        const username   = targetData.username || 'User';

        // Set header
        const titleEl = document.getElementById('headerTitle');
        if (titleEl) {
            titleEl.textContent = isOwnPage
                ? (MODE === 'followers' ? 'Your Followers' : 'Your Following')
                : `${username}'s ${MODE === 'followers' ? 'Followers' : 'Following'}`;
        }

        // Load the list
        await loadPeople(viewUID);

    } catch (e) {
        console.error('user-people.js error:', e);
        showToast('❌ Failed to load');
    } finally {
        hideLoader();
    }

    // Setup avatar popup
    setupPopup();
});

// ── LOAD PEOPLE ────────────────────────────────────────────────────────────
async function loadPeople(viewUID) {
    const dbPath  = MODE === 'followers'
        ? `users/${viewUID}/followers`
        : `users/${viewUID}/following`;

    const snap = await get(ref(db, dbPath));

    const list      = document.getElementById('peopleList');
    const emptyEl   = document.getElementById('emptyState');
    const countEl   = document.getElementById('headerCount');

    if (!snap.exists() || !list) {
        if (emptyEl) emptyEl.style.display = 'flex';
        if (countEl) countEl.textContent = '0 people';
        return;
    }

    // Collect UIDs
    const uids = Object.keys(snap.val());

    if (countEl) countEl.textContent = `${uids.length} ${uids.length === 1 ? 'person' : 'people'}`;

    // Fetch all user data in parallel
    const peopleData = await Promise.all(uids.map(uid => fetchUser(uid).then(data => ({ uid, ...data }))));

    // Sort: staff first, then alphabetical
    peopleData.sort((a, b) => {
        const rankA = getRoleRank(a.uid, a.role);
        const rankB = getRoleRank(b.uid, b.role);
        if (rankB !== rankA) return rankB - rankA;
        return (a.username || '').localeCompare(b.username || '');
    });

    if (peopleData.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    // Fetch my following list to know who I already follow
    const myFollowingSnap = await get(ref(db, `users/${myUID}/following`));
    const myFollowing = myFollowingSnap.exists() ? myFollowingSnap.val() : {};

    // Render rows
    list.innerHTML = '';
    peopleData.forEach(person => {
        const row = buildRow(person, myFollowing);
        list.appendChild(row);
    });
}

function getRoleRank(uid, role) {
    if (uid === OWNER_UID) return ROLE_RANK.owner;
    return ROLE_RANK[role] || ROLE_RANK.member;
}

// ── BUILD ROW ──────────────────────────────────────────────────────────────
function buildRow(person, myFollowing) {
    const frameClass   = getFrameClass(person.uid, person);
    const staffBadge   = getStaffBadgeHTML(person.uid, person);
    const isFollowing  = !!myFollowing[person.uid];

    const avatarInner = person.photoURL
        ? `<img src="${esc(person.photoURL)}" alt="${esc(person.username)}">`
        : `<span style="font-size:1.3rem;">${esc(person.username?.[0] || '?')}</span>`;

    // Follow button — only show on own page
    const followBtnHTML = isOwnPage
        ? `<button class="follow-btn show ${isFollowing ? 'state-unfollow' : 'state-follow'}"
                data-uid="${esc(person.uid)}"
                data-following="${isFollowing ? '1' : '0'}">
                ${isFollowing ? 'Unfollow' : MODE === 'followers' ? 'Follow Back' : 'Follow'}
           </button>`
        : '';

    const row = document.createElement('div');
    row.className      = 'people-row';
    row.dataset.uid    = person.uid;
    row.dataset.name   = (person.username || '').toLowerCase();

    row.innerHTML = `
        <div class="people-avatar-wrap ${frameClass}" data-uid="${esc(person.uid)}">
            <div class="people-avatar">${avatarInner}</div>
            <div class="people-frame"></div>
        </div>
        <div class="people-info">
            <div class="people-name">
                ${esc(person.username || 'User')}
                ${staffBadge}
            </div>
        </div>
        ${followBtnHTML}
    `;

    // Tap row → user-view.html (but not if tapping follow btn or avatar)
    row.addEventListener('click', (e) => {
        if (e.target.closest('.follow-btn') || e.target.closest('.people-avatar-wrap')) return;
        window.location.href = `user-view.html?uid=${person.uid}`;
    });

    // Tap avatar → popup
    row.querySelector('.people-avatar-wrap')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPopup(person.uid, person, myFollowing);
    });

    // Follow/Unfollow button on row
    row.querySelector('.follow-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        await toggleFollow(person.uid, btn);
    });

    return row;
}

// ── TOGGLE FOLLOW ──────────────────────────────────────────────────────────
async function toggleFollow(targetUID, btn) {
    const isFollowing = btn?.getAttribute('data-following') === '1';

    try {
        if (isFollowing) {
            await Promise.all([
                remove(ref(db, `users/${myUID}/following/${targetUID}`)),
                remove(ref(db, `users/${targetUID}/followers/${myUID}`)),
                update(ref(db, `users/${myUID}`),    { followingCount: increment(-1) }),
                update(ref(db, `users/${targetUID}`), { followersCount: increment(-1) })
            ]);

            if (btn) {
                btn.textContent = MODE === 'followers' ? 'Follow Back' : 'Follow';
                btn.className   = 'follow-btn show state-follow';
                btn.setAttribute('data-following', '0');
            }
            showToast('Unfollowed');

        } else {
            await Promise.all([
                set(ref(db, `users/${myUID}/following/${targetUID}`), true),
                set(ref(db, `users/${targetUID}/followers/${myUID}`), true),
                update(ref(db, `users/${myUID}`),    { followingCount: increment(1) }),
                update(ref(db, `users/${targetUID}`), { followersCount: increment(1) })
            ]);

            // Check if mutual — create chat + notify
            const theyFollowMe = await get(ref(db, `users/${targetUID}/following/${myUID}`));
            if (theyFollowMe.exists()) {
                // Create mutual chat if not exists
                const chatID   = [myUID, targetUID].sort().join('_');
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
                    await update(ref(db, `chats/${chatID}`), { isRequest: false });
                }

                // Send follow-back notification
                const { push } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
                await push(ref(db, `notifications/${targetUID}`), {
                    type: 'follow_back',
                    from: myUID,
                    time: Date.now(),
                    read: false,
                    data: {}
                });
            } else {
                // Send regular follow notification
                const { push } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
                await push(ref(db, `notifications/${targetUID}`), {
                    type: 'follow',
                    from: myUID,
                    time: Date.now(),
                    read: false,
                    data: {}
                });
            }

            if (btn) {
                btn.textContent = 'Unfollow';
                btn.className   = 'follow-btn show state-unfollow';
                btn.setAttribute('data-following', '1');
            }
            showToast('Following! 🎉');
        }
    } catch (e) {
        console.error('toggleFollow error:', e);
        showToast('❌ Action failed');
    }
}

// ── AVATAR POPUP ───────────────────────────────────────────────────────────
function setupPopup() {
    document.getElementById('popupClose')?.addEventListener('click', closePopup);
    document.getElementById('avatarPopup')?.addEventListener('click', (e) => {
        if (e.target.id === 'avatarPopup') closePopup();
    });
}

function closePopup() {
    document.getElementById('avatarPopup')?.classList.remove('open');
}

async function openPopup(uid, data, myFollowing) {
    // Avatar
    const imgEl = document.getElementById('popupAvatarImg');
    if (imgEl) {
        imgEl.innerHTML = data.photoURL
            ? `<img src="${esc(data.photoURL)}" alt="${esc(data.username)}">`
            : `<span style="font-size:2rem;">${esc(data.username?.[0] || '?')}</span>`;
    }

    // Frame on popup wrap
    const wrapEl = document.getElementById('popupAvatarWrap');
    if (wrapEl) wrapEl.className = `popup-avatar-wrap ${getFrameClass(uid, data)}`;

    // Name
    const nameEl = document.getElementById('popupName');
    if (nameEl) nameEl.textContent = data.username || 'User';

    // Role badge
    const badgeEl = document.getElementById('popupRoleBadge');
    if (badgeEl) {
        const role = (uid === OWNER_UID) ? 'owner' : (data.role || '');
        badgeEl.className = 'popup-role-badge';
        if      (role === 'owner') { badgeEl.className += ' owner'; badgeEl.innerHTML = '👑 Owner'; }
        else if (role === 'admin') { badgeEl.className += ' admin'; badgeEl.innerHTML = '⚙️ Admin'; }
        else if (role === 'mod')   { badgeEl.className += ' mod';   badgeEl.innerHTML = '🛡️ Mod'; }
    }

    // Follow button — always show in popup regardless of whose page
    const followBtn = document.getElementById('popupFollowBtn');
    if (followBtn) {
        // Re-check live follow state
        const snap        = await get(ref(db, `users/${myUID}/following/${uid}`));
        const isFollowing = snap.exists();

        followBtn.textContent = isFollowing ? '✓ Unfollow' : '➕ Follow';
        followBtn.className   = isFollowing
            ? 'popup-btn unfollow-state'
            : 'popup-btn follow-state';

        // Remove old listener and add fresh one
        const newBtn = followBtn.cloneNode(true);
        followBtn.parentNode.replaceChild(newBtn, followBtn);

        newBtn.addEventListener('click', async () => {
            await toggleFollow(uid, null);

            // Update popup button state
            const nowSnap  = await get(ref(db, `users/${myUID}/following/${uid}`));
            const nowFollow = nowSnap.exists();
            newBtn.textContent = nowFollow ? '✓ Unfollow' : '➕ Follow';
            newBtn.className   = nowFollow ? 'popup-btn unfollow-state' : 'popup-btn follow-state';

            // Also update the row button if visible
            const rowBtn = document.querySelector(`.follow-btn[data-uid="${uid}"]`);
            if (rowBtn) {
                rowBtn.textContent = nowFollow ? 'Unfollow' : (MODE === 'followers' ? 'Follow Back' : 'Follow');
                rowBtn.className   = `follow-btn show ${nowFollow ? 'state-unfollow' : 'state-follow'}`;
                rowBtn.setAttribute('data-following', nowFollow ? '1' : '0');
            }
        });
    }

    // View Profile button
    const viewBtn = document.getElementById('popupViewBtn');
    if (viewBtn) {
        viewBtn.onclick = () => { window.location.href = `user-view.html?uid=${uid}`; };
    }

    document.getElementById('avatarPopup')?.classList.add('open');
}
