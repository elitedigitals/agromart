A backend API for AgroMart, an agriculture-focused marketplace built with Node.js and Express.
This API powers the core server logic of AgroMart — providing endpoints for products, orders, users, authentication, and more. It’s designed to be consumed by a frontend application (web/mobile) for a complete e-commerce experience.

AgroMart is an online platform that connects farmers, sellers, and buyers to buy and sell agricultural products. The backend handles:

User authentication & authorization
Product listing by sellers and buying of products by buyers
user wallet for payment deposit 
Escrow Wallet for holding and releasing of funds
seller wallet for withdrawal of funds
Order processing
Database storage and retrieval

Integrated API for frontend consumption

Tech Stack

This project uses:

Component	                 Technology
Language	                 JavaScript (Node.js)
Web Framework 	           Express.js
Database	                 MongoDB 
Environment Management	  .env
Package Manager          	npm

Features

RESTful API structure
Authentication (JWT / session based)
Product CRUD
Payment processing
Order processing
User roles and authorization
Clean routing and controllers
Modular code structure

Getting Started

Follow these steps to set up and run the project locally.

 1. Clone the repo
git clone https://github.com/elitedigitals/agromart.git
cd agromart

 2. Install dependencies
npm install

3. Configure Environment Variables

Create a .env file in the project root:

PORT=5000
MONGO_URI=your_database_connection_string
JWT_SECRET=your_jwt_secret


4. Run the Server

For development:

npm run dev


For production:

npm start


Then visit:

http://localhost:5000


