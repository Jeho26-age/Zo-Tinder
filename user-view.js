import { initializeApp }                              from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }               from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, update, increment, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

// ── Role hierarchy ─────────────────────────────────────────────────────────
const ROLE_RANK = { owner: 4, admin: 3, mod: 2, member: 1 };

function getRoleRank(uid, role) {
    if (uid === OWNER_UID) return ROLE_RANK.owner;
    return ROLE_RANK[role] || ROLE_RANK.member;
}

// ── Get target UID from URL (?uid=xxx) ─────────────────────────────────────
const params    = new URLSearchParams(window.location.search);
const targetUID = params.get('uid') || params.get('id');

if (!targetUID) window.location.href = 'home.html';

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

// ── Modal helpers ──────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (viewer) => {
    if (!viewer) {
        window.location.href = 'index.html';
        return;
    }

    // Viewing your own profile? Redirect to profile.html
    if (viewer.uid === targetUID) {
        window.location.href = 'profile.html';
        return;
    }

    try {
        // Fetch target user + viewer data in parallel
        const [targetSnap, viewerSnap] = await Promise.all([
            get(ref(db, `users/${targetUID}`)),
            get(ref(db, `users/${viewer.uid}`))
        ]);

        if (!targetSnap.exists()) {
            hideLoader();
            showToast('⚠️ User not found');
            return;
        }

        const targetData = targetSnap.val();
        const viewerData = viewerSnap.exists() ? viewerSnap.val() : {};

        // Determine viewer role
        const viewerRole = (viewer.uid === OWNER_UID) ? 'owner' : (viewerData.role || 'member');
        const viewerRank = getRoleRank(viewer.uid, viewerRole);
        const targetRole = (targetUID === OWNER_UID) ? 'owner' : (targetData.role || 'member');
        const targetRank = getRoleRank(targetUID, targetRole);

        // Render everything
        renderProfile(targetUID, targetData);
        setupFollowersFollowingLinks();
        showRoleMenuItems(viewerRank, targetRank);
        await Promise.all([
            loadFollowState(viewer.uid, targetUID),
            loadLikeState(viewer.uid, targetUID, targetData.profileLikes || 0)
        ]);
        await loadRankings(targetUID);

        // Wire up all interactions
        setupMenu(viewer.uid, targetUID, viewerRank, targetRank);
        setupFollowBtn(viewer.uid, targetUID);
        setupLikeBtn(viewer.uid, targetUID);
        setupModals(viewer.uid, targetUID, viewerRank, targetRank);

    } catch (e) {
        console.error('user-view.js error:', e);
        showToast('❌ Failed to load profile');
    } finally {
        hideLoader();
    }
});

// ── RENDER PROFILE ─────────────────────────────────────────────────────────
function renderProfile(uid, data) {

    // Cover
    if (data.coverVideoURL) {
        const vid = document.getElementById('coverVideo');
        if (vid) { vid.src = data.coverVideoURL; vid.style.display = 'block'; }
    } else if (data.coverImageURL) {
        const img = document.getElementById('coverImg');
        if (img) { img.src = data.coverImageURL; img.style.display = 'block'; }
    }

    // Avatar
    if (data.photoURL) {
        const avatarImg   = document.getElementById('avatarImg');
        const placeholder = document.getElementById('avatarPlaceholder');
        if (avatarImg) { avatarImg.src = data.photoURL; avatarImg.style.display = 'block'; }
        if (placeholder) placeholder.style.display = 'none';
    }

    // Online dot
    const dot = document.getElementById('onlineDot');
    if (dot) dot.style.display = data.isOnline ? 'block' : 'none';

    // Frame — role overrides equipped frame
    const wrap = document.getElementById('avatarWrap');
    if (wrap) {
        let frameClass = 'frame-none';
        const role = (uid === OWNER_UID) ? 'owner' : (data.role || 'member');
        if      (role === 'owner') frameClass = 'frame-owner';
        else if (role === 'admin') frameClass = 'frame-admin';
        else if (role === 'mod')   frameClass = 'frame-mod';
        else if (data.equippedFrame) frameClass = data.equippedFrame;
        wrap.className = `avatar-wrap ${frameClass}`;
    }

    // Name
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = data.username || 'User';

    // Role badge
    const badge = document.getElementById('roleBadge');
    if (badge) {
        const role = (uid === OWNER_UID) ? 'owner' : (data.role || '');
        if (role === 'owner') {
            badge.innerHTML = '👑 Owner'; badge.className = 'role-badge owner'; badge.style.display = 'inline-flex';
        } else if (role === 'admin') {
            badge.innerHTML = '⚙️ Admin'; badge.className = 'role-badge admin'; badge.style.display = 'inline-flex';
        } else if (role === 'mod') {
            badge.innerHTML = '🛡️ Mod'; badge.className = 'role-badge mod'; badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Location
    const locWrap = document.getElementById('profileLocation');
    const locText = document.getElementById('locationText');
    if (locWrap && locText) {
        const parts = [data.khaw, data.veng].filter(Boolean);
        if (parts.length) {
            locText.textContent   = parts.join(', ');
            locWrap.style.display = 'flex';
        }
    }

    // Stats
    const followersEl = document.getElementById('statFollowers');
    const followingEl = document.getElementById('statFollowing');
    const likesEl     = document.getElementById('statLikes');
    if (followersEl) followersEl.textContent = (data.followersCount || 0).toLocaleString();
    if (followingEl) followingEl.textContent = (data.followingCount || 0).toLocaleString();
    if (likesEl)     likesEl.textContent     = (data.profileLikes   || 0).toLocaleString();

    // Interests
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

    // Bio
    const bioEl = document.getElementById('bioText');
    if (bioEl && data.bio) bioEl.textContent = data.bio;
}

// ── FOLLOWERS / FOLLOWING LINKS ────────────────────────────────────────────
function setupFollowersFollowingLinks() {
    const fLink  = document.getElementById('followersLink');
    const fgLink = document.getElementById('followingLink');
    if (fLink)  fLink.href  = `user-followers.html?uid=${targetUID}`;
    if (fgLink) fgLink.href = `user-following.html?uid=${targetUID}`;
}

// ── SHOW ROLE MENU ITEMS ───────────────────────────────────────────────────
// Only show mod/admin buttons if viewer outranks target
function showRoleMenuItems(viewerRank, targetRank) {
    if (viewerRank <= targetRank) return; // can't action someone equal or higher

    if (viewerRank >= ROLE_RANK.mod) {
        document.querySelectorAll('.role-mod').forEach(el => el.style.display = 'block');
    }
    if (viewerRank >= ROLE_RANK.admin) {
        document.querySelectorAll('.role-admin').forEach(el => el.style.display = 'block');
    }
}

// ── FOLLOW STATE ───────────────────────────────────────────────────────────
async function loadFollowState(viewerUID, targetUID) {
    const snap = await get(ref(db, `users/${viewerUID}/following/${targetUID}`));
    setFollowState(snap.exists());
}

function setFollowState(isFollowing) {
    // Main button
    const btn       = document.getElementById('followBtn');
    const btnIcon   = document.getElementById('followBtnIcon');
    const btnLabel  = document.getElementById('followBtnLabel');
    // Menu item
    const menuIcon  = document.getElementById('menuFollowIcon');
    const menuLabel = document.getElementById('menuFollowLabel');

    if (isFollowing) {
        btn?.classList.replace('state-follow', 'state-unfollow');
        if (btnIcon)  btnIcon.textContent  = '✓';
        if (btnLabel) btnLabel.textContent = 'Unfollow';
        if (menuIcon)  menuIcon.textContent  = '➖';
        if (menuLabel) menuLabel.textContent = 'Unfollow';
    } else {
        btn?.classList.replace('state-unfollow', 'state-follow');
        if (btnIcon)  btnIcon.textContent  = '➕';
        if (btnLabel) btnLabel.textContent = 'Follow';
        if (menuIcon)  menuIcon.textContent  = '➕';
        if (menuLabel) menuLabel.textContent = 'Follow';
    }

    btn?.setAttribute('data-following', isFollowing ? '1' : '0');
}

function setupFollowBtn(viewerUID, targetUID) {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    btn.addEventListener('click', () => toggleFollow(viewerUID, targetUID));

    const menuBtn = document.getElementById('menuFollowToggle');
    if (menuBtn) menuBtn.addEventListener('click', () => {
        closePopup();
        toggleFollow(viewerUID, targetUID);
    });
}

async function toggleFollow(viewerUID, targetUID) {
    const btn        = document.getElementById('followBtn');
    const isFollowing = btn?.getAttribute('data-following') === '1';

    try {
        if (isFollowing) {
            // Unfollow
            await Promise.all([
                remove(ref(db, `users/${viewerUID}/following/${targetUID}`)),
                remove(ref(db, `users/${targetUID}/followers/${viewerUID}`)),
                update(ref(db, `users/${viewerUID}`), { followingCount:  increment(-1) }),
                update(ref(db, `users/${targetUID}`), { followersCount:  increment(-1) })
            ]);
            setFollowState(false);
            updateStatDisplay('statFollowers', -1);
            showToast('Unfollowed');
        } else {
            // Follow
            await Promise.all([
                set(ref(db, `users/${viewerUID}/following/${targetUID}`), true),
                set(ref(db, `users/${targetUID}/followers/${viewerUID}`), true),
                update(ref(db, `users/${viewerUID}`), { followingCount:  increment(1) }),
                update(ref(db, `users/${targetUID}`), { followersCount:  increment(1) })
            ]);
            setFollowState(true);
            updateStatDisplay('statFollowers', 1);
            showToast('Following! 🎉');
        }
    } catch (e) {
        console.error('toggleFollow error:', e);
        showToast('❌ Action failed');
    }
}

// ── LIKE STATE ─────────────────────────────────────────────────────────────
async function loadLikeState(viewerUID, targetUID, currentLikes) {
    const snap = await get(ref(db, `users/${viewerUID}/likedProfiles/${targetUID}`));
    setLikeState(snap.exists(), currentLikes);
}

function setLikeState(isLiked, count) {
    const btn   = document.getElementById('likeBtn');
    const icon  = document.getElementById('likeIcon');
    const countEl = document.getElementById('likeCount');

    if (isLiked) {
        btn?.classList.add('liked');
        if (icon) icon.textContent = '❤️';
    } else {
        btn?.classList.remove('liked');
        if (icon) icon.textContent = '🤍';
    }

    if (countEl && count !== undefined) countEl.textContent = Number(count).toLocaleString();
    btn?.setAttribute('data-liked', isLiked ? '1' : '0');
    btn?.setAttribute('data-count', count ?? 0);
}

function setupLikeBtn(viewerUID, targetUID) {
    const btn = document.getElementById('likeBtn');
    if (!btn) return;
    btn.addEventListener('click', () => toggleLike(viewerUID, targetUID));
}

async function toggleLike(viewerUID, targetUID) {
    const btn    = document.getElementById('likeBtn');
    const isLiked = btn?.getAttribute('data-liked') === '1';
    const count   = parseInt(btn?.getAttribute('data-count') || '0');

    try {
        if (isLiked) {
            await Promise.all([
                remove(ref(db, `users/${viewerUID}/likedProfiles/${targetUID}`)),
                update(ref(db, `users/${targetUID}`), { profileLikes: increment(-1) })
            ]);
            setLikeState(false, Math.max(0, count - 1));
        } else {
            await Promise.all([
                set(ref(db, `users/${viewerUID}/likedProfiles/${targetUID}`), true),
                update(ref(db, `users/${targetUID}`), { profileLikes: increment(1) })
            ]);
            setLikeState(true, count + 1);
        }
    } catch (e) {
        console.error('toggleLike error:', e);
        showToast('❌ Action failed');
    }
}

// ── STAT DISPLAY UPDATE (local, no refetch) ────────────────────────────────
function updateStatDisplay(elId, delta) {
    const el = document.getElementById(elId);
    if (!el) return;
    const current = parseInt(el.textContent.replace(/,/g, '')) || 0;
    el.textContent = Math.max(0, current + delta).toLocaleString();
}

// ── POPUP MENU ─────────────────────────────────────────────────────────────
function closePopup() {
    document.getElementById('popupMenu')?.classList.remove('open');
}

function setupMenu(viewerUID, targetUID, viewerRank, targetRank) {
    const menuBtn  = document.getElementById('menuBtn');
    const popup    = document.getElementById('popupMenu');

    // Toggle open/close
    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        popup?.classList.toggle('open');
    });

    // Close on outside tap
    document.addEventListener('click', (e) => {
        if (!popup?.contains(e.target) && e.target !== menuBtn) closePopup();
    });

    // Block
    document.getElementById('menuBlock')?.addEventListener('click', () => {
        closePopup();
        openModal('blockModal');
    });

    // Temp ban
    document.getElementById('menuTempBan')?.addEventListener('click', () => {
        closePopup();
        openModal('tempBanModal');
    });

    // Ban
    document.getElementById('menuBan')?.addEventListener('click', () => {
        closePopup();
        openModal('banModal');
    });
}

// ── MODALS SETUP ───────────────────────────────────────────────────────────
function setupModals(viewerUID, targetUID, viewerRank, targetRank) {

    // ── BLOCK ──────────────────────────────────────────────────────────────
    document.getElementById('blockCancelBtn')?.addEventListener('click', () => closeModal('blockModal'));

    document.getElementById('blockConfirmBtn')?.addEventListener('click', async () => {
        try {
            await set(ref(db, `users/${viewerUID}/blocked/${targetUID}`), true);
            closeModal('blockModal');
            showToast('🚫 User blocked');
            setTimeout(() => history.back(), 1500);
        } catch (e) {
            console.error('block error:', e);
            showToast('❌ Failed to block user');
        }
    });

    // ── TEMP BAN ───────────────────────────────────────────────────────────
    // Duration chip selection
    document.querySelectorAll('.duration-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
    });

    document.getElementById('tempBanCancelBtn')?.addEventListener('click', () => closeModal('tempBanModal'));

    document.getElementById('tempBanConfirmBtn')?.addEventListener('click', async () => {
        // Role check — can't temp ban equal or higher role
        if (viewerRank <= targetRank) {
            showToast('⛔ Cannot ban a user with equal or higher role');
            closeModal('tempBanModal');
            return;
        }

        const selected = document.querySelector('.duration-chip.selected');
        const hours    = parseInt(selected?.getAttribute('data-hours') || '1');
        const until    = Date.now() + hours * 60 * 60 * 1000;

        try {
            await update(ref(db, `users/${targetUID}`), {
                tempBan: {
                    until:  until,
                    hours:  hours,
                    by:     viewerUID,
                    at:     Date.now()
                }
            });
            closeModal('tempBanModal');
            showToast(`⏳ User temp banned for ${hours}h`);
        } catch (e) {
            console.error('tempBan error:', e);
            showToast('❌ Failed to apply temp ban');
        }
    });

    // ── PERMANENT BAN ──────────────────────────────────────────────────────
    document.getElementById('banCancelBtn')?.addEventListener('click', () => closeModal('banModal'));

    document.getElementById('banConfirmBtn')?.addEventListener('click', async () => {
        // Role check — can't ban equal or higher role
        if (viewerRank <= targetRank) {
            showToast('⛔ Cannot ban a user with equal or higher role');
            closeModal('banModal');
            return;
        }

        try {
            await update(ref(db, `users/${targetUID}`), {
                banned:   true,
                bannedBy: viewerUID,
                bannedAt: Date.now()
            });
            closeModal('banModal');
            showToast('🔨 User has been banned');
            setTimeout(() => history.back(), 1500);
        } catch (e) {
            console.error('ban error:', e);
            showToast('❌ Failed to ban user');
        }
    });

    // Close modals on overlay tap
    ['blockModal', 'tempBanModal', 'banModal'].forEach(id => {
        const overlay = document.getElementById(id);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(id);
        });
    });
}

// ── ACHIEVEMENTS ───────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = {
    leaderboard_1:  { icon: '🥇', label: '#1 Leaderboard', tier: 'gold'   },
    leaderboard_3:  { icon: '🥈', label: 'Top 3',          tier: 'silver' },
    leaderboard_10: { icon: '🥉', label: 'Top 10',         tier: 'bronze' },
};

function renderAchievements(achievements) {
    const el = document.getElementById('achievementsList');
    if (!el) return;

    const earned = Object.keys(achievements).filter(k => achievements[k]);
    if (!earned.length) return;

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

// ── LIVE RANKINGS ──────────────────────────────────────────────────────────
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

        const byFollowers    = [...users].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
        const byProfileLikes = [...users].sort((a, b) => (b.profileLikes  || 0) - (a.profileLikes  || 0));
        const byTotalLikes   = [...users].sort((a, b) => (b.total_likes   || 0) - (a.total_likes   || 0));

        const posFollowers    = byFollowers.findIndex(u => u.uid === uid) + 1;
        const posProfileLikes = byProfileLikes.findIndex(u => u.uid === uid) + 1;
        const posTotalLikes   = byTotalLikes.findIndex(u => u.uid === uid) + 1;

        const boards = [
            {
                icon: '🌐', label: 'Most Followed', sub: 'Top Influencers',
                pos: posFollowers, value: me.followersCount || 0, unit: 'followers',
                href: 'leaderboard-followed.html'
            },
            {
                icon: '💖', label: 'Profile Stars', sub: 'Most Liked Profiles',
                pos: posProfileLikes, value: me.profileLikes || 0, unit: 'likes',
                href: 'leaderboard-likes.html'
            },
            {
                icon: '🏆', label: 'Battle Kings', sub: 'Hall of Fame',
                pos: posTotalLikes, value: me.total_likes || 0, unit: 'total likes',
                href: 'leaderboard-battle.html'
            },
        ];

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

    } catch (e) {
        console.error('loadRankings error:', e);
        el.innerHTML = '<span class="achievements-empty">Could not load achievements</span>';
    }
}
