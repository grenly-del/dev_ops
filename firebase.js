// Import the functions you need from the SDKs you need
const {initializeApp} = require('firebase/app')
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChkXQQiGkXgb1rI_a66VSM_Hpz7o0115c",
  authDomain: "devops-c4e99.firebaseapp.com",
  projectId: "devops-c4e99",
  storageBucket: "devops-c4e99.firebasestorage.app",
  messagingSenderId: "837711957783",
  appId: "1:837711957783:web:6dc2ff8a549d625c62f152",
  measurementId: "G-4VBP5SYK3X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

module.exports = {app}