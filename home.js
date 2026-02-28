import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update, increment, set, push, off } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain: "zo-tinder.firebaseapp.com",
    databaseURL: "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zo-tinder",
    storageBucket: "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId: "1:866061631708:web:f2c70a3989032095803419"
};

const app      = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth     = getAuth(app);

let userStack        = [];
let currentUserIndex = 0;
let myData           = {};
let myId             = null;

// ── WINDOW ACTIONS ─────────────────────────────────────────────────────────

window.viewProfile = () => {
    const targetUser = userStack[currentUserIndex];
    if (targetUser) {
        window.location.href = `user-view.html?uid=${targetUser.uid}`;
    }
};

window.nope = () => {
    const card = document.getElementById('mainCard');
    if (!userStack[currentUserIndex]) return;
    card.classList.add('slide-left');
    setTimeout(() => {
        card.classList.remove('slide-left');
        currentUserIndex++;
        renderCard();
    }, 400);
};

// ── FOLLOW USER ────────────────────────────────────────────────────────────
window.followUser = async () => {
    const card       = document.getElementById('mainCard');
    const targetUser = userStack[currentUserIndex];

    if (targetUser && auth.currentUser) {
        myId             = auth.currentUser.uid;
        const targetId   = targetUser.uid;

        try {
            // ── 1. Keep legacy follow_requests node (existing notify.html may use it)
            await set(ref(database, `follow_requests/${targetId}/${myId}`), {
                from:      myId,
                username:  myData.username  || 'Unknown',
                photo:     myData.photoURL  || '',
                age:       myData.age       || '??',
                gender:    myData.gender    || '',
                veng:      myData.veng      || '',
                khaw:      myData.khaw      || '',
                interests: myData.interests || {},
                lookingFor:myData.lookingFor|| 'Thian tur',
                timestamp: Date.now()
            });

            // ── 2. NEW: Write to standardised follower/following nodes
            await set(ref(database, `users/${targetId}/followers/${myId}`), true);
            await set(ref(database, `users/${myId}/following/${targetId}`), true);

            // ── 3. Update counts
            await update(ref(database, `users/${targetId}`), { followersCount: increment(1) });
            await update(ref(database, `users/${myId}`),     { followingCount:  increment(1) });

            // ── 4. Check if mutual follow → create chat + send follow_back notif
            const theyFollowMe = await get(ref(database, `users/${targetId}/following/${myId}`));

            if (theyFollowMe.exists()) {
                // Mutual — create empty chat
                const chatID   = [myId, targetId].sort().join('_');
                const chatSnap = await get(ref(database, `chats/${chatID}`));
                if (!chatSnap.exists()) {
                    await set(ref(database, `chats/${chatID}`), {
                        participants: { [myId]: true, [targetId]: true },
                        isRequest:   false,
                        createdAt:   Date.now(),
                        lastMessage: '',
                        lastTime:    Date.now(),
                        lastFrom:    myId,
                    });
                } else {
                    await update(ref(database, `chats/${chatID}`), { isRequest: false });
                }

                // Notify them that I followed back
                await push(ref(database, `notifications/${targetId}`), {
                    type: 'follow_back',
                    from: myId,
                    time: Date.now(),
                    read: false,
                    data: {}
                });

            } else {
                // Not mutual — send regular follow notification
                await push(ref(database, `notifications/${targetId}`), {
                    type: 'follow',
                    from: myId,
                    time: Date.now(),
                    read: false,
                    data: {}
                });
            }

        } catch (e) { console.error('Follow Error:', e); }
    }

    // Slide card out
    card.classList.add('slide-right');
    setTimeout(() => {
        card.classList.remove('slide-right');
        currentUserIndex++;
        renderCard();
    }, 400);
};

// ── AUTH STATE ─────────────────────────────────────────────────────────────
auth.onAuthStateChanged((user) => {
    if (user) {
        myId = user.uid;
        get(ref(database, `users/${user.uid}`)).then((snapshot) => {
            myData = snapshot.val() || {};
            startDiscovery();
            listenNotifBadge(user.uid);
        });
    } else {
        window.location.href = 'login.html';
    }
});

// ── NOTIFICATION BADGE ─────────────────────────────────────────────────────
function listenNotifBadge(uid) {
    const notifRef = ref(database, `notifications/${uid}`);

    onValue(notifRef, (snap) => {
        let unread = 0;
        if (snap.exists()) {
            snap.forEach(child => {
                if (!child.val().read) unread++;
            });
        }

        // Find or create badge element on the notify button
        const notifBtn = document.querySelector('.icon-btn[onclick*="notify"]');
        if (!notifBtn) return;

        // Make button position relative so badge can sit on it
        notifBtn.style.position = 'relative';

        let badge = document.getElementById('notifBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'notifBadge';
            badge.style.cssText = `
                position: absolute;
                top: -6px; right: -6px;
                background: #ff3e1d;
                color: white;
                font-size: 10px;
                font-weight: 900;
                font-family: 'Nunito', sans-serif;
                min-width: 18px; height: 18px;
                border-radius: 9px;
                padding: 0 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #080808;
                pointer-events: none;
                z-index: 999;
                line-height: 1;
            `;
            notifBtn.appendChild(badge);
        }

        if (unread > 0) {
            badge.textContent   = unread > 200 ? '200+' : unread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// ── SMART DISCOVERY ────────────────────────────────────────────────────────
function startDiscovery() {
    const usersRef = ref(database, 'users');
    off(usersRef);

    onValue(usersRef, (snapshot) => {
        const allUsers = snapshot.val();
        if (!allUsers) return;

        const tempStack  = [];
        const myIdNow    = auth.currentUser.uid;
        const myInterests = myData.interests ? Object.values(myData.interests) : [];
        const myAge      = parseInt(myData.age) || 20;

        for (let id in allUsers) {
            if (id === myIdNow) continue;
            let user  = allUsers[id];
            user.uid  = id;

            // 1. GENDER & INTENT FILTER
            if (myData.lookingFor !== 'Thian tur' && user.gender === myData.gender) continue;
            if (user.lookingFor !== myData.lookingFor) continue;

            // 2. LOCATION & INTEREST BYPASS
            const sameVeng = user.veng && myData.veng && user.veng.toLowerCase() === myData.veng.toLowerCase();
            const sameKhaw = user.khaw && myData.khaw && user.khaw.toLowerCase() === myData.khaw.toLowerCase();

            let interestMatch = false;
            if (user.interests) {
                const userInterests = Object.values(user.interests);
                interestMatch = myInterests.some(i => userInterests.includes(i));
            }

            if (!sameVeng && !sameKhaw && !interestMatch) continue;

            // 3. AGE FILTER (+/- 8 years)
            const userAge = parseInt(user.age) || 0;
            if (Math.abs(userAge - myAge) > 8) continue;

            tempStack.push(user);
        }

        userStack        = tempStack.sort(() => Math.random() - 0.5);
        currentUserIndex = 0;
        renderCard();
    }, { onlyOnce: true });
}

// ── RENDER CARD ────────────────────────────────────────────────────────────
function renderCard() {
    const card      = document.getElementById('mainCard');
    const scanningUI = document.getElementById('scanningUI');
    const photo     = document.getElementById('currentPhoto');

    if (!userStack || userStack.length === 0 || currentUserIndex >= userStack.length) {
        if (scanningUI) scanningUI.style.display = 'flex';
        if (card)       card.style.display       = 'none';
        return;
    }

    if (scanningUI) scanningUI.style.display = 'none';
    if (card)       card.style.display       = 'block';

    const user = userStack[currentUserIndex];

    photo.src = 'https://via.placeholder.com/300x400?text=Zawn_Mek...';
    if (user.photoURL) {
        const img  = new Image();
        img.src    = user.photoURL;
        img.onload = () => { photo.src = user.photoURL; };
    }

    const genderIcon = user.gender === 'Mipa' ? '♂️' : '♀️';
    document.getElementById('currentName').innerText    = `${user.username || 'User'}, ${user.age || '??'} ${genderIcon}`;
    document.getElementById('currentLooking').innerText = `Duh zawng: ${user.lookingFor || 'Thian tur'}`;
    document.getElementById('currentBio').innerText     = user.bio || '';

    const khaw = user.khaw || '';
    const veng = user.veng || '';
    document.getElementById('currentVeng').innerText = `📍 ${veng}${veng && khaw ? ', ' : ''}${khaw}`;

    const tags = document.getElementById('interestTags');
    tags.innerHTML = '';
    if (user.interests) {
        const list = Array.isArray(user.interests) ? user.interests : Object.values(user.interests);
        list.slice(0, 3).forEach(interest => {
            const span       = document.createElement('span');
            span.className   = 'interest-tag';
            span.innerText   = interest;
            tags.appendChild(span);
        });
    }
}
