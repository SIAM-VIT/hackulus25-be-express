
<p align="center"><img src="https://imgur.com/Vp4LWt0.png" width=160 title="SIAM-VIT" alt="SIAM-VIT"></a>
</p>
<div align="center">
  <h3 align="center">Hackulus'25 Backend Application</h3>

  <p align="center">
    <a href="https://github.com/SIAM-VIT/hackulus25-be-express/issues">Report Bug</a>
    ·
    <a href="https://hackulus25-be-express.onrender.com">Live Deployment</a>
  </p>
</div>


## Table of Contents

- [Table of Contents](#table-of-contents)
- [About The Project](#about-the-project)
- [Built With](#built-with)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project Locally](#running=the-project-locally)
- [Available Scripts](#available-scripts)
- [Contributors](#contributors)
- [License](#license)


## About The Project

This repository contains the official backend for **Hackulus'25**, SIAM-VIT’s flagship hackathon.  
The backend provides APIs to manage hackathon tracks, panels, admins, submissions, and related workflows.

**Key Features:**

- RESTful API built with **Node.js** and **Express.js**
- PostgreSQL as the primary database
- JWT-based authentication for admins
- Secure validation and error handling
- Deployed and hosted on **Render**

## Built With

This project is built using the following technologies and frameworks:

- [Node.js](https://nodejs.org/) (JavaScript runtime environment)
- [Express.js](https://expressjs.com/) (Fast, unopinionated, minimalist web framework for Node.js)
- [PostgreSQL](https://www.postgresql.org/) (Open-source relational database)
- [JWT](https://jwt.io/) (JSON Web Tokens for authentication)
- [Render](https://render.com/) (Platform for deployment)


## Getting Started

To get a local copy up and running, follow these simple steps.

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [PostgreSQL](https://www.postgresql.org/)

## Installation

1. Clone the repo
   ```sh
   git clone https://github.com/SIAM-VIT/hackulus25-be-express.git

2. Navigate into the project directory
    ```sh
    cd hackulus25-be-express

3. Install dependencies
    ```sh
    npm install

4. Set up your environment variables by creating a .env file in the root directory. Example:
    ```sh
    PORT=4000
    DATABASE_URL=postgresql://<username>:<pwd>@localhost:5432/<dbname>
    JWT_SECRET=
    JWT_EXPIRES_IN=15m
    UPLOAD_DIR=uploads
    BCRYPT_SALT_ROUNDS=10
    SENTRY_DSN=
    SENTRY_AUTH_TOKEN=
    REDIS_URL=

    # Render DB
    DB_HOSTNAME=
    DB_PORT=
    DB_DATABASE=
    DB_USERNAME=
    DB_PASSWORD=
    ```

## Running the Project Locally

```sh
npm start
```

The server will start on http://localhost:4000



## Available Scripts

In the project directory, run:

```sh
npm start
```

Runs the app in production mode.

```sh
npm run dev
```
Runs the app in development mode using nodemon.
The server restarts automatically when code changes are detected.

```sh
npm run lint
```
Checks for lint issues.


## Contributors

<table>
    <tr align="center" style="font-weight:bold">
        <td>
        Aryan Deshpande (Backend)
        <p align="center">
            <img src="https://avatars.githubusercontent.com/dshryn" width="150" height="150" alt="Aryan Deshpande">
        </p>
            <p align="center">
                <a href="https://github.com/dshryn">
                    <img src="http://www.iconninja.com/files/241/825/211/round-collaboration-social-github-code-circle-network-icon.svg" width="36" height="36" alt="GitHub"/>
                </a>
            </p>
        </td>
        <td>
        Aaryan Shrivastav (Backend)
        <p align="center">
            <img src="https://avatars.githubusercontent.com/aaryanshrivastav" width="150" height="150" alt="Aaryan Shrivastav">
        </p>
            <p align="center">
                <a href="https://github.com/aaryanshrivastav">
                    <img src="http://www.iconninja.com/files/241/825/211/round-collaboration-social-github-code-circle-network-icon.svg" width="36" height="36" alt="GitHub"/>
                </a>
            </p>
        </td>
     <td>
        Rishab Nagwani (Full Stack)
        <p align="center">
            <img src="https://avatars.githubusercontent.com/rxshabN" width="150" height="150" alt="Rishab Nagwani">
        </p>
            <p align="center">
                <a href="https://github.com/rxshabN">
                    <img src="http://www.iconninja.com/files/241/825/211/round-collaboration-social-github-code-circle-network-icon.svg" width="36" height="36" alt="GitHub"/>
                </a>
            </p>
        </td>
    </tr>
</table>


## License

Distributed under the MIT License. See LICENSE for more information.

<p align="center"> Made with ❤️ by SIAM-VIT. </p> 
