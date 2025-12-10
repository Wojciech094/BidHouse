# BidHouse – Auction Marketplace  
Semester Project 2 – Noroff Front-End Development

Live Demo: [https://bidhouseweb.netlify.app/] 
Figma Design:[https://www.figma.com/design/r7xFWxpezkvcGRC5nRjs2B/BidHouse?node-id=0-1&t=r0lf3JKbTWowO6mr-1]
Project Board: [https://github.com/users/Wojciech094/projects/10]  
Repository: [https://github.com/Wojciech094/BidHouse]

## Overview
BidHouse is a fully functional auction marketplace built with HTML, TailwindCSS and vanilla JavaScript, integrated with the Noroff Auction API v2.  
Users can browse listings, register and log in, create auctions, place bids, edit their profiles, and track wins.  
The project emphasizes clean architecture, responsive design, accessibility and stable API interaction.

## Features

### Authentication
- Registration limited to **@stud.noroff.no**
- Secure login/logout with token storage
- Automatic API key creation
- Dynamic header showing username, credits and new wins

### Profile System
- Avatar, banner, bio and credits display
- Edit profile with **live media previews**
- Stats overview: total listings, wins, active bids
- Preview sections with “View All” navigation

### Listings
- Browse active listings
- Search by keyword, filter by tags
- Sorting: newest, oldest, ending soon, price asc/desc
- Lazy-loaded images + load-more pagination
- Single listing page with:
  - Hero image (`object-cover`)
  - Seller details
  - Bid count & highest bid
  - Bid history timeline
  - LIVE / ENDED status
  - Auto-disabled bid form when appropriate

### Listing Management
- Create listing (title, description, media URL, end date/time)
- Live preview of media
- Edit listing (locked if bids exist)
- Delete listing (locked if bids exist)

### Bidding System
- Bid from listing card or single page
- Input validation + success/error feedback
- Prevent bidding on own listings
- Instant UI updates after bid submission

### Wins & Notifications
- “My Wins” page
- Header badge for new wins
- Badge resets after visit
- Last-seen wins stored locally

## Tech Stack
- **HTML**, **TailwindCSS**, **Vanilla JavaScript**
- **Noroff Auction API v2**
- **Netlify**
- **Figma**
- **GitHub Projects**

## File Structure
```bash
src/
  style.css
  js/
    auth.js
    utils.js
    index.js
    single-listing.js
    create.js
    edit-listing.js
    profile.js
    edit-profile.js
    my-listings.js
    my-bids.js
    my-wins.js
    login-reg.js

public/
  credits.svg

BIDHOUSE/
  index.html
  single.html
  create.html
  edit-listing.html
  edit-profile.html
  profile.html
  my-listings.html
  my-bids.html
  my-wins.html
  login.html
  register.html
  contact.html
  about.html
  tailwind.config.js
  vite.config.ts
  package.json
```

## Running Locally
```bash
git clone https://github.com/Wojciech094/BidHouse.git
cd bidhouse
npm install
npm run dev
```

Or open `index.html` using Live Server.

## Deployment
The project is deployed on **Netlify**, automatically building from the `main` branch.  
Runs fully client-side.

## License
Created as part of Noroff Front-End Development – Semester Project 2.
