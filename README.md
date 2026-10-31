# MetroGo – Metro Reservation System

A web-based metro ticket reservation system designed to make metro travel booking easier and more convenient. Users can search for metro routes, view fares, book tickets, manage bookings, and view their booking history.

## Project Overview

**MetroGo** is a college final-year project that provides an online platform for metro ticket reservation. It includes separate user and administrator functionalities to manage bookings and metro information.

## Features

### User Module

- User registration
- Secure user login
- Search metro routes by source and destination stations
- View route details
- View ticket fare
- Book metro tickets
- Add passenger details
- View booking history
- Cancel bookings
- Payment functionality using Razorpay (integration planned for the payment module)

### Admin Module

- Manage metro stations
- Add, edit, and delete stations
- Manage metro routes
- Manage metro schedules
- Manage metro-related information

## Technologies Used

| Technology      | Purpose                   |
| --------------- | ------------------------- |
| React           | Frontend development      |
| Tailwind CSS    | User interface styling    |
| Python          | Backend development       |
| FastAPI         | Backend API framework     |
| MySQL           | Database management       |
| MySQL Connector | Python–MySQL connectivity |
| Razorpay        | Payment integration       |

## Project Structure


MetroReservationSystem/
│
├── backend/
│   ├── database.py
│   └── main.py
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── .gitignore
└── README.md


## Installation and Setup

### 1. Clone the Repository


git clone https://github.com/Divyapadval0411/MetroGo-Metro-Reservation-System.git


### 2. Open the Project Folder


cd MetroGo-Metro-Reservation-System


### 3. Backend Setup

Create and activate a Python virtual environment:


python -m venv .venv


Windows PowerShell:


.venv\Scripts\Activate.ps1


Install the required Python packages using the project's dependency file, if provided.

Configure your database credentials in a `.env` file in the project root.

### 4. Database Setup

- Install and start MySQL.
- Create the project database.
- Import the project's SQL database script.
- Configure the database connection details in `.env`.

### 5. Run the Backend

From the project root:

python -m uvicorn backend.main:app --reload


Backend API:


http://127.0.0.1:8000


FastAPI documentation:


http://127.0.0.1:8000/docs


### 6. Run the Frontend

Open another terminal:


cd frontend
npm install
npm run dev


Open the local URL displayed in the terminal to access the application.

## Payment Integration

Razorpay is intended for handling online ticket payments. Payment credentials should be stored securely in environment variables and never committed to the public repository.

## Project Purpose

This project demonstrates the development of a full-stack web application using React, Python FastAPI, and MySQL. It aims to provide a simple and organized platform for metro ticket reservation and administration.

## Developer

**Divya Padval**

GitHub Repository:
[https://github.com/Divyapadval0411/MetroGo-Metro-Reservation-System](https://github.com/Divyapadval0411/MetroGo-Metro-Reservation-System)

---

*MetroGo – Making Metro Ticket Reservation Easier.*
