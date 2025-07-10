# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running the project locally

To run this project on your local machine, follow these steps:

1.  **Install dependencies:**
    Open a terminal in the project's root directory and run:
    ```bash
    npm install
    ```

2.  **Set up Environment Variables:**
    Create a file named `.env` in the root of your project and add the necessary Firebase configuration keys:
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # If you use Google AI for Genkit flows, add your API key
    GOOGLE_API_KEY=your_google_ai_api_key
    ```
    You can find your Firebase config keys in your Firebase project settings.

3.  **Run the AI Development Server (Genkit):**
    This project uses Genkit for AI features. Open a terminal and run the following command to start the Genkit development server:
    ```bash
    npm run genkit:dev
    ```
    Keep this terminal running.

4.  **Run the Next.js Development Server:**
    In a **new terminal**, run the main application:
    ```bash
    npm run dev
    ```

5.  **Open the App:**
    Open your browser and navigate to `http://localhost:3000`.

## Building and Deploying as a PWA

Now that the application is configured as a Progressive Web App (PWA), you can build it for production and deploy it. Once deployed, users can "install" it to their devices.

1.  **Create App Icons (Reminder):**
    Before you build, make sure you have created and placed the following icons in the `public/icons/` directory:
    *   `icon-192x192.png`
    *   `icon-512x512.png`

2.  **Build the Application:**
    Run the following command in your terminal to create a production-ready version of your app:
    ```bash
    npm run build
    ```
    This command will optimize your application and generate the necessary Service Worker files for the PWA to function offline.

3.  **Deploy to Firebase Hosting:**
    This project is already set up for Firebase. To deploy it, run:
    ```bash
    firebase deploy --only hosting
    ```
    After the command finishes, it will give you a public URL for your deployed application.

4.  **How Users "Install" the App:**
    *   **On Mobile (iOS/Android):** Users can visit the deployed URL in their browser (like Chrome or Safari) and will typically see an "Add to Home Screen" option in the browser's menu.
    *   **On Desktop (Chrome/Edge):** Users will see an "Install" icon in the address bar. Clicking this will add the application to their desktop or app launcher.

    For the install prompt to appear, your site **must be served over HTTPS**, which Firebase Hosting does automatically.
# Freelance-Flow
