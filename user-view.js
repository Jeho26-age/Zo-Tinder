import { initializeApp }                                      from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }                       from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
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

// ── Get target UID from URL (?uid= or ?id=) ────────────────────────────────
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

function openModal(id)  { document.getElementById(id)?.classList.add('open');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── BLOCKED SCREEN ─────────────────────────────────────────────────────────
function showBlockedByScreen(data) {
    // Hide all interactive sections
    const hide = [
        'action-row', 'stats-row'
    ];
    document.querySelectorAll('.action-row, .stats-row, .section-card').forEach(el => {
        el.style.display = 'none';
    });

    // Show blocked message after name/location
    const profileBody = document.querySelector('.profile-body');
    const existing = document.getElementById('blockedMsg');
    if (!existing && profileBody) {
        const msg = document.createElement('div');
        msg.id = 'blockedMsg';
        msg.style.cssText = `
            margin-top: 24px;
            width: 100%;
            background: rgba(255,62,29,0.08);
            border: 1px solid rgba(255,62,29,0.2);
            border-radius: 20px;
            padding: 28px 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        `;
        msg.innerHTML = `
            <div style="font-size: 2.5rem;">🚫</div>
            <div style="font-size: 16px; font-weight: 900; color: white;">You've been blocked</div>
            <div style="font-size: 13px; color: #666; font-weight: 600; line-height: 1.5;">
                <strong style="color:#aaa;">${esc(data.username || 'This user')}</strong> has blocked you.<br>
                You cannot interact with this profile.
            </div>
        `;
        profileBody.appendChild(msg);
    }
}

// ── YOU BLOCKED THIS USER screen ───────────────────────────────────────────
function showYouBlockedScreen(data, viewerUID, targetUID) {
    // Hide follow/like buttons
    document.querySelector('.action-row')?.style.setProperty('display', 'none');

    // Insert unblock button after name row
    const profileBody = document.querySelector('.profile-body');
    const existing = document.getElementById('youBlockedMsg');
    if (!existing && profileBody) {
        const msg = document.createElement('div');
        msg.id = 'youBlockedMsg';
        msg.style.cssText = `
            margin-top: 16px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        `;
        msg.innerHTML = `
            <div style="
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 14px 20px;
                text-align: center;
                width: 100%;
            ">
                <div style="font-size: 13px; color: #555; font-weight: 700;">You have blocked this user</div>
            </div>
            <button id="unblockBtn" style="
                width: 100%;
                height: 46px;
                border-radius: 14px;
                border: 1.5px solid rgba(255,255,255,0.15);
                background: transparent;
                color: white;
                font-family: 'Nunito', sans-serif;
                font-size: 15px;
                font-weight: 900;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            ">🔓 Unblock</button>
        `;
        profileBody.appendChild(msg);

        // Unblock button logic
        document.getElementById('unblockBtn')?.addEventListener('click', async () => {
            try {
                await remove(ref(db, `users/${viewerUID}/blocked/${targetUID}`));
                document.getElementById('youBlockedMsg')?.remove();
                document.querySelector('.action-row')?.style.removeProperty('display');
                showToast('✅ User unblocked');
            } catch (e) {
                console.error('unblock error:', e);
                showToast('❌ Failed to unblock');
            }
        });
    }
}

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
        // Fetch target + viewer + block states in parallel
        const [targetSnap, viewerSnap, theyBlockedMe, iBlockedThem] = await Promise.all([
            get(ref(db, `users/${targetUID}`)),
            get(ref(db, `users/${viewer.uid}`)),
            get(ref(db, `users/${targetUID}/blocked/${viewer.uid}`)),  // target blocked viewer
            get(ref(db, `users/${viewer.uid}/blocked/${targetUID}`))   // viewer blocked target
        ]);

        if (!targetSnap.exists()) {
            hideLoader();
            showToast('⚠️ User not found');
            return;
        }

        const targetData = targetSnap.val();
        const viewerData = viewerSnap.exists() ? viewerSnap.val() : {};

        // ── Permanent ban — account should not be viewable ─────────────────
        if (targetData.banned === true) {
            hideLoader();
            document.body.innerHTML = `
                <div style="
                    min-height:100dvh; background:#080808;
                    display:flex; flex-direction:column;
                    align-items:center; justify-content:center;
                    gap:16px; padding:24px; text-align:center;
                    font-family:'Nunito',sans-serif;
                ">
                    <div style="font-size:3rem;">🚫</div>
                    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:2px;color:#ff3e1d;">
                        Account Unavailable
                    </div>
                    <div style="font-size:14px;color:#555;font-weight:700;max-width:280px;line-height:1.6;">
                        This account has been permanently banned and is no longer accessible.
                    </div>
                    <button onclick="history.back()" style="
                        margin-top:12px; padding:14px 28px;
                        background:rgba(255,255,255,0.06);
                        border:1px solid rgba(255,255,255,0.1);
                        border-radius:14px; color:white;
                        font-family:'Nunito',sans-serif;
                        font-size:14px; font-weight:800;
                        cursor:pointer;
                    ">← Go Back</button>
                </div>`;
            return;
        }

        // Determine roles
        const viewerRole = (viewer.uid === OWNER_UID) ? 'owner' : (viewerData.role || 'member');
        const viewerRank = getRoleRank(viewer.uid, viewerRole);
        const targetRole = (targetUID === OWNER_UID) ? 'owner' : (targetData.role || 'member');
        const targetRank = getRoleRank(targetUID, targetRole);

        // Always render basic profile (avatar, name) so they know whose profile it is
        renderProfile(targetUID, targetData);

        // ── BLOCK STATE CHECKS ─────────────────────────────────────────────

        // Case 1: Target has blocked the viewer
        if (theyBlockedMe.exists()) {
            showBlockedByScreen(targetData);
            hideLoader();
            return; // stop here — no follow/like/rankings
        }

        // Case 2: Viewer has blocked the target
        if (iBlockedThem.exists()) {
            showYouBlockedScreen(targetData, viewer.uid, targetUID);
            // Still show stats/interests/bio/rankings but no follow/like
            await loadRankings(targetUID);
            hideLoader();
            return;
        }

        // ── NORMAL FLOW ────────────────────────────────────────────────────
        setupFollowersFollowingLinks();
        showRoleMenuItems(viewer.uid, viewerRank, targetRank, targetData);

        await Promise.all([
            loadFollowState(viewer.uid, targetUID),
            loadLikeState(viewer.uid, targetUID, targetData.profileLikes || 0)
        ]);
        await loadRankings(targetUID);

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

    // Frame
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
function showRoleMenuItems(viewerUID, viewerRank, targetRank, targetData) {
    if (viewerRank <= targetRank) return;

    const isTempBanned = targetData.tempBan && targetData.tempBan.until && targetData.tempBan.until > Date.now();

    // ── Hide block button if target is staff ──────────────────────────────
    if (targetRank >= ROLE_RANK.mod) {
        document.getElementById('menuBlock')?.style.setProperty('display', 'none');
    }

    if (viewerRank >= ROLE_RANK.mod) {
        document.querySelectorAll('.role-mod').forEach(el => el.style.display = 'block');
    }
    if (viewerRank >= ROLE_RANK.admin) {
        document.querySelectorAll('.role-admin').forEach(el => el.style.display = 'block');
    }
    if (viewerUID === OWNER_UID) {
        document.querySelectorAll('.role-owner').forEach(el => el.style.display = 'block');
    }

    // ── Single toggle button — label changes based on ban state ───────────
    const toggleBtn   = document.getElementById('menuTempBanToggle');
    const toggleIcon  = document.getElementById('menuTempBanIcon');
    const toggleLabel = document.getElementById('menuTempBanLabel');

    if (isTempBanned) {
        // Check if this viewer can lift
        const banApplierUID  = targetData.tempBan.by || '';
        const banApplierRank = targetData.tempBan.byRole || ROLE_RANK.member;
        const canLift = (
            viewerUID === banApplierUID ||
            viewerUID === OWNER_UID ||
            (viewerRank >= ROLE_RANK.admin && banApplierUID !== OWNER_UID) ||
            (viewerRank >= ROLE_RANK.mod && banApplierRank < ROLE_RANK.admin && banApplierUID !== OWNER_UID)
        );
        if (canLift && toggleBtn) {
            if (toggleIcon)  toggleIcon.textContent  = '🔓';
            if (toggleLabel) toggleLabel.textContent = 'Lift Temp Ban';
            toggleBtn.dataset.mode = 'lift';
        }

        // Show red banner to staff
        showTempBanBanner(targetData);
    } else {
        if (toggleBtn) toggleBtn.dataset.mode = 'ban';
    }

    // ── Unban option for owner if permanently banned ───────────────────────
    // (perm ban is already blocked at load — this is for future admin panel use)
}

// Helper
function isAdminRank(byRole) {
    return byRole >= ROLE_RANK.admin;
}

// ── Show red banner on profile ─────────────────────────────────────────────
function showTempBanBanner(targetData) {
    const banner   = document.getElementById('tempBanBanner');
    const bannerTx = document.getElementById('tempBanBannerText');
    const username = document.getElementById('profileName')?.textContent || 'This user';
    if (!banner || !bannerTx) return;

    const until = targetData.tempBan?.until;
    const remaining = until ? until - Date.now() : 0;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const timeStr = remaining > 0 ? `${h}h ${m}m remaining` : 'expiring soon';

    bannerTx.innerHTML = `<span>${username}</span> is currently temporarily banned · ${timeStr}`;
    banner.style.display = 'flex';
}

// ── FOLLOW STATE ───────────────────────────────────────────────────────────
async function loadFollowState(viewerUID, targetUID) {
    const snap = await get(ref(db, `users/${viewerUID}/following/${targetUID}`));
    setFollowState(snap.exists());
}

function setFollowState(isFollowing) {
    const btn      = document.getElementById('followBtn');
    const btnIcon  = document.getElementById('followBtnIcon');
    const btnLabel = document.getElementById('followBtnLabel');
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
            await Promise.all([
                remove(ref(db, `users/${viewerUID}/following/${targetUID}`)),
                remove(ref(db, `users/${targetUID}/followers/${viewerUID}`)),
                update(ref(db, `users/${viewerUID}`), { followingCount: increment(-1) }),
                update(ref(db, `users/${targetUID}`), { followersCount: increment(-1) })
            ]);
            setFollowState(false);
            updateStatDisplay('statFollowers', -1);
            showToast('Unfollowed');
        } else {
            await Promise.all([
                set(ref(db, `users/${viewerUID}/following/${targetUID}`), true),
                set(ref(db, `users/${targetUID}/followers/${viewerUID}`), true),
                update(ref(db, `users/${viewerUID}`), { followingCount: increment(1) }),
                update(ref(db, `users/${targetUID}`), { followersCount: increment(1) })
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
    const btn     = document.getElementById('likeBtn');
    const icon    = document.getElementById('likeIcon');
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
    const btn     = document.getElementById('likeBtn');
    const isLiked  = btn?.getAttribute('data-liked') === '1';
    const count    = parseInt(btn?.getAttribute('data-count') || '0');

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

// ── STAT DISPLAY UPDATE ────────────────────────────────────────────────────
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
    const menuBtn = document.getElementById('menuBtn');
    const popup   = document.getElementById('popupMenu');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        popup?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!popup?.contains(e.target) && e.target !== menuBtn) closePopup();
    });

    document.getElementById('menuBlock')?.addEventListener('click', () => {
        closePopup();
        // Staff members cannot be blocked
        if (targetRank >= ROLE_RANK.mod) {
            showToast('⛔ You cannot block a staff member');
            return;
        }
        openModal('blockModal');
    });

    // Single toggle button — opens ban or lift modal depending on state
    document.getElementById('menuTempBanToggle')?.addEventListener('click', () => {
        closePopup();
        const mode = document.getElementById('menuTempBanToggle')?.dataset.mode;
        if (mode === 'lift') {
            openModal('liftTempBanModal');
        } else {
            openModal('tempBanModal');
        }
    });

    document.getElementById('menuBan')?.addEventListener('click', () => {
        closePopup();
        openModal('banModal');
    });

    document.getElementById('menuUnban')?.addEventListener('click', () => {
        closePopup();
        openModal('unbanModal');
    });
}

// ── MODALS ─────────────────────────────────────────────────────────────────
function setupModals(viewerUID, targetUID, viewerRank, targetRank) {

    // ── BLOCK ──────────────────────────────────────────────────────────────
    document.getElementById('blockCancelBtn')?.addEventListener('click', () => closeModal('blockModal'));

    document.getElementById('blockConfirmBtn')?.addEventListener('click', async () => {
        // Double check — cannot block staff
        if (targetRank >= ROLE_RANK.mod) {
            showToast('⛔ You cannot block a staff member');
            closeModal('blockModal');
            return;
        }
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
    document.querySelectorAll('.duration-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
    });

    document.getElementById('tempBanCancelBtn')?.addEventListener('click', () => closeModal('tempBanModal'));

    document.getElementById('tempBanConfirmBtn')?.addEventListener('click', async () => {
        if (viewerRank <= targetRank) {
            showToast('⛔ Cannot ban a user with equal or higher role');
            closeModal('tempBanModal');
            return;
        }
        const reason = document.getElementById('tempBanReason')?.value.trim();
        if (!reason) { showToast('Reason a ziak ngai a ni'); return; }
        const selected = document.querySelector('.duration-chip.selected');
        const hours    = parseInt(selected?.getAttribute('data-hours') || '1');
        const until    = Date.now() + hours * 60 * 60 * 1000;
        try {
            await update(ref(db, `users/${targetUID}`), {
                tempBan: { until, hours, reason, by: viewerUID, byRole: viewerRank, at: Date.now() }
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
        if (viewerRank <= targetRank) {
            showToast('⛔ Cannot ban a user with equal or higher role');
            closeModal('banModal');
            return;
        }
        const reason = document.getElementById('banReason')?.value.trim();
        if (!reason) { showToast('Reason a ziak ngai a ni'); return; }
        try {
            await update(ref(db, `users/${targetUID}`), {
                banned: true, banReason: reason, bannedBy: viewerUID, bannedAt: Date.now()
            });
            closeModal('banModal');
            showToast('🔨 User has been permanently banned');
            setTimeout(() => history.back(), 1500);
        } catch (e) {
            console.error('ban error:', e);
            showToast('❌ Failed to ban user');
        }
    });

    // ── LIFT TEMP BAN ──────────────────────────────────────────────────────
    document.getElementById('liftTempBanCancelBtn')?.addEventListener('click', () => closeModal('liftTempBanModal'));

    document.getElementById('liftTempBanConfirmBtn')?.addEventListener('click', async () => {
        // Re-check permission on confirm
        const snap = await get(ref(db, `users/${targetUID}/tempBan`));
        if (!snap.exists()) {
            closeModal('liftTempBanModal');
            showToast('⚠️ No active temp ban found');
            return;
        }
        const tempBan = snap.val();
        const banApplierRank = tempBan.byRole || ROLE_RANK.member;

        // Cannot lift if applier outranks viewer (and viewer is not owner)
        if (viewerUID !== OWNER_UID && viewerRank <= banApplierRank && viewerUID !== tempBan.by) {
            closeModal('liftTempBanModal');
            showToast('⛔ You cannot lift a ban applied by a higher role');
            return;
        }

        try {
            await remove(ref(db, `users/${targetUID}/tempBan`));
            closeModal('liftTempBanModal');
            showToast('✅ Temp ban lifted');
            // Reset toggle button back to "Temporary Ban" mode
            const toggleBtn   = document.getElementById('menuTempBanToggle');
            const toggleIcon  = document.getElementById('menuTempBanIcon');
            const toggleLabel = document.getElementById('menuTempBanLabel');
            if (toggleBtn)   toggleBtn.dataset.mode  = 'ban';
            if (toggleIcon)  toggleIcon.textContent  = '⏳';
            if (toggleLabel) toggleLabel.textContent = 'Temporary Ban';
            // Hide red banner
            document.getElementById('tempBanBanner')?.style.setProperty('display', 'none');
        } catch(e) {
            console.error('liftTempBan error:', e);
            showToast('❌ Failed to lift ban');
        }
    });

    // ── UNBAN (permanent — owner only) ──────────────────────────────────
    document.getElementById('unbanCancelBtn')?.addEventListener('click', () => closeModal('unbanModal'));

    document.getElementById('unbanConfirmBtn')?.addEventListener('click', async () => {
        if (viewerUID !== OWNER_UID) {
            closeModal('unbanModal');
            showToast('⛔ Only the owner can unban permanently banned users');
            return;
        }
        try {
            await update(ref(db, `users/${targetUID}`), {
                banned:    null,
                banReason: null,
                bannedBy:  null,
                bannedAt:  null,
            });
            closeModal('unbanModal');
            showToast('✅ User has been unbanned');
            document.getElementById('menuUnban')?.style.setProperty('display', 'none');
            document.getElementById('menuBan')?.style.setProperty('display', 'block');
        } catch(e) {
            console.error('unban error:', e);
            showToast('❌ Failed to unban user');
        }
    });

    // Close modals on overlay tap
    ['blockModal', 'tempBanModal', 'banModal', 'liftTempBanModal', 'unbanModal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            if (e.target === document.getElementById(id)) closeModal(id);
        });
    });
}

// ── ACHIEVEMENTS ───────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = {
    leaderboard_1:  { icon: '🥇', label: '#1 Leaderboard', tier: 'gold'   },
    leaderboard_3:  { icon: '🥈', label: 'Top 3',          tier: 'silver' },
    leaderboard_10: { icon: '🥉', label: 'Top 10',         tier: 'bronze' },
};

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
            { icon: '🌐', label: 'Most Followed',  sub: 'Top Influencers',     pos: posFollowers,    value: me.followersCount || 0, unit: 'followers',   href: 'leaderboard-followed.html' },
            { icon: '💖', label: 'Profile Stars',  sub: 'Most Liked Profiles', pos: posProfileLikes, value: me.profileLikes   || 0, unit: 'likes',       href: 'leaderboard-likes.html'    },
            { icon: '🏆', label: 'Battle Kings',   sub: 'Hall of Fame',        pos: posTotalLikes,   value: me.total_likes    || 0, unit: 'total likes', href: 'leaderboard-battle.html'   },
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
