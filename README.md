# BanglaGram 🇧🇩

A simple social media platform built with HTML, CSS,
JavaScript and Firebase.

Developer: Alpha.HR

## Features

- Email and password signup
- Login and logout
- Password reset
- User profiles
- Create text posts
- Image URL posts
- News feed
- Like system
- Comment system
- User search module
- Follow and unfollow module
- Notification module
- Firestore security rules
- Responsive design

## Project Structure

BanglaGram/
│
├── index.html
├── style.css
├── firestore.rules
├── README.md
│
└── js/
    ├── firebase.js
    ├── app.js
    ├── auth.js
    ├── posts.js
    ├── profile.js
    ├── social.js
    └── notifications.js

## Firebase Setup

1. Open Firebase Console.
2. Select your BanglaGram project.
3. Enable Authentication.
4. Enable Email/Password sign-in.
5. Create a Firestore Database.
6. Publish firestore.rules.
7. Add your GitHub Pages domain
   to Authentication > Settings > Authorized domains.

## GitHub Pages Setup

1. Upload all project files to your repository.
2. Open repository Settings.
3. Select Pages.
4. Choose Deploy from a branch.
5. Select main branch and root folder.
6. Save.

Website:
https://alpha-hr-bd.github.io/BanglaGram/

## Important

This is an MVP starter project.

- Image posts currently use image URLs.
- Firebase Storage upload is not included.
- Like and comment counters are not yet synchronized.
- Follow and notification modules are available as
  JavaScript functions but need UI integration.
- User search needs a search interface.
- Firestore may request an index for some queries.

Do not remove Firestore security rules.
