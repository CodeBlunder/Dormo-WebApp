// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCzDJkBjK5kzBjQreZ3n-ZNl5vVtZniOHk",
  authDomain: "dormo-822fc.firebaseapp.com",
  databaseURL: "https://dormo-822fc-default-rtdb.firebaseio.com",
  projectId: "dormo-822fc",
  storageBucket: "dormo-822fc.firebasestorage.app",
  messagingSenderId: "763888854476",
  appId: "1:763888854476:web:128041991a590c1d99a969",
  measurementId: "G-S8J1YBM0EV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Get a reference to the Realtime Database service
const database = getDatabase(app);

// Get a reference to the Auth service
const auth= getAuth(app);
export { app, database, auth };