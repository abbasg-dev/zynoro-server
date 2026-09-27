# Backend

Node + Express + Mongoose + JWT + dotenv + Zod.

Email/password authentication is owned by this backend:
- Zod validates requests.
- bcrypt hashes passwords.
- MongoDB stores the password hash.
- JWT is issued after successful authentication.
- Protected routes use the JWT.

Firebase is only used for Google authentication.
The client signs in with Google using Firebase, obtains a Firebase ID token, and sends that token to `POST /api/auth/google`.
The server verifies the Firebase token and then issues the application's JWT.

MongoDB uses the same user document when the same email is encountered, preventing a duplicate application user.
