// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOelxKPrcSeiLpYN2WwYPWysHwZjZLd9c",
  authDomain: "onthi12-thpttanhong.firebaseapp.com",
  projectId: "onthi12-thpttanhong",
  storageBucket: "onthi12-thpttanhong.firebasestorage.app",
  messagingSenderId: "922115936320",
  appId: "1:922115936320:web:67b86c06af9149ff584fa5"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
