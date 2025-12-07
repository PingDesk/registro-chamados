import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6TBH1AQ24g-UPw8nXJQUIdxfBrK9uaGI",
  authDomain: "app-pingdesk.firebaseapp.com",
  projectId: "app-pingdesk",
  storageBucket: "app-pingdesk.firebasestorage.app",
  messagingSenderId: "518825513254",
  appId: "1:518825513254:web:baa4af831f56c5f7f8a2a2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
