import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update, increment, set, off } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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
const database = getDatabase(app);
const auth = getAuth(app);

let userStack = [];
let currentUserIndex = 0;
let myData = {};

// --- WINDOW ACTIONS ---

window.viewProfile = () => {
    const targetUser = userStack[currentUserIndex];
    if (targetUser) {
        window.location.href = `user-view.html?id=${targetUser.uid}`;
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

// NEW: Follow Logic (Digital Business Card Send)
window.followUser = async () => {
    const card = document.getElementById('mainCard');
    const targetUser = userStack[currentUserIndex];

    if (targetUser && auth.currentUser) {
        const myId = auth.currentUser.uid;
        const targetId = targetUser.uid;
        
        // Prepare the full data package for the other user's notification
        const followData = {
            from: myId,
            username: myData.username || "Unknown",
            photo: myData.photoURL || "",
            age: myData.age || "??",
            gender: myData.gender || "",
            veng: myData.veng || "",
            khaw: myData.khaw || "",
            interests: myData.interests || {},
            lookingFor: myData.lookingFor || "Thian tur",
            timestamp: Date.now()
        };

        try {
            // 1. Send the full request card to their node
            await set(ref(database, `follow_requests/${targetId}/${myId}`), followData);
            
            // 2. Track who I am following in my own node
            await set(ref(database, `following/${myId}/${targetId}`), { timestamp: Date.now() });
            
            // 3. Increment their follower count for the Leaderboard
            await update(ref(database, `users/${targetId}`), { followersCount: increment(1) });

        } catch (e) { console.error("Follow Error:", e); }
    }

    // Slide out and show next card instantly
    card.classList.add('slide-right');
    setTimeout(() => {
        card.classList.remove('slide-right');
        currentUserIndex++;
        renderCard();
    }, 400);
};

// --- SMART DISCOVERY ---

auth.onAuthStateChanged((user) => {
    if (user) {
        get(ref(database, 'users/' + user.uid)).then((snapshot) => {
            myData = snapshot.val() || {};
            startDiscovery();
        });
    } else { window.location.href = "login.html"; }
});

function startDiscovery() {
    const usersRef = ref(database, 'users');
    off(usersRef);

    onValue(usersRef, (snapshot) => {
        const allUsers = snapshot.val();
        if (!allUsers) return;

        const tempStack = [];
        const myId = auth.currentUser.uid;
        const myInterests = myData.interests ? Object.values(myData.interests) : [];
        const myAge = parseInt(myData.age) || 20;

        for (let id in allUsers) {
            if (id === myId) continue;
            let user = allUsers[id];
            user.uid = id;

            // 1. GENDER & INTENT FILTER
            if (myData.lookingFor !== "Thian tur" && user.gender === myData.gender) continue;
            if (user.lookingFor !== myData.lookingFor) continue;

            // 2. LOCATION & INTEREST BYPASS
            const sameVeng = user.veng && myData.veng && user.veng.toLowerCase() === myData.veng.toLowerCase();
            const sameKhaw = user.khaw && myData.khaw && user.khaw.toLowerCase() === myData.khaw.toLowerCase();
            
            let interestMatch = false;
            if (user.interests) {
                const userInterests = Object.values(user.interests);
                interestMatch = myInterests.some(i => userInterests.includes(i));
            }

            // Must match location OR interests
            if (!sameVeng && !sameKhaw && !interestMatch) continue;

            // 3. AGE FILTER (+/- 8 years)
            const userAge = parseInt(user.age) || 0;
            if (Math.abs(userAge - myAge) > 8) continue;

            tempStack.push(user);
        }
        
        userStack = tempStack.sort(() => Math.random() - 0.5);
        currentUserIndex = 0;
        renderCard();
    }, { onlyOnce: true });
}

function renderCard() {
    const card = document.getElementById('mainCard');
    const scanningUI = document.getElementById('scanningUI');
    const photo = document.getElementById('currentPhoto');
    
    if (!userStack || userStack.length === 0 || currentUserIndex >= userStack.length) {
        if (scanningUI) scanningUI.style.display = 'flex';
        if (card) card.style.display = 'none';
        return;
    }

    if (scanningUI) scanningUI.style.display = 'none';
    if (card) card.style.display = 'block';

    const user = userStack[currentUserIndex];

    photo.src = "https://via.placeholder.com/300x400?text=Zawn_Mek..."; 
    if (user.photoURL) {
        const img = new Image();
        img.src = user.photoURL;
        img.onload = () => { photo.src = user.photoURL; };
    }

    const genderIcon = user.gender === "Mipa" ? "♂️" : "♀️";
    document.getElementById('currentName').innerText = `${user.username || 'User'}, ${user.age || '??'} ${genderIcon}`;
    
    document.getElementById('currentLooking').innerText = `Duh zawng: ${user.lookingFor || 'Thian tur'}`;
    // Add this inside the info update section of renderCard
document.getElementById('currentBio').innerText = user.bio || "";

    
    const khaw = user.khaw || "";
    const veng = user.veng || "";
    document.getElementById('currentVeng').innerText = `📍 ${veng}${veng && khaw ? ', ' : ''}${khaw}`;

    const tags = document.getElementById('interestTags');
    tags.innerHTML = "";
    if (user.interests) {
        const list = Array.isArray(user.interests) ? user.interests : Object.values(user.interests);
        list.slice(0, 3).forEach(interest => {
            const span = document.createElement('span');
            span.className = 'interest-tag';
            span.innerText = interest;
            tags.appendChild(span);
        });
    }
}
