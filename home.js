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

// --- GLOBAL ACTIONS ---

// New: View Profile Button Logic
window.viewProfile = () => {
    const targetUser = userStack[currentUserIndex];
    if (targetUser) {
        // Redirects to user profile with their ID in the URL
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

window.accept = async () => {
    const card = document.getElementById('mainCard');
    const targetUser = userStack[currentUserIndex];

    if (targetUser && auth.currentUser) {
        const myId = auth.currentUser.uid;
        const targetId = targetUser.uid;
        
        try {
            await update(ref(database, `users/${targetId}`), { profileLikes: increment(1) });
            await set(ref(database, `likes/${myId}/${targetId}`), { timestamp: Date.now() });
            
            // Notification Trigger
            await set(ref(database, `pending_requests/${targetId}/${myId}`), {
                from: myId,
                username: myData.username || "Unknown",
                photo: myData.photoURL || "",
                timestamp: Date.now()
            });
        } catch (e) { console.error(e); }
    }

    card.classList.add('slide-right');
    setTimeout(() => {
        card.classList.remove('slide-right');
        currentUserIndex++;
        renderCard();
    }, 400);
};

// --- DATA FETCHING ---

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
    off(usersRef); // Clean old listeners

    onValue(usersRef, (snapshot) => {
        const allUsers = snapshot.val();
        if (!allUsers) return;

        const tempStack = [];
        const myId = auth.currentUser.uid;

        for (let id in allUsers) {
            if (id === myId) continue;
            let user = allUsers[id];
            user.uid = id;

            // Simple Filter (Since Age Bar is gone)
            // Show opposite gender if looking for love, else show everyone
            if (myData.lookingFor !== "Thian tur") {
                if (user.gender === myData.gender) continue;
            }
            
            tempStack.push(user);
        }
        
        userStack = tempStack.sort(() => Math.random() - 0.5);
        renderCard();
    }, { onlyOnce: true });
}

function renderCard() {
    const card = document.getElementById('mainCard');
    const scanningUI = document.getElementById('scanningUI');
    const photo = document.getElementById('currentPhoto');
    const statusLabel = document.getElementById('statusLabel');
    
    // Check if we ran out of users
    if (userStack.length === 0 || currentUserIndex >= userStack.length) {
        if (scanningUI) scanningUI.style.display = 'flex';
        // Use class to hide instead of .value (which caused your error)
        photo.classList.add('hidden-content');
        document.querySelector('.profile-info').classList.add('hidden-content');
        if (statusLabel) statusLabel.innerText = "SCANNING...";
        
        // Auto-refresh after 8 seconds
        setTimeout(() => {
            currentUserIndex = 0;
            startDiscovery();
        }, 8000);
        return;
    }

    // Show Content
    if (scanningUI) scanningUI.style.display = 'none';
    photo.classList.remove('hidden-content');
    document.querySelector('.profile-info').classList.remove('hidden-content');

    const user = userStack[currentUserIndex];
    const genderIcon = user.gender === "Mipa" ? "♂️" : "♀️";

    document.getElementById('currentName').innerText = `${user.username}, ${user.age} ${genderIcon}`;
    document.getElementById('currentLooking').innerText = `Duh zawng: ${user.lookingFor || 'Thian tur'}`;
    document.getElementById('currentBio').innerText = user.bio ? `"${user.bio}"` : "";
    
    // Khaw & Veng from your Firebase Screenshot
    const khaw = user.khaw || "";
    const veng = user.veng || "";
    document.getElementById('currentVeng').innerText = `📍 ${khaw}${khaw && veng ? ', ' : ''}${veng}`;
    
    photo.src = user.photoURL || "https://via.placeholder.com/400x600?text=No+Photo";

    // Interests
    const tags = document.getElementById('interestTags');
    tags.innerHTML = "";
    if (user.interests) {
        Object.values(user.interests).forEach(interest => {
            const span = document.createElement('span');
            span.className = 'interest-tag';
            span.innerText = interest;
            tags.appendChild(span);
        });
    }
    
    if (statusLabel) {
        statusLabel.innerText = user.isOnline ? "ONLINE" : "OFFLINE";
        statusLabel.style.color = user.isOnline ? "#00ff00" : "#888";
    }
}
