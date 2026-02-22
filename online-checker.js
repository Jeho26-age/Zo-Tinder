import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userId = user.uid;
        const userStatusRef = ref(db, `users/${userId}/isOnline`);
        const lastSeenRef = ref(db, `users/${userId}/lastSeen`);
        const connectedRef = ref(db, ".info/connected");

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We are connected! 
                
                // 1. Set Mizo online status
                set(userStatusRef, true);

                // 2. If I disconnect (close app, lose signal), tell Firebase to do this:
                onDisconnect(userStatusRef).set(false);
                onDisconnect(lastSeenRef).set(serverTimestamp());
            }
        });
    }
});
